import nodemailer from "nodemailer";
import crypto from "crypto";

// ─── Generate OTP ──────────────────────────────────
export const generateOTP = () => {
  return Math.floor(10000 + Math.random() * 90000).toString(); // 5 digits
};

export const hashOTP = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

// ─── Email transporter ─────────────────────────────
const createTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  // Development: use Ethereal
  return null;
};

// ─── Send email OTP ────────────────────────────────
export const sendEmailOTP = async ({ email, otp, purpose }) => {
  const subjects = {
    register: "Verify your NexaChat account",
    login:    "Your NexaChat login code",
    reset:    "Reset your NexaChat password",
    change:   "Verify your identity – NexaChat",
  };

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px">
      <div style="text-align:center;margin-bottom:32px">
        <div style="display:inline-flex;background:#2563eb;width:56px;height:56px;border-radius:14px;align-items:center;justify-content:center;margin-bottom:16px">
          <span style="font-size:28px">💬</span>
        </div>
        <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0">NexaChat</h1>
      </div>
      <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0">
        <h2 style="color:#0f172a;font-size:18px;font-weight:600;margin:0 0 8px">${subjects[purpose] || "Verification Code"}</h2>
        <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px">
          Use the code below to verify your identity. This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="background:#eff6ff;border:2px dashed #bfdbfe;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
          <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#2563eb;font-family:monospace">${otp}</span>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin:0">
          If you didn't request this code, you can safely ignore this email.
        </p>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:12px;margin:16px 0 0">
        © ${new Date().getFullYear()} NexaChat. All rights reserved.
      </p>
    </div>
  `;

  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
      return;
    }
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || "NexaChat <noreply@nexachat.app>",
      to:      email,
      subject: subjects[purpose] || "Verification Code",
      html,
    });
  } catch (err) {
    console.error("[Email] Send failed:", err.message);
    // In dev, just log the OTP
    console.log(`[DEV] OTP for ${email}: ${otp}`);
  }
};

// ─── Send SMS OTP ──────────────────────────────────
export const sendSmsOTP = async ({ phone, otp }) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log(`[DEV] SMS OTP for ${phone}: ${otp}`);
      return;
    }
    const { default: twilio } = await import("twilio");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `Your NexaChat verification code is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   phone,
    });
  } catch (err) {
    console.error("[SMS] Send failed:", err.message);
    console.log(`[DEV] SMS OTP for ${phone}: ${otp}`);
  }
};

// ─── Send password reset email ─────────────────────
export const sendPasswordResetEmail = async ({ email, resetUrl }) => {
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2>Reset your password</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600">
        Reset Password
      </a>
      <p style="color:#94a3b8;font-size:12px;margin-top:16px">
        If you didn't request this, ignore this email.
      </p>
    </div>
  `;
  try {
    const transporter = createTransporter();
    if (!transporter) { console.log(`[DEV] Reset URL: ${resetUrl}`); return; }
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to:   email,
      subject: "Reset your NexaChat password",
      html,
    });
  } catch (err) {
    console.error("[Email] Reset email failed:", err.message);
    console.log(`[DEV] Reset URL: ${resetUrl}`);
  }
};
