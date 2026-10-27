import type { Promotion } from "../types";

export const INITIAL_PROMOTIONS: Promotion[] = [
  { id: "PROMO-001", code: "CAMPGO10", name: "Ưu đãi chuyến đi", discountType: "percentage", discountValue: 10, maxDiscount: 300000, minimumRental: 500000, scope: "all", productIds: [], categoryIds: [], startsAt: "2024-01-01T00:00", endsAt: "2030-12-31T23:59", totalUsageLimit: 100, perCustomerLimit: 1, usedCount: 23, status: "active" },
  { id: "PROMO-002", code: "NEWGEAR20", name: "Trải nghiệm thiết bị mới", discountType: "percentage", discountValue: 20, maxDiscount: 500000, minimumRental: 1000000, scope: "categories", productIds: [], categoryIds: ["CAT-TENT", "CAT-BACKPACK"], startsAt: "2024-01-01T00:00", endsAt: "2030-12-31T23:59", totalUsageLimit: 30, perCustomerLimit: 1, usedCount: 7, status: "active" },
];
