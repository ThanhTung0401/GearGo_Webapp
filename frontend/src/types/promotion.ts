// ─── Promotion Types ──────────────────────────────────────────────────────────

export interface Promotion {
  id: string;
  code: string;
  name: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount: number | null;
  minimumRental: number;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  startsAt: string;
  endsAt: string;
  totalUsageLimit: number | null;
  perCustomerLimit: number | null;
  usedCount: number;
  status: "active" | "inactive";
  stopReason?: string; // Lý do tạm dừng / ngừng chương trình (UC8.5)
  updatedAt?: string;
  updatedBy?: string;
}

export interface PromotionUsage {
  id: string;
  promotionId: string;
  orderId: string;
  reservedAt: string;
  expiresAt?: string;
  usedAt?: string;
  releasedAt?: string;
  discountAmount: number;
  status: "reserved" | "used" | "released";
}
