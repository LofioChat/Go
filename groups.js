import express from "express";
import { v4 as uuidv4 } from "uuid";
import { protect } from "../middleware/auth.js";
import { Conversation } from "../models/Conversation.js";
import { upload, handleFileUpload } from "../services/uploadService.js";

const router = express.Router();
router.use(protect);

// POST /api/groups  — create group
router.post("/", async (req, res) => {
  try {
    const { name, description, memberIds, avatar } = req.body;
    const userId = req.user._id;
    if (!name) return res.status(400).json({ message: "Group name required" });

    const allMembers = [...new Set([userId.toString(), ...(memberIds || [])])];
    const meta = allMembers.map((id) => ({ user: id, unreadCount: 0 }));

    const conv = await Conversation.create({
      isGroup: true,
      name,
      description: description || "",
      avatar: avatar || "",
      participants: allMembers,
      admins: [userId],
      inviteLink: uuidv4(),
      meta,
    });

    await conv.populate("participants", "firstName lastName username avatar isOnline");
    res.status(201).json({ conversation: conv });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/groups/:groupId
router.get("/:groupId", async (req, res) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true })
      .populate("participants", "firstName lastName username avatar isOnline lastSeen")
      .populate("admins", "firstName lastName username avatar");
    if (!conv) return res.status(404).json({ message: "Group not found" });
    res.json({ group: conv });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/groups/:groupId — update group info
router.patch("/:groupId", async (req, res) => {
  try {
    const { name, description, avatar } = req.body;
    const conv = await Conversation.findOneAndUpdate(
      { _id: req.params.groupId, admins: req.user._id },
      { $set: { name, description, avatar } },
      { new: true }
    ).populate("participants", "firstName lastName username avatar");
    if (!conv) return res.status(403).json({ message: "Not authorized or group not found" });
    res.json({ group: conv });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/groups/:groupId/members — add members
router.post("/:groupId/members", async (req, res) => {
  try {
    const { memberIds } = req.body;
    const conv = await Conversation.findOne({ _id: req.params.groupId, admins: req.user._id });
    if (!conv) return res.status(403).json({ message: "Not authorized" });

    const newMembers = memberIds.filter((id) => !conv.participants.includes(id));
    conv.participants.push(...newMembers);
    conv.meta.push(...newMembers.map((id) => ({ user: id, unreadCount: 0 })));
    await conv.save();
    await conv.populate("participants", "firstName lastName username avatar");
    res.json({ group: conv });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/groups/:groupId/members/:memberId
router.delete("/:groupId/members/:memberId", async (req, res) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.groupId, admins: req.user._id });
    if (!conv) return res.status(403).json({ message: "Not authorized" });
    conv.participants = conv.participants.filter((p) => p.toString() !== req.params.memberId);
    conv.meta = conv.meta.filter((m) => m.user.toString() !== req.params.memberId);
    await conv.save();
    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/groups/:groupId/leave
router.post("/:groupId/leave", async (req, res) => {
  try {
    const userId = req.user._id;
    const conv = await Conversation.findById(req.params.groupId);
    if (!conv) return res.status(404).json({ message: "Group not found" });
    conv.participants = conv.participants.filter((p) => p.toString() !== userId.toString());
    conv.admins = conv.admins.filter((a) => a.toString() !== userId.toString());
    conv.meta = conv.meta.filter((m) => m.user.toString() !== userId.toString());
    if (conv.participants.length === 0) {
      await conv.deleteOne();
    } else {
      if (conv.admins.length === 0 && conv.participants.length > 0) {
        conv.admins.push(conv.participants[0]);
      }
      await conv.save();
    }
    res.json({ message: "Left group" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/groups/:groupId/invite-link
router.post("/:groupId/invite-link", async (req, res) => {
  try {
    const conv = await Conversation.findOneAndUpdate(
      { _id: req.params.groupId, participants: req.user._id },
      { inviteLink: uuidv4() },
      { new: true }
    );
    const link = `${process.env.CLIENT_URL}/join/${conv.inviteLink}`;
    res.json({ link });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/groups/avatar — upload group avatar
router.post("/avatar", upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    const result = await handleFileUpload(req.file, "groups");
    res.json({ url: result.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
