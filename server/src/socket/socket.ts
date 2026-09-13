import { Server, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { replayService } from "../services/replay.service.js";

interface UserPayload {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role: "INTERVIEWER" | "CANDIDATE";
}

interface CursorPosition {
    lineNumber: number;
    column: number;
}

interface ChatMessage {
    senderId: string;
    senderName: string;
    senderAvatar?: string | null;
    text: string;
    timestamp: string;
}

// Keep track of connected users per room: roomId -> Array<{ socketId, user }>
const roomUsers = new Map<string, Array<{ socketId: string; user: UserPayload }>>();
// Throttle cursor replay events: "roomId:userId" -> lastBufferedTimestamp
const cursorThrottle = new Map<string, number>();

const isRoomMember = (socket: Socket, roomId: string): boolean => {
    return socket.rooms.has(roomId);
};

const getSocketRole = (socket: Socket): "INTERVIEWER" | "CANDIDATE" | undefined => {
    const authUser = (socket as unknown as { user?: { userId: string; role: "INTERVIEWER" | "CANDIDATE"; name?: string; email?: string; avatar?: string | null } }).user;
    return authUser?.role;
};

export const initSocket = (server: HttpServer) => {
    const clientUrl = env.CLIENT_URL.replace(/\/+$/, "");
    const io = new Server(server, {
        cors: {
            origin: [clientUrl, `${clientUrl}/`],
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // ─── Socket JWT Middleware ──────────────────────────────────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
        if (!token) {
            return next(new Error("Authentication required"));
        }
        try {
            const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
                userId: string;
                role: string;
                name?: string;
                email?: string;
                avatar?: string | null;
            };
            (socket as unknown as { user?: typeof decoded }).user = decoded;
            next();
        } catch {
            next(new Error("Authentication error: invalid or expired token"));
        }
    });

    io.on("connection", (socket) => {
        logger.info("Socket connected", { socketId: socket.id });

        // 1. Join Room: Accepts user payload and broadcasts list
        socket.on("joinRoom", ({ roomId, user }: { roomId: string; user: UserPayload }) => {
            if (!roomId) return;
            socket.join(roomId);

            const authUser = (socket as unknown as { user?: { userId: string; role: "INTERVIEWER" | "CANDIDATE"; name?: string; email?: string; avatar?: string | null } }).user;
            // Use server-verified JWT identity; fall back to client-supplied display name only
            const sanitizedUser: UserPayload = {
                id: authUser?.userId || socket.id,
                role: authUser?.role || "CANDIDATE",
                name: authUser?.name || user?.name || "User",
                email: authUser?.email || "",
                avatar: authUser?.avatar ?? user?.avatar ?? null,
            };

            if (!roomUsers.has(roomId)) {
                roomUsers.set(roomId, []);
            }
            const users = roomUsers.get(roomId)!;

            const distinctUserIds = new Set(users.map((u) => u.user.id));
            if (distinctUserIds.size >= 2 && !distinctUserIds.has(sanitizedUser.id)) {
                logger.warn("Socket join rejected: room is full", { roomId, userId: sanitizedUser.id });
                socket.emit("roomFull", { message: "This room is already at full capacity." });
                return;
            }

            // Prevent duplicate entries for the same socket connection
            if (!users.some((u) => u.socketId === socket.id)) {
                users.push({ socketId: socket.id, user: sanitizedUser });
            }

            // Emit the updated list of users to everyone in the room
            io.to(roomId).emit("presenceUpdate", users.map((u) => u.user));
            logger.info("User joined room", { roomId, socketId: socket.id, userCount: users.length });

            // Start replay tracking for this room
            replayService.startTracking(roomId);
        });

        // 2. Relay Cursor Movement
        socket.on("cursorMove", ({ roomId, user, position }: { roomId: string; user: UserPayload; position: CursorPosition }) => {
            if (!isRoomMember(socket, roomId)) return;
            socket.to(roomId).emit("cursorUpdate", { user, position });

            // Throttle cursor replay events to max 1 per 500ms per user
            const key = `${roomId}:${user.id}`;
            const now = Date.now();
            const last = cursorThrottle.get(key) || 0;
            if (now - last >= 500) {
                cursorThrottle.set(key, now);
                replayService.buffer(roomId, {
                    type: "cursor",
                    timestamp: replayService.getRelativeTimestamp(roomId),
                    data: { lineNumber: position.lineNumber, column: position.column, userId: user.id },
                });
            }
        });

        // Relay Chat Messages
        socket.on("sendMessage", ({ roomId, message }: { roomId: string; message: ChatMessage }) => {
            if (!isRoomMember(socket, roomId)) return;
            socket.to(roomId).emit("receiveMessage", message);
        });

        // Buffer code snapshots for replay (Yjs handles real-time sync)
        socket.on("codeChange", ({ roomId, code }: { roomId: string; code: string }) => {
            if (!isRoomMember(socket, roomId)) return;

            // Buffer code snapshot for replay
            replayService.buffer(roomId, {
                type: "code",
                timestamp: replayService.getRelativeTimestamp(roomId),
                data: { code },
            });
        });

        socket.on("languageChange", ({ roomId, language }: { roomId: string; language: string }) => {
            if (!isRoomMember(socket, roomId)) return;
            if (getSocketRole(socket) !== "INTERVIEWER") return;
            socket.to(roomId).emit("languageChange", language);

            // Buffer language change for replay
            replayService.buffer(roomId, {
                type: "language",
                timestamp: replayService.getRelativeTimestamp(roomId),
                data: { language },
            });
        });

        socket.on("problemChange", ({ roomId, problem }: { roomId: string; problem: string }) => {
            if (!isRoomMember(socket, roomId)) return;
            if (getSocketRole(socket) !== "INTERVIEWER") return;
            socket.to(roomId).emit("problemChange", problem);
        });

        // WebRTC signaling
        socket.on("offer", ({ roomId, offer }: { roomId: string; offer: unknown }) => {
            if (!isRoomMember(socket, roomId)) return;
            socket.to(roomId).emit("offer", offer);
        });

        socket.on("answer", ({ roomId, answer }: { roomId: string; answer: unknown }) => {
            if (!isRoomMember(socket, roomId)) return;
            socket.to(roomId).emit("answer", answer);
        });

        socket.on("candidateReady", ({ roomId }: { roomId: string }) => {
            if (!isRoomMember(socket, roomId)) return;
            socket.to(roomId).emit("candidateReady");
        });

        socket.on("sessionEnded", ({ roomId }: { roomId: string }) => {
            if (!isRoomMember(socket, roomId)) return;
            if (getSocketRole(socket) !== "INTERVIEWER") return;
            socket.to(roomId).emit("sessionEnded");
        });

        socket.on("iceCandidate", ({ roomId, candidate }: { roomId: string; candidate: unknown }) => {
            if (!isRoomMember(socket, roomId)) return;
            socket.to(roomId).emit("iceCandidate", candidate);
        });

        // 3. Handle Disconnection presence cleanup
        socket.on("disconnect", () => {
            logger.info("Socket disconnected", { socketId: socket.id });

            // Search all rooms to remove this socket connection
            for (const [roomId, users] of roomUsers.entries()) {
                const index = users.findIndex((u) => u.socketId === socket.id);
                if (index !== -1) {
                    users.splice(index, 1);
                    // Broadcast updated list to the remaining users
                    io.to(roomId).emit("presenceUpdate", users.map((u) => u.user));

                    // Clean up map key if room becomes empty
                    if (users.length === 0) {
                        roomUsers.delete(roomId);
                        for (const key of cursorThrottle.keys()) {
                            if (key.startsWith(`${roomId}:`)) {
                                cursorThrottle.delete(key);
                            }
                        }
                    }
                }
            }
        });
    });

    return io;
};