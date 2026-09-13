import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/health or /api/v1/health
router.get(["/", "/health"], async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            success: true,
            data: {
                status: "ok",
                database: "connected",
                timestamp: new Date().toISOString(),
            },
        });
    } catch (err: any) {
        res.status(503).json({
            success: false,
            error: {
                message: "Database connection failed",
                details: err?.message || "Service Unavailable",
            },
        });
    }
});

export default router;