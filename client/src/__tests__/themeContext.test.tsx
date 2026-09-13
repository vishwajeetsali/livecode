// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../features/theme";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
});

describe("ThemeContext", () => {
    it("defaults to dark theme", () => {
        const { result } = renderHook(() => useTheme(), { wrapper });

        expect(result.current.theme).toBe("dark");
        expect(result.current.resolvedTheme).toBe("dark");
    });

    it("sets theme and persists to localStorage", () => {
        const { result } = renderHook(() => useTheme(), { wrapper });

        act(() => {
            result.current.setTheme("light");
        });

        expect(result.current.theme).toBe("light");
        expect(result.current.resolvedTheme).toBe("light");
        expect(localStorage.getItem("livecode_theme")).toBe("light");
    });

    it("toggles between dark and light", () => {
        const { result } = renderHook(() => useTheme(), { wrapper });

        act(() => {
            result.current.toggleTheme();
        });

        expect(result.current.resolvedTheme).toBe("light");

        act(() => {
            result.current.toggleTheme();
        });

        expect(result.current.resolvedTheme).toBe("dark");
    });

    it("applies data-theme attribute to document", () => {
        const { result } = renderHook(() => useTheme(), { wrapper });

        act(() => {
            result.current.setTheme("light");
        });

        expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("reads theme from localStorage on init", () => {
        localStorage.setItem("livecode_theme", "light");

        const { result } = renderHook(() => useTheme(), { wrapper });

        expect(result.current.theme).toBe("light");
        expect(result.current.resolvedTheme).toBe("light");
    });

    it("falls back to dark for invalid localStorage value", () => {
        localStorage.setItem("livecode_theme", "invalid");

        const { result } = renderHook(() => useTheme(), { wrapper });

        expect(result.current.theme).toBe("dark");
    });

    it("throws when useTheme is used outside provider", () => {
        expect(() => {
            renderHook(() => useTheme());
        }).toThrow("useTheme must be used within ThemeProvider");
    });
});
