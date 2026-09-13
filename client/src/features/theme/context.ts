import { createContext } from "react";
import type { Theme } from "./types";

export interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: "dark" | "light";
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
