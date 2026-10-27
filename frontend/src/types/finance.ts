// ─── Financial Adjustment Types ───────────────────────────────────────────────

export interface FinancialAdjustment {
  id: string;
  orderId?: string;
  importReceiptId?: string;
  type: "Thu bù" | "Hoàn trả" | "Bù trừ chiết khấu" | "Sai lệch kiểm kê";
  amount: number;
  reason: string;
  status: "Đã duyệt" | "Chờ duyệt";
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
}
