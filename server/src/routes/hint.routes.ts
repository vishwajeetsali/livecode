import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getHint } from "../controllers/hint.controller.js";
import { reviewCode } from "../controllers/review.controller.js";
import { validate } from "../middleware/validate.js";
import { aiHintSchema, reviewCodeSchema } from "../middleware/schemas.js";

const router = express.Router();

router.post("/hint", verifyToken, validate(aiHintSchema), getHint);
router.post("/review", verifyToken, validate(reviewCodeSchema), reviewCode);

export default router;