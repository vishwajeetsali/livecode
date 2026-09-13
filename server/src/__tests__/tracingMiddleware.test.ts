import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { tracingMiddleware, withSpan } from "../middleware/tracing.js";

// Mock OpenTelemetry API
const mockSpan = {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
};

vi.mock("@opentelemetry/api", () => {
    const SpanStatusCode = { OK: 1, ERROR: 2 };
    return {
        trace: {
            getActiveSpan: vi.fn(() => mockSpan),
            getTracer: vi.fn(() => ({
                startActiveSpan: vi.fn((name: string, fn: any) => fn(mockSpan)),
            })),
        },
        SpanStatusCode,
    };
});

describe("tracingMiddleware", () => {
    beforeEach(() => vi.clearAllMocks());

    it("enriches span with request ID", () => {
        const req = { id: "req-123", headers: {}, route: { path: "/test" } } as unknown as Request;
        const res = { on: vi.fn() } as unknown as Response;
        const next = vi.fn();

        tracingMiddleware(req, res, next);

        expect(mockSpan.setAttribute).toHaveBeenCalledWith("http.request_id", "req-123");
        expect(next).toHaveBeenCalled();
    });

    it("enriches span with user context when present", () => {
        const req = {
            id: "req-456",
            headers: {},
            user: { userId: "u1", role: "INTERVIEWER" },
            route: { path: "/api/rooms" },
        } as unknown as Request;
        const res = { on: vi.fn() } as unknown as Response;
        const next = vi.fn();

        tracingMiddleware(req, res, next);

        expect(mockSpan.setAttribute).toHaveBeenCalledWith("user.id", "u1");
        expect(mockSpan.setAttribute).toHaveBeenCalledWith("user.role", "INTERVIEWER");
    });

    it("sets route attribute", () => {
        const req = { headers: {}, route: { path: "/api/code/execute" }, path: "/api/code/execute" } as unknown as Request;
        const res = { on: vi.fn() } as unknown as Response;
        const next = vi.fn();

        tracingMiddleware(req, res, next);

        expect(mockSpan.setAttribute).toHaveBeenCalledWith("http.route", "/api/code/execute");
    });

    it("always calls next()", () => {
        const req = { headers: {}, path: "/" } as unknown as Request;
        const res = { on: vi.fn() } as unknown as Response;
        const next = vi.fn();

        tracingMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});

describe("withSpan", () => {
    beforeEach(() => vi.clearAllMocks());

    it("creates span with attributes and returns result", async () => {
        const result = await withSpan("test-op", { key: "val" }, async (span) => {
            return 42;
        });

        expect(result).toBe(42);
        expect(mockSpan.setAttribute).toHaveBeenCalledWith("key", "val");
        expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 }); // OK
        expect(mockSpan.end).toHaveBeenCalled();
    });

    it("records error and rethrows on failure", async () => {
        const error = new Error("boom");

        await expect(
            withSpan("fail-op", {}, async () => { throw error; })
        ).rejects.toThrow("boom");

        expect(mockSpan.setStatus).toHaveBeenCalledWith(
            expect.objectContaining({ code: 2, message: "boom" })
        );
        expect(mockSpan.recordException).toHaveBeenCalledWith(error);
        expect(mockSpan.end).toHaveBeenCalled();
    });

    it("always ends the span even on error", async () => {
        try {
            await withSpan("err-op", {}, async () => { throw new Error("x"); });
        } catch {}

        expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });
});
