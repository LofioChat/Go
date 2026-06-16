import { formatDistanceToNowStrict, format, isToday, isYesterday, parseISO } from "date-fns";

// ─── Date / Time ───────────────────────────────────
export const formatMessageTime = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "h:mm a");
};

export const formatConversationTime = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

export const formatCallDuration = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const formatTimeAgo = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNowStrict(d, { addSuffix: true });
};

// ─── Validation ────────────────────────────────────
export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validatePhone = (phone) =>
  /^\+?[\d\s\-()]{8,15}$/.test(phone);

export const validateUsername = (username) =>
  /^[a-zA-Z0-9_\.]{3,30}$/.test(username);

export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: "Weak",   color: "strength-weak" };
  if (score === 2) return { score, label: "Fair",   color: "strength-fair" };
  if (score === 3) return { score, label: "Good",   color: "strength-good" };
  return                      { score, label: "Strong", color: "strength-strong" };
};

// ─── Avatar ────────────────────────────────────────
export const getInitials = (name = "") => {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const generateAvatarColor = (str = "") => {
  const colors = [
    "#2563eb","#7c3aed","#db2777","#dc2626","#ea580c",
    "#16a34a","#0891b2","#9333ea","#c026d3","#0284c7",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ─── File / Media ──────────────────────────────────
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const getFileIcon = (type) => {
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf"))      return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("sheet") || type.includes("excel")) return "📊";
  return "📎";
};

export const isImageType = (type = "") => type.startsWith("image/");
export const isVideoType = (type = "") => type.startsWith("video/");

// ─── Clipboard ─────────────────────────────────────
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    return true;
  }
};

// ─── Misc ──────────────────────────────────────────
export const truncate = (str = "", max = 50) =>
  str.length <= max ? str : str.slice(0, max - 1) + "…";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const generateId = () =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);
