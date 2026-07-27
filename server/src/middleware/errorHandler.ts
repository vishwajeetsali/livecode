import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";
import { logger } from "../utils/logger.js";
import { ZodError } from "zod";

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.id;

    // Custom AppError
    if (err instanceof AppError) {
        logger.warn(err.message, {
            requestId,
            statusCode: err.statusCode,
            errorCode: err.errorCode,
            details: err.details,
            path: req.originalUrl,
            method: req.method,
        });

        return res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                code: err.errorCode,
                statusCode: err.statusCode,
                details: err.details || null,
            },
        });
    }

    // Zod validation error
    if (err instanceof ZodError) {
        logger.warn("Validation Error", {
            requestId,
            issues: err.issues,
            path: req.originalUrl,
            method: req.method,
        });

        return res.status(422).json({
            success: false,
            error: {
                message: "Validation error",
                code: "VALIDATION_ERROR",
                statusCode: 422,
                details: err.issues,
            },
        });
    }

    // Prisma / DB errors or Unhandled internal errors
    logger.error(err.message || "Unhandled exception", {
        requestId,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method,
    });

    const statusCode = (err as any).statusCode || 500;
    const isProd = process.env.NODE_ENV === "production";

    return res.status(statusCode).json({
        success: false,
        error: {
            message: isProd ? "Internal server error" : err.message || "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
            statusCode,
            details: isProd ? null : err.stack,
        },
    });
};
