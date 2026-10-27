// ─── Order & Rental Operation Types ──────────────────────────────────────────

import type { OrderStatus, MoneyTransaction } from "./common";

export interface OrderItem {
  productId: string;
  productName: string;
  qty: number;
  days: number;
  pricePerDay: number;
  depositPerUnit: number;
  compensation: number;
  price?: number; // Alias tương thích
  equipmentId?: string; // Gán tạm thời
}

export interface AssignedEquipment {
  equipmentId: string;
  productId: string;
  assignedAt?: string;
  returnedAt?: string;
  returnCondition?: string;
  returnNote?: string;
}

export interface Surcharge {
  id: string;
  type: string;
  equipmentId: string;
  amount: number;
  reason: string;
  status: "Chờ duyệt" | "Đã duyệt" | "Từ chối" | "Tranh chấp";
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  customerResponse?: string;
  resolutionNote?: string;
  originalAmount?: number;
}

export interface HandoverItemCheck {
  equipmentId: string;
  productId: string;
  condition: string;
  accessoriesOk?: boolean;
  accessoriesChecked?: boolean;
  note?: string;
}

export interface HandoverRecord {
  id: string; // BBBG-{orderId}
  orderId: string;
  handoverAt?: string;
  handedOverAt?: string;
  staffName: string;
  customerName?: string;
  customerConfirmedName?: string;
  receiverName?: string; // Họ tên người nhận thực tế tại quầy (UC4.2)
  receiverPhone?: string; // SĐT người nhận tại quầy
  receiverIdCard?: string; // Số CCCD/Định danh người nhận
  isAuthorizedReceiver?: boolean; // Nhận thay được ủy quyền (dòng 1.1)
  earlyPickupConfirmed?: boolean; // Chấp thuận nhận sớm hơn lịch hẹn (dòng 1.2)
  items: HandoverItemCheck[];
  accessoriesChecklist?: { name: string; checked: boolean }[];
  accessoriesList?: { name: string; checked: boolean }[];
  initialNotes?: string;
  photoUrls?: string[];
  signatureConfirmed: boolean;
}

// UC4.4: Lịch sử liên hệ xử lý quá hạn
export interface ContactLog {
  id: string;
  contactedAt: string;
  staffName: string;
  outcome: "Hẹn giờ trả mới" | "Xin gia hạn thêm" | "Không nghe máy" | "Khách báo mất" | "Khác";
  note: string;
  newExpectedTime?: string;
}

export interface ReturnReceiptItem {
  equipmentId: string;
  productId: string;
  condition: "Bình thường" | "Cần vệ sinh" | "Hỏng nhẹ" | "Hỏng nặng" | "Thiếu phụ kiện" | "Mất thiết bị";
  note?: string;
  surchargeAmount: number;
  maintenanceReceiptId?: string;
  lostApproved?: boolean; // Quản trị viên duyệt kết luận mất (UC4.3 Dòng phụ 3.2 & 814)
}

export interface ReturnReceipt {
  id: string; // PNT-{orderId}-{returnRound}
  orderId: string;
  returnRound: number; // 1, 2, 3...
  returnedAt: string;
  staffName: string;
  items: ReturnReceiptItem[];
  isFinalReturn: boolean; // la_lan_tra_cuoi: true khi tất cả thiết bị của đơn đã xử lý xong
  note?: string;
  photoUrls?: string[]; // Ảnh bằng chứng hư hại khi nhận trả
}

// UC5.4: Bảng đối soát cọc và hoàn tất đơn (Reconciliation Statement)
export interface ReconciliationStatement {
  confirmedAt?: string;
  confirmedBy?: string;
  depositCollected: number; // Tiền cọc thực thu ban đầu
  totalApprovedSurcharges: number; // Tổng phụ phí bồi thường & quá hạn đã duyệt
  totalPriorSettlements: number; // Các khoản thu thêm/hoàn cọc đã xử lý trước đó
  netDifference: number; // Chênh lệch còn lại = depositCollected - totalApprovedSurcharges - totalPriorSettlements
  settlementType: "refund" | "collect" | "balanced"; // Hoàn cọc (UC5.6) | Thu thêm (UC5.5) | Cân bằng (Dòng 5.1)
  status: "draft" | "confirmed" | "locked"; // Dự thảo -> Đã xác nhận căn cứ (Bước 4) -> Đã khóa hoàn tất (Bước 7)
  lockedAt?: string;
  lockedBy?: string;
  note?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  pickupTime: string;
  returnTime: string;
  rentalStartDate?: string; // Alias tương thích
  rentalEndDate?: string;   // Alias tương thích
  rental: number;
  discount: number;
  depositTotal: number;
  total?: number; // Alias tương thích
  promoCode?: string;
  status: OrderStatus;
  createdAt: string;
  expiresAt?: string;
  assignedEquipment: AssignedEquipment[];
  assignedEquipmentIds?: any; // Hỗ trợ backward compatibility
  handoverRecord?: HandoverRecord;
  returnReceipts?: ReturnReceipt[];
  surcharges: Surcharge[];
  transactions: MoneyTransaction[];
  cancellationFee?: number;
  cancellationRefund?: number;
  cancellationReason?: string;
  paidAt?: string;
  handedOverAt?: string;
  returnedAt?: string;
  reconciledAt?: string;
  reconciliation?: ReconciliationStatement;
  contactLogs?: ContactLog[]; // UC4.4: Lịch sử gọi điện nhắc và xử lý quá hạn
  shortageReported?: { reportedAt: string; staffName: string; note: string; status: "Chờ xử lý" | "Đã giải quyết" }; // UC4.1 Dòng phụ 5.1
  noShowReported?: { reportedAt: string; staffName: string; note: string }; // UC4.5 Dòng phụ 4.2
  statusHistory: { status: OrderStatus; at: string; by: string }[];
}
