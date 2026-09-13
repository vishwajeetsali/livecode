import { describe, it, expect } from "vitest";
import { toCamelCase, toPascalCase, getStarterCode, isStarterCode } from "../utils/starterCode";

describe("toCamelCase", () => {
    it("should convert 'Two Sum' to 'twoSum'", () => {
        expect(toCamelCase("Two Sum")).toBe("twoSum");
    });

    it("should convert 'Valid Parentheses' to 'validParentheses'", () => {
        expect(toCamelCase("Valid Parentheses")).toBe("validParentheses");
    });

    it("should handle single word", () => {
        expect(toCamelCase("Fizzbuzz")).toBe("fizzbuzz");
    });

    it("should strip special characters", () => {
        expect(toCamelCase("3Sum (Closest)")).toBe("3sumClosest");
    });

    it("should return 'solution' for empty string", () => {
        expect(toCamelCase("")).toBe("solution");
    });

    it("should handle multiple spaces", () => {
        expect(toCamelCase("  Merge   Sort   Array  ")).toBe("mergeSortArray");
    });
});

describe("toPascalCase", () => {
    it("should convert 'Two Sum' to 'TwoSum'", () => {
        expect(toPascalCase("Two Sum")).toBe("TwoSum");
    });

    it("should convert 'valid parentheses' to 'ValidParentheses'", () => {
        expect(toPascalCase("valid parentheses")).toBe("ValidParentheses");
    });

    it("should return 'Solution' for empty string", () => {
        expect(toPascalCase("")).toBe("Solution");
    });
});

describe("getStarterCode", () => {
    it("should generate JavaScript template with correct function name", () => {
        const code = getStarterCode("Two Sum", "javascript");
        expect(code).toContain("function twoSum(input)");
        expect(code).toContain("Write your solution here");
    });

    it("should generate TypeScript template", () => {
        const code = getStarterCode("Two Sum", "typescript");
        expect(code).toContain("function twoSum(input: any): any");
    });

    it("should generate Python template with snake-like naming", () => {
        const code = getStarterCode("Two Sum", "python");
        expect(code).toContain("def twoSum(input_val):");
    });

    it("should generate C++ template with class", () => {
        const code = getStarterCode("Two Sum", "cpp");
        expect(code).toContain("class Solution");
        expect(code).toContain("auto twoSum(auto input)");
    });

    it("should generate Java template with class", () => {
        const code = getStarterCode("Two Sum", "java");
        expect(code).toContain("public class Solution");
        expect(code).toContain("public static Object twoSum(Object input)");
    });

    it("should generate Rust template", () => {
        const code = getStarterCode("Two Sum", "rust");
        expect(code).toContain("fn twoSum(input: &str) -> String");
    });

    it("should fallback to default for unknown language", () => {
        const code = getStarterCode("Two Sum", "unknown_lang");
        expect(code).toContain("// Start coding here...");
    });

    it("should use 'solution' for empty problem title", () => {
        const code = getStarterCode("", "javascript");
        expect(code).toContain("function solution(input)");
    });
});

describe("isStarterCode", () => {
    it("should return true for empty or default text", () => {
        expect(isStarterCode("")).toBe(true);
        expect(isStarterCode("   ")).toBe(true);
        expect(isStarterCode("// Start coding here...")).toBe(true);
    });

    it("should return true for JavaScript Two Sum template", () => {
        const jsCode = getStarterCode("Two Sum", "javascript");
        expect(isStarterCode(jsCode, "Two Sum")).toBe(true);
    });

    it("should return true for Python Two Sum template", () => {
        const pyCode = getStarterCode("Two Sum", "python");
        expect(isStarterCode(pyCode, "Two Sum")).toBe(true);
    });

    it("should return false for user-modified code", () => {
        expect(isStarterCode("function twoSum(input) {\n    return [0, 1];\n}", "Two Sum")).toBe(false);
        expect(isStarterCode("console.log('hello')", "Two Sum")).toBe(false);
    });
});
