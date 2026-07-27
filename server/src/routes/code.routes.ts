import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { executeCode } from "../controllers/code.controller.js";
import { validate } from "../middleware/validate.js";
import { executeCodeSchema } from "../middleware/schemas.js";

const router = express.Router();

router.post("/execute", verifyToken, validate(executeCodeSchema), executeCode);

export default router;