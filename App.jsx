import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import { useSocket } from "./hooks/useSocket";
import apiUtil from "./utils/api";

// Auth
import Login          from "./components/auth/Login";
import Register       from "./components/auth/Register";
import OTP            from "./components/auth/OTP";
import ForgotPassword from "./components/auth/ForgotPassword";

// Main
import Home        from "./components/home/Home";
import NewChat     from "./components/home/NewChat";
import Search      from "./components/search/Search";
import CallHistory from "./components/calls/CallHistory";
import Account     from "./components/account/Account";
import Chat        from "./components/chat/Chat";
import CallScreen  from "./components/calls/CallScreen";
import IncomingCallModal from "./components/calls/IncomingCallModal";
import StoryViewer     from "./components/story/StoryViewer";
import { CreateGroup } from "./components/group/Group";

function SocketProvider({ children }) {
  useSocket();
  return children;
}

function Protected({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/home" replace />;
}

function applyTheme() {
  const t = localStorage.getItem("theme") || "system";
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark");
  else if (t === "light") root.classList.remove("dark");
  else {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
    else root.classList.remove("dark");
  }
}

function StoryCreate() {
  const navigate = useNavigate();
  const [text, setText]       = useState("");
  const [bgColor, setBgColor] = useState("#2563eb");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);
  const COLORS  = ["#2563eb","#7c3aed","#db2777","#dc2626","#16a34a","#0891b2","#ea580c","#0f172a"];

  const post = async (type, mediaUrl) => {
    setLoading(true);
    try {
      await apiUtil.post("/stories", { type, content: text, bgColor, mediaUrl });
      navigate("/home");
    } catch {} finally { setLoading(false); }
  };

  const uploadMedia = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await apiUtil.post("/stories/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    post(file.type.startsWith("video") ? "video" : "image", data.url);
  };

  return (
    <div className="app-shell" style={{ background: bgColor }}>
      <header className="page-header" style={{ background: "transparent", border: "none" }}>
        <button className="btn-icon" onClick={() => navigate(-1)} style={{ color: "#fff" }}>✕</button>
        <span className="flex-1" />
        <button
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "rgba(255,255,255,0.2)" }}
          onClick={() => post("text")}
          disabled={!text.trim() || loading}
        >
          {loading ? "Posting…" : "Share"}
        </button>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <textarea
          className="w-full bg-transparent text-white text-center text-2xl font-bold outline-none resize-none placeholder-white/50"
          placeholder="Type something…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          autoFocus
        />
      </div>
      <div className="flex items-center justify-between px-4 pb-8 gap-4">
        <div className="flex gap-2 overflow-x-auto">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setBgColor(c)}
              className="w-7 h-7 rounded-full border-2 flex-shrink-0 transition-transform"
              style={{ background: c, borderColor: bgColor === c ? "#fff" : "transparent", transform: bgColor === c ? "scale(1.2)" : "scale(1)" }} />
          ))}
        </div>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.2)" }}
          onClick={() => fileRef.current?.click()}
        >
          📷 Media
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0])} />
      </div>
    </div>
  );
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    applyTheme();
    checkAuth();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (!localStorage.getItem("theme") || localStorage.getItem("theme") === "system") applyTheme();
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            maxWidth: 340,
          },
        }}
      />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      {isAuthenticated && (
        <SocketProvider>
          <IncomingCallModal />
        </SocketProvider>
      )}
      <Routes>
        <Route path="/login"           element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register"        element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/otp"             element={<OTP />} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />

        <Route path="/home"         element={<Protected><SocketProvider><Home /></SocketProvider></Protected>} />
        <Route path="/search"       element={<Protected><SocketProvider><Search /></SocketProvider></Protected>} />
        <Route path="/calls"        element={<Protected><SocketProvider><CallHistory /></SocketProvider></Protected>} />
        <Route path="/account"      element={<Protected><SocketProvider><Account /></SocketProvider></Protected>} />
        <Route path="/chat/:convId" element={<Protected><SocketProvider><Chat /></SocketProvider></Protected>} />
        <Route path="/call"         element={<Protected><SocketProvider><CallScreen /></SocketProvider></Protected>} />
        <Route path="/new-chat"     element={<Protected><SocketProvider><NewChat /></SocketProvider></Protected>} />
        <Route path="/story/create" element={<Protected><SocketProvider><StoryCreate /></SocketProvider></Protected>} />
        <Route path="/story/:storyId" element={<Protected><SocketProvider><StoryViewer /></SocketProvider></Protected>} />
        <Route path="/group/create" element={<Protected><SocketProvider><CreateGroup /></SocketProvider></Protected>} />

        <Route path="/"  element={<Navigate to="/home" replace />} />
        <Route path="*"  element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
}
