import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, Pin, Archive, Search as SearchIcon } from "lucide-react";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import Avatar from "../shared/Avatar";
import BottomNav from "../shared/BottomNav";
import StoryBar from "../story/StoryBar";
import { formatConversationTime, truncate } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function Home() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const { conversations, fetchConversations, pinConversation, archiveConversation, isLoading, onlineUsers } = useChatStore();

  const [pullY, setPullY]     = useState(0);
  const [pulling, setPulling] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { conv, x, y }
  const listRef = useRef(null);
  const startY  = useRef(0);

  useEffect(() => { fetchConversations(); }, []);

  const handleTouchStart = (e) => {
    if (listRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  };
  const handleTouchMove = (e) => {
    if (!pulling) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && delta < 80) setPullY(delta);
  };
  const handleTouchEnd = () => {
    if (pullY > 50) fetchConversations();
    setPullY(0);
    setPulling(false);
  };

  const openChat = (conv) => {
    useChatStore.getState().setActiveConversation(conv);
    navigate(`/chat/${conv._id}`);
  };

  const visibleConvs = conversations.filter((c) => !c.archived);
  const pinned   = visibleConvs.filter((c) => c.pinned);
  const unpinned = visibleConvs.filter((c) => !c.pinned);

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="page-header">
        <h1 className="text-xl font-bold flex-1" style={{ color: "var(--text-primary)" }}>NexaChat</h1>
        <button className="btn-icon" onClick={() => navigate("/search")}>
          <SearchIcon size={20} />
        </button>
        <button className="btn-icon" onClick={() => toast("Options")}>
          <MoreVertical size={20} />
        </button>
      </header>

      <div
        ref={listRef}
        className="page-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to refresh indicator */}
        {pullY > 10 && (
          <div className="ptr-indicator" style={{ height: pullY, overflow: "hidden" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {pullY > 50 ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        )}

        {/* Stories */}
        <StoryBar />

        {/* Pinned chats */}
        {pinned.length > 0 && (
          <section>
            <div className="flex items-center gap-2 px-4 py-2">
              <Pin size={12} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Pinned
              </span>
            </div>
            {pinned.map((conv) => (
              <ChatRow
                key={conv._id}
                conv={conv}
                currentUserId={user?._id}
                onlineUsers={onlineUsers}
                onOpen={() => openChat(conv)}
                onContextMenu={(pos) => setContextMenu({ conv, ...pos })}
              />
            ))}
          </section>
        )}

        {/* All chats */}
        <section>
          {unpinned.length === 0 && pinned.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                No conversations yet
              </h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Start a new chat by tapping the button below
              </p>
            </div>
          )}
          {unpinned.map((conv) => (
            <ChatRow
              key={conv._id}
              conv={conv}
              currentUserId={user?._id}
              onlineUsers={onlineUsers}
              onOpen={() => openChat(conv)}
              onContextMenu={(pos) => setContextMenu({ conv, ...pos })}
            />
          ))}
        </section>

        {/* Archived link */}
        {conversations.some((c) => c.archived) && (
          <button
            className="w-full flex items-center gap-3 px-4 py-4 border-t"
            style={{ borderColor: "var(--border)", color: "var(--brand)", background: "none" }}
            onClick={() => navigate("/archived")}
          >
            <Archive size={18} />
            <span className="text-sm font-medium">
              Archived ({conversations.filter((c) => c.archived).length})
            </span>
          </button>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          conv={contextMenu.conv}
          x={contextMenu.x}
          y={contextMenu.y}
          onPin={() => { pinConversation(contextMenu.conv._id); setContextMenu(null); }}
          onArchive={() => { archiveConversation(contextMenu.conv._id); setContextMenu(null); }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* FAB */}
      <button className="fab" onClick={() => navigate("/new-chat")}>
        <Plus size={26} />
      </button>

      <BottomNav />
    </div>
  );
}

function ChatRow({ conv, currentUserId, onlineUsers, onOpen, onContextMenu }) {
  const other = conv.participants?.find((p) => p._id !== currentUserId);
  const name  = conv.isGroup ? conv.name : other?.name || other?.username || "Unknown";
  const avatar = conv.isGroup ? conv.avatar : other?.avatar;
  const isOnline = !conv.isGroup && onlineUsers.has(other?._id);
  const lastMsg = conv.lastMessage;

  const lastText = lastMsg?.deleted
    ? "Message deleted"
    : lastMsg?.type === "image"   ? "📷 Image"
    : lastMsg?.type === "video"   ? "🎬 Video"
    : lastMsg?.type === "audio"   ? "🎵 Voice message"
    : lastMsg?.type === "file"    ? "📎 File"
    : lastMsg?.type === "location"? "📍 Location"
    : lastMsg?.content            ? truncate(lastMsg.content, 48)
    : "Say hello!";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-secondary active:bg-tertiary"
      style={{ "--hover": "var(--bg-secondary)" }}
      onClick={onOpen}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu({ x: e.clientX, y: e.clientY }); }}
      onTouchStart={(e) => {
        const t = setTimeout(() => onContextMenu({ x: e.touches[0].clientX, y: e.touches[0].clientY }), 500);
        e.currentTarget._longPress = t;
      }}
      onTouchEnd={(e) => clearTimeout(e.currentTarget._longPress)}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar src={avatar} name={name} size="md" />
        {isOnline && <span className="online-badge" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {conv.pinned && <Pin size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
            <span className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
              {name}
            </span>
          </div>
          <span className="text-xs flex-shrink-0" style={{ color: conv.unreadCount ? "var(--brand)" : "var(--text-muted)" }}>
            {lastMsg ? formatConversationTime(lastMsg.createdAt) : ""}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-sm truncate" style={{ color: "var(--text-muted)" }}>
            {lastText}
          </span>
          {conv.unreadCount > 0 && (
            <span className="badge flex-shrink-0">{conv.unreadCount > 99 ? "99+" : conv.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ContextMenu({ conv, onPin, onArchive, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="context-menu fixed z-50" style={{ bottom: 100, left: "50%", transform: "translateX(-50%)", width: 220 }}>
        <div className="context-menu-item" onClick={onPin}>
          <Pin size={16} />
          {conv.pinned ? "Unpin chat" : "Pin chat"}
        </div>
        <div className="context-menu-item" onClick={onArchive}>
          <Archive size={16} />
          {conv.archived ? "Unarchive" : "Archive chat"}
        </div>
      </div>
    </>
  );
}
