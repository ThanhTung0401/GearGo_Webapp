import type { ChiTietNhanTraBackend } from "../../../services/api";
import type { ReturnReceiptItem } from "../../../store";

export type ReturnStatusFilter = "active" | "completed" | "all";

export type ContactOutcome =
  | "Hẹn giờ trả mới"
  | "Xin gia hạn thêm"
  | "Không nghe máy"
  | "Khách báo mất";

export interface DebtRowItem {
  key: string;
  maChiTietBanGiao: number | undefined;
  equipmentId: string;
  displayCode: string;
  productName: string;
  compensation: number;
  // FN5-05: thiết bị đang nằm trong phiếu nhận trả nháp (chưa chốt) thì phải khoá checkbox
  maPhieuNhanTraDangGiu?: number | null;
}

export interface OverdueInfoState {
  isOverdue: boolean;
  overdueDays: number;
  overdueHours: number;
  surcharge: number;
}

export interface ApproveLostTarget {
  phieuId: number;
  chiTiet: ChiTietNhanTraBackend;
}

// Tính mức phụ phí gợi ý mặc định theo tình trạng nhận trả và giá trị bồi thường tham chiếu
export function getDefaultReturnFee(cond: ReturnReceiptItem["condition"], compensation: number): number {
  if (cond === "Cần vệ sinh") return 50000;
  if (cond === "Hỏng nhẹ") return Math.round(compensation * 0.1);
  if (cond === "Hỏng nặng") return Math.round(compensation * 0.4);
  if (cond === "Thiếu phụ kiện") return 80000;
  if (cond === "Mất thiết bị") return compensation;
  return 0;
}
