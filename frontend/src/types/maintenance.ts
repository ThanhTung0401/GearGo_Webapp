// ─── Maintenance & Stock Adjustment Types ────────────────────────────────────

import type { EquipmentStatus } from "./common";

export interface MaintenanceReceipt {
  id: string; // PBT-{timestamp}
  equipmentId: string;
  productId?: string;
  orderId?: string;
  issueDescription: string;
  status: "Chờ xử lý" | "Đang bảo dưỡng" | "Hoàn tất" | "Không thể sửa" | "Đang sửa chữa" | "Đã nghiệm thu";
  createdAt: string;
  estimatedCost: number;
  actualCost?: number;
  completedAt?: string;
  note?: string;
  outcomeNote?: string;
}

export interface StockAdjustmentLine {
  equipmentId: string;
  previousStatus: EquipmentStatus;
  newStatus: EquipmentStatus;
  reason: string;
}

export interface StockAdjustmentReceipt {
  id: string; // PDCK-{timestamp}
  createdAt: string;
  createdBy: string;
  reason: string;
  status: "Chờ duyệt" | "Đã duyệt" | "Từ chối";
  approvedBy?: string;
  approvedAt?: string;
  note?: string;
  lines: StockAdjustmentLine[];
}
