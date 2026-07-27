import type { Request, Response } from "express";
import { ProblemService } from "../services/problem.service.js";

export const getProblems = async (_req: Request, res: Response) => {
    const problems = await ProblemService.getAllProblems();
    res.json(problems);
};

export const createProblem = async (req: Request, res: Response) => {
    const { title, difficulty, description, examples, constraints } = req.body;
    const problem = await ProblemService.createProblem({
        title,
        difficulty,
        description,
        examples,
        constraints,
    });
    res.status(201).json(problem);
};

export const deleteProblem = async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    await ProblemService.deleteProblem(id);
    res.json({ message: "problem deleted successfully" });
};
