import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
    auth: (cb) => {
        cb({ token: localStorage.getItem("accessToken") });
    },
});

export default socket;