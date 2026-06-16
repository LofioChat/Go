import express from "express";
import { protect } from "../middleware/auth.js";
import User from "../models/User.js";
import { Message, Conversation } from "../models/Conversation.js";

const router = express.Router();
router.use(protect);

// GET /api/search?q=...&types=users,messages,groups
router.get("/", async (req, res) => {
  try {
    const { q, types } = req.query;
    const userId = req.user._id;
    if (!q || !q.trim()) return res.json({ results: { users: [], messages: [], groups: [] } });

    const wantedTypes = types ? types.split(",") : ["users", "messages", "groups"];
    const regex = new RegExp(q.trim(), "i");
    const results = {};

    if (wantedTypes.includes("users")) {
      results.users = await User.find({
        _id: { $ne: userId },
        isActive: true,
        $or: [
          { firstName: regex }, { lastName: regex },
          { username: regex }, { phone: regex },
        ],
      })
        .select("firstName lastName username avatar isOnline")
        .limit(20);
    }

    if (wantedTypes.includes("messages")) {
      const myConvIds = await Conversation.find({ participants: userId }).distinct("_id");
      const msgs = await Message.find({
        conversation: { $in: myConvIds },
        content: regex,
        deleted: false,
      })
        .populate("sender", "firstName lastName username")
        .sort({ createdAt: -1 })
        .limit(20);

      results.messages = msgs.map((m) => ({
        _id: m._id,
        conversationId: m.conversation,
        senderName: m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : "Unknown",
        content: m.content,
        createdAt: m.createdAt,
      }));
    }

    if (wantedTypes.includes("groups")) {
      const groups = await Conversation.find({
        isGroup: true,
        participants: userId,
        name: regex,
      }).limit(20);

      results.groups = groups.map((g) => ({
        _id: g._id,
        conversationId: g._id,
        name: g.name,
        avatar: g.avatar,
        memberCount: g.participants.length,
      }));
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
