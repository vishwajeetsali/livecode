import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    req.id = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
};
