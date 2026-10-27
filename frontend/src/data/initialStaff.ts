import type { StaffAccount } from "../types";

export const INITIAL_STAFF_ACCOUNTS: StaffAccount[] = [
  { id: "NV-001", username: "admin", name: "Nguyễn Văn Trưởng (Admin)", password: "admin123", role: "Quản trị viên", phone: "0909 000 001", email: "admin@geargo.vn", status: "active", permissions: ["Quản lý kho thiết bị", "Bàn giao & Nhận trả", "Lập phụ phí & Đối soát", "Xem báo cáo doanh thu", "Quản lý khuyến mãi"], createdAt: "01/01/2024" },
  { id: "NV-002", username: "nv_mai", name: "Lê Thị Mai", password: "staff123", role: "Nhân viên kho", phone: "0909 000 002", email: "mai.lt@geargo.vn", status: "active", permissions: ["Quản lý kho thiết bị", "Bàn giao & Nhận trả"], createdAt: "15/02/2024" },
  { id: "NV-003", username: "nv_tuan", name: "Trần Tuấn", password: "staff123", role: "Nhân viên kho", phone: "0909 000 003", email: "tuan.t@geargo.vn", status: "active", permissions: ["Quản lý kho thiết bị", "Bàn giao & Nhận trả"], createdAt: "10/03/2024" },
  { id: "NV-004", username: "nv_hung", name: "Vũ Huy Hùng", password: "staff123", role: "Nhân viên chăm sóc KH", phone: "0909 000 004", email: "hung.vh@geargo.vn", status: "locked", lockedReason: "Nghỉ việc từ 01/10/2024 (UC1.11 Demo)", permissions: ["Lập phụ phí & Đối soát"], createdAt: "01/04/2024" },
];
