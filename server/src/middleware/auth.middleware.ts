import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtUser } from "../types/index.js";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../errors/AppError.js";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) throw new UnauthorizedError("Authentication token is required");

    try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUser;
        req.user = decoded;
        next();
    } catch {
        throw new UnauthorizedError("Invalid or expired authentication token");
    }
};