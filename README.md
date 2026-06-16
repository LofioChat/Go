# NexaChat — Full-Stack Real-Time Messaging Application

A production-ready, WhatsApp-style chat application with real-time messaging, voice/video calling, stories, groups, and full authentication. Built as a complete full-stack solution: **React frontend + Node/Express backend + MongoDB + Socket.io + WebRTC**.

---

## 🏗️ Architecture

```
nexachat/
├── frontend/          React + Vite + Tailwind (mobile-first PWA)
│   └── src/
│       ├── components/
│       │   ├── auth/      Login, Register, OTP, ForgotPassword
│       │   ├── home/      Home feed, NewChat
│       │   ├── chat/      Chat screen, AttachmentMenu
│       │   ├── group/     CreateGroup, GroupInfo
│       │   ├── story/     StoryBar, StoryViewer
│       │   ├── calls/     CallHistory, CallScreen, IncomingCallModal
│       │   ├── search/    Search
│       │   ├── account/   Account/Settings
│       │   └── shared/    Avatar, BottomNav
│       ├── store/         Zustand: authStore, chatStore, callStore
│       ├── hooks/         useSocket, useWebRTC
│       └── utils/         api, socket, helpers
│
└── backend/           Node + Express + Socket.io + MongoDB
    └── src/
        ├── models/         User, Conversation, Message, Story, Call
        ├── routes/         auth, users, conversations, groups, stories, search, calls
        ├── middleware/      auth (JWT)
        ├── services/        otpService (email/SMS), uploadService (Cloudinary)
        └── socket/           socketHandler (presence, typing, WebRTC signaling)
```

---

## ✨ Features Implemented

**Authentication**
- Username / email / phone login with show/hide password, remember me, forgot password
- Registration with live username availability check + password strength meter
- 5-digit OTP verification with auto-focus, countdown, resend, paste support
- Optional Google/Apple sign-in buttons (hook up OAuth credentials to activate)

**Messaging**
- Real-time text, image, video, voice-note, document, contact, and location messages
- Reply, forward, edit, delete, copy, and emoji reactions (❤️ 👍 😂 …)
- Typing indicators, online/last-seen status, read receipts (✓ / ✓✓ / blue ✓✓)
- Pin & archive chats, unread counters, pull-to-refresh

**Calling**
- WebRTC voice & video calls with mute / camera-toggle / speaker controls
- Incoming-call modal, call history with missed/duration/redial

**Stories**
- 24-hour expiring text/image/video stories, viewer list, reactions, replies, tap-to-navigate

**Groups**
- Create groups, add/remove members, admin roles, invite links, descriptions

**Account**
- Avatar upload, QR code, privacy controls, theme (light/dark/system), blocked users, linked devices, logout & delete account

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- (Optional) Cloudinary account for media uploads
- (Optional) SMTP credentials + Twilio for real OTP delivery — without these, OTPs are printed to the backend console in dev mode

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env       # fill in MONGODB_URI, JWT_SECRET, etc.
npm run seed                # optional: creates demo users (password: password123)
npm run dev                  # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                  # starts on http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to the backend automatically (see `vite.config.js`).

### 3. Build for production

```bash
cd frontend && npm run build     # outputs dist/
cd backend  && npm start          # serve API + Socket.io
```

---

## 🔑 Environment Variables (backend/.env)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing auth tokens |
| `CLOUDINARY_*` | Media (image/video/file) storage — without it, dev placeholder URLs are used |
| `SMTP_*` / `EMAIL_FROM` | Sending OTP & password-reset emails |
| `TWILIO_*` | Sending OTP via SMS |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth login |
| `CLIENT_URL` | Frontend origin for CORS + email links |

Without Cloudinary/SMTP/Twilio configured, the app still runs fully in "dev mode": OTPs are logged to the backend console and uploaded media returns a placeholder URL, so you can test every flow end-to-end before wiring real credentials.

---

## 📱 Mobile-First Design

The frontend is built as a single-column, max-width-480px "app shell" that behaves like a native mobile app in any browser, and can be installed as a PWA (manifest.json included) on phones for an app-like experience without going through app stores.

---

## 🧩 Extending Further

- **Push notifications**: hook Web Push / FCM into `socket:message:new` events
- **End-to-end encryption**: integrate libsodium/Signal-protocol on the message payload before it hits `/conversations/:id/messages`
- **Group video calls**: the socket handler already includes `group_call:*` event scaffolding for mesh/SFU expansion
- **Polls**: `AttachmentMenu` has a Poll button stub ready for a `type: "poll"` message variant
