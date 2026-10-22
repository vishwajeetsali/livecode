import express from "express";
import crypto from "crypto";
import passport from "../config/passport.js";
import { googleCallback, refreshToken, logout, exchangeCode, setRole } from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { env } from "../config/env.js";

const router = express.Router();

const isSecureRequest = (req: express.Request) => {
    return req.secure || req.headers["x-forwarded-proto"] === "https";
};

// start google login
router.get("/google", (req, res, next) => {
    const state = crypto.randomBytes(32).toString("hex");
    const isSecure = isSecureRequest(req);
    res.cookie("oauth_state", state, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
        path: "/",
        maxAge: 10 * 60 * 1000, // 10 minutes
    });
    passport.authenticate("google", {
        scope: ["profile", "email"],
        state,
    })(req, res, next);
});

// google redirects here
router.get("/google/callback",
    (req, res, next) => {
        const queryState = req.query.state as string;
        const cookieState = req.cookies?.oauth_state as string;
        if (!queryState || !cookieState || queryState !== cookieState) {
            return res.redirect(`${env.CLIENT_URL}/?error=invalid_csrf_state`);
        }
        const isSecure = isSecureRequest(req);
        res.clearCookie("oauth_state", {
            httpOnly: true,
            secure: isSecure,
            sameSite: isSecure ? "none" : "lax",
            path: "/",
        });
        next();
    },
    passport.authenticate("google", { session: false }),
    googleCallback
);

router.post("/exchange", exchangeCode);
router.patch("/role", verifyToken, setRole);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

export default router;
