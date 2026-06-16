import React from "react";
import { useNavigate } from "react-router-dom";
import { PhoneOff, PhoneCall, Video } from "lucide-react";
import { useCallStore } from "../../store/callStore";
import { useWebRTC } from "../../hooks/useWebRTC";
import { getSocket } from "../../utils/socket";
import Avatar from "../shared/Avatar";

export default function IncomingCallModal() {
  const navigate = useNavigate();
  const { incomingCall, setIncomingCall } = useCallStore();
  const { answerCall } = useWebRTC();

  if (!incomingCall) return null;

  const { fromUser, isVideo, signal, convId } = incomingCall;

  const accept = async () => {
    setIncomingCall(null);
    await answerCall({ fromUserId: fromUser._id, fromUser, signal, isVideo, convId });
    navigate("/call");
  };

  const decline = () => {
    const socket = getSocket();
    if (socket) socket.emit("call:decline", { toUserId: fromUser._id, convId });
    setIncomingCall(null);
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex items-end justify-center pb-4 pt-4 px-4"
      style={{ maxWidth: 480, left: "50%", transform: "translateX(-50%)" }}
    >
      <div
        className="w-full rounded-3xl p-5 shadow-2xl"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Caller info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Avatar src={fromUser?.avatar} name={fromUser?.name || fromUser?.username} size="xl" />
            <div
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: isVideo ? "#2563eb" : "#16a34a" }}
            >
              {isVideo ? <Video size={14} color="#fff" /> : <PhoneCall size={14} color="#fff" />}
            </div>
          </div>
          <div>
            <p className="text-xs text-white/60 mb-0.5">
              Incoming {isVideo ? "video" : "voice"} call
            </p>
            <h3 className="text-lg font-bold text-white">
              {fromUser?.firstName
                ? `${fromUser.firstName} ${fromUser.lastName}`
                : fromUser?.username || "Unknown"}
            </h3>
            <p className="text-sm text-white/60">@{fromUser?.username}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-10">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              className="call-action-btn"
              style={{ background: "var(--danger)", color: "#fff", width: 64, height: 64 }}
              onClick={decline}
            >
              <PhoneOff size={28} />
            </button>
            <span className="text-xs text-white/60">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              className="call-action-btn"
              style={{ background: "#16a34a", color: "#fff", width: 64, height: 64 }}
              onClick={accept}
            >
              {isVideo ? <Video size={28} /> : <PhoneCall size={28} />}
            </button>
            <span className="text-xs text-white/60">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
