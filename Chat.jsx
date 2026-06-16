import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Phone, Video, MoreVertical, Paperclip,
  Mic, Send, SmilePlus, X, Reply, Forward, Copy,
  Trash2, Edit3, Pin, Info,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { useCallStore } from "../../store/callStore";
import { useWebRTC } from "../../hooks/useWebRTC";
import Avatar from "../shared/Avatar";
import { formatMessageTime, formatTimeAgo, copyToClipboard } from "../../utils/helpers";
import { emitTyping, joinConversation, leaveConversation } from "../../utils/socket";
import AttachmentMenu from "./AttachmentMenu";
import api from "../../utils/api";
import toast from "react-hot-toast";

export default function Chat() {
  const { convId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    activeConversation, messages, fetchMessages,
    sendMessage, addMessage, markAsRead,
    typingUsers, onlineUsers, addReaction,
    updateMessage, deleteMessage: deleteMsg,
  } = useChatStore();
  const { initiateCall } = useWebRTC();

  const [text, setText]           = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [replyTo, setReplyTo]     = useState(null);
  const [editMsg, setEditMsg]     = useState(null);
  const [selected, setSelected]   = useState(null); // selected message for context
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks   = useRef([]);
  const bottomRef  = useRef(null);
  const textRef    = useRef(null);
  const typingTimer = useRef(null);

  const conv   = activeConversation;
  const other  = conv?.participants?.find((p) => p._id !== user?._id);
  const name   = conv?.isGroup ? conv?.name : other?.name || other?.username || "Unknown";
  const avatar = conv?.isGroup ? conv?.avatar : other?.avatar;
  const isOnline = !conv?.isGroup && onlineUsers.has(other?._id);
  const convMessages = messages[convId] || [];
  const typingList = typingUsers[convId] || [];
  const isTyping = typingList.length > 0;

  // Load messages
  useEffect(() => {
    if (!convId) return;
    joinConversation(convId);
    markAsRead(convId);
    setLoading(true);
    fetchMessages(convId, 1).then((d) => {
      setHasMore(d?.hasMore ?? false);
      setLoading(false);
    });
    return () => leaveConversation(convId);
  }, [convId]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (page === 1) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages.length]);

  const loadMore = async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setLoading(true);
    const d = await fetchMessages(convId, nextPage);
    setPage(nextPage);
    setHasMore(d?.hasMore ?? false);
    setLoading(false);
  };

  const handleTyping = () => {
    emitTyping(convId, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(convId, false), 2000);
  };

  const send = async () => {
    if (!text.trim() && !editMsg) return;
    const payload = editMsg
      ? { messageId: editMsg._id, content: text.trim(), type: "edit" }
      : {
          content: text.trim(),
          type: "text",
          replyTo: replyTo?._id,
        };
    setShowEmoji(false);
    if (editMsg) {
      try {
        const { data } = await api.patch(`/conversations/${convId}/messages/${editMsg._id}`, { content: text.trim() });
        updateMessage(convId, editMsg._id, { content: text.trim(), edited: true });
        setEditMsg(null);
      } catch { toast.error("Could not edit message"); }
    } else {
      const tempId = `temp_${Date.now()}`;
      const tempMsg = {
        _id: tempId, content: text.trim(), type: "text",
        sender: { _id: user._id, name: user.name, avatar: user.avatar },
        createdAt: new Date().toISOString(), status: "sending",
        replyTo: replyTo,
      };
      addMessage(convId, tempMsg);
      setText("");
      setReplyTo(null);
      emitTyping(convId, false);
      const res = await sendMessage(convId, payload);
      if (res.success) {
        updateMessage(convId, tempId, { ...res.message, _id: res.message._id });
      } else {
        updateMessage(convId, tempId, { status: "failed" });
        toast.error("Failed to send");
      }
    }
    setText("");
    textRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current   = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const fd   = new FormData();
        fd.append("file", blob, "voice.webm");
        fd.append("type", "audio");
        try {
          const { data } = await api.post(`/conversations/${convId}/messages`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          addMessage(convId, data.message);
        } catch { toast.error("Failed to send voice message"); }
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.current.start();
      setRecording(true);
    } catch { toast.error("Microphone permission denied"); }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  const callUser = (isVideo) => {
    initiateCall({ toUserId: other._id, toUser: other, isVideo, convId });
    navigate("/call");
  };

  const handleDelete = async (msg) => {
    setSelected(null);
    try {
      await api.delete(`/conversations/${convId}/messages/${msg._id}`);
      deleteMsg(convId, msg._id);
    } catch { toast.error("Could not delete"); }
  };

  const handleReact = (msg, emoji) => {
    setSelected(null);
    addReaction(convId, msg._id, emoji);
  };

  return (
    <div className="app-shell" style={{ position: "relative" }}>
      {/* Header */}
      <header className="page-header gap-0">
        <button className="btn-icon mr-1" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <Avatar src={avatar} name={name} size="sm" showOnline={!conv?.isGroup} isOnline={isOnline} />
        <div className="flex-1 px-3 cursor-pointer" onClick={() => navigate(`/profile/${other?._id}`)}>
          <p className="font-semibold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>{name}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {isTyping
              ? "typing…"
              : isOnline
              ? "online"
              : other?.lastSeen
              ? `last seen ${formatTimeAgo(other.lastSeen)}`
              : ""}
          </p>
        </div>
        <button className="btn-icon" onClick={() => callUser(false)}>
          <Phone size={20} />
        </button>
        <button className="btn-icon" onClick={() => callUser(true)}>
          <Video size={20} />
        </button>
        <button className="btn-icon" onClick={() => toast("Chat options")}>
          <MoreVertical size={20} />
        </button>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1"
        style={{ background: "var(--bg-chat)" }}
        onClick={() => { setShowEmoji(false); setSelected(null); }}
      >
        {/* Load more */}
        {hasMore && (
          <button className="self-center text-xs px-3 py-1.5 rounded-full mb-2"
            style={{ background: "var(--bg-primary)", color: "var(--brand)" }}
            onClick={loadMore} disabled={loading}
          >
            {loading ? "Loading…" : "Load older messages"}
          </button>
        )}

        {convMessages.map((msg, i) => {
          const isMine = msg.sender?._id === user?._id || msg.sender === user?._id;
          const showAvatar = !isMine && (i === 0 || convMessages[i-1]?.sender?._id !== msg.sender?._id);
          return (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isMine={isMine}
              showAvatar={showAvatar && conv?.isGroup}
              onReply={() => { setReplyTo(msg); textRef.current?.focus(); }}
              onEdit={isMine && !msg.deleted ? () => { setEditMsg(msg); setText(msg.content); textRef.current?.focus(); } : null}
              onDelete={isMine && !msg.deleted ? () => handleDelete(msg) : null}
              onReact={(emoji) => handleReact(msg, emoji)}
              onCopy={() => copyToClipboard(msg.content)}
              onForward={() => toast("Forward coming soon")}
              isSelected={selected?._id === msg._id}
              onSelect={() => setSelected(msg)}
            />
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 px-2">
            <div className="bubble-in flex items-center gap-1 py-3 px-4">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
          <Reply size={16} style={{ color: "var(--brand)" }} />
          <div className="flex-1 pl-2 border-l-2" style={{ borderColor: "var(--brand)" }}>
            <p className="text-xs font-medium" style={{ color: "var(--brand)" }}>
              {replyTo.sender?._id === user?._id ? "You" : replyTo.sender?.firstName}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{replyTo.content}</p>
          </div>
          <button className="btn-icon" onClick={() => setReplyTo(null)}><X size={16} /></button>
        </div>
      )}

      {/* Edit banner */}
      {editMsg && (
        <div className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
          <Edit3 size={16} style={{ color: "var(--brand)" }} />
          <p className="flex-1 text-xs" style={{ color: "var(--text-secondary)" }}>Editing message</p>
          <button className="btn-icon" onClick={() => { setEditMsg(null); setText(""); }}><X size={16} /></button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-16 left-0 right-0 z-40" onClick={(e) => e.stopPropagation()}>
          <EmojiPicker
            onEmojiClick={(e) => setText((t) => t + e.emoji)}
            width="100%" height={340}
            theme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
            lazyLoadEmojis
          />
        </div>
      )}

      {/* Attachment menu */}
      {showAttach && (
        <AttachmentMenu
          convId={convId}
          onClose={() => setShowAttach(false)}
          onMessageSent={(msg) => addMessage(convId, msg)}
        />
      )}

      {/* Input bar */}
      <div className="chat-input-bar">
        <button className="btn-icon" onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}>
          <Paperclip size={22} />
        </button>

        <textarea
          ref={textRef}
          className="chat-textarea"
          placeholder="Message…"
          value={text}
          rows={1}
          onChange={(e) => { setText(e.target.value); handleTyping(); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />

        <button className="btn-icon" onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}>
          <SmilePlus size={22} />
        </button>

        {text.trim() || editMsg ? (
          <button
            onClick={send}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--brand)" }}
          >
            <Send size={18} color="#fff" />
          </button>
        ) : (
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: recording ? "var(--danger)" : "var(--brand)" }}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
          >
            <Mic size={18} color="#fff" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────
function MessageBubble({ msg, isMine, showAvatar, onReply, onEdit, onDelete, onReact, onCopy, onForward, isSelected, onSelect }) {
  const [showActions, setShowActions] = useState(false);
  const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "👏"];

  const statusIcon = isMine
    ? msg.status === "read"      ? "✓✓" 
    : msg.status === "delivered" ? "✓✓" 
    : msg.status === "sent"      ? "✓" : "⏰"
    : null;

  const statusColor = msg.status === "read" ? "#60a5fa" : "rgba(255,255,255,0.6)";

  return (
    <div
      className={`flex items-end gap-2 my-0.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}
      onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
    >
      {showAvatar && !isMine && <Avatar name={msg.sender?.name || msg.sender?.username} src={msg.sender?.avatar} size="xs" />}
      {!showAvatar && !isMine && <div className="w-7" />}

      <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[78%] relative`}>
        {/* Reply preview in bubble */}
        {msg.replyTo && (
          <div className={`px-3 py-1.5 mb-1 rounded-xl text-xs border-l-2 ${isMine ? "border-white/50 bg-white/10" : "border-brand bg-brand-light"}`}
            style={{ borderColor: isMine ? "rgba(255,255,255,0.5)" : "var(--brand)", background: isMine ? "rgba(255,255,255,0.1)" : "var(--brand-light)" }}>
            <p className="font-medium" style={{ color: isMine ? "rgba(255,255,255,0.7)" : "var(--brand)" }}>
              {msg.replyTo.sender?.firstName || "Reply"}
            </p>
            <p className="truncate" style={{ color: isMine ? "rgba(255,255,255,0.6)" : "var(--text-muted)", maxWidth: 180 }}>
              {msg.replyTo.content}
            </p>
          </div>
        )}

        {/* Bubble */}
        <div className={isMine ? "bubble-out" : "bubble-in"}>
          {msg.deleted ? (
            <em className="text-sm" style={{ opacity: 0.6 }}>This message was deleted</em>
          ) : msg.type === "image" ? (
            <img src={msg.mediaUrl} alt="img" className="rounded-xl max-w-full" style={{ maxHeight: 260 }} />
          ) : msg.type === "audio" ? (
            <audio controls src={msg.mediaUrl} className="w-48" />
          ) : msg.type === "video" ? (
            <video src={msg.mediaUrl} controls className="rounded-xl" style={{ maxHeight: 200 }} />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          )}

          {/* Reactions display */}
          {msg.reactions?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(
                msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})
              ).map(([emoji, count]) => (
                <span key={emoji} className="text-xs bg-black/10 rounded-full px-1.5 py-0.5">{emoji} {count > 1 ? count : ""}</span>
              ))}
            </div>
          )}

          {/* Time + status */}
          <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
            {msg.edited && <span className="text-xs opacity-50 mr-1">edited</span>}
            <span className="text-xs opacity-60">{formatMessageTime(msg.createdAt)}</span>
            {statusIcon && <span className="text-xs" style={{ color: statusColor }}>{statusIcon}</span>}
          </div>
        </div>

        {/* Actions popup */}
        {showActions && !msg.deleted && (
          <div className={`absolute z-20 mt-1 ${isMine ? "right-0" : "left-0"}`} style={{ bottom: "calc(100% + 4px)" }}
            onClick={(e) => e.stopPropagation()}>
            {/* Reactions */}
            <div className="reaction-picker mb-2">
              {REACTIONS.map(e => (
                <button key={e} className="reaction-btn" onClick={() => { onReact(e); setShowActions(false); }}>{e}</button>
              ))}
            </div>
            {/* Action buttons */}
            <div className="context-menu" style={{ minWidth: 160 }}>
              <div className="context-menu-item" onClick={() => { onReply(); setShowActions(false); }}>
                <Reply size={15} /> Reply
              </div>
              <div className="context-menu-item" onClick={() => { onCopy(); setShowActions(false); toast.success("Copied"); }}>
                <Copy size={15} /> Copy
              </div>
              <div className="context-menu-item" onClick={() => { onForward(); setShowActions(false); }}>
                <Forward size={15} /> Forward
              </div>
              {onEdit && (
                <div className="context-menu-item" onClick={() => { onEdit(); setShowActions(false); }}>
                  <Edit3 size={15} /> Edit
                </div>
              )}
              {onDelete && (
                <div className="context-menu-item danger" onClick={() => { onDelete(); setShowActions(false); }}>
                  <Trash2 size={15} /> Delete
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
