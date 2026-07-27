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
}

interface DecodedToken {
    userId: string;
    role: "INTERVIEWER" | "CANDIDATE";
    name?: string;
    email?: string;
    avatar?: string | null;
}

const getStoredToken = () => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
    return localStorage.getItem("accessToken");
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

const initialState: AuthState = {
    user: getInitialUser(),
    accessToken: getStoredToken(),
    isAuthenticated: !!getStoredToken(),
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
            state.user = action.payload.user;
            state.accessToken = action.payload.accessToken;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
        },
    },
});



export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;