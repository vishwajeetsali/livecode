import { useState, useCallback, useEffect, type ReactNode } from "react";
import type { Theme } from "./types";
import { ThemeContext } from "./context";

const STORAGE_KEY = "livecode_theme";

const getSystemPreference = (): "dark" | "light" => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const resolveTheme = (theme: Theme): "dark" | "light" => {
    return theme === "system" ? getSystemPreference() : theme;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        return stored && ["dark", "light", "system"].includes(stored) ? stored : "dark";
    });

    const resolvedTheme = resolveTheme(theme);

    const applyTheme = useCallback((resolved: "dark" | "light") => {
        document.documentElement.setAttribute("data-theme", resolved);
        // Update meta theme-color for mobile browsers
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute("content", resolved === "dark" ? "#060609" : "#f8f9fc");
        }
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }, [resolvedTheme, setTheme]);

    // Apply theme on change
    useEffect(() => {
        applyTheme(resolvedTheme);
    }, [resolvedTheme, applyTheme]);

    // Listen for system preference changes when in "system" mode
    useEffect(() => {
        if (theme !== "system") return;
        const mq = window.matchMedia("(prefers-color-scheme: light)");
        const handler = () => applyTheme(getSystemPreference());
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [theme, applyTheme]);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
