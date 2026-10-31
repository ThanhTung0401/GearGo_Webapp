// ─── Rental Policy Types ──────────────────────────────────────────────────────

export interface AccessoryFeeItem {
  accessoryName: string;
  defaultFee: number;
}

export interface RentalPolicyConfig {
  version: string; // VD: "v1.0", "v1.1" (UC8.1.1)
  effectiveDate: string; // Ngày bắt đầu áp dụng
  changeReason?: string; // Lý do điều chỉnh phiên bản
  holdMinutes: number; // Mặc định 15 phút giữ chỗ
  standardPickupTime: string; // Giờ nhận máy tiêu chuẩn trong ngày (VD: "08:00")
  standardReturnTime: string; // Giờ trả máy tiêu chuẩn trong ngày (VD: "20:00")
  cancellationFreeHours: number; // Mặc định >48h miễn phí
  cancellationTier1Hours: number; // 24-48h
  cancellationTier1FeePercent: number; // 30%
  cancellationTier2FeePercent: number; // 100% (<24h)
  overdueMultiplier: number; // Hệ số phạt trễ hạn (1.5 = 150%/ngày)
  minDepositPercentage: number; // Tỷ lệ đặt cọc tối thiểu (100%)
  damageCompensationPercent: number; // Tỷ lệ đền bù hư hỏng cơ bản (% giá trị thiết bị, VD: 50%)
  accessoryLossFeeSchedule: AccessoryFeeItem[]; // Biểu phí đền bù mất phụ kiện
  adminApprovalFeeThreshold: number; // Ngưỡng phụ phí cần Quản trị viên duyệt (VD: 1.000.000 đ)
  reminderPickupHoursBefore: number; // Lịch nhắc nhận máy trước X giờ (VD: 4h)
  reminderReturnHoursBefore: number; // Lịch nhắc hẹn trả trước X giờ (VD: 2h)
  updatedAt: string;
  updatedBy: string;
}

export interface PolicyVersion {
  version: string;
  effectiveDate: string;
  updatedAt: string;
  updatedBy: string;
  changeReason: string;
  configSnapshot: RentalPolicyConfig;
}
