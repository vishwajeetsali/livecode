import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

/**
 * Express middleware that validates req.body against a Zod schema.
 * Returns 400 with a structured error array on failure.
 */
export const validate =
    (schema: ZodSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map((e) => ({
                field: e.path.join("."),
                message: e.message,
            }));
            return res.status(400).json({ message: "Validation failed", errors });
        }
        req.body = result.data; // replace with parsed + coerced data
        next();
    };
