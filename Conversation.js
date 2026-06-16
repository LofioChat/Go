import mongoose from "mongoose";

// ─── Message ────────────────────────────────────────
const reactionSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  emoji: { type: String, required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["text","image","video","audio","file","location","contact","system"],
      default: "text",
    },
    content:    { type: String, default: "" },
    mediaUrl:   { type: String },
    mediaSize:  { type: Number },
    mediaMime:  { type: String },
    mediaThumb: { type: String },
    location:   { lat: Number, lng: Number, address: String },
    contact:    { name: String, phone: String, avatar: String },
    replyTo:    { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    status: {
      type: String,
      enum: ["sending","sent","delivered","read","failed"],
      default: "sent",
    },
    readBy:    [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, readAt: Date }],
    reactions: [reactionSchema],
    edited:    { type: Boolean, default: false },
    editedAt:  { type: Date },
    deleted:   { type: Boolean, default: false },
    deletedAt: { type: Date },
    pinned:    { type: Boolean, default: false },
    forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ content: "text" });

// ─── Conversation ────────────────────────────────────
const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    isGroup:      { type: Boolean, default: false },
    name:         { type: String, trim: true },       // group name
    avatar:       { type: String },                   // group avatar
    description:  { type: String, default: "" },      // group description
    admins:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    inviteLink:   { type: String, unique: true, sparse: true },
    lastMessage:  { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    pinnedMessage:{ type: mongoose.Schema.Types.ObjectId, ref: "Message" },

    // Per-participant metadata
    meta: [{
      user:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      unreadCount: { type: Number, default: 0 },
      pinned:      { type: Boolean, default: false },
      archived:    { type: Boolean, default: false },
      muted:       { type: Boolean, default: false },
      mutedUntil:  { type: Date },
      nickname:    { type: String },
      theme:       { type: String },
      lastRead:    { type: Date },
    }],
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// Helper to get meta for a user
conversationSchema.methods.getMetaFor = function (userId) {
  return this.meta.find((m) => m.user.toString() === userId.toString()) || {};
};

export const Message      = mongoose.model("Message", messageSchema);
export const Conversation = mongoose.model("Conversation", conversationSchema);
