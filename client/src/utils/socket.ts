import { io } from "socket.io-client";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
    autoConnect: false,
    auth: async (cb) => {
        let token = localStorage.getItem("accessToken");

        // If token is expired, attempt a refresh before reconnecting
        if (token) {
            try {
                const parts = token.split(".");
                if (parts[1]) {
                    const payload = JSON.parse(atob(parts[1]));
                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        const res = await axios.post(
                            `${API_BASE}/auth/refresh`,
                            { currentRole: payload.role },
                            { withCredentials: true }
                        );
                        const newToken = res.data?.data?.accessToken || res.data?.accessToken;
                        if (newToken) {
                            localStorage.setItem("accessToken", newToken);
                            token = newToken;
                        }
                    }
                }
            } catch {
                // Refresh failed — proceed with expired token (server will reject)
            }
        }

        cb({ token });
    },
});

export default socket;
