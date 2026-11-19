import type { Supplier } from "../types";

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: "SUP-001", displayCode: "NCC001", name: "Naturehike Việt Nam", contactPerson: "Lê Minh Tuấn", phone: "0909 123 456", email: "sales@naturehike.vn", address: "TP. Hồ Chí Minh", taxCode: "0312345678", note: "Nhà cung cấp lều và đồ ngủ chính.", cooperationStatus: "active" },
  { id: "SUP-002", displayCode: "NCC002", name: "Outdoor Pro", contactPerson: "Trần Thu Hà", phone: "0912 345 678", email: "contact@outdoorpro.vn", address: "Hà Nội", taxCode: "0109876543", note: "Thiết bị bếp và chiếu sáng.", cooperationStatus: "active" },
  { id: "SUP-003", displayCode: "NCC003", name: "Kovea Camping Gear", contactPerson: "Phạm Quốc Hùng", phone: "0938 789 012", email: "contact@koveavietnam.com", address: "Đà Nẵng", taxCode: "0401239876", note: "Tạm dừng nhập hàng do chất lượng khung lều không đạt.", cooperationStatus: "inactive", statusReason: "Vi phạm chất lượng khung lều đợt giao T8/2024 (UC7.4)" },
  { id: "SUP-004", displayCode: "NCC004", name: "Osprey & BlackDiamond VN", contactPerson: "Nguyễn Hoàng Nam", phone: "0934 567 890", email: "sales@ospreyvn.com", address: "Quận 1, TP. Hồ Chí Minh", taxCode: "0314567890", note: "Nhà phân phối balo trekking và gậy leo núi chuyên dụng.", cooperationStatus: "active" },
  { id: "SUP-005", displayCode: "NCC005", name: "EcoFlow Energy Việt Nam", contactPerson: "Phạm Minh Khoa", phone: "0977 112 233", email: "b2b@ecoflow.vn", address: "Cầu Giấy, Hà Nội", taxCode: "0107788990", note: "Trạm sạc dự phòng và pin năng lượng mặt trời.", cooperationStatus: "active" },
  { id: "SUP-006", displayCode: "NCC006", name: "Decathlon Quechua Partner", contactPerson: "Lê Thanh Tùng", phone: "0988 990 011", email: "partner@decathlon.vn", address: "Thanh Xuân, Hà Nội", taxCode: "0105566778", note: "Lều bật tự động và đệm hơi tự bơm.", cooperationStatus: "active" },
];
