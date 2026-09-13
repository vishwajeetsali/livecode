import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getReplay } from "../controllers/replay.controller.js";

const router = express.Router();

router.get("/:sessionId", verifyToken, getReplay);

export default router;
