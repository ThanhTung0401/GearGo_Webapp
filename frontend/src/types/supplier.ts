// ─── Supplier & Import Receipt Types ──────────────────────────────────────────

export interface Supplier {
  id: string;
  displayCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxCode: string;
  note: string;
  cooperationStatus: "active" | "inactive";
  statusReason?: string; // Lý do ngừng hợp tác / thay đổi trạng thái (UC7.4)
}

export interface ImportReceiptLine {
  id?: string;
  productId: string;
  productNameSnapshot?: string;
  quantity: number;
  unitPrice: number;
  equipmentCodes: string[];
  receivingCondition?: string;
  note?: string;
  // Bổ sung kiểm định chất lượng UC7.7 & UC7.7.2:
  acceptedQty?: number; // Số lượng đạt chuẩn
  acceptedCodes?: string[]; // Mã thiết bị đạt -> vào kho Sẵn sàng
  damagedQty?: number; // Số lượng lỗi chấp nhận bảo hành (UC7.7.2)
  damagedCodes?: string[]; // Mã thiết bị lỗi -> vào kho Đang bảo trì
  damageNotes?: string; // Mô tả lỗi kỹ thuật
  rejectedQty?: number; // Số lượng từ chối trả lại NCC -> không tăng kho
  rejectionReason?: string; // Lý do từ chối
  priceZeroReason?: string; // Lý do đơn giá 0 (hàng tặng/bảo hành - UC7.5.1)
}

export interface ImportReceiptAdjustment {
  id: string; // DCNH-...
  importReceiptId: string;
  type: "Giá vốn" | "Số lượng" | "Thông tin chứng từ";
  previousValue: string;
  newValue: string;
  reason: string;
  evidence?: string;
  status: "Chờ duyệt" | "Đã duyệt" | "Từ chối";
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewNote?: string;
  reviewNotes?: string; // Alias
  reviewedBy?: string;  // Alias
  reviewedAt?: string;  // Alias
}

export interface ImportReceipt {
  id: string;
  displayCode?: string;
  supplierId: string;
  supplierName: string;
  supplierDocumentNumber?: string;
  expectedAt?: string;
  receivedAt?: string;
  note?: string;
  status: "Nháp" | "Đã nhập kho" | "Đã hủy";
  createdAt: string;
  createdBy: string;
  confirmedAt?: string;
  cancelledAt?: string; // Hỗ trợ phiếu hủy
  cancelReason?: string; // Lý do hủy
  lines: ImportReceiptLine[];
  inspectedBy?: string; // Nhân viên kho kiểm nhận thực tế (UC7.7)
  inspectedAt?: string;
  adjustments?: ImportReceiptAdjustment[]; // Các bản ghi điều chỉnh sau chốt (UC7.10)
}
