import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../features/auth/authSlice";
import { jwtDecode } from "jwt-decode";
import api from "../utils/api";

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const exchanged = useRef(false);

    useEffect(() => {
        if (exchanged.current) return;
        exchanged.current = true;

        const handleAuth = async () => {
            const code = searchParams.get("code");
            const tokenParam = searchParams.get("token");

            let token = tokenParam;
            let isNewUser = false;

            if (code) {
                try {
                    const res = await api.post("/auth/exchange", { code });
                    token = res.data.accessToken;
                    isNewUser = res.data.isNewUser ?? false;
                } catch {
                    navigate("/");
                    return;
                }
            }

            if (token) {
                localStorage.setItem("accessToken", token);

                const decoded = jwtDecode<{ userId: string; role: "INTERVIEWER" | "CANDIDATE"; name?: string; email?: string; avatar?: string | null }>(token);

                dispatch(setCredentials({
                    user: {
                        id: decoded.userId,
                        name: decoded.name || "",
                        email: decoded.email || "",
                        avatar: decoded.avatar || undefined,
                        role: decoded.role,
                    },
                    accessToken: token,
                }));

                navigate(isNewUser ? "/role-select" : "/dashboard");
            } else {
                // No code or token — nothing to exchange, redirect to home
                navigate("/");
            }
        };

        handleAuth();
    }, [dispatch, navigate, searchParams]);


    return <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">Logging in...</div>;
};

export default AuthCallback;