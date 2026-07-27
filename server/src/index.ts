import { env } from "./config/env.js";

// LiveCode API Server entrypoint
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import passport from "./config/passport.js";
import { initSocket } from "./socket/socket.js";
import authRouter from "./routes/auth.routes.js";
import roomRouter from "./routes/room.routes.js";
import codeRouter from "./routes/code.routes.js";
import hintRouter from "./routes/hint.routes.js";
import sessionRouter from "./routes/session.routes.js";
import reportRouter from "./routes/report.routes.js";
import mockRouter from "./routes/mock.routes.js";
import transcribeRoutes from "./routes/transcribe.routes.js";
import healthRouter from "./routes/health.js";
import problemRouter from "./routes/problem.routes.js";
import { seedProblems } from "./utils/seedProblems.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";

const app = express();
const PORT = env.PORT;

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

// Global rate limit — 200 requests per minute per IP
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please slow down." },
});

// Tight limit for expensive external API calls
const codeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: "Code execution limit reached. Try again in a minute." },
});

const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { message: "AI request limit reached. Try again in a minute." },
});

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
}));
app.use(requestIdMiddleware);
app.use(globalLimiter);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

import openapiSpec from "./docs/openapi.json" with { type: "json" };

// ─── API Router v1 ───────────────────────────────────────────────────────────
const v1Router = express.Router();
v1Router.get("/docs", (_req, res) => res.json(openapiSpec));
v1Router.use("/health", healthRouter);
v1Router.use("/auth", authRouter);
v1Router.use("/rooms", roomRouter);
v1Router.use("/code", codeLimiter, codeRouter);
v1Router.use("/ai", aiLimiter, hintRouter);
v1Router.use("/sessions", sessionRouter);
v1Router.use("/reports", reportRouter);
v1Router.use("/mock", mockRouter);
v1Router.use("/transcribe", transcribeRoutes);
v1Router.use("/problems", problemRouter);

app.use("/api/v1", v1Router);
app.use("/api", v1Router);

const server = createServer(app);
initSocket(server);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

server.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`, { mode: env.NODE_ENV });
    try {
        await seedProblems();
    } catch (err: any) {
        logger.error("Failed to seed database", { error: err?.message || err });
    }
});