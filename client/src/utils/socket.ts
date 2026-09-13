import { io } from "socket.io-client";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
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
                            `${API_URL}/api/auth/refresh`,
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