import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../app/store";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";

const Navbar = () => {
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        dispatch(logout());
        navigate("/");
    };

    return (
        <nav className="flex items-center justify-between px-8 py-4 border-b border-white/[0.04] backdrop-blur-md bg-[var(--bg-deep)]/80 sticky top-0 z-50">
            {/* Logo */}
            <h1
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
                className="text-white text-xl font-bold cursor-pointer tracking-tight select-none"
            >
                Live<span className="text-[var(--accent)]">Code</span>
                <span className="text-[10px] text-[var(--text-muted)] ml-2 font-medium tracking-wider">AI</span>
            </h1>

            {isAuthenticated ? (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="btn btn-ghost btn-sm"
                    >
                        Dashboard
                    </button>

                    <div className="w-px h-4 bg-white/10 mx-1" />

                    {/* User info */}
                    <div className="flex items-center gap-2 px-2">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="" className="w-6 h-6 rounded-full ring-1 ring-white/10" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[10px] text-[var(--accent)] font-bold">
                                {user?.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                        )}
                        <span className="text-xs text-[var(--text-secondary)] font-medium hidden sm:inline">
                            {user?.name?.split(" ")[0] || "User"}
                        </span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="btn btn-ghost btn-sm text-[var(--text-muted)] hover:text-[var(--danger)]"
                    >
                        Logout
                    </button>
                </div>
            ) : (
                <a href={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/google`}>
                    <button className="btn btn-primary btn-sm">
                        Sign in with Google
                    </button>
                </a>
            )}
        </nav>
    );
};

export default Navbar;