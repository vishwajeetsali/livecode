// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "../features/notifications";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
    <NotificationProvider>{children}</NotificationProvider>
);

describe("NotificationContext", () => {
    it("starts with empty notifications and zero unread", () => {
        const { result } = renderHook(() => useNotifications(), { wrapper });

        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
    });

    it("adds a notification with auto-generated id and timestamp", () => {
        const { result } = renderHook(() => useNotifications(), { wrapper });

        act(() => {
            result.current.addNotification({ type: "info", title: "Test", message: "Hello" });
        });

        expect(result.current.notifications).toHaveLength(1);
        expect(result.current.notifications[0].id).toMatch(/^notif-/);
        expect(result.current.notifications[0].read).toBe(false);
        expect(result.current.notifications[0].timestamp).toBeInstanceOf(Date);
        expect(result.current.unreadCount).toBe(1);
    });

    it("prepends new notifications (newest first)", () => {
        const { result } = renderHook(() => useNotifications(), { wrapper });

        act(() => {
            result.current.addNotification({ type: "info", title: "First", message: "1" });
        });
        act(() => {
            result.current.addNotification({ type: "success", title: "Second", message: "2" });
        });

        expect(result.current.notifications[0].title).toBe("Second");
        expect(result.current.notifications[1].title).toBe("First");
    });

    it("caps at 50 notifications", () => {
        const { result } = renderHook(() => useNotifications(), { wrapper });

        act(() => {
            for (let i = 0; i < 55; i++) {
                result.current.addNotification({ type: "info", title: `N${i}`, message: `msg${i}` });
            }
        });

        expect(result.current.notifications).toHaveLength(50);
    });

    it("marks single notification as read", () => {
        const { result } = renderHook(() => useNotifications(), { wrapper });

        act(() => {
            result.current.addNotification({ type: "info", title: "T", message: "M" });
        });

        const id = result.current.notifications[0].id;

        act(() => {
            result.current.markAsRead(id);
        });

        expect(result.current.notifications[0].read).toBe(true);
        expect(result.current.unreadCount).toBe(0);
    });

    it("marks all as read", () => {
        const { result } = renderHook(() => useNotifications(), { wrapper });

        act(() => {
            result.current.addNotification({ type: "info", title: "A", message: "1" });
            result.current.addNotification({ type: "info", title: "B", message: "2" });
        });

        act(() => {
            result.current.markAllAsRead();
        });

        expect(result.current.unreadCount).toBe(0);
        expect(result.current.notifications.every((n) => n.read)).toBe(true);
    });

    it("removes a specific notification", () => {
        const { result } = renderHook(() => useNotifications(), { wrapper });

        act(() => {
            result.current.addNotification({ type: "info", title: "Keep", message: "1" });
            result.current.addNotification({ type: "info", title: "Remove", message: "2" });
        });

        const removeId = result.current.notifications[0].id; // "Remove" is first (prepended)

        act(() => {
            result.current.removeNotification(removeId);
        });

        expect(result.current.notifications).toHaveLength(1);
        expect(result.current.notifications[0].title).toBe("Keep");
    });

    it("clears all notifications", () => {
        const { result } = renderHook(() => useNotifications(), { wrapper });

        act(() => {
            result.current.addNotification({ type: "info", title: "A", message: "1" });
            result.current.addNotification({ type: "info", title: "B", message: "2" });
        });

        act(() => {
            result.current.clearAll();
        });

        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
    });

    it("throws when useNotifications is used outside provider", () => {
        expect(() => {
            renderHook(() => useNotifications());
        }).toThrow("useNotifications must be used within NotificationProvider");
    });
});
