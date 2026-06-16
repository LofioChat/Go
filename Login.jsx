import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, MessageCircle, Loader } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const [form, setForm] = useState({ identifier: "", password: "", remember: false });
  const [showPwd, setShowPwd] = useState(false);

  const handle = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.identifier.trim() || !form.password) {
      toast.error("Please fill in all fields");
      return;
    }
    const res = await login({ identifier: form.identifier, password: form.password, remember: form.remember });
    if (res.success) {
      if (res.requiresOtp) {
        navigate("/otp", { state: { type: "login", identifier: form.identifier } });
      } else {
        navigate("/home");
      }
    } else {
      toast.error(res.error || "Login failed");
    }
  };

  return (
    <div className="page-content-no-nav flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <div className="flex flex-col flex-1 px-6 py-8 overflow-y-auto">
        {/* Logo */}
        <div className="flex flex-col items-center mt-8 mb-10">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "var(--brand)" }}
          >
            <MessageCircle size={32} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Welcome back
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Sign in to NexaChat
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* Identifier */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Username, Email or Phone
            </label>
            <input
              className="input-field"
              type="text"
              placeholder="Enter username, email or phone"
              value={form.identifier}
              onChange={handle("identifier")}
              autoComplete="username"
              autoCapitalize="none"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Password
            </label>
            <div className="relative">
              <input
                className="input-field pr-12"
                type={showPwd ? "text" : "password"}
                placeholder="Enter password"
                value={form.password}
                onChange={handle("password")}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn-icon absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPwd((p) => !p)}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.remember}
                onChange={handle("remember")}
              />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Remember me
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium"
              style={{ color: "var(--brand)" }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Login Button */}
          <button type="submit" className="btn-primary mt-2" disabled={isLoading}>
            {isLoading ? <Loader size={18} className="animate-spin" /> : null}
            {isLoading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Social */}
        <div className="divider my-6"><span>or continue with</span></div>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={() => toast("Google sign-in requires OAuth setup")}>
            <img src="https://www.google.com/favicon.ico" alt="Google" width={18} height={18} />
            Google
          </button>
          <button className="btn-secondary flex-1" onClick={() => toast("Apple sign-in requires iOS setup")}>
            <span style={{ fontSize: 18 }}>🍎</span>
            Apple
          </button>
        </div>

        {/* Sign up link */}
        <p className="text-center mt-8 text-sm" style={{ color: "var(--text-muted)" }}>
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold" style={{ color: "var(--brand)" }}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
