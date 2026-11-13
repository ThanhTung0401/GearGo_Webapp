import type { MaintenanceReceipt } from "../types";

/**
 * Dữ liệu phiếu bảo trì khởi tạo / dự phòng (fallback) khi Backend API chưa sẵn sàng.
 * Khi kết nối với ASP.NET Core API (WP-M06: UC59 - UC61 / UC6.12, UC6.13),
 * hệ thống sẽ ưu tiên tải dữ liệu bảo dưỡng và nghiệm thu từ `equipmentApi.timKiemBaoTri()`.
 */
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
