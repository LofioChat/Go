import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import connectDB from "./config/db.js";
import { initSocket } from "./socket/socketHandler.js";

// Routes
import authRoutes         from "./routes/auth.js";
import userRoutes         from "./routes/users.js";
import conversationRoutes from "./routes/conversations.js";
import groupRoutes        from "./routes/groups.js";
import storyRoutes        from "./routes/stories.js";
import searchRoutes       from "./routes/search.js";
import callRoutes         from "./routes/calls.js";

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Connect DB ────────────────────────────────────
await connectDB();

// ─── Middleware ────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// ─── Rate Limiting ─────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many auth attempts, please try again later." },
});

app.use("/api", limiter);
app.use("/api/auth", authLimiter);

// ─── Make io accessible in routes ─────────────────
app.use((req, _, next) => { req.io = io; next(); });

// ─── Routes ────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/groups",        groupRoutes);
app.use("/api/stories",       storyRoutes);
app.use("/api/search",        searchRoutes);
app.use("/api/calls",         callRoutes);

// ─── Health check ──────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ─── 404 handler ───────────────────────────────────
app.use((_, res) => res.status(404).json({ message: "Route not found" }));

// ─── Error handler ─────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[Error]", err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
});

// ─── Socket.io ─────────────────────────────────────
initSocket(io);

// ─── Start server ──────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 NexaChat server running on port ${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`   DB:   ${process.env.MONGODB_URI?.replace(/:\/\/.*@/, "://***@") || "local"}\n`);
});

export { io };
