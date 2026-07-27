import { prisma } from "../lib/prisma.js";

export const SessionService = {
    async getUserSessions(userId: string, cursor?: string, limit = 10) {
        const take = Math.min(Math.max(limit, 1), 50);

        const sessions = await prisma.session.findMany({
            where: { userId },
            include: { room: true, report: true },
            orderBy: { startTime: "desc" },
            take: take + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        let nextCursor: string | null = null;
        if (sessions.length > take) {
            const nextItem = sessions.pop();
            nextCursor = nextItem?.id || null;
        }

        return {
            items: sessions,
            nextCursor,
            hasMore: !!nextCursor,
        };
    },
};
