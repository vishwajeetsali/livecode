import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { requirePersistentRole } from "../middleware/requirePersistentRole.js";
import { UnauthorizedError, ForbiddenError } from "../errors/AppError.js";
import { prisma } from "../lib/prisma.js";

vi.mock("../lib/prisma.js", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

describe("requirePersistentRole middleware", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls next(UnauthorizedError) when req.user is missing", async () => {
        const req = {} as Request;
        const res = {} as Response;
        const next = vi.fn();

        await requirePersistentRole(["INTERVIEWER"])(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("calls next() when DB user has allowed role", async () => {
        const req = { user: { userId: "user-123", role: "CANDIDATE" } } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
            id: "user-123",
            role: "INTERVIEWER",
        } as any);

        await requirePersistentRole(["INTERVIEWER"])(req, res, next);

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: "user-123" },
            select: { role: true },
        });
        expect(next).toHaveBeenCalledWith();
    });

    it("calls next(ForbiddenError) when DB user has disallowed role", async () => {
        const req = { user: { userId: "user-123", role: "INTERVIEWER" } } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
            id: "user-123",
            role: "CANDIDATE",
        } as any);

        await requirePersistentRole(["INTERVIEWER"])(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("calls next(ForbiddenError) when DB user is not found", async () => {
        const req = { user: { userId: "user-123", role: "INTERVIEWER" } } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

        await requirePersistentRole(["INTERVIEWER"])(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
});
