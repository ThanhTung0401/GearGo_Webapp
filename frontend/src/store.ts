// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = "customer" | "staff" | "admin";

export type OrderStatus =
  | "Chờ thanh toán"
  | "Đã xác nhận"
  | "Đang chuẩn bị"
  | "Sẵn sàng nhận"
  | "Đang thuê"
  | "Đã nhận trả"
  | "Chờ đối soát"
  | "Hoàn tất"
  | "Hết hạn"
  | "Khách hủy"
  | "Cửa hàng hủy";

export type EquipmentStatus =
  | "Sẵn sàng"
  | "Đang thuê"
  | "Đang bảo trì"
  | "Thất lạc"
  | "Ngừng sử dụng";

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  description: string;
  displayOrder: number;
  status: "active" | "inactive";
}

export interface Product {
  id: string;
  displayCode?: string;
  categoryId?: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  capacity: string;
  dimensions?: string;
  specifications?: Record<string, string>;
  pricePerDay: number;
  deposit: number;
  compensation: number;
  image: string;
  images?: string[];
  status: "active" | "inactive";
  rating: number;
  reviews: number;
}

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
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount: number | null;
  minimumRental: number;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  startsAt: string;
  endsAt: string;
  totalUsageLimit: number | null;
  perCustomerLimit: number | null;
  usedCount: number;
  status: "active" | "inactive";
}

export interface PromotionUsage {
  id: string;
  promotionId: string;
  orderId: string;
  reservedAt: string;
  expiresAt?: string;
  usedAt?: string;
  releasedAt?: string;
  discountAmount: number;
  status: "reserved" | "used" | "released";
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export interface Equipment {
  id: string;
  displayCode?: string;
  importReceiptLineId?: string;
  productId: string; // current product assignment (can be reassigned)
  originalProductId: string; // source from import
  importReceiptId: string;
  importDate: string;
  importPrice: number;
  condition: string;
  includedAccessories?: string[];
  note?: string;
  equipmentStatus: EquipmentStatus;
  rentCount: number;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  qty: number;
  days: number;
  pricePerDay: number;
  depositPerUnit: number;
  compensation: number;
}

export interface AssignedEquipment {
  equipmentId: string;
  productId: string;
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
}

export type TransactionStatus = "Đang xử lý" | "Thành công" | "Thất bại" | "Hết hạn";
export type TransactionType = "Thanh toán ban đầu" | "Hoàn cọc" | "Thu thêm" | "Hoàn tiền hủy";

export interface MoneyTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
  completedAt?: string;
  note?: string;
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
  lines: ImportReceiptLine[];
}

export interface HandoverItemCheck {
  equipmentId: string;
  productId: string;
  condition: string;
  accessoriesOk: boolean;
  note?: string;
}

export interface HandoverRecord {
  id: string; // BBBG-{orderId}
  orderId: string;
  handoverAt: string;
  staffName: string;
  customerName: string;
  items: HandoverItemCheck[];
  accessoriesChecklist: { name: string; checked: boolean }[];
  initialNotes?: string;
  photoUrls?: string[];
  signatureConfirmed: boolean;
}

export interface ReturnReceiptItem {
  equipmentId: string;
  productId: string;
  condition: "Bình thường" | "Cần vệ sinh" | "Hỏng nhẹ" | "Hỏng nặng" | "Thiếu phụ kiện" | "Mất thiết bị";
  note?: string;
  surchargeAmount: number;
  maintenanceReceiptId?: string;
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
}

export interface MaintenanceReceipt {
  id: string; // PBT-{timestamp}
  equipmentId: string;
  productId: string;
  orderId?: string;
  issueDescription: string;
  status: "Chờ xử lý" | "Đang bảo dưỡng" | "Hoàn tất" | "Không thể sửa";
  createdAt: string;
  estimatedCost: number;
  actualCost?: number;
  completedAt?: string;
  note?: string;
}

export interface StockAdjustmentLine {
  equipmentId: string;
  previousStatus: EquipmentStatus;
  newStatus: EquipmentStatus;
  reason: string;
}

export interface StockAdjustmentReceipt {
  id: string; // PDCK-{timestamp}
  createdAt: string;
  createdBy: string;
  reason: string;
  lines: StockAdjustmentLine[];
}

export interface StaffAccount {
  id: string; // NV-001
  username: string;
  name: string;
  role: "Quản trị viên" | "Nhân viên kho" | "Nhân viên chăm sóc KH";
  phone: string;
  email: string;
  status: "active" | "locked";
  lockedReason?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  pickupTime: string;
  returnTime: string;
  rental: number;
  discount: number;
  depositTotal: number;
  promoCode?: string;
  status: OrderStatus;
  createdAt: string;
  expiresAt?: string;
  assignedEquipment: AssignedEquipment[];
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
  statusHistory: { status: OrderStatus; at: string; by: string }[];
}

export interface Review {
  id: string;
  orderId: string;
  productId: string;
  productName?: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
  status: "active" | "hidden";
  hiddenReason?: string;
  hiddenBy?: string;
}

// ─── Initial data ─────────────────────────────────────────────────────────────

export const INITIAL_CATEGORIES: Category[] = [
  { id: "CAT-TENT", parentId: null, name: "Lều trại", description: "Lều và mái che cho các chuyến cắm trại.", displayOrder: 1, status: "active" },
  { id: "CAT-LIGHT", parentId: null, name: "Đèn", description: "Thiết bị chiếu sáng ngoài trời.", displayOrder: 2, status: "active" },
  { id: "CAT-SLEEP", parentId: null, name: "Ngủ", description: "Túi ngủ và phụ kiện nghỉ đêm.", displayOrder: 3, status: "active" },
  { id: "CAT-COOK", parentId: null, name: "Nấu ăn", description: "Bếp và dụng cụ nấu ăn dã ngoại.", displayOrder: 4, status: "active" },
  { id: "CAT-BACKPACK", parentId: null, name: "Balo", description: "Balo trekking và túi mang đồ.", displayOrder: 5, status: "active" },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: "SUP-001", displayCode: "NCC001", name: "Naturehike Việt Nam", contactPerson: "Lê Minh Tuấn", phone: "0909 123 456", email: "sales@naturehike.vn", address: "TP. Hồ Chí Minh", taxCode: "0312345678", note: "Nhà cung cấp lều và đồ ngủ chính.", cooperationStatus: "active" },
  { id: "SUP-002", displayCode: "NCC002", name: "Outdoor Pro", contactPerson: "Trần Thu Hà", phone: "0912 345 678", email: "contact@outdoorpro.vn", address: "Hà Nội", taxCode: "0109876543", note: "Thiết bị bếp và chiếu sáng.", cooperationStatus: "active" },
];

export const INITIAL_PROMOTIONS: Promotion[] = [
  { id: "PROMO-001", code: "CAMPGO10", name: "Ưu đãi chuyến đi", discountType: "percentage", discountValue: 10, maxDiscount: 300000, minimumRental: 500000, scope: "all", productIds: [], categoryIds: [], startsAt: "2024-01-01T00:00", endsAt: "2030-12-31T23:59", totalUsageLimit: 100, perCustomerLimit: 1, usedCount: 23, status: "active" },
  { id: "PROMO-002", code: "NEWGEAR20", name: "Trải nghiệm thiết bị mới", discountType: "percentage", discountValue: 20, maxDiscount: 500000, minimumRental: 1000000, scope: "categories", productIds: [], categoryIds: ["CAT-TENT", "CAT-BACKPACK"], startsAt: "2024-01-01T00:00", endsAt: "2030-12-31T23:59", totalUsageLimit: 30, perCustomerLimit: 1, usedCount: 7, status: "active" },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "P001",
    name: "Lều 4 người – Tiêu chuẩn",
    category: "Lều trại",
    brand: "Naturehike",
    description: "Lều 4 mùa chống nước IPX4, khung nhôm nhẹ, dựng nhanh 5 phút. Kèm túi đựng, cọc và dây chằng.",
    capacity: "4 người",
    pricePerDay: 150000,
    deposit: 500000,
    compensation: 2500000,
    image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&h=400&fit=crop&auto=format",
    status: "active",
    rating: 4.8,
    reviews: 42,
  },
  {
    id: "P002",
    name: "Lều 4 người – Tiết kiệm",
    category: "Lều trại",
    brand: "Naturehike",
    description: "Lều đã qua sử dụng, tình trạng tốt 80%, đầy đủ phụ kiện. Phù hợp cho chuyến đi ngắn ngân sách tiết kiệm.",
    capacity: "4 người",
    pricePerDay: 100000,
    deposit: 300000,
    compensation: 1500000,
    image: "https://images.unsplash.com/photo-1576176539998-0237d1ac6a85?w=600&h=400&fit=crop&auto=format",
    status: "active",
    rating: 4.2,
    reviews: 18,
  },
  {
    id: "P003",
    name: "Đèn cắm trại LED",
    category: "Đèn",
    brand: "Black Diamond",
    description: "Đèn treo lều 400lm, sạc USB-C, 3 chế độ sáng, chống nước IPX4.",
    capacity: "—",
    pricePerDay: 40000,
    deposit: 100000,
    compensation: 400000,
    image: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=600&h=400&fit=crop&auto=format",
    status: "active",
    rating: 4.6,
    reviews: 34,
  },
  {
    id: "P004",
    name: "Túi ngủ mùa đông",
    category: "Ngủ",
    brand: "Decathlon",
    description: "Chịu nhiệt −5°C, chất liệu polyester cao cấp, trọng lượng 1.1kg.",
    capacity: "1 người",
    pricePerDay: 50000,
    deposit: 200000,
    compensation: 800000,
    image: "https://images.unsplash.com/photo-1537905569824-f89f14cceb68?w=600&h=400&fit=crop&auto=format",
    status: "active",
    rating: 4.5,
    reviews: 28,
  },
  {
    id: "P005",
    name: "Bếp gas du lịch",
    category: "Nấu ăn",
    brand: "Kovea",
    description: "Bếp gas mini van an toàn, 2.8kW, trọng lượng 86g. Kèm túi đựng và đầu nối.",
    capacity: "—",
    pricePerDay: 40000,
    deposit: 150000,
    compensation: 600000,
    image: "https://images.unsplash.com/photo-1532339142463-fd0a8979791a?w=600&h=400&fit=crop&auto=format",
    status: "active",
    rating: 4.7,
    reviews: 51,
  },
  {
    id: "P006",
    name: "Balo trekking 60L",
    category: "Balo",
    brand: "Osprey",
    description: "Khung nhôm nội vi AirScape, ngăn đựng nước 3L, đệm lưng thoáng khí.",
    capacity: "60 lít",
    pricePerDay: 80000,
    deposit: 300000,
    compensation: 1500000,
    image: "https://images.unsplash.com/photo-1571863533956-01c88e79957e?w=600&h=400&fit=crop&auto=format",
    status: "active",
    rating: 4.9,
    reviews: 55,
  },
];

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

// Pre-existing confirmed order for demo scenario
export const DEMO_ORDER: Order = {
  id: "DT-20241210-042",
  customerId: "KH001",
  customerName: "Nguyễn Văn An",
  customerPhone: "0901 234 567",
  items: [
    {
      productId: "P001",
      productName: "Lều 4 người – Tiêu chuẩn",
      qty: 2,
      days: 3,
      pricePerDay: 150000,
      depositPerUnit: 500000,
      compensation: 2500000,
    },
  ],
  pickupTime: "2024-12-15 09:00",
  returnTime: "2024-12-18 09:00",
  rental: 900000,
  discount: 90000,
  depositTotal: 1000000,
  promoCode: "CAMPGO10",
  status: "Đã xác nhận",
  createdAt: "2024-12-10 14:30",
  assignedEquipment: [],
  surcharges: [],
  transactions: [
    {
      id: "GD-20241210-001",
      type: "Thanh toán ban đầu",
      amount: 1810000,
      status: "Thành công",
      createdAt: "2024-12-10 14:44",
      completedAt: "2024-12-10 14:45",
    },
  ],
  paidAt: "2024-12-10 14:45",
  statusHistory: [
    { status: "Chờ thanh toán", at: "2024-12-10 14:30", by: "Hệ thống" },
    { status: "Đã xác nhận", at: "2024-12-10 14:45", by: "Hệ thống" },
  ],
};

// Đơn mẫu đang thuê có trả 1 phần (UC12 Demo)
export const DEMO_ORDER_PARTIAL: Order = {
  id: "DT-20241208-015",
  customerId: "KH002",
  customerName: "Trần Minh Quang",
  customerPhone: "0918 765 432",
  items: [
    {
      productId: "P001",
      productName: "Lều 4 người – Tiêu chuẩn",
      qty: 1,
      days: 4,
      pricePerDay: 150000,
      depositPerUnit: 500000,
      compensation: 2500000,
    },
    {
      productId: "P003",
      productName: "Đèn cắm trại LED",
      qty: 1,
      days: 4,
      pricePerDay: 40000,
      depositPerUnit: 100000,
      compensation: 400000,
    },
  ],
  pickupTime: "2024-12-08 09:00",
  returnTime: "2024-12-12 09:00",
  rental: 760000,
  discount: 0,
  depositTotal: 600000,
  status: "Đang thuê",
  createdAt: "2024-12-06 10:00",
  paidAt: "2024-12-06 10:15",
  handedOverAt: "2024-12-08 09:10",
  assignedEquipment: [
    {
      equipmentId: "L003",
      productId: "P001",
    },
    {
      equipmentId: "D003",
      productId: "P003",
      returnedAt: "10/12/2024 16:30",
      returnCondition: "Bình thường",
      returnNote: "Khách trả sớm đèn trước do không cần dùng",
    },
  ],
  handoverRecord: {
    id: "BBBG-DT-20241208-015",
    orderId: "DT-20241208-015",
    handoverAt: "08/12/2024 09:10",
    staffName: "NV Kho Tuấn",
    customerName: "Trần Minh Quang",
    items: [
      { equipmentId: "L003", productId: "P001", condition: "Tốt", accessoriesOk: true },
      { equipmentId: "D003", productId: "P003", condition: "Tốt, pin đầy", accessoriesOk: true },
    ],
    accessoriesChecklist: [
      { name: "Cọc và dây lều (10 cọc + 4 dây)", checked: true },
      { name: "Túi đựng lều", checked: true },
      { name: "Cáp sạc Type-C của đèn", checked: true },
    ],
    initialNotes: "Đầy đủ phụ kiện, thiết bị hoạt động tốt",
    signatureConfirmed: true,
  },
  returnReceipts: [
    {
      id: "PNT-DT-20241208-015-1",
      orderId: "DT-20241208-015",
      returnRound: 1,
      returnedAt: "10/12/2024 16:30",
      staffName: "NV Kho Mai",
      isFinalReturn: false,
      note: "Khách trả trước đèn D003, lều L003 tiếp tục dùng và sẽ trả vào ngày 12/12",
      items: [
        {
          equipmentId: "D003",
          productId: "P003",
          condition: "Bình thường",
          surchargeAmount: 0,
          note: "Đèn hoạt động bình thường, đã nhận lại cáp sạc",
        },
      ],
    },
  ],
  surcharges: [],
  transactions: [
    {
      id: "GD-20241206-002",
      type: "Thanh toán ban đầu",
      amount: 1360000,
      status: "Thành công",
      createdAt: "2024-12-06 10:15",
      completedAt: "2024-12-06 10:15",
    },
  ],
  statusHistory: [
    { status: "Chờ thanh toán", at: "2024-12-06 10:00", by: "Hệ thống" },
    { status: "Đã xác nhận", at: "2024-12-06 10:15", by: "Hệ thống" },
    { status: "Đang chuẩn bị", at: "2024-12-07 15:00", by: "NV Kho Tuấn" },
    { status: "Sẵn sàng nhận", at: "2024-12-07 16:30", by: "NV Kho Tuấn" },
    { status: "Đang thuê", at: "2024-12-08 09:10", by: "NV Kho Tuấn" },
  ],
};

export const INITIAL_ORDERS: Order[] = [DEMO_ORDER, DEMO_ORDER_PARTIAL];

export const INITIAL_MAINTENANCE_RECEIPTS: MaintenanceReceipt[] = [
  {
    id: "PBT-20240810-01",
    equipmentId: "L004",
    productId: "P001",
    issueDescription: "Rách nhẹ lớp vải chống nước cửa trước, cần may ép nhiệt",
    status: "Đang bảo dưỡng",
    createdAt: "10/08/2024 15:00",
    estimatedCost: 150000,
    note: "Đang đợi keo chống thấm chuyên dụng",
  },
];

export const fmt = (n: number) =>
  n.toLocaleString("vi-VN") + "đ";

export const statusColors: Record<string, { bg: string; text: string }> = {
  "Chờ thanh toán": { bg: "#FEF3C7", text: "#B45309" },
  "Đã xác nhận": { bg: "#DBEAFE", text: "#1D4ED8" },
  "Đang chuẩn bị": { bg: "#FEF9C3", text: "#A16207" },
  "Sẵn sàng nhận": { bg: "#DCFCE7", text: "#15803D" },
  "Đang thuê": { bg: "#EDE9FE", text: "#6D28D9" },
  "Đã nhận trả": { bg: "#CCFBF1", text: "#0D9488" },
  "Chờ đối soát": { bg: "#F3F4F6", text: "#374151" },
  "Hoàn tất": { bg: "#D1FAE5", text: "#065F46" },
  "Hết hạn": { bg: "#FEE2E2", text: "#B91C1C" },
  "Khách hủy": { bg: "#F3F4F6", text: "#6B7280" },
  "Cửa hàng hủy": { bg: "#FEF2F2", text: "#DC2626" },
  "Trả một phần": { bg: "#FFF7ED", text: "#C2410C" },
};

export const INITIAL_REVIEWS: Review[] = [
  {
    id: "REV-001",
    orderId: "DT-DEMO-001",
    productId: "P001",
    productName: "Lều 4 người – Tiêu chuẩn",
    customerId: "KH002",
    customerName: "Nguyễn Văn An",
    rating: 5,
    comment: "Lều rất chắc chắn, chống mưa tốt trong chuyến đi Ba Vì. Đầy đủ cọc và dây chằng phụ kiện.",
    createdAt: "2024-11-20 16:30",
    status: "active",
  },
  {
    id: "REV-002",
    orderId: "DT-DEMO-001",
    productId: "P003",
    productName: "Đèn cắm trại LED siêu sáng",
    customerId: "KH002",
    customerName: "Nguyễn Văn An",
    rating: 4,
    comment: "Đèn sáng tốt, pin dùng cả đêm, cầm vừa tay và móc treo tiện lợi.",
    createdAt: "2024-11-20 16:35",
    status: "active",
  },
];

export const INITIAL_STAFF_ACCOUNTS: StaffAccount[] = [
  { id: "NV-001", username: "admin", name: "Nguyễn Văn Trưởng (Admin)", role: "Quản trị viên", phone: "0909 000 001", email: "admin@geargo.vn", status: "active", createdAt: "01/01/2024" },
  { id: "NV-002", username: "nv_mai", name: "Lê Thị Mai", role: "Nhân viên kho", phone: "0909 000 002", email: "mai.lt@geargo.vn", status: "active", createdAt: "15/02/2024" },
  { id: "NV-003", username: "nv_tuan", name: "Trần Tuấn", role: "Nhân viên kho", phone: "0909 000 003", email: "tuan.t@geargo.vn", status: "active", createdAt: "10/03/2024" },
  { id: "NV-004", username: "nv_hung", name: "Vũ Huy Hùng", role: "Nhân viên chăm sóc KH", phone: "0909 000 004", email: "hung.vh@geargo.vn", status: "locked", lockedReason: "Nghỉ việc từ 01/10/2024", createdAt: "01/04/2024" },
];

export const INITIAL_STOCK_ADJUSTMENTS: StockAdjustmentReceipt[] = [
  {
    id: "PDCK-20240901-01",
    createdAt: "01/09/2024 16:00",
    createdBy: "Quản trị viên",
    reason: "Kiểm kê kho định kỳ Quý 3/2024",
    lines: [
      { equipmentId: "L004", previousStatus: "Sẵn sàng", newStatus: "Đang bảo trì", reason: "Phát hiện rách nhẹ cửa khi kiểm kê định kỳ" },
    ],
  },
];

