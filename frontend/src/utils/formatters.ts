// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Định dạng số tiền sang chuẩn VNĐ (Ví dụ: 150000 -> "150.000đ")
 */
export const fmt = (n?: number | null): string =>
  (n ?? 0).toLocaleString("vi-VN") + "đ";

/**
 * Định dạng số nguyên theo chuẩn Việt Nam (Ví dụ: 1500 -> "1.500")
 */
export const formatNumberVi = (n?: number | null): string =>
  (n ?? 0).toLocaleString("vi-VN");

/**
 * Định dạng ngày sang chuỗi dd/MM/yyyy (trả về fallback nếu rỗng hoặc không hợp lệ)
 */
export const formatDateVi = (value?: string | Date | null, fallback = "—"): string => {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : fallback;
  return date.toLocaleDateString("vi-VN");
};

/**
 * Định dạng ngày giờ sang chuỗi dd/MM/yyyy HH:mm (trả về fallback nếu rỗng hoặc không hợp lệ)
 */
export const formatDateTimeVi = (value?: string | Date | null, fallback = "—"): string => {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : fallback;
  return date.toLocaleString("vi-VN");
};
