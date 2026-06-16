import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall, Video, RotateCcw } from "lucide-react";
import { useCallStore } from "../../store/callStore";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useAuthStore } from "../../store/authStore";
import Avatar from "../shared/Avatar";
import BottomNav from "../shared/BottomNav";
import { formatTimeAgo, formatCallDuration } from "../../utils/helpers";
import api from "../../utils/api";

export default function CallHistory() {
  const navigate = useNavigate();
  const { user }  = useAuthStore();
  const { callHistory, setCallHistory } = useCallStore();
  const { initiateCall } = useWebRTC();
  const [filter, setFilter] = useState("all"); // all | missed

  useEffect(() => {
    api.get("/calls/history")
      .then(({ data }) => setCallHistory(data.calls || []))
      .catch(() => {});
  }, []);

  const filtered = filter === "missed"
    ? callHistory.filter((c) => c.status === "missed")
    : callHistory;

  const redial = (call) => {
    const peer = call.participants.find((p) => p._id !== user?._id);
    initiateCall({ toUserId: peer._id, toUser: peer, isVideo: call.type === "video", convId: call.conversationId });
    navigate("/call");
  };

  const CallIcon = ({ type, direction, status }) => {
    if (status === "missed") return <PhoneMissed size={18} color="var(--danger)" />;
    if (direction === "incoming") return <PhoneIncoming size={18} color="var(--online)" />;
    return <PhoneOutgoing size={18} color="var(--brand)" />;
  };

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1 className="text-xl font-bold flex-1" style={{ color: "var(--text-primary)" }}>Calls</h1>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
          {["all", "missed"].map((f) => (
            <button
              key={f}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                background: filter === f ? "var(--bg-primary)" : "transparent",
                color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: filter === f ? "var(--shadow-sm)" : "none",
                border: "none", cursor: "pointer",
              }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="page-content">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <PhoneCall size={48} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              {filter === "missed" ? "No missed calls" : "No call history"}
            </h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Your call history will appear here
            </p>
          </div>
        ) : (
          filtered.map((call) => {
            const peer = call.participants?.find((p) => p._id !== user?._id);
            const isMissed = call.status === "missed";
            const isIncoming = call.direction === "incoming";
            const isGroup = call.isGroup;

            return (
              <div
                key={call._id}
                className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer transition-colors"
                style={{ borderColor: "var(--border)" }}
                onClick={() => navigate(`/chat/${call.conversationId}`)}
              >
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={isGroup ? call.groupAvatar : peer?.avatar}
                    name={isGroup ? call.groupName : peer?.name || peer?.username}
                    size="md"
                  />
                  {/* Call type badge */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)" }}
                  >
                    {call.type === "video"
                      ? <Video size={10} style={{ color: "var(--text-muted)" }} />
                      : <PhoneCall size={10} style={{ color: "var(--text-muted)" }} />
                    }
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="font-semibold text-sm truncate"
                      style={{ color: isMissed ? "var(--danger)" : "var(--text-primary)" }}
                    >
                      {isGroup ? call.groupName : peer?.firstName ? `${peer.firstName} ${peer.lastName}` : peer?.username || "Unknown"}
                    </p>
                    {isGroup && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--brand-light)", color: "var(--brand)" }}>
                        Group
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CallIcon type={call.type} direction={call.direction} status={call.status} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {isIncoming ? "Incoming" : "Outgoing"} {call.type === "video" ? "video" : "voice"} call
                    </span>
                    {call.duration > 0 && (
                      <>
                        <span style={{ color: "var(--text-muted)" }}>·</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {formatCallDuration(call.duration)}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {formatTimeAgo(call.createdAt)}
                  </p>
                </div>

                {/* Redial button */}
                <button
                  className="btn-icon flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); redial(call); }}
                  title="Call back"
                >
                  {call.type === "video"
                    ? <Video size={20} style={{ color: "var(--brand)" }} />
                    : <RotateCcw size={18} style={{ color: "var(--brand)" }} />
                  }
                </button>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
