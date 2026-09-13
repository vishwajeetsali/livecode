import { prisma } from "../lib/prisma.js";
import { logger } from "../utils/logger.js";
import type { Prisma } from "@prisma/client";

interface ReplayEventPayload {
    type: "code" | "cursor" | "language";
    timestamp: number;
    data: Record<string, unknown>;
}

// In-memory buffer: roomId → events[]
const roomBuffers = new Map<string, ReplayEventPayload[]>();
const roomStartTimes = new Map<string, number>();

// Periodic cleanup of stale buffers for abandoned rooms (older than 4 hours)
setInterval(() => {
    const now = Date.now();
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    for (const [roomId, startTime] of roomStartTimes.entries()) {
        if (now - startTime > FOUR_HOURS) {
            roomBuffers.delete(roomId);
            roomStartTimes.delete(roomId);
            logger.info("Purged abandoned room replay buffer", { roomId });
        }
    }
}, 30 * 60 * 1000).unref();

export const replayService = {
    /**
     * Mark the start time for a room so we can compute relative timestamps.
     */
    startTracking(roomId: string): void {
        if (!roomStartTimes.has(roomId)) {
            roomStartTimes.set(roomId, Date.now());
        }
    },

    /**
     * Get the relative timestamp (ms since room tracking started).
     */
    getRelativeTimestamp(roomId: string): number {
        const start = roomStartTimes.get(roomId);
        return start ? Date.now() - start : 0;
    },

    /**
     * Buffer a replay event in memory (capped at 5,000 events to prevent OOM).
     */
    buffer(roomId: string, event: ReplayEventPayload): void {
        if (!roomBuffers.has(roomId)) {
            roomBuffers.set(roomId, []);
        }
        const buf = roomBuffers.get(roomId)!;
        if (buf.length >= 5000) {
            buf.shift(); // Evict oldest event
        }
        buf.push(event);
    },

    /**
     * Flush all buffered events for a room to multiple sessions.
     * Called when a multi-participant session ends.
     */
    async flushForSessions(roomId: string, sessionIds: string[]): Promise<number> {
        const events = roomBuffers.get(roomId);
        if (!events || events.length === 0) {
            logger.info("No replay events to flush", { roomId, sessionIds });
            roomBuffers.delete(roomId);
            roomStartTimes.delete(roomId);
            return 0;
        }

        try {
            const createData: Array<{ sessionId: string; type: any; timestamp: number; data: Prisma.InputJsonValue }> = [];
            for (const sessionId of sessionIds) {
                for (const e of events) {
                    createData.push({
                        sessionId,
                        type: e.type,
                        timestamp: e.timestamp,
                        data: e.data as Prisma.InputJsonValue,
                    });
                }
            }

            const result = await prisma.replayEvent.createMany({
                data: createData,
            });

            logger.info("Replay events flushed", {
                roomId,
                sessionIds,
                eventCount: result.count,
            });

            return result.count;
        } catch (error) {
            logger.error("Failed to flush replay events", {
                roomId,
                sessionIds,
                error: error instanceof Error ? error.message : String(error),
            });
            return 0;
        } finally {
            roomBuffers.delete(roomId);
            roomStartTimes.delete(roomId);
        }
    },

    /**
     * Flush all buffered events for a room to a single session.
     * Called when a session ends.
     */
    async flush(roomId: string, sessionId: string): Promise<number> {
        return this.flushForSessions(roomId, [sessionId]);
    },

    /**
     * Retrieve all replay events for a session, ordered by timestamp.
     */
    async getBySessionId(sessionId: string, userId: string) {
        // Verify the user owns this session (same check as report access)
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { userId: true, room: { select: { userId: true } } },
        });

        if (!session) return null;

        // Allow access if user is the candidate OR the room creator (interviewer)
        if (session.userId !== userId && session.room.userId !== userId) {
            return null;
        }

        const events = await prisma.replayEvent.findMany({
            where: { sessionId },
            orderBy: { timestamp: "asc" },
            select: {
                type: true,
                timestamp: true,
                data: true,
            },
        });

        return events;
    },
};
