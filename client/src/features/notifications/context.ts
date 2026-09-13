import { createContext } from "react";
import type { Notification } from "./types";

export interface NotificationContextValue {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);
