import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName:  { type: String, required: true, trim: true, maxlength: 50 },
    lastName:   { type: String, required: true, trim: true, maxlength: 50 },
    username:   { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 30 },
    email:      { type: String, sparse: true, lowercase: true, trim: true },
    phone:      { type: String, sparse: true, trim: true },
    password:   { type: String, required: true, minlength: 8 },
    avatar:     { type: String, default: "" },
    bio:        { type: String, default: "", maxlength: 200 },
    isVerified: { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true },
    lastSeen:   { type: Date, default: Date.now },
    isOnline:   { type: Boolean, default: false },

    // Privacy settings
    privacy: {
      lastSeen:       { type: String, enum: ["everyone","contacts","nobody"], default: "everyone" },
      profilePhoto:   { type: String, enum: ["everyone","contacts","nobody"], default: "everyone" },
      about:          { type: String, enum: ["everyone","contacts","nobody"], default: "everyone" },
      status:         { type: String, enum: ["everyone","contacts","nobody"], default: "everyone" },
    },

    // Two-step verification
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret:  { type: String },

    // Google OAuth
    googleId: { type: String, sparse: true },

    // Blocked users
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Devices
    devices: [{ deviceId: String, name: String, addedAt: Date, lastActive: Date }],

    // OTP
    otp:          { type: String },
    otpExpires:   { type: Date },
    otpPurpose:   { type: String, enum: ["register","login","reset","change"] },

    // Password reset
    resetToken:        { type: String },
    resetTokenExpires: { type: Date },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ username: 1 });
userSchema.index({ firstName: "text", lastName: "text", username: "text" });

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Safe public profile
userSchema.methods.toPublicJSON = function () {
  return {
    _id:        this._id,
    firstName:  this.firstName,
    lastName:   this.lastName,
    username:   this.username,
    avatar:     this.avatar,
    bio:        this.bio,
    isOnline:   this.isOnline,
    lastSeen:   this.lastSeen,
    isVerified: this.isVerified,
    name: `${this.firstName} ${this.lastName}`,
  };
};

export default mongoose.model("User", userSchema);
