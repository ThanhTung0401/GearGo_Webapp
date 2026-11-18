/**
 * Dữ liệu dùng chung cho bộ test Playwright 10 phân hệ GearGo.
 * Khớp với tài khoản mẫu trong scripts/SeedData_GearGo_Full.sql.
 */

export const API_URL = process.env.API_URL || "http://localhost:5000";
export const APP_URL = process.env.APP_URL || "http://localhost:8443";

export const TEST_ACCOUNTS = {
  admin: {
    email: "admin@geargo.vn",
    password: process.env.TEST_PASSWORD || "GearGo@2026",
  },
  staff: {
    email: "staff@geargo.vn",
    password: process.env.TEST_PASSWORD || "GearGo@2026",
  },
  customer: {
    email: "customer@geargo.vn",
    password: process.env.TEST_PASSWORD || "GearGo@2026",
  },
  customer2: {
    email: "quang.kh@geargo.vn",
    password: process.env.TEST_PASSWORD || "GearGo@2026",
  },
  locked: {
    email: "locked.kh@geargo.vn",
    password: process.env.TEST_PASSWORD || "GearGo@2026",
  },
} as const;

/**
 * Tạo khoảng ngày thuê hợp lệ ở tương lai (mặc định +5 ngày đến +7 ngày kể từ hôm nay)
 * để không bị backend từ chối lỗi ngày quá khứ.
 */
export function getFutureRentalDates(offsetStartDays = 5, durationDays = 2) {
  const start = new Date();
  start.setDate(start.getDate() + offsetStartDays);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);

  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
  const pickupDate = toDateStr(start);
  const returnDate = toDateStr(end);

  return {
    pickupDate,
    returnDate,
    gioNhanIso: new Date(`${pickupDate}T09:00:00`).toISOString(),
    gioTraIso: new Date(`${returnDate}T09:00:00`).toISOString(),
  };
}

/**
 * Tạo chuỗi ngẫu nhiên ngắn để đặt tên/mã không trùng lặp khi test tạo mới.
 */
export function uniqueSuffix(): string {
  return `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}
