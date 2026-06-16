import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, RotateCcw, HelpCircle, Loader } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

const OTP_LENGTH = 5;
const RESEND_DELAY = 60;

export default function OTP() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { verifyOtp, resendOtp, isLoading } = useAuthStore();
  const { type, identifier, userId } = location.state || {};

  const [digits, setDigits]       = useState(Array(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_DELAY);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
    // Auto-submit when all filled
    if (val && next.every(Boolean)) submitOtp(next.join(""));
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft"  && idx > 0)             inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...pasted.split(""), ...Array(OTP_LENGTH).fill("")].slice(0, OTP_LENGTH);
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) submitOtp(pasted);
  };

  const submitOtp = async (code) => {
    const res = await verifyOtp({ otp: code, identifier, userId, type });
    if (res.success) {
      toast.success("Verified successfully!");
      navigate("/home", { replace: true });
    } else {
      toast.error(res.error || "Invalid OTP");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    const res = await resendOtp({ identifier, type });
    setResending(false);
    if (res.success) {
      toast.success("OTP sent again!");
      setCountdown(RESEND_DELAY);
      setCanResend(false);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } else {
      toast.error(res.error || "Could not resend OTP");
    }
  };

  const maskedIdentifier = identifier
    ? identifier.includes("@")
      ? identifier.replace(/(.{2}).*(@.*)/, "$1***$2")
      : identifier.replace(/(\+?\d{2})\d{6}(\d{2})/, "$1******$2")
    : "";

  return (
    <div className="page-content-no-nav flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <div className="flex flex-col flex-1 px-6 py-8">
        {/* Back */}
        <button
          className="btn-icon self-start mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={22} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl"
            style={{ background: "var(--brand-light)" }}
          >
            📱
          </div>
          <h1 className="text-2xl font-bold text-center" style={{ color: "var(--text-primary)" }}>
            Verify your identity
          </h1>
          <p className="text-sm text-center mt-2" style={{ color: "var(--text-muted)", maxWidth: 280 }}>
            We sent a 5-digit code to{" "}
            <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
              {maskedIdentifier}
            </span>
          </p>
        </div>

        {/* OTP Boxes */}
        <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              className={`otp-box ${d ? "filled" : ""}`}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoComplete="one-time-code"
            />
          ))}
        </div>

        {/* Submit Button */}
        <button
          className="btn-primary mb-6"
          disabled={digits.some((d) => !d) || isLoading}
          onClick={() => submitOtp(digits.join(""))}
        >
          {isLoading ? <Loader size={18} className="animate-spin" /> : null}
          {isLoading ? "Verifying…" : "Verify"}
        </button>

        {/* Countdown / Resend */}
        <div className="flex flex-col items-center gap-3">
          {!canResend ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Resend code in{" "}
              <span className="font-semibold" style={{ color: "var(--brand)" }}>
                {countdown}s
              </span>
            </p>
          ) : (
            <button
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? <Loader size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Resend OTP
            </button>
          )}

          <button
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => toast("Try a different verification method in settings")}
          >
            <HelpCircle size={14} />
            Try another way
          </button>
        </div>
      </div>
    </div>
  );
}
