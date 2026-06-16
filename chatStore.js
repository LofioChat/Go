import { create } from "zustand";
import api from "../utils/api";

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),
  isLoading: false,
  searchResults: [],
  pinnedChats: [],
  archivedChats: [],

  setOnlineUsers: (users) => set({ onlineUsers: new Set(users) }),
  addOnlineUser:  (id) => set((s) => ({ onlineUsers: new Set([...s.onlineUsers, id]) })),
  removeOnlineUser: (id) => set((s) => { const u = new Set(s.onlineUsers); u.delete(id); return { onlineUsers: u }; }),

  setTyping: (convId, userId, isTyping) =>
    set((s) => ({
      typingUsers: {
        ...s.typingUsers,
        [convId]: isTyping
          ? [...(s.typingUsers[convId] || []).filter((u) => u !== userId), userId]
          : (s.typingUsers[convId] || []).filter((u) => u !== userId),
      },
    })),

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get("/conversations");
      set({ conversations: data.conversations, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  setActiveConversation: (conv) => set({ activeConversation: conv }),

  fetchMessages: async (convId, page = 1) => {
    try {
      const { data } = await api.get(`/conversations/${convId}/messages?page=${page}&limit=40`);
      set((s) => ({
        messages: {
          ...s.messages,
          [convId]: page === 1 ? data.messages : [...data.messages, ...(s.messages[convId] || [])],
        },
      }));
      return data;
    } catch { return null; }
  },

  addMessage: (convId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [convId]: [...(s.messages[convId] || []), message],
      },
      conversations: s.conversations.map((c) =>
        c._id === convId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    })),

  updateMessage: (convId, msgId, updates) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [convId]: (s.messages[convId] || []).map((m) =>
          m._id === msgId ? { ...m, ...updates } : m
        ),
      },
    })),

  deleteMessage: (convId, msgId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [convId]: (s.messages[convId] || []).map((m) =>
          m._id === msgId ? { ...m, deleted: true, content: "This message was deleted" } : m
        ),
      },
    })),

  markAsRead: async (convId) => {
    try {
      await api.patch(`/conversations/${convId}/read`);
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c._id === convId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch { /* silent */ }
  },

  sendMessage: async (convId, payload) => {
    try {
      const { data } = await api.post(`/conversations/${convId}/messages`, payload);
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  },

  createConversation: async (userId) => {
    try {
      const { data } = await api.post("/conversations", { participantId: userId });
      set((s) => ({
        conversations: [data.conversation, ...s.conversations.filter((c) => c._id !== data.conversation._id)],
      }));
      return { success: true, conversation: data.conversation };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  },

  pinConversation: async (convId) => {
    try {
      await api.patch(`/conversations/${convId}/pin`);
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c._id === convId ? { ...c, pinned: !c.pinned } : c
        ),
      }));
    } catch { /* silent */ }
  },

  archiveConversation: async (convId) => {
    try {
      await api.patch(`/conversations/${convId}/archive`);
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c._id === convId ? { ...c, archived: !c.archived } : c
        ),
      }));
    } catch { /* silent */ }
  },

  searchConversations: async (query) => {
    if (!query.trim()) { set({ searchResults: [] }); return; }
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
      set({ searchResults: data.results });
    } catch { /* silent */ }
  },

  addReaction: async (convId, msgId, emoji) => {
    try {
      const { data } = await api.post(`/conversations/${convId}/messages/${msgId}/react`, { emoji });
      get().updateMessage(convId, msgId, { reactions: data.reactions });
    } catch { /* silent */ }
  },
}));
