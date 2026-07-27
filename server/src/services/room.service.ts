import { prisma } from "../lib/prisma.js";
import { generateAccessToken } from "../utils/tokens.js";
import { NotFoundError, BadRequestError } from "../errors/AppError.js";
import type { RoomMode } from "@prisma/client";

export const RoomService = {
    async createRoom(userId: string, mode: RoomMode = "LIVE") {
        const room = await prisma.room.create({
            data: {
                userId,
                mode,
            },
        });

        await prisma.user.update({
            where: { id: userId },
            data: { role: "INTERVIEWER" },
        });

        const session = await prisma.session.create({
            data: {
                roomId: room.id,
                userId,
            },
        });

        const profile = { name: "", email: "" };
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            profile.name = user.name;
            profile.email = user.email;
        }

        const accessToken = generateAccessToken(userId, "INTERVIEWER", profile);

        return {
            id: room.id,
            sessionId: session.id,
            accessToken,
        };
    },

    async joinRoom(userId: string, roomId: string) {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { sessions: true },
        });

        if (!room) {
            throw new NotFoundError("Room not found");
        }

        const activeSession = room.sessions.find((s) => s.endTime === null);
        if (!activeSession) {
            throw new BadRequestError("Room has already ended");
        }

        await prisma.user.update({
            where: { id: userId },
            data: { role: "CANDIDATE" },
        });

        const session = await prisma.session.create({
            data: {
                roomId,
                userId,
            },
        });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const profile = { name: user?.name || "", email: user?.email || "" };
        const accessToken = generateAccessToken(userId, "CANDIDATE", profile);

        return {
            id: room.id,
            sessionId: session.id,
            accessToken,
        };
    },

    async getRoomById(roomId: string) {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
            throw new NotFoundError("Room not found");
        }
        return room;
    },

    async updateRoomProblem(roomId: string, problem: string) {
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

        const activeSession = await prisma.session.findFirst({
            where: { roomId, endTime: null },
            orderBy: { startTime: "desc" },
        });

        if (!activeSession) {
            throw new BadRequestError("Session not found or already ended");
        }

        const updatedSession = await prisma.session.update({
            where: { id: activeSession.id },
            data: { endTime: new Date() },
        });

        return { sessionId: updatedSession.id };
    },
};
