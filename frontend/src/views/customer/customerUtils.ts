/** Chuyển đổi ngày (YYYY-MM-DD) và giờ (HH:mm) sang ISO timestamp phục vụ gọi API backend. */
export function toIsoDateTime(date: string, hour?: string): string {
  const h = hour || "09:00";
  const parsed = new Date(`${date}T${h}:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}
