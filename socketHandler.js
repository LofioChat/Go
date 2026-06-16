import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { Conversation } from "../models/Conversation.js";
import { Call } from "../models/StoryCall.js";

// Track online users: userId -> Set of socketIds (multi-device support)
const onlineUsers = new Map();

const addOnline = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
};

const removeOnline = (userId, socketId) => {
  const set = onlineUsers.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    onlineUsers.delete(userId);
    return true; // fully offline
  }
  return false;
};

export const initSocket = (io) => {
  // ─── Auth middleware ────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));
      socket.userId = user._id.toString();
      socket.user   = user;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] ${socket.user.username} connected (${socket.id})`);

    // Join personal room (for direct emits)
    socket.join(`user:${userId}`);
    addOnline(userId, socket.id);

    // Update DB presence
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

    // Notify all relevant users this user is online
    socket.broadcast.emit("presence:online", { userId });

    // Send current online list to this user
    socket.emit("presence:list", { users: Array.from(onlineUsers.keys()) });

    // ─── Conversation rooms ─────────────────────────
    socket.on("join_conversation", (convId) => {
      socket.join(`conv:${convId}`);
    });

    socket.on("leave_conversation", (convId) => {
      socket.leave(`conv:${convId}`);
    });

    // ─── Typing indicator ───────────────────────────
    socket.on("typing", async ({ conversationId, isTyping }) => {
      try {
        const conv = await Conversation.findById(conversationId).select("participants");
        if (!conv) return;
        conv.participants.forEach((pId) => {
          const pStr = pId.toString();
          if (pStr !== userId) {
            io.to(`user:${pStr}`).emit("typing:update", { conversationId, userId, isTyping });
          }
        });
      } catch (err) {
        console.error("[Socket] typing error:", err.message);
      }
    });

    // ─── Message delivery/read receipts (real-time) ─
    socket.on("message:delivered", async ({ conversationId, messageId }) => {
      io.to(`conv:${conversationId}`).emit("message:status", { conversationId, messageId, status: "delivered" });
    });

    socket.on("message:read", async ({ conversationId, messageId }) => {
      io.to(`conv:${conversationId}`).emit("message:status", { conversationId, messageId, status: "read" });
    });

    // ═══════════════════════════════════════════════
    // WebRTC Call Signaling
    // ═══════════════════════════════════════════════

    // Initiate call — offer signal
    socket.on("call_signal", async ({ type, toUserId, signal, isVideo, convId }) => {
      try {
        if (type === "offer") {
          // Create call log entry
          const call = await Call.create({
            conversation: convId,
            initiator: userId,
            participants: [userId, toUserId],
            type: isVideo ? "video" : "audio",
            status: "ringing",
            startedAt: new Date(),
          });

          io.to(`user:${toUserId}`).emit("call:incoming", {
            callId: call._id,
            fromUserId: userId,
            fromUser: socket.user.toPublicJSON(),
            signal,
            isVideo,
            convId,
          });
        } else if (type === "answer") {
          io.to(`user:${toUserId}`).emit("call:signal", signal);
          // Update call status to ongoing
          await Call.findOneAndUpdate(
            { participants: { $all: [userId, toUserId] }, status: "ringing" },
            { status: "ongoing" },
            { sort: { createdAt: -1 } }
          );
        }
      } catch (err) {
        console.error("[Socket] call_signal error:", err.message);
      }
    });

    // ICE candidates / renegotiation signals pass-through
    socket.on("call:ice", ({ toUserId, candidate }) => {
      io.to(`user:${toUserId}`).emit("call:signal", candidate);
    });

    // Decline call
    socket.on("call:decline", async ({ toUserId, convId }) => {
      io.to(`user:${toUserId}`).emit("call:ended", { reason: "declined" });
      await Call.findOneAndUpdate(
        { participants: { $all: [userId, toUserId] }, status: { $in: ["ringing", "initiated"] } },
        { status: "declined", endedAt: new Date() },
        { sort: { createdAt: -1 } }
      );
    });

    // End call
    socket.on("call:end", async ({ toUserId, convId, duration }) => {
      io.to(`user:${toUserId}`).emit("call:ended", { reason: "ended" });
      try {
        const call = await Call.findOne(
          { participants: { $all: [userId, toUserId] }, status: { $in: ["ongoing", "ringing", "initiated"] } },
          {},
          { sort: { createdAt: -1 } }
        );
        if (call) {
          call.status   = call.status === "ringing" ? "missed" : "ended";
          call.duration  = duration || 0;
          call.endedAt   = new Date();
          await call.save();
        }
      } catch (err) {
        console.error("[Socket] call:end error:", err.message);
      }
    });

    // Missed call (timeout on caller side / no answer)
    socket.on("call:missed", async ({ toUserId }) => {
      try {
        await Call.findOneAndUpdate(
          { participants: { $all: [userId, toUserId] }, status: { $in: ["ringing", "initiated"] } },
          { status: "missed", endedAt: new Date() },
          { sort: { createdAt: -1 } }
        );
        io.to(`user:${toUserId}`).emit("call:ended", { reason: "missed" });
      } catch (err) {
        console.error("[Socket] call:missed error:", err.message);
      }
    });

    // ─── Group call signaling (mesh, simplified) ────
    socket.on("group_call:join", ({ convId }) => {
      socket.join(`group_call:${convId}`);
      socket.to(`group_call:${convId}`).emit("group_call:peer_joined", {
        userId, user: socket.user.toPublicJSON(),
      });
    });

    socket.on("group_call:signal", ({ convId, toUserId, signal }) => {
      io.to(`user:${toUserId}`).emit("group_call:signal", { convId, fromUserId: userId, signal });
    });

    socket.on("group_call:leave", ({ convId }) => {
      socket.leave(`group_call:${convId}`);
      socket.to(`group_call:${convId}`).emit("group_call:peer_left", { userId });
    });

    // ═══════════════════════════════════════════════
    // Disconnect
    // ═══════════════════════════════════════════════
    socket.on("disconnect", async () => {
      const fullyOffline = removeOnline(userId, socket.id);
      if (fullyOffline) {
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit("presence:offline", { userId });
      }
      console.log(`[Socket] ${socket.user.username} disconnected (${socket.id})`);
    });
  });
};

export const getOnlineUsers = () => Array.from(onlineUsers.keys());
export const isUserOnline   = (userId) => onlineUsers.has(userId);
