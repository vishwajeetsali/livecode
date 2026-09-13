import axios from "axios";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.success === true && 'data' in response.data) {
            response.data = response.data.data;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                let currentRole: string | undefined;
                const existingToken = localStorage.getItem("accessToken");
                if (existingToken) {
                    try {
                        const parts = existingToken.split(".");
                        if (parts[1]) {
                            const payload = JSON.parse(atob(parts[1]));
                            currentRole = payload.role;
                        }
                    } catch {}
                }

                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/refresh`,
                    { currentRole },
                    { withCredentials: true }
                );
                const newToken = res.data?.data?.accessToken || res.data?.accessToken;
                if (newToken) {
                    localStorage.setItem("accessToken", newToken);
                    processQueue(null, newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return api(originalRequest);
                } else {
                    throw new Error("No token returned from refresh");
                }
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                localStorage.removeItem("accessToken");
                if (window.location.pathname !== "/") {
                    window.location.href = "/";
                }
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default api;