import mongoose from "mongoose";

// ─── Story ────────────────────────────────────────
const storySchema = new mongoose.Schema(
  {
    user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type:      { type: String, enum: ["text","image","video"], default: "text" },
    content:   { type: String },           // text content
    mediaUrl:  { type: String },           // image/video URL
    mediaType: { type: String },
    bgColor:   { type: String, default: "#2563eb" },
    caption:   { type: String },
    privacy:   { type: String, enum: ["everyone","contacts","nobody"], default: "everyone" },
    viewers:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reactions: [{
      user:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      emoji: String,
      at:    { type: Date, default: Date.now },
    }],
    replies: [{
      user:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      message:   String,
      at:        { type: Date, default: Date.now },
    }],
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), index: true },
  },
  { timestamps: true }
);

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── Call ─────────────────────────────────────────
const callSchema = new mongoose.Schema(
  {
    conversation:  { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    initiator:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    participants:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    type:          { type: String, enum: ["audio","video"], required: true },
    direction:     { type: String, enum: ["incoming","outgoing"] },
    status:        { type: String, enum: ["initiated","ringing","ongoing","ended","missed","declined"], default: "initiated" },
    duration:      { type: Number, default: 0 }, // seconds
    startedAt:     { type: Date },
    endedAt:       { type: Date },
    isGroup:       { type: Boolean, default: false },
    groupName:     { type: String },
    groupAvatar:   { type: String },
  },
  { timestamps: true }
);

callSchema.index({ participants: 1, createdAt: -1 });

export const Story = mongoose.model("Story", storySchema);
export const Call  = mongoose.model("Call",  callSchema);
