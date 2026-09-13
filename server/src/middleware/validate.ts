import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { ValidationError } from "../errors/AppError.js";

/**
 * Express middleware that validates req.body against a Zod schema.
 * Throws a ValidationError on failure, which is handled by the centralized
 * error handler to produce a consistent { success, error } response shape.
 */
export const validate =
    (schema: ZodSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const details = result.error.issues.map((e) => ({
                field: e.path.join("."),
                message: e.message,
            }));
            throw new ValidationError("Validation failed", details);
        }
        req.body = result.data; // replace with parsed + coerced data
        next();
    };
