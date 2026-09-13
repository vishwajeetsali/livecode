import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requestIdMiddleware } from "../middleware/requestId.js";

const mockRes = () => {
    const headers: Record<string, string> = {};
    return {
        setHeader: vi.fn((k: string, v: string) => { headers[k] = v; }),
        _headers: headers,
    } as unknown as Response;
};

describe("requestIdMiddleware", () => {
    it("generates a UUID when no x-request-id header is present", () => {
        const req = { headers: {} } as Request;
        const res = mockRes();
        const next = vi.fn();

        requestIdMiddleware(req, res, next);

        expect(req.id).toBeDefined();
        expect(req.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
        expect(res.setHeader).toHaveBeenCalledWith("X-Request-ID", req.id);
        expect(next).toHaveBeenCalled();
    });

    it("preserves incoming x-request-id header", () => {
        const req = { headers: { "x-request-id": "custom-123" } } as unknown as Request;
        const res = mockRes();
        const next = vi.fn();

        requestIdMiddleware(req, res, next);

        expect(req.id).toBe("custom-123");
        expect(res.setHeader).toHaveBeenCalledWith("X-Request-ID", "custom-123");
        expect(next).toHaveBeenCalled();
    });

    it("sets unique IDs for different requests", () => {
        const req1 = { headers: {} } as Request;
        const req2 = { headers: {} } as Request;
        const res1 = mockRes();
        const res2 = mockRes();
        const next = vi.fn();

        requestIdMiddleware(req1, res1, next);
        requestIdMiddleware(req2, res2, next);

        expect(req1.id).not.toBe(req2.id);
    });

    it("always calls next()", () => {
        const req = { headers: {} } as Request;
        const res = mockRes();
        const next = vi.fn();

        requestIdMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });
});
