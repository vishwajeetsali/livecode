import { describe, it, expect } from "vitest";
import authReducer, { setCredentials, logout } from "../features/auth/authSlice";

describe("authSlice Redux Reducer", () => {
    const initialState = {
        user: null,
        accessToken: null,
        isAuthenticated: false,
    };

    it("should handle initial state", () => {
        expect(authReducer(undefined, { type: "unknown" })).toEqual(initialState);
    });

    it("should handle setCredentials", () => {
        const userPayload = {
            id: "user-1",
            name: "John Doe",
            email: "john@example.com",
            role: "INTERVIEWER" as const,
        };

        const state = authReducer(initialState, setCredentials({
            user: userPayload,
            accessToken: "mock_token_abc",
        }));

        expect(state.isAuthenticated).toBe(true);
        expect(state.accessToken).toBe("mock_token_abc");
        expect(state.user).toEqual(userPayload);
    });

    it("should handle logout", () => {
        const loggedInState = {
            user: { id: "user-1", name: "John", email: "john@example.com", role: "CANDIDATE" as const },
            accessToken: "token_123",
            isAuthenticated: true,
        };

        const state = authReducer(loggedInState, logout());
        expect(state.isAuthenticated).toBe(false);
        expect(state.accessToken).toBeNull();
        expect(state.user).toBeNull();
    });
});
