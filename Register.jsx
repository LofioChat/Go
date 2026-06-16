import React, { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Check, X, Loader, MessageCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getPasswordStrength, validateEmail, validatePhone, validateUsername } from "../../utils/helpers";
import api from "../../utils/api";
import toast from "react-hot-toast";

let usernameTimer = null;

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    username: "", password: "", confirmPassword: "",
    remember: false, agreeTerms: false,
  });
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken"

  const strength = getPasswordStrength(form.password);

  const handle = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleUsername = (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, username: val }));
    if (!validateUsername(val)) { setUsernameStatus(null); return; }
    setUsernameStatus("checking");
    clearTimeout(usernameTimer);
    usernameTimer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check-username?username=${val}`);
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus(null);
      }
    }, 600);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.agreeTerms) { toast.error("Please accept Terms & Conditions"); return; }
    if (!form.firstName || !form.lastName) { toast.error("Name is required"); return; }
    if (!validateEmail(form.email)) { toast.error("Invalid email address"); return; }
    if (form.phone && !validatePhone(form.phone)) { toast.error("Invalid phone number"); return; }
    if (!validateUsername(form.username)) { toast.error("Username must be 3-30 chars (letters, numbers, _ or .)"); return; }
    if (usernameStatus === "taken") { toast.error("Username already taken"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); return; }

    const res = await register({
      firstName: form.firstName, lastName: form.lastName,
      email: form.email, phone: form.phone,
      username: form.username, password: form.password,
      remember: form.remember,
    });

    if (res.success) {
      navigate("/otp", { state: { type: "register", identifier: form.email || form.phone, userId: res.userId } });
    } else {
      toast.error(res.error || "Registration failed");
    }
  };

  return (
    <div className="page-content-no-nav flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <div className="flex flex-col flex-1 px-6 py-8 overflow-y-auto">
        {/* Logo */}
        <div className="flex flex-col items-center mt-4 mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl mb-3" style={{ background: "var(--brand)" }}>
            <MessageCircle size={28} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Create account</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Join NexaChat today</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* Name row */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>First Name</label>
              <input className="input-field" placeholder="John" value={form.firstName} onChange={handle("firstName")} />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Last Name</label>
              <input className="input-field" placeholder="Doe" value={form.lastName} onChange={handle("lastName")} />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Email</label>
            <input className="input-field" type="email" placeholder="john@example.com" value={form.email} onChange={handle("email")} autoCapitalize="none" />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Phone Number <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
            </label>
            <input className="input-field" type="tel" placeholder="+91 9876543210" value={form.phone} onChange={handle("phone")} />
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Username</label>
            <div className="relative">
              <input
                className="input-field pr-10"
                placeholder="john_doe"
                value={form.username}
                onChange={handleUsername}
                autoCapitalize="none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking"  && <Loader size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} />}
                {usernameStatus === "available" && <Check size={16} color="var(--online)" />}
                {usernameStatus === "taken"     && <X size={16} color="var(--danger)" />}
              </span>
            </div>
            {usernameStatus === "taken"     && <p className="text-xs danger">Username already taken</p>}
            {usernameStatus === "available" && <p className="text-xs" style={{ color: "var(--online)" }}>Username available!</p>}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Password</label>
            <div className="relative">
              <input
                className="input-field pr-12"
                type={showPwd ? "text" : "password"}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={handle("password")}
                autoComplete="new-password"
              />
              <button type="button" className="btn-icon absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(p => !p)}>
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Strength indicator */}
            {form.password && (
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`strength-bar flex-1 ${i <= strength.score ? strength.color : ""}`}
                      style={{ background: i <= strength.score ? undefined : "var(--border)" }} />
                  ))}
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Strength: <span className={`font-medium ${strength.color}`}>{strength.label}</span></p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Confirm Password</label>
            <div className="relative">
              <input
                className="input-field pr-12"
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={handle("confirmPassword")}
                autoComplete="new-password"
              />
              <button type="button" className="btn-icon absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowConfirm(p => !p)}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs danger">Passwords do not match</p>
            )}
          </div>

          {/* Remember */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="checkbox" checked={form.remember} onChange={handle("remember")} />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Remember me</span>
          </label>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="checkbox mt-0.5" checked={form.agreeTerms} onChange={handle("agreeTerms")} />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              I agree to the{" "}
              <Link to="/terms" className="font-medium" style={{ color: "var(--brand)" }}>Terms & Conditions</Link>
              {" "}and{" "}
              <Link to="/privacy" className="font-medium" style={{ color: "var(--brand)" }}>Privacy Policy</Link>
            </span>
          </label>

          <button type="submit" className="btn-primary mt-2" disabled={isLoading || usernameStatus === "taken"}>
            {isLoading ? <Loader size={18} className="animate-spin" /> : null}
            {isLoading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center mt-6 mb-8 text-sm" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold" style={{ color: "var(--brand)" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
