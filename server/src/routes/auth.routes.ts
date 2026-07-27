import express from "express";
import passport from "../config/passport.js";
import { googleCallback, refreshToken, logout, exchangeCode } from "../controllers/auth.controller.js";

const router = express.Router();

// start google login
router.get("/google", passport.authenticate("google", {
    scope: ["profile", "email"],
}));

// google redirects here
router.get("/google/callback",
    passport.authenticate("google", { session: false }),
    googleCallback
);

router.post("/exchange", exchangeCode);
router.get("/refresh", refreshToken);
router.get("/logout", logout);

export default router;