import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requirePersistentRole } from "../middleware/requirePersistentRole.js";
import { getProblems, createProblem, deleteProblem } from "../controllers/problem.controller.js";
import { validate } from "../middleware/validate.js";
import { createProblemSchema } from "../middleware/schemas.js";

const router = express.Router();

router.get("/", verifyToken, getProblems);
router.post("/create", verifyToken, requirePersistentRole(["INTERVIEWER"]), validate(createProblemSchema), createProblem);
router.delete("/:id", verifyToken, requirePersistentRole(["INTERVIEWER"]), deleteProblem);

export default router;
