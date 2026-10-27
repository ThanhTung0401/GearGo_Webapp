import type { Category } from "../types";

export const INITIAL_CATEGORIES: Category[] = [
  { id: "CAT-TENT", parentId: null, name: "Lều trại", description: "Lều và mái che cho các chuyến cắm trại.", displayOrder: 1, status: "active" },
  { id: "CAT-LIGHT", parentId: null, name: "Đèn", description: "Thiết bị chiếu sáng ngoài trời.", displayOrder: 2, status: "active" },
  { id: "CAT-SLEEP", parentId: null, name: "Ngủ", description: "Túi ngủ và phụ kiện nghỉ đêm.", displayOrder: 3, status: "active" },
  { id: "CAT-COOK", parentId: null, name: "Nấu ăn", description: "Bếp và dụng cụ nấu ăn dã ngoại.", displayOrder: 4, status: "active" },
  { id: "CAT-BACKPACK", parentId: null, name: "Balo", description: "Balo trekking và túi mang đồ.", displayOrder: 5, status: "active" },
];
