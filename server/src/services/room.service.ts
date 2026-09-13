import { prisma } from "../lib/prisma.js";
import { generateAccessToken } from "../utils/tokens.js";
import { NotFoundError, BadRequestError } from "../errors/AppError.js";
import { replayService } from "./replay.service.js";
import type { RoomMode } from "@prisma/client";

export const RoomService = {
    async createRoom(userId: string, mode: RoomMode = "LIVE") {
        const room = await prisma.room.create({
            data: {
                userId,
                mode,
            },
        });

        // Room creator gets an INTERVIEWER-scoped token for this session,
        // but we do NOT mutate their persistent User.role in the database.
        const session = await prisma.session.create({
            data: {
                roomId: room.id,
                userId,
            },
        });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const profile = { name: user?.name || "", email: user?.email || "" };

        // Session-scoped role: creator is INTERVIEWER for this room
        const accessToken = generateAccessToken(userId, "INTERVIEWER", profile);

        return {
            id: room.id,
            sessionId: session.id,
            accessToken,
        };
    },

    async joinRoom(userId: string, roomId: string) {
        return await prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                include: { sessions: true },
            });

            if (!room) {
                throw new NotFoundError("Room not found");
            }

            const activeSessions = room.sessions.filter((s) => s.endTime === null);
            if (activeSessions.length === 0) {
                throw new BadRequestError("Room has already ended");
            }

            const isCreator = room.userId === userId;
            const existingActiveSession = activeSessions.find((s) => s.userId === userId);

            if (existingActiveSession) {
                const user = await tx.user.findUnique({ where: { id: userId } });
                const profile = { name: user?.name || "", email: user?.email || "" };
                const role = isCreator ? "INTERVIEWER" : "CANDIDATE";
                const accessToken = generateAccessToken(userId, role, profile);
                return {
                    id: room.id,
                    sessionId: existingActiveSession.id,
                    accessToken,
                };
            }

            // Room capacity check: 1 interviewer + 1 candidate maximum
            const candidateSession = activeSessions.find((s) => s.userId !== room.userId);
            if (candidateSession && !isCreator) {
                throw new BadRequestError("Room is already full (maximum 1 interviewer and 1 candidate)");
            }

            // Joiner gets a CANDIDATE-scoped token for this session
            const session = await tx.session.create({
                data: {
                    roomId,
                    userId,
                },
            });

            const user = await tx.user.findUnique({ where: { id: userId } });
            const profile = { name: user?.name || "", email: user?.email || "" };

            const accessToken = generateAccessToken(userId, "CANDIDATE", profile);

            return {
                id: room.id,
                sessionId: session.id,
                accessToken,
            };
        });
    },

    async getRoomById(roomId: string) {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
            throw new NotFoundError("Room not found");
        }
        return room;
    },

    /** Get room by ID with authorization: user must be the room creator or a session participant */
    async getRoomByIdForUser(roomId: string, userId: string) {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { sessions: { select: { userId: true } } },
        });
        if (!room) {
            throw new NotFoundError("Room not found");
        }

        const isCreator = room.userId === userId;
        const isParticipant = room.sessions.some((s) => s.userId === userId);
        if (!isCreator && !isParticipant) {
            throw new NotFoundError("Room not found");
        }

        // Strip sessions from response — return same shape as getRoomById
        const { sessions: _, ...roomData } = room;
        return roomData;
    },

    async updateRoomProblem(roomId: string, problem: string) {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { sessions: true },
        });

        if (!room) {
            throw new NotFoundError("Room not found");
        }

        const activeSessions = room.sessions.filter((s) => s.endTime === null);
        if (activeSessions.length === 0) {
            throw new BadRequestError("Cannot change problem on an ended room");
        }

        return prisma.room.update({
            where: { id: roomId },
            data: { problem },
        });
    },

    async endRoom(roomId: string) {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
            throw new NotFoundError("Room not found");
        }

        // End ALL active sessions in the room (not just the first one)
        const activeSessions = await prisma.session.findMany({
            where: { roomId, endTime: null },
        });

        if (activeSessions.length === 0) {
            throw new BadRequestError("No active sessions found or room already ended");
        }

        const now = new Date();
        await prisma.session.updateMany({
            where: {
                roomId,
                endTime: null,
            },
            data: { endTime: now },
        });

        // Prefer the room creator's (interviewer) session as primary return value
        const primarySession = activeSessions.find(s => s.userId === room.userId) || activeSessions[0]!;
        const allSessionIds = activeSessions.map((s) => s.id);

        // Flush replay events to database for all participants (fire-and-forget, non-blocking)
        replayService.flushForSessions(roomId, allSessionIds).catch(() => {});

        return { sessionId: primarySession.id };
    },
};
