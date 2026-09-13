import { prisma } from "../lib/prisma.js";
import { NotFoundError, BadRequestError } from "../errors/AppError.js";
import type { Difficulty } from "@prisma/client";

export const ProblemService = {
    async getAllProblems() {
        return prisma.problem.findMany({
            orderBy: { createdAt: "desc" },
        });
    },

    async createProblem(data: {
        title: string;
        difficulty: Difficulty;
        description: string;
        examples?: any[];
        constraints?: string[];
    }) {
        const title = data.title.trim();
        const description = data.description.trim();
        try {
            return await prisma.problem.create({
                data: {
                    title,
                    difficulty: data.difficulty,
                    description,
                    examples: data.examples || [],
                    constraints: data.constraints || [],
                },
            });
        } catch (error: any) {
            if (error?.code === "P2002") {
                throw new BadRequestError("Problem with this title already exists");
            }
            throw error;
        }
    },

    async deleteProblem(id: string) {
        const problem = await prisma.problem.findUnique({ where: { id } });
        if (!problem) {
            throw new NotFoundError("Problem not found");
        }

        const protectedTitles = ["Two Sum", "Valid Parentheses", "Reverse Linked List"];
        if (protectedTitles.map((t) => t.toLowerCase()).includes(problem.title.trim().toLowerCase())) {
            throw new BadRequestError("Built-in system problems cannot be deleted");
        }

        try {
            return await prisma.problem.delete({
                where: { id },
            });
        } catch (error: any) {
            if (error?.code === "P2025") {
                throw new NotFoundError("Problem not found");
            }
            throw error;
        }
    },
};
