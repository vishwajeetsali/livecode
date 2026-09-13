import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";
import { logger } from "../utils/logger.js";
import { ZodError } from "zod";
import { env } from "../config/env.js";

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

    // Google OAuth TokenError
    if (err.name === "TokenError") {
        logger.error("Google OAuth Token Error", { requestId, message: err.message });
        return res.status(400).json({
            success: false,
            error: {
                message: "Authentication failed with Google OAuth.",
                code: "OAUTH_TOKEN_ERROR",
                statusCode: 400,
                details: null,
            },
        });
    }

    // JWT verification errors
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        logger.warn("JWT Verification Error", { requestId, message: err.message });
        return res.status(401).json({
            success: false,
            error: {
                message: "Invalid or expired token",
                code: "UNAUTHORIZED",
                statusCode: 401,
                details: null,
            },
        });
    }

    // Multer file upload errors
    if (err.name === "MulterError") {
        const multerErr = err as Error & { code?: string };
        const statusCode = multerErr.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        const message = multerErr.code === "LIMIT_FILE_SIZE"
            ? "Uploaded file exceeds the maximum 25MB limit"
            : err.message || "File upload error";

        logger.warn("Multer Upload Error", { requestId, code: multerErr.code, message });
        return res.status(statusCode).json({
            success: false,
            error: {
                message,
                code: multerErr.code === "LIMIT_FILE_SIZE" ? "PAYLOAD_TOO_LARGE" : "INVALID_FILE_UPLOAD",
                statusCode,
                details: null,
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

    const statusCode = (err as Error & { statusCode?: number }).statusCode || 500;
    const isProd = env.NODE_ENV === "production";

    return res.status(statusCode).json({
        success: false,
        error: {
            message: isProd ? "Internal server error" : err.message || "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
            statusCode,
            details: null,
        },
    });
};
