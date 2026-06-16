import { useRef, useCallback, useEffect } from "react";
import Peer from "simple-peer";
import { useCallStore } from "../store/callStore";
import { emitCallSignal } from "../utils/socket";

export const useWebRTC = () => {
  const peerRef = useRef(null);
  const {
    setLocalStream,
    setRemoteStream,
    setActiveCall,
    startCallTimer,
    stopCallTimer,
    endCall: endCallStore,
  } = useCallStore();

  const getMedia = useCallback(async (video = false) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video ? { width: 640, height: 480, facingMode: "user" } : false,
    });
    setLocalStream(stream);
    return stream;
  }, []);

  const initiateCall = useCallback(async ({ toUserId, toUser, isVideo, convId }) => {
    try {
      const stream = await getMedia(isVideo);

      peerRef.current = new Peer({ initiator: true, trickle: false, stream });

      peerRef.current.on("signal", (signal) => {
        emitCallSignal({ type: "offer", toUserId, signal, isVideo, convId });
      });

      peerRef.current.on("stream", (remoteStream) => {
        setRemoteStream(remoteStream);
        startCallTimer();
      });

      peerRef.current.on("error", (err) => {
        console.error("[WebRTC] Error:", err);
        endCall();
      });

      peerRef.current.on("close", () => endCall());

      setActiveCall({ toUser, isVideo, direction: "outgoing", convId });
    } catch (err) {
      console.error("[WebRTC] Media error:", err);
    }
  }, []);

  const answerCall = useCallback(async ({ fromUserId, fromUser, signal, isVideo, convId }) => {
    try {
      const stream = await getMedia(isVideo);

      peerRef.current = new Peer({ initiator: false, trickle: false, stream });

      peerRef.current.on("signal", (answerSignal) => {
        emitCallSignal({ type: "answer", toUserId: fromUserId, signal: answerSignal, convId });
      });

      peerRef.current.on("stream", (remoteStream) => {
        setRemoteStream(remoteStream);
        startCallTimer();
      });

      peerRef.current.on("error", (err) => {
        console.error("[WebRTC] Error:", err);
        endCall();
      });

      peerRef.current.on("close", () => endCall());

      peerRef.current.signal(signal);
      setActiveCall({ fromUser, isVideo, direction: "incoming", convId });
    } catch (err) {
      console.error("[WebRTC] Media error:", err);
    }
  }, []);

  const handleIncomingSignal = useCallback((signal) => {
    if (peerRef.current) peerRef.current.signal(signal);
  }, []);

  const endCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    stopCallTimer();
    endCallStore();
  }, []);

  // Listen for WebRTC signals from socket
  useEffect(() => {
    const handler = (e) => handleIncomingSignal(e.detail);
    window.addEventListener("webrtc:signal", handler);
    return () => window.removeEventListener("webrtc:signal", handler);
  }, [handleIncomingSignal]);

  return { initiateCall, answerCall, endCall, handleIncomingSignal };
};
