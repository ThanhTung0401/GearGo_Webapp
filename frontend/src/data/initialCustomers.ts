import type { CustomerAccount } from "../types";

/**
 * Dữ liệu khách hàng mẫu khởi tạo - đồng bộ khớp chuẩn với DbSeeder của ASP.NET Core Backend.
 * Khi isRealApiEnabled() = true, hệ thống sẽ ưu tiên nạp trực tiếp qua staffApi.timTaiKhoan({ vaiTro: "KhachHang" }).
 */
export const INITIAL_CUSTOMERS: CustomerAccount[] = [
  {
    id: "KH001",
    name: "Nguyễn Văn An",
    phone: "0901000003",
    email: "customer@geargo.vn",
    password: "GearGo@2026",
    address: "123 Cầu Giấy, Phường Dịch Vọng, Hà Nội",
    status: "active",
    createdAt: "01/01/2026",
    totalOrders: 3,
    totalSpent: 3500000,
    currentDeposit: 1000000,
  },
  {
    id: "KH002",
    name: "Trần Minh Quang",
    phone: "0918765432",
    email: "quang.kh@geargo.vn",
    password: "GearGo@2026",
    address: "456 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
    status: "active",
    createdAt: "15/01/2026",
    totalOrders: 2,
    totalSpent: 2120000,
    currentDeposit: 600000,
  },
  {
    id: "KH003",
    name: "Hoàng Văn Khóa",
    phone: "0909999888",
    email: "locked.kh@geargo.vn",
    password: "GearGo@2026",
    address: "789 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    status: "locked",
    lockedReason: "Vi phạm điều khoản nhiều lần làm hỏng thiết bị không bồi thường",
    createdAt: "12/02/2026",
    totalOrders: 1,
    totalSpent: 450000,
    currentDeposit: 0,
  },
];
