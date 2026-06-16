import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Volume2, VolumeX, RotateCcw, Maximize2,
} from "lucide-react";
import { useCallStore } from "../../store/callStore";
import { useWebRTC } from "../../hooks/useWebRTC";
import { getSocket } from "../../utils/socket";
import Avatar from "../shared/Avatar";

export default function CallScreen() {
  const navigate = useNavigate();
  const {
    activeCall, localStream, remoteStream,
    isMuted, isVideoOff, isSpeakerOn,
    toggleMute, toggleVideo, toggleSpeaker,
    callDuration, formatDuration,
  } = useCallStore();
  const { endCall } = useWebRTC();

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    const socket = getSocket();
    if (socket && activeCall) {
      socket.emit("call:end", {
        toUserId: activeCall.toUser?._id || activeCall.fromUser?._id,
        convId: activeCall.convId,
      });
    }
    endCall();
    navigate(-1);
  };

  const peer = activeCall?.toUser || activeCall?.fromUser;
  const isVideo = activeCall?.isVideo;
  const isConnected = !!remoteStream;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: isVideo && isConnected ? "#000" : "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
        maxWidth: 480, left: "50%", transform: "translateX(-50%)",
      }}
    >
      {/* Remote video (full screen) */}
      {isVideo && remoteStream && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Overlay gradient */}
      {isVideo && (
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%)" }} />
      )}

      {/* Top info */}
      <div className="relative z-10 flex flex-col items-center pt-16 pb-8">
        {!isVideo || !isConnected ? (
          <>
            <Avatar src={peer?.avatar} name={peer?.name || peer?.username} size="2xl" className="mb-4" />
            <h2 className="text-2xl font-bold text-white mb-1">
              {peer?.firstName ? `${peer.firstName} ${peer.lastName}` : peer?.username || "Unknown"}
            </h2>
          </>
        ) : (
          <h2 className="text-lg font-semibold text-white mb-1">
            {peer?.firstName ? `${peer.firstName} ${peer.lastName}` : peer?.username}
          </h2>
        )}

        <p className="text-white/70 text-sm">
          {!isConnected
            ? activeCall?.direction === "outgoing" ? "Calling…" : "Incoming call…"
            : formatDuration(callDuration)
          }
        </p>

        {isVideo && !isConnected && (
          <p className="text-white/50 text-xs mt-1">
            {isVideo ? "Video call" : "Voice call"}
          </p>
        )}
      </div>

      {/* Local video PiP */}
      {isVideo && localStream && (
        <div
          className="absolute top-4 right-4 z-20 rounded-2xl overflow-hidden border-2 border-white/30"
          style={{ width: 100, height: 140 }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        </div>
      )}

      {/* Center avatar for audio call */}
      {!isVideo && (
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            {/* Pulse rings */}
            {isConnected && (
              <>
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ background: "var(--brand)", animationDuration: "2s" }}
                />
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-10"
                  style={{ background: "var(--brand)", animationDuration: "2s", animationDelay: "0.5s" }}
                />
              </>
            )}
            <Avatar src={peer?.avatar} name={peer?.name || peer?.username} size="3xl" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="relative z-10 pb-16 flex flex-col items-center gap-8">
        {/* Secondary controls row */}
        <div className="flex gap-8 items-center">
          <ControlBtn
            icon={isSpeakerOn ? Volume2 : VolumeX}
            label={isSpeakerOn ? "Speaker" : "Earpiece"}
            active={isSpeakerOn}
            onClick={toggleSpeaker}
          />
          {isVideo && (
            <ControlBtn
              icon={RotateCcw}
              label="Flip"
              onClick={() => {}}
            />
          )}
          {isVideo && (
            <ControlBtn
              icon={Maximize2}
              label="Full"
              onClick={() => {}}
            />
          )}
        </div>

        {/* Main controls row */}
        <div className="flex items-center gap-6">
          {/* Mute */}
          <button
            className="call-action-btn"
            style={{ background: isMuted ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)", color: "#fff" }}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff size={26} /> : <Mic size={26} />}
          </button>

          {/* End call */}
          <button
            className="call-action-btn"
            style={{ background: "var(--danger)", color: "#fff", width: 72, height: 72 }}
            onClick={handleEndCall}
          >
            <PhoneOff size={30} />
          </button>

          {/* Video toggle */}
          {isVideo ? (
            <button
              className="call-action-btn"
              style={{ background: isVideoOff ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)", color: "#fff" }}
              onClick={toggleVideo}
            >
              {isVideoOff ? <VideoOff size={26} /> : <Video size={26} />}
            </button>
          ) : (
            <button
              className="call-action-btn"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
              onClick={() => {}}
            >
              <Video size={26} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ControlBtn({ icon: Icon, label, active = false, onClick }) {
  return (
    <button
      className="flex flex-col items-center gap-1"
      onClick={onClick}
      style={{ background: "none", border: "none", cursor: "pointer" }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)" }}
      >
        <Icon size={22} color="#fff" />
      </div>
      <span className="text-xs text-white/70">{label}</span>
    </button>
  );
}
