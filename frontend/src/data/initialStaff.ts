import type { StaffAccount } from "../types";

/**
 * Dữ liệu nhân sự mẫu khởi tạo - đồng bộ khớp chuẩn với DbSeeder của ASP.NET Core Backend.
 * Khi isRealApiEnabled() = true, hệ thống sẽ ưu tiên nạp trực tiếp qua staffApi.timNhanVien().
 */
export const INITIAL_STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: "NV-001",
    username: "admin",
    name: "Nguyễn Văn Quản Trị",
    password: "GearGo@2026",
    role: "Quản trị viên",
    phone: "0901000001",
    email: "admin@geargo.vn",
    status: "active",
    permissions: [
      "Quản lý kho thiết bị",
      "Bàn giao & Nhận trả",
      "Lập phụ phí & Đối soát",
      "Xem báo cáo doanh thu",
      "Quản lý khuyến mãi",
    ],
    createdAt: "01/01/2026",
  },
  {
    id: "NV-002",
    username: "staff",
    name: "Lê Thị Mai (NV Kho)",
    password: "GearGo@2026",
    role: "Nhân viên kho",
    phone: "0901000002",
    email: "staff@geargo.vn",
    status: "active",
    permissions: ["Quản lý kho thiết bị", "Bàn giao & Nhận trả"],
    createdAt: "15/02/2026",
  },
  {
    id: "NV-003",
    username: "tuan.staff",
    name: "Trần Tuấn (NV Kho)",
    password: "GearGo@2026",
    role: "Nhân viên kho",
    phone: "0901000005",
    email: "tuan.staff@geargo.vn",
    status: "active",
    permissions: ["Quản lý kho thiết bị", "Bàn giao & Nhận trả"],
    createdAt: "10/03/2026",
  },
];
