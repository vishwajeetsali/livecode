import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtUser } from "../types/index.js";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "no token" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtUser;
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: "invalid token" });
    }
};