import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/tokens.js";
import { env } from "../config/env.js";

describe("JWT Token Utils", () => {
    it("should generate a valid signed access token containing user payload", () => {
        const token = generateAccessToken("user-123", "INTERVIEWER", { name: "Alice", email: "alice@test.com" });
        expect(typeof token).toBe("string");

        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
        expect(decoded.userId).toBe("user-123");
        expect(decoded.role).toBe("INTERVIEWER");
        expect(decoded.name).toBe("Alice");
    });

    it("should generate a valid signed refresh token containing userId", () => {
        const token = generateRefreshToken("user-123");
        expect(typeof token).toBe("string");

        const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
        expect(decoded.userId).toBe("user-123");
    });
});
