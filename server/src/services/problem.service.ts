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
        try {
            return await prisma.problem.create({
                data: {
                    title: data.title,
                    difficulty: data.difficulty,
                    description: data.description,
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
