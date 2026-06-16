import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import { protect, signToken } from "../middleware/auth.js";
import {
  generateOTP, hashOTP,
  sendEmailOTP, sendSmsOTP, sendPasswordResetEmail,
} from "../services/otpService.js";

const router = express.Router();

// ─── Helpers ───────────────────────────────────────
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = (s) => /^\+?[\d\s\-()]{7,15}$/.test(s.replace(/\s/g,""));

const sendOTP = async (user, purpose) => {
  const otp = generateOTP();
  user.otp        = hashOTP(otp);
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  user.otpPurpose = purpose;
  await user.save();
  if (user.email) await sendEmailOTP({ email: user.email, otp, purpose });
  else if (user.phone) await sendSmsOTP({ phone: user.phone, otp });
  return otp;
};

// ─── Register ───────────────────────────────────────
// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, username, password } = req.body;
    if (!firstName || !lastName || !username || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }
    if (!email && !phone) {
      return res.status(400).json({ message: "Email or phone required" });
    }

    // Check uniqueness
    if (await User.findOne({ username: username.toLowerCase() })) {
      return res.status(400).json({ message: "Username already taken" });
    }
    if (email && await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ message: "Email already registered" });
    }
    if (phone && await User.findOne({ phone })) {
      return res.status(400).json({ message: "Phone already registered" });
    }

    const user = await User.create({ firstName, lastName, email, phone, username, password });
    await sendOTP(user, "register");

    res.status(201).json({ message: "OTP sent", userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Verify OTP ──────────────────────────────────────
// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { otp, identifier, userId, type } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP required" });

    let user;
    if (userId) user = await User.findById(userId);
    else if (identifier && isEmail(identifier)) user = await User.findOne({ email: identifier.toLowerCase() });
    else if (identifier) user = await User.findOne({ phone: identifier });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.otp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }
    if (user.otp !== hashOTP(otp)) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpPurpose = undefined;
    user.isVerified = true;
    user.isOnline   = true;
    user.lastSeen   = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Resend OTP ──────────────────────────────────────
router.post("/resend-otp", async (req, res) => {
  try {
    const { identifier, type } = req.body;
    let user;
    if (isEmail(identifier)) user = await User.findOne({ email: identifier.toLowerCase() });
    else user = await User.findOne({ phone: identifier });
    if (!user) return res.status(404).json({ message: "User not found" });
    await sendOTP(user, type || "login");
    res.json({ message: "OTP resent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Login ───────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Identifier and password required" });
    }

    let user;
    if (isEmail(identifier))  user = await User.findOne({ email: identifier.toLowerCase() });
    else if (isPhone(identifier)) user = await User.findOne({ phone: identifier });
    else user = await User.findOne({ username: identifier.toLowerCase() });

    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (!await user.comparePassword(password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (!user.isActive) return res.status(403).json({ message: "Account deactivated" });

    // 2FA check
    if (user.twoFactorEnabled) {
      await sendOTP(user, "login");
      return res.json({ requiresOtp: true, message: "OTP sent" });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user: user.toPublicJSON(), requiresOtp: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Forgot Password ─────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;
    let user;
    if (isEmail(identifier))  user = await User.findOne({ email: identifier.toLowerCase() });
    else if (isPhone(identifier)) user = await User.findOne({ phone: identifier });
    else user = await User.findOne({ username: identifier.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: "If an account exists, reset instructions were sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken        = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    if (user.email) await sendPasswordResetEmail({ email: user.email, resetUrl });

    res.json({ message: "If an account exists, reset instructions were sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Reset Password ─────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user   = await User.findOne({ resetToken: hashed, resetTokenExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

    user.password          = password;
    user.resetToken        = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get current user ────────────────────────────────
router.get("/me", protect, async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

// ─── Logout ──────────────────────────────────────────
router.post("/logout", protect, async (req, res) => {
  req.user.isOnline = false;
  req.user.lastSeen = new Date();
  await req.user.save();
  res.clearCookie("nexachat_token");
  res.json({ message: "Logged out" });
});

// ─── Check username availability ─────────────────────
router.get("/check-username", async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ message: "Username required" });
  const exists = await User.findOne({ username: username.toLowerCase() });
  res.json({ available: !exists });
});

export default router;
