import { useState, useCallback, type ReactNode } from "react";
import type { Notification } from "./types";
import { NotificationContext } from "./context";

let notificationId = 0;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback((n: Omit<Notification, "id" | "timestamp" | "read">) => {
        const newNotification: Notification = {
            ...n,
            id: `notif-${++notificationId}`,
            timestamp: new Date(),
            read: false,
        };
        setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep max 50
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll, removeNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};
