import type { Request, Response, NextFunction } from "express";
import type { JwtUser } from "../types/index.js";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";

export const requireRole = (allowedRoles: Array<"INTERVIEWER" | "CANDIDATE">) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const user = req.user as JwtUser | undefined;
        if (!user) {
            return next(new UnauthorizedError());
        }

        if (!allowedRoles.includes(user.role)) {
            return next(new ForbiddenError(`Action restricted to roles: ${allowedRoles.join(", ")}`));
        }

        next();
    };
};
