import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Shield, Bell, HelpCircle, LogOut, Trash2,
  ChevronRight, QrCode, Link2, Smartphone, Archive,
  Moon, Sun, Monitor, HardDrive, UserX,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuthStore } from "../../store/authStore";
import Avatar from "../shared/Avatar";
import BottomNav from "../shared/BottomNav";
import api from "../../utils/api";
import toast from "react-hot-toast";

export default function Account() {
  const navigate  = useNavigate();
  const { user, logout, updateProfile } = useAuthStore();
  const [showQR, setShowQR]       = useState(false);
  const [theme, setTheme]         = useState(localStorage.getItem("theme") || "system");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const applyTheme = (t) => {
    setTheme(t);
    localStorage.setItem("theme", t);
    const root = document.documentElement;
    if (t === "dark")  root.classList.add("dark");
    else if (t === "light") root.classList.remove("dark");
    else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
      else root.classList.remove("dark");
    }
  };

  const changeAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const { data } = await api.post("/users/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await updateProfile({ avatar: data.url });
      toast.success("Profile picture updated!");
    } catch { toast.error("Upload failed"); }
    setUploading(false);
  };

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    logout();
    navigate("/login", { replace: true });
  };

  const handleDeleteAccount = () => {
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;
    api.delete("/users/me")
      .then(() => { logout(); navigate("/login"); })
      .catch(() => toast.error("Could not delete account"));
  };

  const ACCOUNT_SECTIONS = [
    {
      title: "Account",
      items: [
        { icon: Shield, label: "Security & notifications", onPress: () => navigate("/settings/security") },
        { icon: Link2,  label: "Change email, phone or username", onPress: () => navigate("/settings/identity") },
        { icon: Shield, label: "Two-step verification", onPress: () => navigate("/settings/2fa") },
      ],
    },
    {
      title: "Privacy",
      items: [
        { icon: ChevronRight, label: "Last seen & online",  onPress: () => navigate("/settings/privacy/lastseen") },
        { icon: ChevronRight, label: "Profile photo",       onPress: () => navigate("/settings/privacy/photo") },
        { icon: ChevronRight, label: "About",               onPress: () => navigate("/settings/privacy/about") },
        { icon: ChevronRight, label: "Links",               onPress: () => navigate("/settings/privacy/links") },
        { icon: ChevronRight, label: "Status (Story)",      onPress: () => navigate("/settings/privacy/status") },
      ],
    },
    {
      title: "Chats",
      items: [
        { icon: theme === "dark" ? Moon : theme === "light" ? Sun : Monitor,
          label: "Theme", sublabel: theme.charAt(0).toUpperCase() + theme.slice(1),
          onPress: () => {
            const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
            applyTheme(next);
          },
        },
        { icon: Archive, label: "Chat backup",  onPress: () => navigate("/settings/backup") },
      ],
    },
    {
      title: "Notifications",
      items: [
        { icon: Bell, label: "Notification settings", onPress: () => navigate("/settings/notifications") },
      ],
    },
    {
      title: "More",
      items: [
        { icon: HardDrive,   label: "Storage usage",  onPress: () => navigate("/settings/storage") },
        { icon: UserX,       label: "Blocked users",  onPress: () => navigate("/settings/blocked") },
        { icon: Smartphone,  label: "Linked devices", onPress: () => navigate("/settings/devices") },
        { icon: HelpCircle,  label: "Help & Feedback",onPress: () => navigate("/settings/help") },
      ],
    },
  ];

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1 className="text-xl font-bold flex-1" style={{ color: "var(--text-primary)" }}>Account</h1>
        <button className="btn-icon" onClick={() => setShowQR(true)}><QrCode size={20} /></button>
      </header>

      <div className="page-content">
        {/* Profile card */}
        <div
          className="mx-4 mt-4 mb-2 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          onClick={() => navigate("/profile/edit")}
        >
          <div className="relative">
            <Avatar src={user?.avatar} name={user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username} size="xl" />
            <button
              className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "var(--brand)", border: "2px solid var(--bg-primary)" }}
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              disabled={uploading}
            >
              <Camera size={13} color="#fff" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={changeAvatar} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
              {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username || "User"}
            </p>
            <p className="text-sm text-muted truncate">@{user?.username}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
              {user?.bio || "Tap to add a bio"}
            </p>
          </div>
          <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
        </div>

        {/* Settings sections */}
        {ACCOUNT_SECTIONS.map((section) => (
          <div key={section.title} className="mt-4">
            <p className="px-4 pb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {section.title}
            </p>
            <div className="mx-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left"
                  style={{
                    background: "var(--bg-primary)",
                    borderBottom: idx < section.items.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                  onClick={item.onPress}
                >
                  <item.icon size={18} style={{ color: "var(--brand)", flexShrink: 0 }} />
                  <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{item.label}</span>
                  {item.sublabel && (
                    <span className="text-xs mr-1" style={{ color: "var(--text-muted)" }}>{item.sublabel}</span>
                  )}
                  <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <div className="mx-4 mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <button
            className="w-full flex items-center gap-3 px-4 py-4 text-left border-b"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
            onClick={handleLogout}
          >
            <LogOut size={18} color="var(--danger)" />
            <span className="text-sm font-medium danger">Log out</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-4 text-left"
            style={{ background: "var(--bg-primary)" }}
            onClick={handleDeleteAccount}
          >
            <Trash2 size={18} color="var(--danger)" />
            <span className="text-sm font-medium danger">Delete account</span>
          </button>
        </div>

        <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>
          NexaChat v1.0.0
        </p>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Your QR Code</h3>
              <button className="btn-icon" onClick={() => setShowQR(false)}>✕</button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-2xl shadow-md">
                <QRCodeSVG
                  value={`nexachat://user/${user?._id}`}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                Scan this code to start a chat with <strong>{user?.username}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
