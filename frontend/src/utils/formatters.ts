// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Định dạng số tiền sang chuẩn VNĐ (Ví dụ: 150000 -> "150.000đ")
 */
export const fmt = (n?: number | null): string =>
  (n ?? 0).toLocaleString("vi-VN") + "đ";
