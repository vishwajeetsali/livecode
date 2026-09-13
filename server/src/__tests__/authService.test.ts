import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../services/auth.service.js";
import { UnauthorizedError, NotFoundError } from "../errors/AppError.js";
import { prisma } from "../lib/prisma.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

vi.mock("../lib/prisma.js", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock("../config/env.js", () => ({
    env: {
        JWT_ACCESS_SECRET: "test-access-secret-12345678",
        JWT_REFRESH_SECRET: "test-refresh-secret-12345678",
    },
}));

describe("AuthService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("exchangeCode", () => {
        it("throws UnauthorizedError for empty or invalid code", () => {
            expect(() => AuthService.exchangeCode("")).toThrow(UnauthorizedError);
            expect(() => AuthService.exchangeCode(null as any)).toThrow(UnauthorizedError);
            expect(() => AuthService.exchangeCode("non_existent_code_12345")).toThrow(UnauthorizedError);
        });
    });

    describe("setUserRole", () => {
        it("throws NotFoundError when user does not exist", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

            await expect(AuthService.setUserRole("non-existent-user", "INTERVIEWER")).rejects.toThrow(NotFoundError);
        });

        it("updates user role and returns fresh accessToken with role", async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
                id: "user-1",
                name: "John Doe",
                email: "john@example.com",
                avatar: null,
                role: "CANDIDATE",
            } as any);

            vi.mocked(prisma.user.update).mockResolvedValueOnce({
                id: "user-1",
                name: "John Doe",
                email: "john@example.com",
                avatar: null,
                role: "INTERVIEWER",
            } as any);

            const result = await AuthService.setUserRole("user-1", "INTERVIEWER");

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: "user-1" },
                data: { role: "INTERVIEWER" },
            });
            expect(result.role).toBe("INTERVIEWER");
            expect(result.accessToken).toBeDefined();
        });
    });

    describe("refreshAccessToken", () => {
        it("throws UnauthorizedError when token is missing", async () => {
            await expect(AuthService.refreshAccessToken("")).rejects.toThrow(UnauthorizedError);
        });

        it("throws UnauthorizedError when token is expired", async () => {
            const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEiLCJleHAiOjEwMDAwMH0.signature";
            await expect(AuthService.refreshAccessToken(expiredToken)).rejects.toThrow(UnauthorizedError);
        });

        it("throws UnauthorizedError when token is invalid or malformed", async () => {
            await expect(AuthService.refreshAccessToken("malformed.jwt.token")).rejects.toThrow(UnauthorizedError);
        });

        it("preserves active session candidate role when passed to refreshAccessToken", async () => {
            const rawToken = jwt.sign({ userId: "user-1" }, env.JWT_REFRESH_SECRET);
            const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

            vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
                id: "user-1",
                name: "John",
                email: "john@test.com",
                avatar: null,
                role: "INTERVIEWER",
                refreshToken: tokenHash,
            } as any);

            const result = await AuthService.refreshAccessToken(rawToken, "CANDIDATE");
            const decoded = jwt.decode(result.accessToken) as any;
            expect(decoded.role).toBe("CANDIDATE");
        });
    });
});

