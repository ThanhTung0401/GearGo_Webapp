import type { ImportReceipt } from "../types";

export const INITIAL_IMPORT_RECEIPTS: ImportReceipt[] = [
  {
    id: "PN-001",
    supplierId: "NCC001",
    supplierName: "Naturehike Việt Nam",
    status: "Đã nhập kho",
    createdAt: "15/03/2024 09:00",
    createdBy: "NV Mai",
    confirmedAt: "15/03/2024 11:00",
    lines: [
      { id: "PN-001-LINE-1", productId: "P001", productNameSnapshot: "Lều 4 người – Tiêu chuẩn", quantity: 5, unitPrice: 1200000, equipmentCodes: ["L001", "L002", "L003", "L005", "L006"], receivingCondition: "Mới", note: "" },
    ],
  },
  {
    id: "PN-002",
    supplierId: "NCC001",
    supplierName: "Naturehike Việt Nam",
    status: "Đã nhập kho",
    createdAt: "10/08/2024 09:00",
    createdBy: "NV Mai",
    confirmedAt: "10/08/2024 11:00",
    lines: [
      { id: "PN-002-LINE-1", productId: "P001", productNameSnapshot: "Lều 4 người – Tiêu chuẩn", quantity: 1, unitPrice: 1350000, equipmentCodes: ["L004"], receivingCondition: "Mới", note: "" },
    ],
  },
  {
    id: "PN-003",
    supplierId: "NCC002",
    supplierName: "Outdoor Pro",
    status: "Đã nhập kho",
    createdAt: "01/05/2024 09:00",
    createdBy: "NV Mai",
    confirmedAt: "01/05/2024 11:00",
    lines: [
      { id: "PN-003-LINE-1", productId: "P003", productNameSnapshot: "Đèn cắm trại LED 500lm", quantity: 4, unitPrice: 350000, equipmentCodes: ["D001", "D002", "D003", "D004"], receivingCondition: "Mới", note: "" },
    ],
  },
  {
    id: "PN-004",
    supplierId: "NCC001",
    supplierName: "Naturehike Việt Nam",
    status: "Đã nhập kho",
    createdAt: "20/04/2024 09:00",
    createdBy: "NV Mai",
    confirmedAt: "20/04/2024 11:00",
    lines: [
      { id: "PN-004-LINE-1", productId: "P004", productNameSnapshot: "Túi ngủ mùa đông", quantity: 3, unitPrice: 480000, equipmentCodes: ["T001", "T002", "T003"], receivingCondition: "Mới", note: "" },
    ],
  },
  {
    id: "PN-005",
    supplierId: "NCC002",
    supplierName: "Outdoor Pro",
    status: "Đã nhập kho",
    createdAt: "12/06/2024 09:00",
    createdBy: "NV Mai",
    confirmedAt: "12/06/2024 11:00",
    lines: [
      { id: "PN-005-LINE-1", productId: "P005", productNameSnapshot: "Bếp gas du lịch mini", quantity: 2, unitPrice: 600000, equipmentCodes: ["B001", "B002"], receivingCondition: "Mới", note: "" },
    ],
  },
  {
    id: "PN-006",
    supplierId: "NCC002",
    supplierName: "Outdoor Pro",
    status: "Đã nhập kho",
    createdAt: "01/07/2024 09:00",
    createdBy: "NV Mai",
    confirmedAt: "01/07/2024 11:00",
    lines: [
      { id: "PN-006-LINE-1", productId: "P006", productNameSnapshot: "Balo trekking 60L", quantity: 2, unitPrice: 2800000, equipmentCodes: ["A001", "A002"], receivingCondition: "Mới", note: "" },
    ],
  },
  {
    id: "PN-DEMO-001",
    supplierId: "NCC001",
    supplierName: "Naturehike Việt Nam",
    status: "Nháp",
    createdAt: "20/12/2024 09:00",
    createdBy: "NV Mai",
    lines: [
      { productId: "P001", quantity: 2, unitPrice: 1200000, equipmentCodes: ["L007", "L008"] },
      { productId: "P004", quantity: 5, unitPrice: 480000, equipmentCodes: ["T004", "T005", "T006", "T007", "T008"] },
    ],
  },
];
