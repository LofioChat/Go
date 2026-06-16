import express from "express";
import { protect } from "../middleware/auth.js";
import { Story } from "../models/StoryCall.js";
import User from "../models/User.js";
import { upload, handleFileUpload } from "../services/uploadService.js";

const router = express.Router();
router.use(protect);

// GET /api/stories — feed (grouped by user, contacts only for now = all users)
router.get("/", async (req, res) => {
  try {
    const userId = req.user._id;
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
      user: { $ne: userId },
    })
      .populate("user", "firstName lastName username avatar")
      .sort({ createdAt: -1 });

    // Group by user — take latest per user for the bar preview
    const seen = new Set();
    const grouped = [];
    for (const s of stories) {
      const uid = s.user._id.toString();
      if (!seen.has(uid)) {
        seen.add(uid);
        grouped.push(s);
      }
    }

    res.json({ stories: grouped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/stories/:storyId — get all stories from that user (for viewer)
router.get("/:storyId", async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId).populate("user", "firstName lastName username avatar");
    if (!story) return res.status(404).json({ message: "Story not found" });

    const userStories = await Story.find({
      user: story.user._id,
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "firstName lastName username avatar")
      .sort({ createdAt: 1 });

    res.json({ userStories });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/stories — create
router.post("/", async (req, res) => {
  try {
    const { type, content, bgColor, mediaUrl, caption, privacy } = req.body;
    const story = await Story.create({
      user: req.user._id,
      type: type || "text",
      content,
      bgColor,
      mediaUrl,
      mediaType: type,
      caption,
      privacy: privacy || "everyone",
    });
    await story.populate("user", "firstName lastName username avatar");
    res.status(201).json({ story });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/stories/upload — media upload helper
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    const result = await handleFileUpload(req.file, "stories");
    res.json({ url: result.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/stories/:storyId/view
router.post("/:storyId/view", async (req, res) => {
  try {
    await Story.findByIdAndUpdate(req.params.storyId, {
      $addToSet: { viewers: req.user._id },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/stories/:storyId/viewers
router.get("/:storyId/viewers", async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId).populate("viewers", "firstName lastName username avatar");
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json({ viewers: story.viewers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/stories/:storyId/react
router.post("/:storyId/react", async (req, res) => {
  try {
    const { emoji } = req.body;
    await Story.findByIdAndUpdate(req.params.storyId, {
      $push: { reactions: { user: req.user._id, emoji } },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/stories/:storyId/reply
router.post("/:storyId/reply", async (req, res) => {
  try {
    const { message } = req.body;
    await Story.findByIdAndUpdate(req.params.storyId, {
      $push: { replies: { user: req.user._id, message } },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/stories/:storyId
router.delete("/:storyId", async (req, res) => {
  try {
    await Story.findOneAndDelete({ _id: req.params.storyId, user: req.user._id });
    res.json({ message: "Story deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
