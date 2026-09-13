import { Router } from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.middleware.js";
import { transcribeAudio } from "../controllers/transcribe.controller.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/webm")) {
            cb(null, true);
        } else {
            cb(new Error("Only audio files are allowed"));
        }
    },
});
const router = Router();

router.post("/", verifyToken, upload.single("audio"), transcribeAudio);

export default router;  