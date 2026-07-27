import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../utils/tokens.js";
import { env } from "../config/env.js";
import { UnauthorizedError, NotFoundError } from "../errors/AppError.js";

// In-memory store for short-lived one-time OAuth auth codes (expires in 60s)
const authCodes = new Map<string, { userId: string; accessToken: string; expiresAt: number }>();

// Helper to hash refresh tokens before storing in database
const hashToken = (token: string) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};

export const googleCallback = async (req: Request, res: Response) => {
    const user = req.user as { id: string; name: string; email: string; avatar?: string | null };

    // fetch role from DB
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new NotFoundError("User not found");

    const profile = { name: dbUser.name, email: dbUser.email, avatar: dbUser.avatar };
    const accessToken = generateAccessToken(user.id, dbUser.role, profile);
    const refreshToken = generateRefreshToken(user.id);

    const hashedRefreshToken = hashToken(refreshToken);

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken },
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Generate short-lived 1-time auth code (60 seconds expiration)
    const code = crypto.randomBytes(32).toString("hex");
    authCodes.set(code, {
        userId: user.id,
        accessToken,
        expiresAt: Date.now() + 60 * 1000,
    });

    res.redirect(`${env.CLIENT_URL}/auth/callback?code=${code}`);
};

export const exchangeCode = async (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
        throw new UnauthorizedError("Authorization code required");
    }

    const authData = authCodes.get(code);
    if (!authData || authData.expiresAt < Date.now()) {
        authCodes.delete(code);
        throw new UnauthorizedError("Invalid or expired authorization code");
    }

    // Code is single-use
    authCodes.delete(code);

    res.json({ accessToken: authData.accessToken });
};

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) return res.status(401).json({ message: "no token" });

        const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
        const dbUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!dbUser || !dbUser.refreshToken) return res.status(401).json({ message: "user not found" });

        // Compare hashed token
        const incomingHash = hashToken(token);
        if (dbUser.refreshToken !== incomingHash) {
            return res.status(401).json({ message: "invalid token" });
        }

        const profile = { name: dbUser.name, email: dbUser.email, avatar: dbUser.avatar };
        const newAccessToken = generateAccessToken(decoded.userId, dbUser.role, profile);
        res.json({ accessToken: newAccessToken });
    } catch {
        res.status(401).json({ message: "invalid token" });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken;
        if (token) {
            const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
            await prisma.user.update({
                where: { id: decoded.userId },
                data: { refreshToken: null },
            });
        }
        res.clearCookie("refreshToken");
        res.json({ message: "logged out" });
    } catch (error) {
        res.status(500).json({ message: "server error" });
    }
};