import type { StockAdjustmentReceipt } from "../types";

export const INITIAL_STOCK_ADJUSTMENTS: StockAdjustmentReceipt[] = [
  {
    id: "PDCK-20241201-01",
    createdAt: "01/12/2024 10:30",
    createdBy: "NV Kho Tuấn",
    reason: "Kiểm kê định kỳ tháng 12/2024: Phát hiện dây lều L005 đứt cần bảo trì",
    status: "Chờ duyệt",
    lines: [
      { equipmentId: "L005", previousStatus: "Sẵn sàng", newStatus: "Đang bảo trì", reason: "Đứt dây chằng và rách bao ngoài khi đối chiếu kiểm kê" },
    ],
  },
  {
    id: "PDCK-20240901-01",
    createdAt: "01/09/2024 16:00",
    createdBy: "Quản trị viên",
    reason: "Kiểm kê kho định kỳ Quý 3/2024",
    status: "Đã duyệt",
    approvedBy: "Quản trị viên",
    approvedAt: "01/09/2024 16:30",
    lines: [
      { equipmentId: "L004", previousStatus: "Sẵn sàng", newStatus: "Đang bảo trì", reason: "Phát hiện rách nhẹ cửa khi kiểm kê định kỳ" },
    ],
  },
];
