import type { Request, Response, NextFunction } from "express";
import type { JwtUser } from "../types/index.js";
import { prisma } from "../lib/prisma.js";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";

/**
 * Checks the user's PERSISTENT role in the database, not the session-scoped JWT role.
 * Use this for global resources (e.g. Problem Bank) that shouldn't be accessible
 * just because a user created a room and got a session-scoped INTERVIEWER token.
 */
export const requirePersistentRole = (allowedRoles: Array<"INTERVIEWER" | "CANDIDATE">) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
        const user = req.user as JwtUser | undefined;
        if (!user) {
            return next(new UnauthorizedError());
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { role: true },
        });

        if (!dbUser || !allowedRoles.includes(dbUser.role)) {
            return next(new ForbiddenError(`Action restricted to roles: ${allowedRoles.join(", ")}`));
        }

        next();
    };
};
