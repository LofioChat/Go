import express from "express";
import { protect } from "../middleware/auth.js";
import { Conversation, Message } from "../models/Conversation.js";
import User from "../models/User.js";
import { upload, handleFileUpload } from "../services/uploadService.js";

const router = express.Router();
router.use(protect);

// ─── Get all conversations ───────────────────────────
router.get("/", async (req, res) => {
  try {
    const userId = req.user._id;
    const convs  = await Conversation.find({ participants: userId })
      .populate("participants", "firstName lastName username avatar isOnline lastSeen")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "firstName username" } })
      .sort({ updatedAt: -1 });

    const result = convs.map((c) => {
      const meta = c.getMetaFor(userId);
      return {
        _id:         c._id,
        participants: c.participants,
        isGroup:     c.isGroup,
        name:        c.name,
        avatar:      c.avatar,
        lastMessage: c.lastMessage,
        unreadCount: meta.unreadCount || 0,
        pinned:      meta.pinned || false,
        archived:    meta.archived || false,
        muted:       meta.muted || false,
        updatedAt:   c.updatedAt,
      };
    });

    res.json({ conversations: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Create / get DM conversation ────────────────────
router.post("/", async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user._id;

    if (participantId === userId.toString()) {
      return res.status(400).json({ message: "Cannot start a chat with yourself" });
    }

    // Check if conversation already exists
    let conv = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [userId, participantId], $size: 2 },
    }).populate("participants", "firstName lastName username avatar isOnline lastSeen");

    if (!conv) {
      conv = await Conversation.create({
        participants: [userId, participantId],
        isGroup: false,
        meta: [
          { user: userId,        unreadCount: 0 },
          { user: participantId, unreadCount: 0 },
        ],
      });
      conv = await conv.populate("participants", "firstName lastName username avatar isOnline lastSeen");
    }

    res.json({ conversation: conv });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get messages ─────────────────────────────────────
router.get("/:convId/messages", async (req, res) => {
  try {
    const { convId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 40;
    const skip  = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ conversation: convId, deleted: false })
        .populate("sender", "firstName lastName username avatar")
        .populate("replyTo", "content type sender")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ conversation: convId }),
    ]);

    res.json({
      messages:  messages.reverse(),
      total,
      hasMore:   total > skip + messages.length,
      page,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Send message ─────────────────────────────────────
router.post("/:convId/messages", upload.single("file"), async (req, res) => {
  try {
    const { convId }  = req.params;
    const { content, type = "text", replyTo, location, contact } = req.body;
    const userId = req.user._id;

    let mediaData = {};
    if (req.file) {
      const uploaded = await handleFileUpload(req.file, "messages");
      mediaData = { mediaUrl: uploaded.url, mediaSize: uploaded.size, mediaMime: uploaded.mime, type: uploaded.type };
    }

    const msg = await Message.create({
      conversation: convId,
      sender:       userId,
      type:         mediaData.type || type,
      content:      content || "",
      replyTo:      replyTo || undefined,
      location:     location ? JSON.parse(location) : undefined,
      contact:      contact  ? JSON.parse(contact)  : undefined,
      status:       "sent",
      ...mediaData,
    });

    await msg.populate("sender", "firstName lastName username avatar");
    if (msg.replyTo) await msg.populate("replyTo", "content type sender");

    // Update conversation
    await Conversation.findByIdAndUpdate(convId, {
      lastMessage: msg._id,
      $inc: { "meta.$[other].unreadCount": 1 },
    }, {
      arrayFilters: [{ "other.user": { $ne: userId } }],
    });

    // Emit via socket
    const conv = await Conversation.findById(convId);
    conv?.participants.forEach((pId) => {
      req.io.to(`user:${pId}`).emit("message:new", { conversationId: convId, message: msg });
    });

    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Edit message ─────────────────────────────────────
router.patch("/:convId/messages/:msgId", async (req, res) => {
  try {
    const { content } = req.body;
    const msg = await Message.findOneAndUpdate(
      { _id: req.params.msgId, sender: req.user._id, deleted: false },
      { content, edited: true, editedAt: new Date() },
      { new: true }
    ).populate("sender", "firstName lastName username avatar");

    if (!msg) return res.status(404).json({ message: "Message not found" });

    const conv = await Conversation.findById(req.params.convId);
    conv?.participants.forEach((pId) => {
      req.io.to(`user:${pId}`).emit("message:updated", {
        conversationId: req.params.convId,
        messageId: msg._id,
        updates: { content, edited: true },
      });
    });

    res.json({ message: msg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Delete message ───────────────────────────────────
router.delete("/:convId/messages/:msgId", async (req, res) => {
  try {
    const msg = await Message.findOneAndUpdate(
      { _id: req.params.msgId, sender: req.user._id },
      { deleted: true, deletedAt: new Date(), content: "", mediaUrl: "" },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const conv = await Conversation.findById(req.params.convId);
    conv?.participants.forEach((pId) => {
      req.io.to(`user:${pId}`).emit("message:deleted", {
        conversationId: req.params.convId, messageId: msg._id,
      });
    });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── React to message ─────────────────────────────────
router.post("/:convId/messages/:msgId/react", async (req, res) => {
  try {
    const { emoji } = req.body;
    const userId    = req.user._id;
    const msg       = await Message.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const existing = msg.reactions.findIndex((r) => r.user.toString() === userId.toString() && r.emoji === emoji);
    if (existing >= 0) {
      msg.reactions.splice(existing, 1); // toggle off
    } else {
      // Remove any existing reaction from this user first
      msg.reactions = msg.reactions.filter((r) => r.user.toString() !== userId.toString());
      msg.reactions.push({ user: userId, emoji });
    }
    await msg.save();

    const conv = await Conversation.findById(req.params.convId);
    conv?.participants.forEach((pId) => {
      req.io.to(`user:${pId}`).emit("message:updated", {
        conversationId: req.params.convId,
        messageId: msg._id,
        updates: { reactions: msg.reactions },
      });
    });

    res.json({ reactions: msg.reactions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Mark as read ─────────────────────────────────────
router.patch("/:convId/read", async (req, res) => {
  try {
    const userId = req.user._id;
    await Conversation.findByIdAndUpdate(req.params.convId, {
      $set: { "meta.$[elem].unreadCount": 0, "meta.$[elem].lastRead": new Date() },
    }, { arrayFilters: [{ "elem.user": userId }] });

    // Mark messages as read
    await Message.updateMany(
      { conversation: req.params.convId, sender: { $ne: userId }, status: { $ne: "read" } },
      { $set: { status: "read" }, $push: { readBy: { user: userId, readAt: new Date() } } }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Pin / Archive ─────────────────────────────────────
router.patch("/:convId/pin", async (req, res) => {
  try {
    const userId = req.user._id;
    const conv   = await Conversation.findById(req.params.convId);
    const meta   = conv.meta.find((m) => m.user.toString() === userId.toString());
    if (meta) meta.pinned = !meta.pinned;
    await conv.save();
    res.json({ pinned: meta?.pinned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:convId/archive", async (req, res) => {
  try {
    const userId = req.user._id;
    const conv   = await Conversation.findById(req.params.convId);
    const meta   = conv.meta.find((m) => m.user.toString() === userId.toString());
    if (meta) meta.archived = !meta.archived;
    await conv.save();
    res.json({ archived: meta?.archived });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
