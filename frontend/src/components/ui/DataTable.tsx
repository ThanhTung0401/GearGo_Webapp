import React, { useState } from "react";
import EmptyState from "./EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index?: number) => string;
  emptyMessage?: string;
  pageSize?: number;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Không có dữ liệu trong danh sách.",
  pageSize = 10
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const currentData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--color-bone)] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-[var(--color-parchment)] border-b border-[var(--color-bone)] text-gray-600 font-semibold text-xs">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.align || "left" }}
                  className="px-4 py-3 whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-bone)]">
            {currentData.map((item, index) => (
              <tr key={keyExtractor(item, index)} className="hover:bg-gray-50/80 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ textAlign: col.align || "left" }}
                    className="px-4 py-3"
                  >
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-bone)] bg-gray-50/50 text-xs text-gray-500">
          <div>
            Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, data.length)} trên tổng {data.length} dòng
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-2.5 py-1 rounded border border-[var(--color-bone)] bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-100"
            >
              Trước
            </button>
            <span className="px-2 font-semibold text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1 rounded border border-[var(--color-bone)] bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-100"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
