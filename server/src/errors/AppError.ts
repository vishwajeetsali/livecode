export class AppError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: string;
    public readonly isOperational: boolean;
    public readonly details?: any;

    constructor(message: string, statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR", isOperational = true, details?: any) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Bad request", errorCode = "BAD_REQUEST", details?: any) {
        super(message, 400, errorCode, true, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized access", errorCode = "UNAUTHORIZED", details?: any) {
        super(message, 401, errorCode, true, details);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden action", errorCode = "FORBIDDEN", details?: any) {
        super(message, 403, errorCode, true, details);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource not found", errorCode = "NOT_FOUND", details?: any) {
        super(message, 404, errorCode, true, details);
    }
}

export class ConflictError extends AppError {
    constructor(message = "Resource conflict", errorCode = "CONFLICT", details?: any) {
        super(message, 409, errorCode, true, details);
    }
}

export class ValidationError extends AppError {
    constructor(message = "Validation failed", details?: any) {
        super(message, 422, "VALIDATION_ERROR", true, details);
    }
}

export class InternalServerError extends AppError {
    constructor(message = "Internal server error", details?: any) {
        super(message, 500, "INTERNAL_SERVER_ERROR", false, details);
    }
}
