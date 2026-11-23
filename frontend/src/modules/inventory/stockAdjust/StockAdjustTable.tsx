import { useState } from "react";
import { formatDateTimeVi, type StockAdjustmentReceipt } from "../../../store";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";

interface StockAdjustTableProps {
  isRealApi: boolean;
  tabMessage: { type: "success" | "error"; text: string } | null;
  displayedAdjustments: StockAdjustmentReceipt[];
  actionLoadingId: string | null;
  onOpenAuditModal: () => void;
  onOpenManualModal: () => void;
  onCheckImpact: (sa: StockAdjustmentReceipt) => void;
  onApprove: (sa: StockAdjustmentReceipt) => void;
  onOpenReject: (saId: string) => void;
}

/**
 * Thanh tiêu đề, bộ lọc, thông báo và bảng danh sách phiếu kiểm kê / điều chỉnh kho có phân trang (UC6.10 & UC6.11).
 */
export function StockAdjustTable({
  isRealApi,
  tabMessage,
  displayedAdjustments,
  actionLoadingId,
  onOpenAuditModal,
  onOpenManualModal,
  onCheckImpact,
  onApprove,
  onOpenReject,
}: StockAdjustTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  const filtered = displayedAdjustments.filter((sa) => {
    const matchStatus = statusFilter === "Tất cả" || (sa.status || "Đã duyệt") === statusFilter;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      sa.id.toLowerCase().includes(q) ||
      (sa.createdBy || "").toLowerCase().includes(q) ||
      (sa.reason || "").toLowerCase().includes(q) ||
      sa.lines.some((l) => (l.equipmentId || "").toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });
  const paging = usePagination(filtered, 8);

  return (
    <>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="adm-page-title">
            Kiểm kê & Điều chỉnh kho (UC6.10 & UC6.11)
          </h2>
          <p className="adm-page-subtitle">
            Tách biệt tài sản khách đang thuê, lập phiếu đề nghị điều chỉnh chờ duyệt và kiểm tra xung đột đơn tương lai trước khi duyệt kho.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onOpenAuditModal} className="adm-btn-amber font-bold">
            📋 Kiểm kê kho (UC6.10)
          </button>
          <button onClick={onOpenManualModal} className="adm-btn-primary font-bold">
            + Lập phiếu thủ công
          </button>
        </div>
      </div>

      <div className="adm-toolbar mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Tìm mã phiếu, người lập, mã thiết bị, lý do..."
          aria-label="Tìm phiếu điều chỉnh kho"
          className="adm-search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc trạng thái điều chỉnh"
          className="adm-select adm-select--min"
        >
          {["Tất cả", "Chờ duyệt", "Đã duyệt", "Từ chối"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="adm-count-text">
          Hiển thị <strong>{filtered.length}</strong> / {displayedAdjustments.length} phiếu
        </span>
      </div>

      {tabMessage && (
        <div role="alert" className={`adm-alert ${tabMessage.type === "error" ? "is-error-solid" : "is-success"}`}>
          {tabMessage.text}
        </div>
      )}

      <div className="adm-table-wrap">
        <div className="adm-table-scroll overflow-x-auto">
          <table className="adm-table adm-table--zebra adm-table--md">
            <thead>
              <tr>
                {["Mã phiếu", "Ngày lập", "Người lập", "Lý do chung", "Thiết bị điều chỉnh", "Trạng thái cũ → Mới", "Tình trạng", "Phê duyệt", "Thao tác"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paging.pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-sm text-gray-500">
                    Không có phiếu điều chỉnh kho nào phù hợp.
                  </td>
                </tr>
              ) : (
                paging.pagedItems.map((sa) => (
                  <tr key={sa.id}>
                    <td className="adm-cell-code">
                      {sa.id}
                    </td>
                    <td className="adm-cell-muted whitespace-nowrap">{formatDateTimeVi(sa.createdAt)}</td>
                    <td className="font-semibold text-[0.82rem]">{sa.createdBy}</td>
                    <td className="text-[0.82rem] text-[var(--color-bark)]">{sa.reason}</td>
                    <td>
                      {sa.lines.map((l, idx) => (
                        <div key={`${l.equipmentId}-${idx}`}>
                          <strong className="adm-cell-mono text-[var(--color-forest)]">{l.equipmentId}</strong>
                          {l.reason && <span className="adm-hint-text"> ({l.reason})</span>}
                        </div>
                      ))}
                    </td>
                    <td>
                      {sa.lines.map((l, idx) => (
                        <div key={`${l.equipmentId}-${idx}`} className="flex items-center gap-1 whitespace-nowrap">
                          <span className="text-[#6B7280]">{l.previousStatus}</span>
                          <span>→</span>
                          <strong className={l.newStatus === "Ngừng sử dụng" ? "text-[#DC2626]" : l.newStatus === "Thất lạc" ? "text-[#B91C1C]" : "text-[var(--color-forest)]"}>
                            {l.newStatus}
                          </strong>
                        </div>
                      ))}
                    </td>
                    <td>
                      <span className={`adm-pill ${sa.status === "Chờ duyệt" ? "is-warning" : sa.status === "Từ chối" ? "is-danger" : "is-success"}`}>
                        {sa.status || "Đã duyệt"}
                      </span>
                    </td>
                    <td className="text-[0.75rem] text-[#6B7280]">
                      {sa.approvedBy ? `${sa.approvedBy}` : sa.status === "Chờ duyệt" ? "Chưa duyệt" : "Tự động"}
                      {sa.approvedAt && <div className="adm-muted-note text-[0.7rem] whitespace-nowrap">{formatDateTimeVi(sa.approvedAt)}</div>}
                    </td>
                    <td>
                      {sa.status === "Chờ duyệt" ? (
                        <div className="flex gap-1">
                          {isRealApi && sa.lines[0] && (
                            <button
                              type="button"
                              disabled={actionLoadingId === sa.id}
                              onClick={() => onCheckImpact(sa)}
                              className="adm-btn-info-soft adm-btn-xs"
                            >
                              🔍 Ảnh hưởng
                            </button>
                          )}
                          <button
                            disabled={actionLoadingId === sa.id}
                            onClick={() => onApprove(sa)}
                            className="adm-btn-forest-solid adm-btn-xs"
                          >
                            {actionLoadingId === sa.id ? "..." : "✓ Duyệt (UC6.11)"}
                          </button>
                          <button
                            disabled={actionLoadingId === sa.id}
                            onClick={() => onOpenReject(sa.id)}
                            className="adm-btn-danger-outline adm-btn-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="adm-muted-note text-[0.75rem]">Đã chốt</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={paging.page}
        totalPages={paging.totalPages}
        totalItems={paging.totalItems}
        startIndex={paging.startIndex}
        endIndex={paging.endIndex}
        onPageChange={paging.setPage}
        itemLabel="phiếu điều chỉnh"
      />
    </>
  );
}
