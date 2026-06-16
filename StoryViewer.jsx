import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Heart, Send, Volume2, VolumeX, MoreVertical } from "lucide-react";
import Avatar from "../shared/Avatar";
import { formatTimeAgo } from "../../utils/helpers";
import api from "../../utils/api";
import toast from "react-hot-toast";

export default function StoryViewer() {
  const navigate = useNavigate();
  const { storyId } = useParams();
  const [stories, setStories]       = useState([]);
  const [storyIdx, setStoryIdx]     = useState(0);
  const [paused, setPaused]         = useState(false);
  const [muted, setMuted]           = useState(false);
  const [reply, setReply]           = useState("");
  const [viewers, setViewers]       = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const progressKey = useRef(0);
  const DURATION = 5000;

  useEffect(() => {
    api.get(`/stories/${storyId}`)
      .then(({ data }) => { setStories(data.userStories); setStoryIdx(0); })
      .catch(() => navigate(-1));
  }, [storyId]);

  const current = stories[storyIdx];

  const next = useCallback(() => {
    if (storyIdx < stories.length - 1) {
      progressKey.current++;
      setStoryIdx((i) => i + 1);
    } else {
      navigate(-1);
    }
  }, [storyIdx, stories.length]);

  const prev = () => {
    if (storyIdx > 0) {
      progressKey.current++;
      setStoryIdx((i) => i - 1);
    }
  };

  // Auto advance
  useEffect(() => {
    if (!current || paused) return;
    const t = setTimeout(next, DURATION);
    return () => clearTimeout(t);
  }, [current, paused, next]);

  // Mark as viewed
  useEffect(() => {
    if (current) api.post(`/stories/${current._id}/view`).catch(() => {});
  }, [current?._id]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    await api.post(`/stories/${current._id}/reply`, { message: reply });
    setReply("");
    toast.success("Reply sent!");
  };

  const sendReaction = async (emoji) => {
    await api.post(`/stories/${current._id}/react`, { emoji });
    toast.success("Reaction sent!");
  };

  if (!current) return <div className="page-content-no-nav flex items-center justify-center">
    <div className="animate-pulse text-muted">Loading…</div>
  </div>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000", maxWidth: 480, left: "50%", transform: "translateX(-50%)" }}>
      {/* Progress bars */}
      <div className="flex gap-1 absolute top-3 left-3 right-3 z-10">
        {stories.map((_, i) => (
          <div key={i} className="story-progress-track">
            {i < storyIdx && <div className="story-progress-fill" style={{ "--duration": "0s", width: "100%" }} />}
            {i === storyIdx && !paused && <div key={progressKey.current} className="story-progress-fill" style={{ "--duration": `${DURATION}ms` }} />}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-3 right-3 z-10 flex items-center gap-3">
        <Avatar src={current.user?.avatar} name={current.user?.name} size="sm" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{current.user?.firstName} {current.user?.lastName}</p>
          <p className="text-xs text-white/60">{formatTimeAgo(current.createdAt)}</p>
        </div>
        <button onClick={() => setMuted(m => !m)} className="text-white p-2">
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button onClick={() => navigate(-1)} className="text-white p-2">
          <X size={20} />
        </button>
      </div>

      {/* Story content */}
      <div
        className="flex-1 relative"
        onTouchStart={(e) => { setPaused(true); }}
        onTouchEnd={(e) => { setPaused(false); }}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
      >
        {current.mediaType === "image" || (!current.mediaType && current.mediaUrl) ? (
          <img src={current.mediaUrl} className="w-full h-full object-cover" alt="story" />
        ) : current.mediaType === "video" ? (
          <video src={current.mediaUrl} className="w-full h-full object-cover" autoPlay muted={muted} loop={false} />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8" style={{ background: current.bgColor || "var(--brand)" }}>
            <p className="text-white text-2xl font-bold text-center leading-relaxed">{current.content}</p>
          </div>
        )}

        {/* Text overlay */}
        {current.caption && (
          <div className="absolute bottom-24 left-4 right-4">
            <p className="text-white text-base font-medium text-center drop-shadow-lg">{current.caption}</p>
          </div>
        )}

        {/* Tap areas */}
        <button className="absolute left-0 top-0 w-1/3 h-full" onClick={prev} style={{ background: "transparent" }} />
        <button className="absolute right-0 top-0 w-1/3 h-full" onClick={next} style={{ background: "transparent" }} />
      </div>

      {/* Reactions row */}
      <div className="absolute bottom-20 left-4 flex gap-3">
        {["❤️", "😂", "😮", "😢", "👏"].map(emoji => (
          <button key={emoji} onClick={() => sendReaction(emoji)} className="text-2xl hover:scale-125 transition-transform">
            {emoji}
          </button>
        ))}
      </div>

      {/* Reply bar */}
      <div className="flex items-center gap-2 px-4 pb-6 pt-2" style={{ background: "transparent" }}>
        <input
          className="flex-1 bg-white/10 text-white placeholder-white/50 rounded-full px-4 py-2.5 text-sm outline-none border border-white/20"
          placeholder={`Reply to ${current.user?.firstName}…`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendReply()}
        />
        <button onClick={sendReply} className="text-white p-2">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
