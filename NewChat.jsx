import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Users, Plus } from "lucide-react";
import Avatar from "../shared/Avatar";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import api from "../../utils/api";

export default function NewChat() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);
  const { createConversation, onlineUsers } = useChatStore();

  useEffect(() => {
    if (!search.trim()) { setUsers([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(search)}&types=users`);
        setUsers((data.results?.users || []).filter((u) => u._id !== user?._id));
      } finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const startChat = async (targetUser) => {
    const res = await createConversation(targetUser._id);
    if (res.success) {
      useChatStore.getState().setActiveConversation(res.conversation);
      navigate(`/chat/${res.conversation._id}`, { replace: true });
    }
  };

  return (
    <div className="app-shell">
      <header className="page-header">
        <button className="btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <h1 className="text-lg font-bold flex-1 ml-2" style={{ color: "var(--text-primary)" }}>New Chat</h1>
      </header>

      <div className="page-content-no-nav flex flex-col">
        {/* Search */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
            <Search size={16} style={{ color: "var(--text-muted)" }} />
            <input
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Search by name, username or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ color: "var(--text-primary)" }}
              autoFocus
            />
          </div>
        </div>

        {/* Quick actions */}
        {!search && (
          <>
            <button
              className="flex items-center gap-3 px-4 py-4 border-b"
              style={{ background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", width: "100%", textAlign: "left" }}
              onClick={() => navigate("/group/create")}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--brand-light)" }}>
                <Users size={20} style={{ color: "var(--brand)" }} />
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>New Group</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Create a group conversation</p>
              </div>
            </button>
          </>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-6">
              <div className="animate-spin w-5 h-5 rounded-full border-2" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
            </div>
          )}
          {!loading && users.map((u) => (
            <button
              key={u._id}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
              onClick={() => startChat(u)}
            >
              <Avatar src={u.avatar} name={u.firstName ? `${u.firstName} ${u.lastName}` : u.username} size="md" showOnline isOnline={onlineUsers.has(u._id)} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {u.firstName ? `${u.firstName} ${u.lastName}` : u.username}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>@{u.username}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--brand-light)" }}>
                <Plus size={16} style={{ color: "var(--brand)" }} />
              </div>
            </button>
          ))}
          {search && !loading && users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                No users found for "<strong>{search}</strong>"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
