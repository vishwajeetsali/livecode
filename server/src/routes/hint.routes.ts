import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getHint } from "../controllers/hint.controller.js";
import { validate } from "../middleware/validate.js";
import { aiHintSchema } from "../middleware/schemas.js";

const router = express.Router();

router.post("/hint", verifyToken, validate(aiHintSchema), getHint);

export default router;