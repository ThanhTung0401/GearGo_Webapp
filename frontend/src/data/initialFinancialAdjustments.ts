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
  {
    id: "PDC-TC-002",
    orderId: "DT-20241210-042",
    type: "Hoàn trả",
    amount: 200000,
    reason: "Hoàn bổ sung tiền cọc thu dư do khách thanh toán nhầm 2 lần",
    status: "Chờ duyệt",
    createdBy: "Lê Thị Mai",
    createdAt: "15/11/2026 09:45",
  },
  {
    id: "PDC-TC-003",
    orderId: "DT-20241120-008",
    type: "Bù trừ chiết khấu",
    amount: -80000,
    reason: "Miễn giảm phí trễ 2 giờ do lỗi kẹt xe khách quan có xác nhận",
    status: "Đã duyệt",
    createdBy: "Trần Tuấn",
    createdAt: "12/11/2026 11:20",
    approvedBy: "Nguyễn Văn Trưởng",
  },
];
