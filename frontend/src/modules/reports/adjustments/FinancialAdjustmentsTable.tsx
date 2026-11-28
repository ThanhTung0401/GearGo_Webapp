import { fmt, formatDateTimeVi, type FinancialAdjustment } from "../../../store";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";

interface FinancialAdjustmentsTableProps {
  adjustments: FinancialAdjustment[];
  canReview?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

/**
 * Bảng lịch sử chứng từ điều chỉnh tài chính và bù trừ đã lập có phân trang.
 */
export function FinancialAdjustmentsTable({
  adjustments,
  canReview = false,
  onApprove,
  onReject,
}: FinancialAdjustmentsTableProps) {
  const paging = usePagination(adjustments, 8);
  return (
    <div className="adm-table-wrap">
      <div className="adm-table-scroll overflow-x-auto">
        <table className="adm-table adm-table--zebra adm-table--md">
          <thead>
            <tr>
              {["Số chứng từ", "Loại điều chỉnh", "Chứng từ liên quan", "Số tiền (đ)", "Lý do bù trừ", "Người lập / Duyệt", "Thời gian", "Trạng thái", ...(canReview ? ["Thao tác"] : [])].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paging.pagedItems.length === 0 ? (
              <tr>
                <td colSpan={canReview ? 9 : 8} className="text-center py-8 text-sm text-gray-500">
                  Chưa có chứng từ điều chỉnh tài chính sau chốt nào.
                </td>
              </tr>
            ) : (
              paging.pagedItems.map((a) => (
                <tr key={a.id}>
                  <td className="adm-cell-code text-[0.82rem]">
                    {a.id}
                  </td>
                  <td className="font-semibold text-[0.82rem]">{a.type}</td>
                  <td className="adm-cell-mono text-[0.8rem]">
                    {a.orderId || a.importReceiptId || "—"}
                  </td>
                  <td className="adm-cell-mono text-[0.85rem] font-bold text-[#B45309]">
                    {fmt(a.amount)}
                  </td>
                  <td className="text-[0.82rem] text-[#374151]">{a.reason}</td>
                  <td className="text-[0.8rem]">
                    <div>{a.createdBy}</div>
                    <div className="text-[0.7rem] text-[#15803D]">
                      {a.status === "Chờ duyệt" ? "Chờ phê duyệt" : `${a.status === "Từ chối" ? "Từ chối" : "Duyệt"}: ${a.approvedBy || "Hệ thống"}`}
                    </div>
                  </td>
                  <td className="adm-hint-text text-[0.75rem] whitespace-nowrap">{formatDateTimeVi(a.createdAt)}</td>
                  <td>
                    <span
                      className={`badge text-[0.72rem] ${
                        a.status === "Đã duyệt"
                          ? "badge-success"
                          : a.status === "Từ chối"
                          ? "badge-danger"
                          : "badge-warning"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  {canReview && (
                    <td>
                      {a.status === "Chờ duyệt" ? (
                        <div className="flex gap-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onApprove?.(a.id)}
                            className="adm-btn-green-xs"
                          >
                            ✓ Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => onReject?.(a.id)}
                            className="adm-btn-danger-outline-xs"
                          >
                            ✕ Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-[0.72rem] text-gray-400">Đã xử lý</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-3">
        <Pagination
          page={paging.page}
          totalPages={paging.totalPages}
          totalItems={paging.totalItems}
          startIndex={paging.startIndex}
          endIndex={paging.endIndex}
          onPageChange={paging.setPage}
          itemLabel="chứng từ"
        />
      </div>
    </div>
  );
}
