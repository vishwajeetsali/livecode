import { describe, it, expect } from "vitest";
import {
    AppError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from "../errors/AppError.js";

describe("AppError Hierarchy", () => {
    it("should instantiate BadRequestError with status code 400", () => {
        const err = new BadRequestError("Invalid payload");
        expect(err.statusCode).toBe(400);
        expect(err.errorCode).toBe("BAD_REQUEST");
        expect(err.message).toBe("Invalid payload");
    });

    it("should instantiate UnauthorizedError with status code 401", () => {
        const err = new UnauthorizedError();
        expect(err.statusCode).toBe(401);
        expect(err.errorCode).toBe("UNAUTHORIZED");
    });

    it("should instantiate ForbiddenError with status code 403", () => {
        const err = new ForbiddenError();
        expect(err.statusCode).toBe(403);
        expect(err.errorCode).toBe("FORBIDDEN");
    });

    it("should instantiate NotFoundError with status code 404", () => {
        const err = new NotFoundError("Room not found");
        expect(err.statusCode).toBe(404);
        expect(err.errorCode).toBe("NOT_FOUND");
    });

    it("should instantiate ValidationError with status code 422 and details", () => {
        const details = [{ field: "title", issue: "Required" }];
        const err = new ValidationError("Validation error", details);
        expect(err.statusCode).toBe(422);
        expect(err.errorCode).toBe("VALIDATION_ERROR");
        expect(err.details).toEqual(details);
    });
});
