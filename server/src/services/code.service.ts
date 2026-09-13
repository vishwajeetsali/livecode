import axios from "axios";
import { env } from "../config/env.js";

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

const toCamelCase = (title: string): string => {
    const words = title.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    if (words.length === 0) return "solution";
    return words[0]!.toLowerCase() + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

function buildTestHarness(code: string, fnName: string, examples: any[]): string {
    return `
${code}

// --- AUTOMATED TEST HARNESS ---
(function() {
    const testCases = ${JSON.stringify(examples)};

    function parseInputArgs(input, rawArgs) {
        if (Array.isArray(rawArgs)) return rawArgs;
        if (rawArgs !== undefined && rawArgs !== null) return [rawArgs];
        if (typeof input !== 'string') return [input];

        try {
            const parts = [];
            const regex = /(?:^|\s*,\s*)[a-zA-Z_]\w*\s*=\s*/g;
            let match;
            const indices = [];
            while ((match = regex.exec(input)) !== null) {
                indices.push({ start: match.index + match[0].indexOf('=') + 1 });
            }
            if (indices.length > 0) {
                for (let i = 0; i < indices.length; i++) {
                    const startVal = indices[i].start;
                    const endVal = (i + 1 < indices.length) ? input.lastIndexOf(',', indices[i + 1].start - 1) : input.length;
                    const valStr = input.substring(startVal, endVal).trim();
                    try {
                        parts.push(JSON.parse(valStr.replace(/'/g, '"')));
                    } catch {
                        parts.push(valStr);
                    }
                }
                if (parts.length > 0) return parts;
            }
        } catch {}

        try {
            const parsed = JSON.parse(input.replace(/'/g, '"'));
            return Array.isArray(parsed) ? [parsed] : [parsed];
        } catch {}

        return [input];
    }

    function normalizeResult(val) {
        if (val === undefined) return "undefined";
        if (typeof val === 'string') {
            try {
                return JSON.stringify(JSON.parse(val.replace(/'/g, '"')));
            } catch {
                return val.trim();
            }
        }
        try {
            return JSON.stringify(val);
        } catch {
            return String(val).trim();
        }
    }

    console.log("===TEST_RESULTS_START===");
    testCases.forEach((tc, idx) => {
        try {
            let funcToRun = typeof ${fnName} === 'function' ? ${fnName} : null;
            if (!funcToRun) {
                const keys = Object.keys(globalThis);
                for (const k of keys) {
                    if (typeof globalThis[k] === 'function' && k !== 'fetch' && k !== 'require' && !k.startsWith('_')) {
                        funcToRun = globalThis[k];
                        break;
                    }
                }
            }

            let result = "No return value";
            if (funcToRun) {
                const args = parseInputArgs(tc.input, tc.args);
                result = funcToRun.apply(null, args);
            }

            const expNorm = normalizeResult(tc.output);
            const actNorm = normalizeResult(result);

            console.log(JSON.stringify({
                testIndex: idx + 1,
                input: typeof tc.input === 'object' ? JSON.stringify(tc.input) : String(tc.input),
                expected: typeof tc.output === 'object' ? JSON.stringify(tc.output) : String(tc.output),
                actual: typeof result === 'object' ? JSON.stringify(result) : String(result),
                passed: expNorm === actNorm
            }));
        } catch (e) {
            console.log(JSON.stringify({
                testIndex: idx + 1,
                input: typeof tc.input === 'object' ? JSON.stringify(tc.input) : String(tc.input),
                expected: String(tc.output),
                actual: "Error: " + (e ? e.message : String(e)),
                passed: false
            }));
        }
    });
    console.log("===TEST_RESULTS_END===");
})();
`;
}

function buildPythonTestHarness(code: string, fnName: string, examples: any[]): string {
    const snakeFnName = fnName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    return `
${code}

# --- AUTOMATED TEST HARNESS ---
import json
import sys

test_cases = ${JSON.stringify(examples)}

def parse_input_args(input_val, raw_args):
    if isinstance(raw_args, list):
        return raw_args
    if raw_args is not None:
        return [raw_args]
    if not isinstance(input_val, str):
        return [input_val]
    try:
        parsed = json.loads(input_val.replace("'", '"'))
        return parsed if isinstance(parsed, list) else [parsed]
    except Exception:
        pass
    return [input_val]

def normalize_result(val):
    if val is None:
        return "undefined"
    if isinstance(val, str):
        try:
            return json.dumps(json.loads(val.replace("'", '"')))
        except Exception:
            return val.strip()
    try:
        return json.dumps(val)
    except Exception:
        pass
    return str(val).strip()

print("===TEST_RESULTS_START===")
func_to_run = None
for candidate_name in ["${fnName}", "${snakeFnName}", "solution"]:
    if candidate_name in globals() and callable(globals()[candidate_name]):
        func_to_run = globals()[candidate_name]
        break

if not func_to_run:
    for k, v in list(globals().items()):
        if callable(v) and not k.startswith("_") and k not in ["parse_input_args", "normalize_result", "json", "sys"]:
            func_to_run = v
            break

for idx, tc in enumerate(test_cases):
    try:
        result = "No return value"
        if func_to_run:
            args = parse_input_args(tc.get("input"), tc.get("args"))
            if isinstance(args, (list, tuple)):
                result = func_to_run(*args)
            else:
                result = func_to_run(args)
        
        exp_norm = normalize_result(tc.get("output"))
        act_norm = normalize_result(result)
        
        print(json.dumps({
            "testIndex": idx + 1,
            "input": json.dumps(tc.get("input")) if isinstance(tc.get("input"), (dict, list)) else str(tc.get("input")),
            "expected": json.dumps(tc.get("output")) if isinstance(tc.get("output"), (dict, list)) else str(tc.get("output")),
            "actual": json.dumps(result) if isinstance(result, (dict, list)) else str(result),
            "passed": exp_norm == act_norm
        }))
    except Exception as e:
        print(json.dumps({
            "testIndex": idx + 1,
            "input": json.dumps(tc.get("input")) if isinstance(tc.get("input"), (dict, list)) else str(tc.get("input")),
            "expected": str(tc.get("output")),
            "actual": f"Error: {e}",
            "passed": False
        }))

print("===TEST_RESULTS_END===")
`;
}

function parseTestResults(rawOutput: string): { output: string; testResults: any[] | null } {
    if (typeof rawOutput === "string" && rawOutput.includes("===TEST_RESULTS_START===")) {
        const startMarker = "===TEST_RESULTS_START===";
        const endMarker = "===TEST_RESULTS_END===";
        const startIdx = rawOutput.lastIndexOf(startMarker);
        const endIdx = rawOutput.lastIndexOf(endMarker);

        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            const userStdout = rawOutput.substring(0, startIdx).trim();
            const jsonSection = rawOutput.substring(startIdx + startMarker.length, endIdx).trim();

            const lines = jsonSection.split("\n").map(l => l.trim()).filter(Boolean);
            const parsedResults = [];
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    if (parsed && typeof parsed === "object" && typeof parsed.testIndex === "number") {
                        parsedResults.push(parsed);
                    }
                } catch {}
            }

            if (parsedResults.length > 0) {
                const passCount = parsedResults.filter((r: any) => r.passed).length;
                const output = `Test Cases: ${passCount}/${parsedResults.length} Passed\n` + (userStdout ? `\n[stdout]\n${userStdout}` : "");
                return { output, testResults: parsedResults };
            }
        }
    }

    return { output: rawOutput, testResults: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

interface ExecuteParams {
    code: string;
    languageId: number;
    stdin?: string;
    problemTitle?: string;
    examples?: any[];
}

export const CodeService = {
    async execute({ code, languageId, stdin, problemTitle, examples }: ExecuteParams) {
        let sourceCode = code;
        const fnName = problemTitle ? toCamelCase(problemTitle) : "solution";

        // Inject test harness if test case examples exist for JavaScript (63), TypeScript (74), Python (71, 92)
        if (examples && Array.isArray(examples) && examples.length > 0) {
            if (languageId === 63 || languageId === 74) {
                sourceCode = buildTestHarness(code, fnName, examples);
            } else if (languageId === 71 || languageId === 92) {
                sourceCode = buildPythonTestHarness(code, fnName, examples);
            }
        }

        try {
            const submission = await axios.post(
                `${env.JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
                {
                    source_code: sourceCode,
                    language_id: languageId,
                    stdin: stdin || "",
                },
                { timeout: 15000 }
            );

            const { stdout, stderr, compile_output, status } = submission.data;
            const rawOutput = stdout || stderr || compile_output || status?.description || "No output";

            return parseTestResults(rawOutput);
        } catch (err: any) {
            if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
                return {
                    output: "Time Limit Exceeded (15s execution timeout)",
                    testResults: null,
                };
            }
            if (err.response?.data?.message || err.response?.data?.error) {
                return {
                    output: err.response.data.message || err.response.data.error,
                    testResults: null,
                };
            }
            return {
                output: "Execution service temporarily unavailable. Please try again.",
                testResults: null,
            };
        }
    },
};
