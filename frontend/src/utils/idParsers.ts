// ─── ID Parsers ──────────────────────────────────────────────────────────────

/**
 * Trích xuất mã số nguyên dương từ ID chuỗi (ví dụ "TB-012" -> 12, "45" -> 45).
 * Trả về null nếu không có phần số hợp lệ.
 */
export const parseNumericId = (rawId?: string | number | null): number | null => {
  if (rawId === null || rawId === undefined) return null;
  if (typeof rawId === "number") return Number.isFinite(rawId) && rawId > 0 ? rawId : null;
  const direct = Number(rawId);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const parsed = parseInt(rawId.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
