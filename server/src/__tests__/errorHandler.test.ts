import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { errorHandler } from "../middleware/errorHandler.js";
import { AppError, BadRequestError, NotFoundError, ValidationError } from "../errors/AppError.js";
import { ZodError } from "zod";

vi.mock("../utils/logger.js", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../config/env.js", () => ({
    env: {
        NODE_ENV: "development",
        PORT: 5000,
        JWT_ACCESS_SECRET: "test",
        JWT_REFRESH_SECRET: "test",
        CLIENT_URL: "http://localhost:5173",
        JUDGE0_URL: "test",
        GROQ_API_KEY: "test",
        GOOGLE_CLIENT_ID: "test",
        GOOGLE_CLIENT_SECRET: "test",
        DATABASE_URL: "test",
    },
}));

function createMockReqRes() {
    const req = { id: "req-123", originalUrl: "/test", method: "POST" } as unknown as Request;
    const statusFn = vi.fn().mockReturnThis();
    const jsonFn = vi.fn().mockReturnThis();
    const res = { status: statusFn, json: jsonFn } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next, statusFn, jsonFn };
}

describe("errorHandler middleware", () => {
    beforeEach(() => vi.clearAllMocks());

    it("should handle AppError (BadRequestError) with 400", () => {
        const { req, res, next, statusFn, jsonFn } = createMockReqRes();
        const err = new BadRequestError("Invalid input");

        errorHandler(err, req, res, next);

        expect(statusFn).toHaveBeenCalledWith(400);
        expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                message: "Invalid input",
                code: "BAD_REQUEST",
                statusCode: 400,
            }),
        }));
    });

    it("should handle NotFoundError with 404", () => {
        const { req, res, next, statusFn, jsonFn } = createMockReqRes();
        const err = new NotFoundError("Room not found");

        errorHandler(err, req, res, next);

        expect(statusFn).toHaveBeenCalledWith(404);
        expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                code: "NOT_FOUND",
            }),
        }));
    });

    it("should handle ValidationError with details", () => {
        const { req, res, next, statusFn, jsonFn } = createMockReqRes();
        const details = [{ field: "title", issue: "Required" }];
        const err = new ValidationError("Validation failed", details);

        errorHandler(err, req, res, next);

        expect(statusFn).toHaveBeenCalledWith(422);
        expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({
                code: "VALIDATION_ERROR",
                details,
            }),
        }));
    });

    it("should handle ZodError with 422", () => {
        const { req, res, next, statusFn, jsonFn } = createMockReqRes();
        const zodErr = new ZodError([{
            code: "invalid_type",
            expected: "string",
            path: ["name"],
            message: "Expected string",
        } as any]);

        errorHandler(zodErr, req, res, next);

        expect(statusFn).toHaveBeenCalledWith(422);
        expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({
                code: "VALIDATION_ERROR",
                message: "Validation error",
            }),
        }));
    });

    it("should handle TokenError with 400", () => {
        const { req, res, next, statusFn, jsonFn } = createMockReqRes();
        const err = new Error("Invalid token");
        err.name = "TokenError";

        errorHandler(err, req, res, next);

        expect(statusFn).toHaveBeenCalledWith(400);
        expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({
                code: "OAUTH_TOKEN_ERROR",
            }),
        }));
    });

    it("should handle unhandled errors with 500 (dev mode shows message)", () => {
        const { req, res, next, statusFn, jsonFn } = createMockReqRes();
        const err = new Error("Something unexpected");

        errorHandler(err, req, res, next);

        expect(statusFn).toHaveBeenCalledWith(500);
        expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({
                code: "INTERNAL_SERVER_ERROR",
                message: "Something unexpected", // shown in dev
            }),
        }));
    });

    it("should handle Multer LIMIT_FILE_SIZE with 413", () => {
        const { req, res, next, statusFn, jsonFn } = createMockReqRes();
        const err = new Error("File too large") as any;
        err.name = "MulterError";
        err.code = "LIMIT_FILE_SIZE";

        errorHandler(err, req, res, next);

        expect(statusFn).toHaveBeenCalledWith(413);
        expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({
                code: "PAYLOAD_TOO_LARGE",
                statusCode: 413,
                message: "Uploaded file exceeds the maximum 25MB limit",
            }),
        }));
    });

    it("should handle JWT verification errors with 401", () => {
        const { req, res, next, statusFn, jsonFn } = createMockReqRes();
        const err = new Error("jwt expired");
        err.name = "TokenExpiredError";

        errorHandler(err, req, res, next);

        expect(statusFn).toHaveBeenCalledWith(401);
        expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({
                code: "UNAUTHORIZED",
                statusCode: 401,
            }),
        }));
    });
});
