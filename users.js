import express from "express";
import { protect } from "../middleware/auth.js";
import User from "../models/User.js";
import { upload, handleFileUpload } from "../services/uploadService.js";

const router = express.Router();
router.use(protect);

// GET /api/users/me
router.get("/me", (req, res) => res.json({ user: req.user.toPublicJSON() }));

// PATCH /api/users/me
router.patch("/me", async (req, res) => {
  try {
    const allowed = ["firstName", "lastName", "bio", "privacy"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/me/avatar
router.post("/me/avatar", upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const result = await handleFileUpload(req.file, "avatars");
    const user   = await User.findByIdAndUpdate(req.user._id, { avatar: result.url }, { new: true });
    res.json({ url: result.url, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:userId
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password -otp -otpExpires -resetToken");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/block/:targetId
router.post("/block/:targetId", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.blockedUsers.includes(req.params.targetId)) {
      user.blockedUsers.push(req.params.targetId);
      await user.save();
    }
    res.json({ message: "User blocked" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/block/:targetId
router.delete("/block/:targetId", async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: req.params.targetId },
    });
    res.json({ message: "User unblocked" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/blocked/list
router.get("/blocked/list", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("blockedUsers", "firstName lastName username avatar");
    res.json({ blockedUsers: user.blockedUsers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/me (delete account)
router.delete("/me", async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.json({ message: "Account deactivated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
