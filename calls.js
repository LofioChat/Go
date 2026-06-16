import express from "express";
import { protect } from "../middleware/auth.js";
import { Call } from "../models/StoryCall.js";

const router = express.Router();
router.use(protect);

// GET /api/calls/history
router.get("/history", async (req, res) => {
  try {
    const userId = req.user._id;
    const calls = await Call.find({ participants: userId })
      .populate("participants", "firstName lastName username avatar")
      .populate("initiator", "firstName lastName username avatar")
      .sort({ createdAt: -1 })
      .limit(100);

    const formatted = calls.map((c) => ({
      _id: c._id,
      conversationId: c.conversation,
      participants: c.participants,
      type: c.type,
      direction: c.initiator._id.toString() === userId.toString() ? "outgoing" : "incoming",
      status: c.status,
      duration: c.duration,
      isGroup: c.isGroup,
      groupName: c.groupName,
      groupAvatar: c.groupAvatar,
      createdAt: c.createdAt,
    }));

    res.json({ calls: formatted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/calls — log a call (used by socket handler too, but exposed for REST as well)
router.post("/", async (req, res) => {
  try {
    const { conversation, participants, type, status, duration, isGroup } = req.body;
    const call = await Call.create({
      conversation, participants, type, status, duration, isGroup,
      initiator: req.user._id,
      startedAt: new Date(),
    });
    res.status(201).json({ call });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/calls/:callId
router.delete("/:callId", async (req, res) => {
  try {
    await Call.findOneAndDelete({ _id: req.params.callId, participants: req.user._id });
    res.json({ message: "Call log deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
