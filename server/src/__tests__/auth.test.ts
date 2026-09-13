import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/authorize.js";
import { UnauthorizedError, ForbiddenError } from "../errors/AppError.js";

// Use the same secret as env for tests
vi.mock("../config/env.js", () => ({
    env: { JWT_ACCESS_SECRET: "test-secret-key-12345678" },
}));

const mockUser = { userId: "u1", role: "INTERVIEWER" as const, name: "Test" };

describe("verifyToken middleware", () => {
    it("throws UnauthorizedError when no Authorization header", () => {
        const req = { headers: {} } as Request;
        const res = {} as Response;
        const next = vi.fn();

        expect(() => verifyToken(req, res, next)).toThrow(UnauthorizedError);
        expect(next).not.toHaveBeenCalled();
    });

    it("throws UnauthorizedError when header has no Bearer token", () => {
        const req = { headers: { authorization: "Basic abc" } } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        // "Basic abc".split(" ")[1] = "abc" which is not a valid JWT
        expect(() => verifyToken(req, res, next)).toThrow(UnauthorizedError);
    });

    it("decodes valid JWT and attaches user to req", () => {
        const token = jwt.sign(mockUser, "test-secret-key-12345678");
        const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        verifyToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect((req as any).user).toMatchObject({ userId: "u1", role: "INTERVIEWER" });
    });

    it("throws UnauthorizedError for expired token", () => {
        const token = jwt.sign(mockUser, "test-secret-key-12345678", { expiresIn: "0s" });
        const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        // Small delay to ensure expiry
        expect(() => verifyToken(req, res, next)).toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError for wrong secret", () => {
        const token = jwt.sign(mockUser, "wrong-secret");
        const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        expect(() => verifyToken(req, res, next)).toThrow(UnauthorizedError);
    });
});

describe("requireRole middleware", () => {
    it("calls next() when user has allowed role", () => {
        const req = { user: { userId: "u1", role: "INTERVIEWER" } } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        requireRole(["INTERVIEWER"])(req, res, next);

        expect(next).toHaveBeenCalledWith();
    });

    it("calls next(ForbiddenError) when user role not allowed", () => {
        const req = { user: { userId: "u1", role: "CANDIDATE" } } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        requireRole(["INTERVIEWER"])(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("calls next(UnauthorizedError) when no user present", () => {
        const req = { user: undefined } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        requireRole(["INTERVIEWER"])(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("accepts multiple allowed roles", () => {
        const req = { user: { userId: "u1", role: "CANDIDATE" } } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        requireRole(["INTERVIEWER", "CANDIDATE"])(req, res, next);

        expect(next).toHaveBeenCalledWith();
    });
});
