import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { generateReport, getReport } from "../controllers/report.controller.js";
import { validate } from "../middleware/validate.js";
import { generateReportSchema } from "../middleware/schemas.js";

const router = express.Router();

router.post("/generate", verifyToken, validate(generateReportSchema), generateReport);
router.get("/:sessionId", verifyToken, getReport);

export default router;