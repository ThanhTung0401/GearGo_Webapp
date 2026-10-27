import type { AuditLogEntry } from "../types";

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "LOG-001",
    timestamp: "10/12/2024 14:45:00",
    actor: "Nguyễn Văn Trưởng",
    role: "Quản trị viên",
    action: "Cập nhật chính sách",
    targetEntity: "RentalPolicy",
    targetId: "GLOBAL-POLICY",
    detail: "Điều chỉnh hệ số quá hạn 150% và áp dụng thời hạn giữ chỗ 15 phút.",
  },
  {
    id: "LOG-002",
    timestamp: "10/12/2024 14:30:12",
    actor: "Nguyễn Văn An",
    role: "Khách hàng",
    action: "Tạo đơn đặt thuê",
    targetEntity: "Order",
    targetId: "DT-20241210-042",
    detail: "Đặt thuê 2 lều P001, áp dụng voucher CAMPGO10 giảm 90.000đ.",
  },
  {
    id: "LOG-003",
    timestamp: "10/12/2024 16:30:00",
    actor: "Lê Thị Mai",
    role: "Nhân viên kho",
    action: "Lập phiếu nhận trả PNT",
    targetEntity: "ReturnReceipt",
    targetId: "PNT-DT-20241208-015-1",
    detail: "Nhận trả 1 phần đèn D003 trong tình trạng bình thường, tiếp tục cho thuê lều L003.",
  },
  {
    id: "LOG-004",
    timestamp: "01/10/2024 11:20:05",
    actor: "Nguyễn Văn Trưởng",
    role: "Quản trị viên",
    action: "Khóa tài khoản",
    targetEntity: "StaffAccount",
    targetId: "NV-004",
    detail: "Khóa tài khoản NV Vũ Huy Hùng lý do: Nghỉ việc từ 01/10/2024.",
  },
];
