import type { FinancialAdjustment } from "../types";

export const INITIAL_FINANCIAL_ADJUSTMENTS: FinancialAdjustment[] = [
  {
    id: "PDC-TC-001",
    orderId: "DT-20241208-015",
    type: "Sai lệch kiểm kê",
    amount: 150000,
    reason: "Điều chỉnh bù trừ chi phí vệ sinh lều bám bẩn đợt khách trước bỏ sót",
    status: "Đã duyệt",
    createdBy: "Lê Thị Mai",
    createdAt: "10/12/2024 17:00",
    approvedBy: "Nguyễn Văn Trưởng",
  },
];
