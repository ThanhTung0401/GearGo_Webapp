// ─── Notification Types ───────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert" | "order" | "system";
  targetRole: "all" | "customer" | "staff" | "admin";
  category?: "order" | "rental" | "finance" | "promo" | "system";
  actionLink?: {
    type: "order" | "page" | "reviews";
    targetId?: string;
    label?: string;
  };
  createdAt: string;
  isRead: boolean;
  link?: string;
}
