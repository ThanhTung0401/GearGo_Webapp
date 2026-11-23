export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (nextPage: number) => void;
  itemLabel?: string;
  className?: string;
}

// Sinh danh sách trang gọn (có dấu "…" khi nhiều trang)
function buildPageTokens(current: number, total: number): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const tokens: Array<number | "..."> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) tokens.push("...");
  for (let p = left; p <= right; p += 1) tokens.push(p);
  if (right < total - 1) tokens.push("...");
  tokens.push(total);
  return tokens;
}

/**
 * Thanh phân trang thống nhất theo bảng màu GearGo cho cả giao diện End-user và Staff/Admin.
 */
export default function Pagination({
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  itemLabel = "mục",
  className = "",
}: PaginationProps) {
  if (totalItems === 0) return null;
  const tokens = buildPageTokens(page, totalPages);

  return (
    <nav
      aria-label="Phân trang"
      data-testid="pagination-bar"
      className={`mt-4 flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-[var(--color-bone)] ${className}`}
    >
      <div className="text-xs text-[var(--color-moss)] font-medium">
        Hiển thị <strong className="text-[var(--color-bark)]">{startIndex}–{endIndex}</strong> /{" "}
        <strong className="text-[var(--color-bark)]">{totalItems}</strong> {itemLabel}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Trang trước"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-bone)] bg-white text-[var(--color-bark)] hover:bg-[var(--color-parchment)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            ← Trước
          </button>

          {tokens.map((tok, idx) =>
            tok === "..." ? (
              <span key={`dots-${idx}`} className="px-1.5 text-xs text-gray-400 select-none">
                …
              </span>
            ) : (
              <button
                key={tok}
                type="button"
                aria-current={tok === page ? "page" : undefined}
                onClick={() => onPageChange(tok)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  tok === page
                    ? "bg-[var(--color-forest)] text-white shadow-2xs"
                    : "border border-[var(--color-bone)] bg-white text-[var(--color-bark)] hover:bg-[var(--color-parchment)]"
                }`}
              >
                {tok}
              </button>
            )
          )}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Trang sau"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-bone)] bg-white text-[var(--color-bark)] hover:bg-[var(--color-parchment)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Sau →
          </button>
        </div>
      )}
    </nav>
  );
}
