import { prisma } from "../lib/prisma.js";

const initialProblems = [
    {
        title: "Two Sum",
        difficulty: "EASY" as const,
        description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        examples: [
            { input: "nums = [2,7,11,15], target = 9", args: [[2, 7, 11, 15], 9], output: "[0,1]" }
        ],
        constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"]
    },
    {
        title: "Valid Parentheses",
        difficulty: "EASY" as const,
        description: "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type of brackets, and are closed in the correct order.",
        examples: [
            { input: "s = '()[]{}'", args: ["()[]{}"], output: "true" }
        ],
        constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'"]
    },
    {
        title: "Reverse Linked List",
        difficulty: "EASY" as const,
        description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
        examples: [
            { input: "head = [1,2,3,4,5]", args: [[1, 2, 3, 4, 5]], output: "[5,4,3,2,1]" }
        ],
        constraints: ["The number of nodes in the list is the range [0, 5000]", "-5000 <= Node.val <= 5000"]
    }
];

export const seedProblems = async () => {
    for (const prob of initialProblems) {
        await prisma.problem.upsert({
            where: { title: prob.title },
            update: {},
            create: prob,
        });
    }
    console.log("Database seeded with initial problems.");
};
