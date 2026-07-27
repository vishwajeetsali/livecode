import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { generateQuestion, startMockSession } from "../controllers/mock.controller.js";
import { validate } from "../middleware/validate.js";
import { mockQuestionSchema } from "../middleware/schemas.js";

const router = express.Router();

router.post("/question", verifyToken, validate(mockQuestionSchema), generateQuestion);
router.post("/start", verifyToken, startMockSession);

export default router;