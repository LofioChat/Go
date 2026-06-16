import React, { useRef } from "react";
import { Camera, Image, Film, FileText, User, MapPin, BarChart2, X } from "lucide-react";
import api from "../../utils/api";
import toast from "react-hot-toast";

const ATTACH_TYPES = [
  { icon: Camera,   label: "Camera",   accept: "image/*",  capture: "environment", type: "image" },
  { icon: Image,    label: "Gallery",  accept: "image/*",                          type: "image" },
  { icon: Film,     label: "Video",    accept: "video/*",                          type: "video" },
  { icon: FileText, label: "Document", accept: "*/*",                              type: "file"  },
  { icon: User,     label: "Contact",  accept: ".vcf",                             type: "contact" },
];

export default function AttachmentMenu({ convId, onClose, onMessageSent }) {
  const fileRef = useRef(null);
  const activeConfig = useRef(null);

  const handleSelect = (config) => {
    activeConfig.current = config;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = config.accept;
    if (config.capture) input.capture = config.capture;
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", config.type);
      try {
        toast.loading("Uploading…", { id: "upload" });
        const { data } = await api.post(`/conversations/${convId}/messages`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Sent!", { id: "upload" });
        onMessageSent(data.message);
        onClose();
      } catch {
        toast.error("Upload failed", { id: "upload" });
      }
    };
    input.click();
  };

  const shareLocation = async () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    toast.loading("Getting location…", { id: "loc" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await api.post(`/conversations/${convId}/messages`, {
            type: "location",
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          toast.success("Location sent!", { id: "loc" });
          onMessageSent(data.message);
          onClose();
        } catch { toast.error("Failed to send location", { id: "loc" }); }
      },
      () => toast.error("Could not get location", { id: "loc" })
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="absolute bottom-16 left-0 right-0 z-40 mx-3 rounded-2xl p-4 shadow-lg animate-slide-up"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Share</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {ATTACH_TYPES.map(({ icon: Icon, label, ...config }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-colors"
              style={{ background: "var(--bg-secondary)" }}
              onClick={() => handleSelect({ ...config, label })}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--brand-light)" }}>
                <Icon size={20} style={{ color: "var(--brand)" }} />
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
            </button>
          ))}
          <button
            className="flex flex-col items-center gap-2 p-3 rounded-xl"
            style={{ background: "var(--bg-secondary)" }}
            onClick={shareLocation}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "var(--brand-light)" }}>
              <MapPin size={20} style={{ color: "var(--brand)" }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Location</span>
          </button>
          <button
            className="flex flex-col items-center gap-2 p-3 rounded-xl"
            style={{ background: "var(--bg-secondary)" }}
            onClick={() => { toast("Poll feature coming soon"); onClose(); }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "var(--brand-light)" }}>
              <BarChart2 size={20} style={{ color: "var(--brand)" }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Poll</span>
          </button>
        </div>
      </div>
    </>
  );
}
