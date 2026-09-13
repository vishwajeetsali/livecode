import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to extract the private helpers for testing.
// Since they are module-private, we test them indirectly via the service,
// but we can also import the module and test the exported service behavior.

// Mock axios and env to avoid real HTTP calls
vi.mock("axios", () => ({
    default: {
        post: vi.fn(),
    },
}));

vi.mock("../config/env.js", () => ({
    env: {
        JUDGE0_URL: "http://mock-judge0:2358",
        PORT: 5000,
        JWT_ACCESS_SECRET: "test",
        JWT_REFRESH_SECRET: "test",
        CLIENT_URL: "http://localhost:5173",
        GROQ_API_KEY: "test",
        GOOGLE_CLIENT_ID: "test",
        GOOGLE_CLIENT_SECRET: "test",
        NODE_ENV: "test",
        DATABASE_URL: "test",
    },
}));

import axios from "axios";
import { CodeService } from "../services/code.service.js";

const mockAxiosPost = vi.mocked(axios.post);

describe("CodeService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("execute — basic code execution", () => {
        it("should return raw stdout when no test harness is used", async () => {
            mockAxiosPost.mockResolvedValueOnce({
                data: {
                    stdout: "Hello World\n",
                    stderr: null,
                    compile_output: null,
                    status: { description: "Accepted" },
                },
            });

            const result = await CodeService.execute({
                code: 'console.log("Hello World")',
                languageId: 63,
            });

            expect(result.output).toBe("Hello World\n");
            expect(result.testResults).toBeNull();
        });

        it("should return stderr when stdout is empty", async () => {
            mockAxiosPost.mockResolvedValueOnce({
                data: {
                    stdout: null,
                    stderr: "ReferenceError: x is not defined",
                    compile_output: null,
                    status: { description: "Runtime Error" },
                },
            });

            const result = await CodeService.execute({
                code: "console.log(x)",
                languageId: 63,
            });

            expect(result.output).toBe("ReferenceError: x is not defined");
            expect(result.testResults).toBeNull();
        });

        it("should return compile_output when both stdout and stderr are null", async () => {
            mockAxiosPost.mockResolvedValueOnce({
                data: {
                    stdout: null,
                    stderr: null,
                    compile_output: "error: expected ';'",
                    status: { description: "Compilation Error" },
                },
            });

            const result = await CodeService.execute({
                code: "int main() {",
                languageId: 50, // C
            });

            expect(result.output).toBe("error: expected ';'");
        });

        it("should return status description as fallback", async () => {
            mockAxiosPost.mockResolvedValueOnce({
                data: {
                    stdout: null,
                    stderr: null,
                    compile_output: null,
                    status: { description: "Time Limit Exceeded" },
                },
            });

            const result = await CodeService.execute({
                code: "while(true) {}",
                languageId: 63,
            });

            expect(result.output).toBe("Time Limit Exceeded");
        });
    });

    describe("execute — test harness injection", () => {
        it("should inject test harness for JavaScript (langId 63) with examples", async () => {
            const testOutput = [
                '===TEST_RESULTS_START===',
                '{"testIndex":1,"input":"[2,7,11,15], 9","expected":"[0,1]","actual":"[0,1]","passed":true}',
                '===TEST_RESULTS_END===',
            ].join("\n");

            mockAxiosPost.mockResolvedValueOnce({
                data: { stdout: testOutput, stderr: null, compile_output: null, status: { description: "Accepted" } },
            });

            const result = await CodeService.execute({
                code: "function twoSum(nums, target) { return [0,1]; }",
                languageId: 63,
                problemTitle: "Two Sum",
                examples: [{ input: "[2,7,11,15], 9", output: "[0,1]" }],
            });

            expect(result.testResults).not.toBeNull();
            expect(result.testResults).toHaveLength(1);
            expect(result.testResults![0].passed).toBe(true);
            expect(result.output).toContain("1/1 Passed");
        });

        it("should inject test harness for Python (langId 71) with examples", async () => {
            const testOutput = [
                '===TEST_RESULTS_START===',
                '{"testIndex":1,"input":"[2,7,11,15], 9","expected":"[0,1]","actual":"[0,1]","passed":true}',
                '===TEST_RESULTS_END===',
            ].join("\n");

            mockAxiosPost.mockResolvedValueOnce({
                data: { stdout: testOutput, stderr: null, compile_output: null, status: { description: "Accepted" } },
            });

            const result = await CodeService.execute({
                code: "def twoSum(nums, target):\n    return [0, 1]",
                languageId: 71,
                problemTitle: "Two Sum",
                examples: [{ input: "[2,7,11,15], 9", output: "[0,1]" }],
            });

            expect(result.testResults).not.toBeNull();
            expect(result.testResults).toHaveLength(1);
            expect(result.testResults![0].passed).toBe(true);
            expect(result.output).toContain("1/1 Passed");
            expect(mockAxiosPost).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    source_code: expect.stringContaining("parse_input_args"),
                }),
                expect.any(Object)
            );
        });

        it("should NOT inject test harness for compiled languages without harness support (e.g. C)", async () => {
            mockAxiosPost.mockResolvedValueOnce({
                data: { stdout: "42\n", stderr: null, compile_output: null, status: { description: "Accepted" } },
            });

            const result = await CodeService.execute({
                code: "int main() { return 0; }",
                languageId: 50, // C
                problemTitle: "Two Sum",
                examples: [{ input: "test", output: "42" }],
            });

            // Should NOT have injected harness, so no test results
            expect(result.testResults).toBeNull();
            expect(result.output).toBe("42\n");
        });

        it("should parse multiple test results correctly", async () => {
            const testOutput = [
                "debug log here",
                "===TEST_RESULTS_START===",
                '{"testIndex":1,"input":"1","expected":"1","actual":"1","passed":true}',
                '{"testIndex":2,"input":"2","expected":"4","actual":"3","passed":false}',
                "===TEST_RESULTS_END===",
            ].join("\n");

            mockAxiosPost.mockResolvedValueOnce({
                data: { stdout: testOutput, stderr: null, compile_output: null, status: { description: "Accepted" } },
            });

            const result = await CodeService.execute({
                code: "function x(n) { return n; }",
                languageId: 63,
                examples: [{ input: "1", output: "1" }, { input: "2", output: "4" }],
            });

            expect(result.testResults).toHaveLength(2);
            expect(result.testResults![0].passed).toBe(true);
            expect(result.testResults![1].passed).toBe(false);
            expect(result.output).toContain("1/2 Passed");
            expect(result.output).toContain("debug log here");
        });

        it("should format source code with multi-parameter parser for structured args", async () => {
            mockAxiosPost.mockResolvedValueOnce({
                data: { stdout: "ok", stderr: null, compile_output: null, status: { description: "Accepted" } },
            });

            await CodeService.execute({
                code: "function twoSum(nums, target) { return [0, 1]; }",
                languageId: 63,
                problemTitle: "Two Sum",
                examples: [{ input: "nums = [2,7,11,15], target = 9", args: [[2, 7, 11, 15], 9], output: "[0,1]" }],
            });

            expect(mockAxiosPost).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    source_code: expect.stringContaining("parseInputArgs"),
                }),
                expect.any(Object)
            );
        });

        it("should parse test results correctly even if user stdout contains the delimiter string", async () => {
            const collidedOutput = [
                "===TEST_RESULTS_START===",
                "User debugging info containing delimiter",
                "===TEST_RESULTS_START===",
                '{"testIndex":1,"input":"[2,7], 9","expected":"[0,1]","actual":"[0,1]","passed":true}',
                "===TEST_RESULTS_END===",
            ].join("\n");

            mockAxiosPost.mockResolvedValueOnce({
                data: { stdout: collidedOutput, stderr: null, compile_output: null, status: { description: "Accepted" } },
            });

            const result = await CodeService.execute({
                code: 'console.log("===TEST_RESULTS_START==="); function twoSum() { return [0,1]; }',
                languageId: 63,
                problemTitle: "Two Sum",
                examples: [{ input: "[2,7], 9", output: "[0,1]" }],
            });

            expect(result.testResults).not.toBeNull();
            expect(result.testResults).toHaveLength(1);
            expect(result.testResults![0].passed).toBe(true);
            expect(result.output).toContain("1/1 Passed");
            expect(result.output).toContain("User debugging info containing delimiter");
        });
    });

    describe("execute — API call shape", () => {
        it("should call Judge0 with correct parameters", async () => {
            mockAxiosPost.mockResolvedValueOnce({
                data: { stdout: "ok", stderr: null, compile_output: null, status: { description: "Accepted" } },
            });

            await CodeService.execute({
                code: "print('hello')",
                languageId: 71,
                stdin: "test input",
            });

            expect(mockAxiosPost).toHaveBeenCalledWith(
                expect.stringContaining("/submissions"),
                expect.objectContaining({
                    source_code: "print('hello')",
                    language_id: 71,
                    stdin: "test input",
                }),
                expect.objectContaining({ timeout: 15000 })
            );
        });

        it("should return Time Limit Exceeded when Judge0 request times out", async () => {
            const timeoutErr = new Error("timeout of 15000ms exceeded") as any;
            timeoutErr.code = "ECONNABORTED";
            mockAxiosPost.mockRejectedValueOnce(timeoutErr);

            const result = await CodeService.execute({
                code: "while(true) {}",
                languageId: 63,
            });

            expect(result.output).toBe("Time Limit Exceeded (15s execution timeout)");
            expect(result.testResults).toBeNull();
        });

        it("should return service unavailable message on general network failure", async () => {
            const netErr = new Error("Network error") as any;
            mockAxiosPost.mockRejectedValueOnce(netErr);

            const result = await CodeService.execute({
                code: "print(1)",
                languageId: 71,
            });

            expect(result.output).toContain("Execution service temporarily unavailable");
            expect(result.testResults).toBeNull();
        });
    });
});
