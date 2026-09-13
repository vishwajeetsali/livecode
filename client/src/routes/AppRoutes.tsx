import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import PublicOnlyRoute from "../components/PublicOnlyRoute";

const Landing = lazy(() => import("../pages/Landing"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Room = lazy(() => import("../pages/Room"));
const Mock = lazy(() => import("../pages/Mock"));
const Report = lazy(() => import("../pages/Report"));
const Replay = lazy(() => import("../pages/Replay"));
const AuthCallback = lazy(() => import("../pages/AuthCallback"));
const RoleSelect = lazy(() => import("../pages/RoleSelect"));

const PageLoader = () => (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[var(--text-muted)] font-mono">Loading module...</span>
        </div>
    </div>
);

const AppRoutes = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/role-select" element={<ProtectedRoute><RoleSelect /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/room/:id" element={<ProtectedRoute><Room /></ProtectedRoute>} />
                <Route path="/mock" element={<ProtectedRoute><Mock /></ProtectedRoute>} />
                <Route path="/report/:id" element={<ProtectedRoute><Report /></ProtectedRoute>} />
                <Route path="/replay/:id" element={<ProtectedRoute><Replay /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;