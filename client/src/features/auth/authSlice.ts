import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: "INTERVIEWER" | "CANDIDATE";
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    /** The user's persistent role from the database (set at login/role-select) */
    baseRole: "INTERVIEWER" | "CANDIDATE" | null;
}

interface DecodedToken {
    userId: string;
    role: "INTERVIEWER" | "CANDIDATE";
    name?: string;
    email?: string;
    avatar?: string | null;
}

const getStoredToken = (): string | null => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    // Clear expired tokens so we don't make doomed API calls on page load
    try {
        const decoded = jwtDecode<{ exp?: number }>(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            localStorage.removeItem("accessToken");
            return null;
        }
    } catch {
        localStorage.removeItem("accessToken");
        return null;
    }
    return token;
};

const getInitialUser = () => {
    const token = getStoredToken();
    if (!token) return null;
    try {
        const decoded = jwtDecode<DecodedToken>(token);
        return {
            id: decoded.userId,
            name: decoded.name || "",
            email: decoded.email || "",
            avatar: decoded.avatar || undefined,
            role: decoded.role,
        };
    } catch {
        return null;
    }
};

const initialUser = getInitialUser();

const initialState: AuthState = {
    user: initialUser,
    accessToken: getStoredToken(),
    isAuthenticated: !!getStoredToken(),
    baseRole: initialUser?.role ?? null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
            state.user = action.payload.user;
            state.accessToken = action.payload.accessToken;
            state.isAuthenticated = true;
            // Only update baseRole if not already set (first login / role selection)
            if (!state.baseRole) {
                state.baseRole = action.payload.user.role;
            }
        },
        /** Update the persistent base role (called after role selection or role change) */
        setBaseRole: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
            state.user = action.payload.user;
            state.accessToken = action.payload.accessToken;
            state.isAuthenticated = true;
            state.baseRole = action.payload.user.role;
        },
        /** Reset user.role back to the persistent base role (call when leaving a room) */
        resetToBaseRole: (state) => {
            if (state.user && state.baseRole) {
                state.user.role = state.baseRole;
            }
        },
        logout: (state) => {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
            state.baseRole = null;
        },
    },
});

export const { setCredentials, setBaseRole, resetToBaseRole, logout } = authSlice.actions;
export default authSlice.reducer;