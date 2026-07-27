import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getMySessions } from "../controllers/session.controller.js";

const router = express.Router();

router.get("/my", verifyToken, getMySessions);

export default router;