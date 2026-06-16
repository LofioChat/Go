import { create } from "zustand";

export const useCallStore = create((set, get) => ({
  callHistory: [],
  activeCall: null,
  incomingCall: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  isSpeakerOn: true,
  callDuration: 0,
  callTimer: null,

  setCallHistory: (history) => set({ callHistory: history }),
  setActiveCall: (call) => set({ activeCall: call }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    }
    set({ isMuted: !isMuted });
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    }
    set({ isVideoOff: !isVideoOff });
  },

  toggleSpeaker: () => set((s) => ({ isSpeakerOn: !s.isSpeakerOn })),

  startCallTimer: () => {
    const timer = setInterval(() => {
      set((s) => ({ callDuration: s.callDuration + 1 }));
    }, 1000);
    set({ callTimer: timer, callDuration: 0 });
  },

  stopCallTimer: () => {
    const { callTimer } = get();
    if (callTimer) clearInterval(callTimer);
    set({ callTimer: null, callDuration: 0 });
  },

  endCall: () => {
    const { localStream, callTimer } = get();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    if (callTimer) clearInterval(callTimer);
    set({
      activeCall: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      callDuration: 0,
      callTimer: null,
    });
  },

  formatDuration: (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  },
}));
