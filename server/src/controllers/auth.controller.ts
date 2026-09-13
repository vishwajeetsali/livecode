import type { Request, Response } from "express";
import type { JwtUser } from "../types/index.js";
import { AuthService } from "../services/auth.service.js";
import { env } from "../config/env.js";
import { BadRequestError } from "../errors/AppError.js";

export const googleCallback = async (req: Request, res: Response) => {
    const user = req.user as { id: string; isNewUser?: boolean };
    const result = await AuthService.handleGoogleCallback(user.id, user.isNewUser ?? false);

    const isProd = env.NODE_ENV === "production";
    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${env.CLIENT_URL}/auth/callback?code=${result.authCode}`);
};

export const exchangeCode = async (req: Request, res: Response) => {
    const { code } = req.body;
    const result = AuthService.exchangeCode(code);
    res.json({ success: true, data: result });
};

export const setRole = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const { role } = req.body;

    if (role !== "INTERVIEWER" && role !== "CANDIDATE") {
        throw new BadRequestError("Role must be INTERVIEWER or CANDIDATE");
    }

    const result = await AuthService.setUserRole(user.userId, role);
    res.json({ success: true, data: result });
};

export const refreshToken = async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;
    const currentRole = req.body?.currentRole;
    const result = await AuthService.refreshAccessToken(token, currentRole);

    // Set the rotated refresh token cookie
    const isProd = env.NODE_ENV === "production";
    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { accessToken: result.accessToken } });
};

export const logout = async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;
    await AuthService.logout(token);
    const isProd = env.NODE_ENV === "production";
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
    });
    res.json({ success: true, data: { message: "logged out" } });
};