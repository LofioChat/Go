import { useEffect, useRef } from "react";
import { connectSocket, disconnectSocket } from "../utils/socket";
import { useChatStore } from "../store/chatStore";
import { useCallStore } from "../store/callStore";
import { useAuthStore } from "../store/authStore";

export const useSocket = () => {
  const { token } = useAuthStore();
  const {
    addMessage, updateMessage, deleteMessage,
    setTyping, addOnlineUser, removeOnlineUser,
    setOnlineUsers,
  } = useChatStore();
  const { setIncomingCall } = useCallStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    // Chat events
    socket.on("message:new", ({ conversationId, message }) => {
      addMessage(conversationId, message);
    });

    socket.on("message:updated", ({ conversationId, messageId, updates }) => {
      updateMessage(conversationId, messageId, updates);
    });

    socket.on("message:deleted", ({ conversationId, messageId }) => {
      deleteMessage(conversationId, messageId);
    });

    socket.on("message:status", ({ conversationId, messageId, status }) => {
      updateMessage(conversationId, messageId, { status });
    });

    // Typing
    socket.on("typing:update", ({ conversationId, userId, isTyping }) => {
      setTyping(conversationId, userId, isTyping);
    });

    // Presence
    socket.on("presence:online", ({ userId }) => addOnlineUser(userId));
    socket.on("presence:offline", ({ userId }) => removeOnlineUser(userId));
    socket.on("presence:list", ({ users }) => setOnlineUsers(users));

    // Calls
    socket.on("call:incoming", (callData) => {
      setIncomingCall(callData);
    });

    socket.on("call:ended", () => {
      useCallStore.getState().endCall();
    });

    socket.on("call:signal", (data) => {
      window.dispatchEvent(new CustomEvent("webrtc:signal", { detail: data }));
    });

    return () => {
      socket.off("message:new");
      socket.off("message:updated");
      socket.off("message:deleted");
      socket.off("message:status");
      socket.off("typing:update");
      socket.off("presence:online");
      socket.off("presence:offline");
      socket.off("presence:list");
      socket.off("call:incoming");
      socket.off("call:ended");
      socket.off("call:signal");
    };
  }, [token]);

  return socketRef.current;
};
