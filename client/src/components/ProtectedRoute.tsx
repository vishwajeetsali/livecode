import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../app/store";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { logout } from "../features/auth/authSlice";
import { useEffect, useState } from "react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, accessToken } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!accessToken) return;
        try {
            const decoded = jwtDecode<{ exp?: number }>(accessToken);
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                localStorage.removeItem("accessToken");
                dispatch(logout());
                setIsExpired(true);
            }
        } catch {
            localStorage.removeItem("accessToken");
            dispatch(logout());
            setIsExpired(true);
        }
    }, [accessToken, dispatch]);

    if (!isAuthenticated || !accessToken || isExpired) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;