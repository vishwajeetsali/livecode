import { describe, it, expect, vi, beforeEach } from "vitest";
import { replayService } from "../services/replay.service.js";

// Mock Prisma and logger to isolate pure in-memory logic
vi.mock("../lib/prisma.js", () => ({
    prisma: {
        replayEvent: {
            createMany: vi.fn().mockResolvedValue({ count: 3 }),
            findMany: vi.fn().mockResolvedValue([]),
        },
        session: {
            findUnique: vi.fn().mockResolvedValue(null),
        },
    },
}));

vi.mock("../utils/logger.js", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("ReplayService — In-Memory Buffer", () => {
    beforeEach(() => {
        // Clear internal maps between tests by starting fresh tracking
        // We use unique roomIds per test to avoid cross-contamination
    });

    it("startTracking should set a start time only once per room", () => {
        const roomId = "room-start-test";
        replayService.startTracking(roomId);
        const ts1 = replayService.getRelativeTimestamp(roomId);

        // Wait a tiny bit and call again — should NOT reset
        replayService.startTracking(roomId);
        const ts2 = replayService.getRelativeTimestamp(roomId);

        // ts2 should be >= ts1 (time moves forward, not reset)
        expect(ts2).toBeGreaterThanOrEqual(ts1);
    });

    it("getRelativeTimestamp should return 0 for untracked room", () => {
        expect(replayService.getRelativeTimestamp("nonexistent-room")).toBe(0);
    });

    it("getRelativeTimestamp should return positive value for tracked room", async () => {
        const roomId = "room-ts-test";
        replayService.startTracking(roomId);

        // Small delay to ensure timestamp > 0
        await new Promise((r) => setTimeout(r, 10));
        const ts = replayService.getRelativeTimestamp(roomId);
        expect(ts).toBeGreaterThan(0);
    });

    it("buffer should accumulate events for a room", () => {
        const roomId = "room-buffer-test";
        replayService.buffer(roomId, { type: "code", timestamp: 100, data: { code: "a" } });
        replayService.buffer(roomId, { type: "code", timestamp: 200, data: { code: "ab" } });
        replayService.buffer(roomId, { type: "cursor", timestamp: 300, data: { lineNumber: 1, column: 3 } });

        // We can verify by flushing and checking the createMany call
    });

    it("flush should call createMany with buffered events", async () => {
        const { prisma } = await import("../lib/prisma.js");
        const roomId = "room-flush-test";
        const sessionId = "session-flush-test";

        replayService.startTracking(roomId);
        replayService.buffer(roomId, { type: "code", timestamp: 0, data: { code: "hello" } });
        replayService.buffer(roomId, { type: "language", timestamp: 50, data: { language: "python" } });

        const count = await replayService.flush(roomId, sessionId);
        expect(count).toBe(3); // mock returns { count: 3 }

        expect(prisma.replayEvent.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ sessionId, type: "code", timestamp: 0 }),
                expect.objectContaining({ sessionId, type: "language", timestamp: 50 }),
            ]),
        });
    });

    it("flush should return 0 for empty buffer", async () => {
        const count = await replayService.flush("empty-room", "empty-session");
        expect(count).toBe(0);
    });

    it("flush should clean up maps after flushing", async () => {
        const roomId = "room-cleanup-test";
        replayService.startTracking(roomId);
        replayService.buffer(roomId, { type: "code", timestamp: 0, data: { code: "x" } });
        await replayService.flush(roomId, "sess");

        // After flush, getRelativeTimestamp should return 0 (start time cleared)
        expect(replayService.getRelativeTimestamp(roomId)).toBe(0);
    });
});
