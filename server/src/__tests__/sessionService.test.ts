import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
const mockFindMany = vi.fn();
vi.mock("../lib/prisma.js", () => ({
    prisma: {
        session: { findMany: (...args: any[]) => mockFindMany(...args) },
    },
}));

import { SessionService } from "../services/session.service.js";

describe("SessionService.getUserSessions", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns sessions with pagination info", async () => {
        const sessions = [{ id: "s1" }, { id: "s2" }];
        mockFindMany.mockResolvedValue(sessions);

        const result = await SessionService.getUserSessions("user1");

        expect(result.items).toHaveLength(2);
        expect(result.hasMore).toBe(false);
        expect(result.nextCursor).toBeNull();
    });

    it("clamps limit to minimum of 1", async () => {
        mockFindMany.mockResolvedValue([]);

        await SessionService.getUserSessions("user1", undefined, 0);

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 2 }) // min(max(0,1),50) + 1 = 2
        );
    });

    it("clamps limit to maximum of 50", async () => {
        mockFindMany.mockResolvedValue([]);

        await SessionService.getUserSessions("user1", undefined, 999);

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 51 }) // 50 + 1
        );
    });

    it("sets nextCursor when more items exist", async () => {
        // Return 11 items when take is 10+1=11
        const sessions = Array.from({ length: 11 }, (_, i) => ({ id: `s${i}` }));
        mockFindMany.mockResolvedValue(sessions);

        const result = await SessionService.getUserSessions("user1", undefined, 10);

        expect(result.hasMore).toBe(true);
        expect(result.nextCursor).toBe("s9");
        expect(result.items).toHaveLength(10);
    });

    it("uses cursor for pagination when provided", async () => {
        mockFindMany.mockResolvedValue([]);

        await SessionService.getUserSessions("user1", "cursor-abc");

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                cursor: { id: "cursor-abc" },
                skip: 1,
            })
        );
    });

    it("handles NaN limit by defaulting to 10", async () => {
        mockFindMany.mockResolvedValue([]);

        await SessionService.getUserSessions("user1", undefined, NaN as any);

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 11 }) // default 10 + 1 = 11
        );
    });
});
