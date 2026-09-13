import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { ValidationError } from "../errors/AppError.js";

const mockReqResNext = (body: any) => {
    const req = { body } as Request;
    const res = {} as Response;
    const next = vi.fn();
    return { req, res, next };
};

const testSchema = z.object({
    name: z.string().min(1, "Name is required"),
    age: z.coerce.number().min(0),
});

describe("validate middleware", () => {
    it("passes valid data and replaces req.body with parsed data", () => {
        const { req, res, next } = mockReqResNext({ name: "Alice", age: "25" });

        validate(testSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body).toEqual({ name: "Alice", age: 25 }); // age coerced to number
    });

    it("throws ValidationError on invalid data", () => {
        const { req, res, next } = mockReqResNext({ name: "", age: -1 });

        expect(() => validate(testSchema)(req, res, next)).toThrow(ValidationError);
    });

    it("includes field-level error details", () => {
        const { req, res, next } = mockReqResNext({ name: "" });

        try {
            validate(testSchema)(req, res, next);
        } catch (err: any) {
            expect(err).toBeInstanceOf(ValidationError);
            expect(err.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ field: "name" }),
                ])
            );
        }
    });

    it("does not call next() on validation failure", () => {
        const { req, res, next } = mockReqResNext({});

        try { validate(testSchema)(req, res, next); } catch {}

        expect(next).not.toHaveBeenCalled();
    });

    it("handles nested field paths", () => {
        const nestedSchema = z.object({
            user: z.object({ email: z.string().email() }),
        });
        const { req, res, next } = mockReqResNext({ user: { email: "bad" } });

        try { validate(nestedSchema)(req, res, next); } catch (err: any) {
            expect(err.details[0].field).toBe("user.email");
        }
    });
});
