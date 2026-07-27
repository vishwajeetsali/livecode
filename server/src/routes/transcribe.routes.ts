import { Router } from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.middleware.js";
import { transcribeAudio } from "../controllers/transcribe.controller.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
});
const router = Router();

router.post("/", verifyToken, upload.single("audio"), transcribeAudio);

export default router;  