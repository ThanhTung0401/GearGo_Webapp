/** Chuyển đổi ngày (YYYY-MM-DD) và giờ (HH:mm) sang ISO timestamp phục vụ gọi API backend. */
export function toIsoDateTime(date: string, hour?: string): string {
  const h = hour || "09:00";
  const parsed = new Date(`${date}T${h}:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/** Lấy ngày hôm nay theo múi giờ địa phương dạng YYYY-MM-DD. */
export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Cộng thêm số ngày vào chuỗi YYYY-MM-DD. */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(`${dateStr}T00:00:00`) : new Date();
  base.setDate(base.getDate() + days);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Chuẩn hóa lịch thuê: Ngày nhận >= hôm nay, Ngày trả luôn > Ngày nhận ít nhất 1 ngày. */
export function normalizeRentalSchedule(
  nextPickup: string,
  nextReturn: string,
  changed: "pickup" | "return"
): { pickupDate: string; returnDate: string } {
  const today = getTodayDateStr();
  let pickupDate = nextPickup && nextPickup >= today ? nextPickup : today;
  let returnDate = nextReturn;

  if (changed === "pickup") {
    if (!returnDate || returnDate <= pickupDate) {
      returnDate = addDaysToDateStr(pickupDate, 1);
    }
  } else {
    if (!returnDate || returnDate <= pickupDate) {
      returnDate = addDaysToDateStr(pickupDate, 1);
    }
  }

  return { pickupDate, returnDate };
}

/** Parse timestamp từ server; nếu thiếu hậu tố múi giờ thì hiểu là UTC để tránh lệch múi giờ client. */
export function parseServerTimestamp(iso?: string | null): number {
  if (!iso) return NaN;
  const trimmed = iso.trim();
  if (!trimmed) return NaN;
  const hasTz = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed);
  return new Date(hasTz ? trimmed : `${trimmed}Z`).getTime();
}
