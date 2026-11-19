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
  {
    id: "PDCK-20261110-03",
    createdAt: "10/11/2026 09:00",
    createdBy: "Trần Phương Thảo",
    reason: "Kiểm kê đột xuất khu vực Đèn & Pin sạc tháng 11/2026",
    status: "Chờ duyệt",
    lines: [
      { equipmentId: "D002", previousStatus: "Sẵn sàng", newStatus: "Đang bảo trì", reason: "Giảm dung lượng pin dưới 70%, cần thay cell" },
    ],
  },
  {
    id: "PDCK-20261102-04",
    createdAt: "02/11/2026 14:20",
    createdBy: "NV Kho Tuấn",
    reason: "Đề nghị thanh lý ghế xếp khung cong không thể phục hồi",
    status: "Từ chối",
    approvedBy: "Quản trị viên",
    approvedAt: "02/11/2026 17:00",
    lines: [
      { equipmentId: "G003", previousStatus: "Đang bảo trì", newStatus: "Ngừng sử dụng", reason: "Quản trị viên yêu cầu giữ lại thay khung dự phòng" },
    ],
  },
];
