import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../utils/tokens.js";
import { env } from "../config/env.js";
import { UnauthorizedError, NotFoundError } from "../errors/AppError.js";
import { logger } from "../utils/logger.js";

// In-memory store for short-lived one-time OAuth auth codes (expires in 60s)
const authCodes = new Map<string, { userId: string; accessToken: string; isNewUser: boolean; expiresAt: number }>();

// Periodic cleanup of expired auth codes to prevent memory leaks (every 5 min)
setInterval(() => {
    const now = Date.now();
    for (const [code, data] of authCodes.entries()) {
        if (data.expiresAt < now) {
            authCodes.delete(code);
        }
    }
}, 5 * 60 * 1000).unref(); // .unref() so this timer doesn't prevent process exit

const hashToken = (token: string) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};

export const AuthService = {
    async handleGoogleCallback(userId: string, isNewUser = false) {
        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!dbUser) throw new NotFoundError("User not found");

        const profile = { name: dbUser.name, email: dbUser.email, avatar: dbUser.avatar };
        const accessToken = generateAccessToken(userId, dbUser.role, profile);
        const refreshToken = generateRefreshToken(userId);

        const hashedRefreshToken = hashToken(refreshToken);

        await prisma.user.update({
            where: { id: userId },
            data: { refreshToken: hashedRefreshToken },
        });

        // Generate short-lived 1-time auth code (60 seconds expiration)
        const authCode = crypto.randomBytes(32).toString("hex");
        authCodes.set(authCode, {
            userId,
            accessToken,
            isNewUser,
            expiresAt: Date.now() + 60 * 1000,
        });

        logger.info("Auth code generated and stored", {
            userId,
            codePrefix: authCode.substring(0, 8),
            mapSize: authCodes.size,
        });

        return { accessToken, refreshToken, authCode };
    },

    exchangeCode(code: string) {
        if (!code || typeof code !== "string") {
            throw new UnauthorizedError("Authorization code required");
        }

        const authData = authCodes.get(code);
        logger.info("Exchange attempt", {
            codePrefix: code.substring(0, 8),
            found: !!authData,
            mapSize: authCodes.size,
            expired: authData ? authData.expiresAt < Date.now() : null,
        });

        if (!authData || authData.expiresAt < Date.now()) {
            authCodes.delete(code);
            throw new UnauthorizedError("Invalid or expired authorization code");
        }

        // Code is single-use
        authCodes.delete(code);

        return { accessToken: authData.accessToken, isNewUser: authData.isNewUser };
    },

    async setUserRole(userId: string, role: "INTERVIEWER" | "CANDIDATE") {
        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!dbUser) throw new NotFoundError("User not found");

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
        });

        const profile = { name: updatedUser.name, email: updatedUser.email, avatar: updatedUser.avatar };
        const accessToken = generateAccessToken(userId, updatedUser.role, profile);

        return { accessToken, role: updatedUser.role };
    },

    async refreshAccessToken(token: string, currentRole?: string) {
        if (!token) throw new UnauthorizedError("Refresh token required");

        let decoded: { userId: string };
        try {
            decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
        } catch {
            throw new UnauthorizedError("Invalid or expired refresh token");
        }

        const dbUser = await prisma.user.findUnique({ where: { id: decoded.userId } });

        if (!dbUser || !dbUser.refreshToken) {
            throw new UnauthorizedError("User not found or session expired");
        }

        // Compare hashed token
        const incomingHash = hashToken(token);
        if (dbUser.refreshToken !== incomingHash) {
            throw new UnauthorizedError("Invalid refresh token");
        }

        const roleToIssue = currentRole === "CANDIDATE" || currentRole === "INTERVIEWER"
            ? currentRole
            : dbUser.role;

        // Rotate refresh token: generate a new one and invalidate the old one
        const newRefreshToken = generateRefreshToken(decoded.userId);
        const newHashedRefreshToken = hashToken(newRefreshToken);

        await prisma.user.update({
            where: { id: decoded.userId },
            data: { refreshToken: newHashedRefreshToken },
        });

        const profile = { name: dbUser.name, email: dbUser.email, avatar: dbUser.avatar };
        return {
            accessToken: generateAccessToken(decoded.userId, roleToIssue, profile),
            refreshToken: newRefreshToken,
        };
    },

    async logout(token?: string) {
        if (token) {
            try {
                const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
                await prisma.user.update({
                    where: { id: decoded.userId },
                    data: { refreshToken: null },
                });
            } catch {
                // Token is invalid/expired — still clear the cookie on the controller side
            }
        }
    },
};

