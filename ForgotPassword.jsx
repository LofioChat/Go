import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading]       = useState(false);
  const [sent, setSent]             = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) { toast.error("Enter your email or phone"); return; }
    setLoading(true);
    const res = await forgotPassword(identifier);
    setLoading(false);
    if (res.success) {
      setSent(true);
    } else {
      toast.error(res.error || "Could not send reset link");
    }
  };

  if (sent) {
    return (
      <div className="page-content-no-nav flex flex-col items-center justify-center px-6" style={{ background: "var(--bg-primary)" }}>
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-bold text-center mb-2" style={{ color: "var(--text-primary)" }}>Check your inbox</h2>
        <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)", maxWidth: 280 }}>
          We sent a password reset link to <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{identifier}</span>
        </p>
        <button className="btn-primary" onClick={() => navigate("/login")} style={{ maxWidth: 280, width: "100%" }}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="page-content-no-nav flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <div className="flex flex-col flex-1 px-6 py-8">
        <button className="btn-icon self-start mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Forgot password?</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Enter your email or phone and we'll send you a reset link.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Email or Phone</label>
            <input
              className="input-field"
              type="text"
              placeholder="Enter email or phone number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoCapitalize="none"
            />
          </div>
          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? <Loader size={18} className="animate-spin" /> : null}
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}
