/**
 * Converts a problem title (e.g. "Two Sum", "Valid Parentheses") to a camelCase function name.
 */
export const toCamelCase = (title: string): string => {
    const words = title.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    if (words.length === 0) return "solution";
    return words[0].toLowerCase() + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

/**
 * Converts a problem title to a PascalCase function/class name.
 */
export const toPascalCase = (title: string): string => {
    const words = title.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    if (words.length === 0) return "Solution";
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

export const normalizeCode = (str: string): string =>
    (str || "").replace(/\r\n/g, "\n").trim();

/**
 * Returns a LeetCode-style starter code template for the given problem title and programming language.
 */
export const getStarterCode = (problemTitle: string, langValue: string): string => {
    const fnName = toCamelCase(problemTitle || "solution");

    let code: string;
    switch (langValue) {
        case "javascript":
            code = `/**
 * @param {any} input
 * @return {any}
 */
function ${fnName}(input) {
    // Write your solution here
    
}
`;
            break;

        case "typescript":
            code = `function ${fnName}(input: any): any {
    // Write your solution here
    
}
`;
            break;

        case "python":
            code = `def ${fnName}(input_val):
    # Write your solution here
    pass
`;
            break;

        case "cpp":
            code = `#include <iostream>
#include <vector>
#include <string>
using namespace std;

class Solution {
public:
    auto ${fnName}(auto input) {
        // Write your solution here
        
    }
};
`;
            break;

        case "java":
            code = `import java.util.*;

public class Solution {
    public static Object ${fnName}(Object input) {
        // Write your solution here
        return null;
    }
}
`;
            break;

        case "go":
            code = `package main

func ${fnName}(input interface{}) interface{} {
	// Write your solution here
	return nil
}
`;
            break;

        case "rust":
            code = `fn ${fnName}(input: &str) -> String {
    // Write your solution here
    String::new()
}
`;
            break;

        case "csharp":
            code = `using System;
using System.Collections.Generic;

public class Solution {
    public static object ${toPascalCase(problemTitle || "solution")}(object input) {
        // Write your solution here
        return null;
    }
}
`;
            break;

        case "php":
            code = `<?php

function ${fnName}($input) {
    // Write your solution here
    return null;
}
`;
            break;

        case "ruby":
            code = `def ${fnName}(input)
  # Write your solution here
  nil
end
`;
            break;

        default:
            code = `// Start coding here...\n`;
            break;
    }

    return code.replace(/\r\n/g, "\n");
};

/** All language keys that getStarterCode supports */
const ALL_LANGS = [
    "javascript", "typescript", "python", "cpp", "java",
    "go", "rust", "csharp", "php", "ruby",
];

/**
 * Returns true if `code` is empty or matches an unmodified starter template
 * for the given problem title in ANY language.
 */
export const isStarterCode = (code: string, problemTitle?: string): boolean => {
    const trimmed = normalizeCode(code);
    if (!trimmed || trimmed === "// Start coding here..." || trimmed.startsWith("// Start coding")) {
        return true;
    }
    const titlesToTest = [problemTitle || "Two Sum", "solution", "Two Sum"].filter(Boolean);
    return titlesToTest.some(title =>
        ALL_LANGS.some(lang => normalizeCode(getStarterCode(title, lang)) === trimmed)
    );
};
