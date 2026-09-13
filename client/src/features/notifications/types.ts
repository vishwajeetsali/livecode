export interface Notification {
    id: string;
    type: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    icon?: string;
}
