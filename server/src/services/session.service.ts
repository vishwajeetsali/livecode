import { prisma } from "../lib/prisma.js";

export const SessionService = {
    async getUserSessions(userId: string, cursor?: string, limit = 10) {
        const safeLimit = typeof limit === "number" && !isNaN(limit) ? limit : 10;
        const take = Math.min(Math.max(safeLimit, 1), 50);

        const sessions = await prisma.session.findMany({
            where: { userId },
            include: { room: true, report: true },
            orderBy: { startTime: "desc" },
            take: take + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        let nextCursor: string | null = null;
        if (sessions.length > take) {
            sessions.pop();
            nextCursor = sessions[sessions.length - 1]?.id || null;
        }

        return {
            items: sessions,
            nextCursor,
            hasMore: !!nextCursor,
        };
    },
};
