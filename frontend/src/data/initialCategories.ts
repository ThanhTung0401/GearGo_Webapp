import type { Category } from "../types";

/**
 * Dữ liệu danh mục khởi tạo / dự phòng (fallback) khi Backend API chưa sẵn sàng.
 * Khi kết nối với ASP.NET Core API (WP-M06: UC44 - UC48 / UC6.1 - UC6.4),
 * hệ thống sẽ ưu tiên tải cây danh mục thực tế từ `catalogApi.layCayDanhMuc()`.
 */
export const INITIAL_CATEGORIES: Category[] = [
  { id: "CAT-TENT", parentId: null, name: "Lều trại", description: "Lều và mái che cho các chuyến cắm trại.", displayOrder: 1, status: "active" },
  { id: "CAT-LIGHT", parentId: null, name: "Đèn", description: "Thiết bị chiếu sáng ngoài trời.", displayOrder: 2, status: "active" },
  { id: "CAT-SLEEP", parentId: null, name: "Ngủ", description: "Túi ngủ và phụ kiện nghỉ đêm.", displayOrder: 3, status: "active" },
  { id: "CAT-COOK", parentId: null, name: "Nấu ăn", description: "Bếp và dụng cụ nấu ăn dã ngoại.", displayOrder: 4, status: "active" },
  { id: "CAT-BACKPACK", parentId: null, name: "Balo", description: "Balo trekking và túi mang đồ.", displayOrder: 5, status: "active" },
  { id: "CAT-FURNITURE", parentId: null, name: "Bàn ghế dã ngoại", description: "Bàn cuộn nhôm, ghế xếp Kermit tiện lợi.", displayOrder: 6, status: "active" },
  { id: "CAT-POWER", parentId: null, name: "Năng lượng & Sạc", description: "Trạm sạc dự phòng và đèn pin công suất lớn.", displayOrder: 7, status: "active" },
  { id: "CAT-WINTER", parentId: null, name: "Đồ mùa đông (Tạm ẩn)", description: "Danh mục thiết bị giữ nhiệt lưu kho theo mùa.", displayOrder: 8, status: "inactive" },
];
