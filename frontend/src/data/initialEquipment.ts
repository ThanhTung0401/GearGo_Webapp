import type { Equipment } from "../types";

export const INITIAL_EQUIPMENT: Equipment[] = [
  // Lều Tiêu chuẩn — 4 chiếc
  { id: "L001", productId: "P001", originalProductId: "P001", importReceiptId: "PN-001", importDate: "2024-03-15", importPrice: 1200000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 14 },
  { id: "L002", productId: "P001", originalProductId: "P001", importReceiptId: "PN-001", importDate: "2024-03-15", importPrice: 1200000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 12 },
  { id: "L003", productId: "P001", originalProductId: "P001", importReceiptId: "PN-001", importDate: "2024-03-15", importPrice: 1200000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 9 },
  { id: "L004", productId: "P001", originalProductId: "P001", importReceiptId: "PN-002", importDate: "2024-08-10", importPrice: 1350000, condition: "Mới", equipmentStatus: "Đang bảo trì", rentCount: 2 },
  // Lều Tiết kiệm — 2 chiếc
  { id: "L005", productId: "P002", originalProductId: "P001", importReceiptId: "PN-001", importDate: "2024-03-15", importPrice: 1200000, condition: "Tốt 80%", equipmentStatus: "Sẵn sàng", rentCount: 22 },
  { id: "L006", productId: "P002", originalProductId: "P001", importReceiptId: "PN-001", importDate: "2024-03-15", importPrice: 1200000, condition: "Tốt 75%", equipmentStatus: "Sẵn sàng", rentCount: 20 },
  // Đèn
  { id: "D001", productId: "P003", originalProductId: "P003", importReceiptId: "PN-003", importDate: "2024-05-01", importPrice: 350000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 8 },
  { id: "D002", productId: "P003", originalProductId: "P003", importReceiptId: "PN-003", importDate: "2024-05-01", importPrice: 350000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 6 },
  { id: "D003", productId: "P003", originalProductId: "P003", importReceiptId: "PN-003", importDate: "2024-05-01", importPrice: 350000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 11 },
  { id: "D004", productId: "P003", originalProductId: "P003", importReceiptId: "PN-003", importDate: "2024-05-01", importPrice: 350000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 5 },
  // Túi ngủ
  { id: "T001", productId: "P004", originalProductId: "P004", importReceiptId: "PN-004", importDate: "2024-04-20", importPrice: 480000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 9 },
  { id: "T002", productId: "P004", originalProductId: "P004", importReceiptId: "PN-004", importDate: "2024-04-20", importPrice: 480000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 7 },
  { id: "T003", productId: "P004", originalProductId: "P004", importReceiptId: "PN-004", importDate: "2024-04-20", importPrice: 480000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 15 },
  // Bếp
  { id: "B001", productId: "P005", originalProductId: "P005", importReceiptId: "PN-005", importDate: "2024-06-12", importPrice: 600000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 18 },
  { id: "B002", productId: "P005", originalProductId: "P005", importReceiptId: "PN-005", importDate: "2024-06-12", importPrice: 600000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 12 },
  // Balo
  { id: "A001", productId: "P006", originalProductId: "P006", importReceiptId: "PN-006", importDate: "2024-07-01", importPrice: 2800000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 6 },
  { id: "A002", productId: "P006", originalProductId: "P006", importReceiptId: "PN-006", importDate: "2024-07-01", importPrice: 2800000, condition: "Tốt", equipmentStatus: "Sẵn sàng", rentCount: 4 },
];
