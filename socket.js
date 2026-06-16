import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io("/", {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
  });

  socket.on("connect", () => console.log("[Socket] Connected:", socket.id));
  socket.on("disconnect", (reason) => console.log("[Socket] Disconnected:", reason));
  socket.on("connect_error", (err) => console.error("[Socket] Error:", err.message));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const emitTyping = (convId, isTyping) => {
  if (socket) socket.emit("typing", { conversationId: convId, isTyping });
};

export const joinConversation = (convId) => {
  if (socket) socket.emit("join_conversation", convId);
};

export const leaveConversation = (convId) => {
  if (socket) socket.emit("leave_conversation", convId);
};

export const emitCallSignal = (payload) => {
  if (socket) socket.emit("call_signal", payload);
};
