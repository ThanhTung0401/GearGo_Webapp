import type { MaintenanceReceipt } from "../types";

export const INITIAL_MAINTENANCE_RECEIPTS: MaintenanceReceipt[] = [
  {
    id: "PBT-20240810-01",
    equipmentId: "L004",
    productId: "P001",
    issueDescription: "Rách nhẹ lớp vải chống nước cửa trước, cần may ép nhiệt",
    status: "Đang bảo dưỡng",
    createdAt: "10/08/2024 15:00",
    estimatedCost: 150000,
    note: "Đang đợi keo chống thấm chuyên dụng",
  },
];
