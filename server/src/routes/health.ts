import { Router } from "express";

const router = Router();

// GET /api/health
router.get("/health", (req, res) => {
    res.json({ status: "ok" })
});

export default router;