import type { Supplier } from "../types";

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: "SUP-001", displayCode: "NCC001", name: "Naturehike Việt Nam", contactPerson: "Lê Minh Tuấn", phone: "0909 123 456", email: "sales@naturehike.vn", address: "TP. Hồ Chí Minh", taxCode: "0312345678", note: "Nhà cung cấp lều và đồ ngủ chính.", cooperationStatus: "active" },
  { id: "SUP-002", displayCode: "NCC002", name: "Outdoor Pro", contactPerson: "Trần Thu Hà", phone: "0912 345 678", email: "contact@outdoorpro.vn", address: "Hà Nội", taxCode: "0109876543", note: "Thiết bị bếp và chiếu sáng.", cooperationStatus: "active" },
  { id: "SUP-003", displayCode: "NCC003", name: "Kovea Camping Gear", contactPerson: "Phạm Quốc Hùng", phone: "0938 789 012", email: "contact@koveavietnam.com", address: "Đà Nẵng", taxCode: "0401239876", note: "Tạm dừng nhập hàng do chất lượng khung lều không đạt.", cooperationStatus: "inactive", statusReason: "Vi phạm chất lượng khung lều đợt giao T8/2024 (UC7.4)" },
];
