import { useEffect, useMemo, useState } from "react";

/**
 * Hook phân trang dùng chung cho cả End-user và Staff/Admin.
 * Tự động đưa về trang hợp lệ khi danh sách thay đổi do lọc/tìm kiếm.
 */
export function usePagination<T>(items: readonly T[], pageSize = 8) {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  const pagedItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    page: safePage,
    setPage,
    totalPages,
    totalItems,
    pageSize,
    startIndex,
    endIndex,
    pagedItems,
  };
}
