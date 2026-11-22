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
  {
    id: "PBT-20261105-02",
    equipmentId: "L002",
    productId: "P001",
    issueDescription: "Vệ sinh khử khuẩn và xịt phủ chống thấm định kỳ",
    status: "Chờ xử lý",
    createdAt: "05/11/2026 09:30",
    estimatedCost: 80000,
    note: "Ưu tiên xử lý trước cuối tuần",
  },
  {
    id: "PBT-20261108-03",
    equipmentId: "B002",
    productId: "P004",
    issueDescription: "Thay đầu đánh lửa piezo bếp ga mini",
    status: "Hoàn tất",
    createdAt: "08/11/2026 14:15",
    estimatedCost: 120000,
    note: "Đã nghiệm thu đạt chuẩn an toàn cháy nổ",
  },
  {
    id: "PBT-20261112-04",
    equipmentId: "T001",
    productId: "P003",
    issueDescription: "Giặt hấp túi ngủ lông vũ sau chuyến Đà Lạt",
    status: "Hoàn tất",
    createdAt: "12/11/2026 10:00",
    estimatedCost: 95000,
    note: "Đã đóng gói lại bao nén chống ẩm",
  },
];
