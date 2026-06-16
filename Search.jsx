import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, X, Clock, ArrowRight, Users, MessageSquare, Hash } from "lucide-react";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import Avatar from "../shared/Avatar";
import BottomNav from "../shared/BottomNav";
import api from "../../utils/api";

const HISTORY_KEY = "nexachat_search_history";
const MAX_HISTORY = 10;

export default function Search() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [query, setQuery]     = useState("");
  const [focused, setFocused] = useState(false);
  const [tab, setTab]         = useState("users"); // users | messages | groups
  const [results, setResults] = useState({ users: [], messages: [], groups: [] });
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
  });
  const inputRef  = useRef(null);
  const debounce  = useRef(null);

  const addToHistory = (term) => {
    const next = [term, ...history.filter((h) => h !== term)].slice(0, MAX_HISTORY);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const removeHistory = (term) => {
    const next = history.filter((h) => h !== term);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  useEffect(() => {
    if (!query.trim()) { setResults({ users: [], messages: [], groups: [] }); return; }
    clearTimeout(debounce.current);
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query)}&types=users,messages,groups`);
        setResults(data.results || { users: [], messages: [], groups: [] });
        addToHistory(query.trim());
      } finally { setLoading(false); }
    }, 400);
  }, [query]);

  const openChat = async (userId) => {
    const { data } = await api.post("/conversations", { participantId: userId });
    useChatStore.getState().setActiveConversation(data.conversation);
    navigate(`/chat/${data.conversation._id}`);
  };

  return (
    <div className="app-shell">
      {/* Search bar header */}
      <header className="page-header">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl"
          style={{ background: "var(--bg-secondary)" }}>
          <SearchIcon size={18} style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)" }}
            placeholder="Search users, messages, groups…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={16} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
        {focused && (
          <button className="text-sm font-medium ml-2" style={{ color: "var(--brand)", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
            onClick={() => { setFocused(false); inputRef.current?.blur(); }}>
            Cancel
          </button>
        )}
      </header>

      <div className="page-content">
        {/* History (shown when focused and no query) */}
        {focused && !query && history.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Recent Searches</span>
              <button onClick={clearHistory} className="text-xs" style={{ color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>Clear all</button>
            </div>
            {history.map((h) => (
              <div key={h} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary"
                onClick={() => setQuery(h)}>
                <Clock size={16} style={{ color: "var(--text-muted)" }} />
                <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{h}</span>
                <button onClick={(e) => { e.stopPropagation(); removeHistory(h); }}>
                  <X size={14} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {query.trim() && (
          <>
            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
              {[
                { key: "users", label: "People", Icon: Users },
                { key: "messages", label: "Messages", Icon: MessageSquare },
                { key: "groups", label: "Groups", Icon: Hash },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-brand" : "border-transparent"}`}
                  style={{ color: tab === key ? "var(--brand)" : "var(--text-muted)", borderColor: tab === key ? "var(--brand)" : "transparent", background: "none" }}
                  onClick={() => setTab(key)}
                >
                  <Icon size={15} /> {label} {results[key]?.length > 0 && <span className="badge" style={{ fontSize: 9 }}>{results[key].length}</span>}
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-5 h-5 rounded-full border-2" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
              </div>
            )}

            {!loading && tab === "users" && results.users?.map((u) => (
              <div key={u._id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary"
                onClick={() => openChat(u._id)}>
                <Avatar src={u.avatar} name={u.name || u.username} size="md" showOnline isOnline={useChatStore.getState().onlineUsers.has(u._id)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{u.firstName} {u.lastName}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>@{u.username}</p>
                </div>
                <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
              </div>
            ))}

            {!loading && tab === "messages" && results.messages?.map((m) => (
              <div key={m._id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary"
                onClick={() => navigate(`/chat/${m.conversationId}`)}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--bg-secondary)" }}>
                  <MessageSquare size={18} style={{ color: "var(--text-muted)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{m.senderName}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{m.content}</p>
                </div>
              </div>
            ))}

            {!loading && tab === "groups" && results.groups?.map((g) => (
              <div key={g._id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary"
                onClick={() => navigate(`/chat/${g.conversationId}`)}>
                <Avatar src={g.avatar} name={g.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{g.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{g.memberCount} members</p>
                </div>
              </div>
            ))}

            {!loading && results[tab]?.length === 0 && (
              <div className="flex flex-col items-center py-16">
                <SearchIcon size={40} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No {tab} found for "{query}"</p>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!query && !focused && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <SearchIcon size={48} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Search NexaChat</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Find people, messages, and groups</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
