import type { AuditLogEntryWithRef } from "../../../services/mappers";
import Icon from "../../../components/Icon";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";
import { formatDateTimeVi } from "../../../store";
import { formatBackendEnum } from "../../../utils/formatters";
import { type StaffTab } from "../../orders/returnMapping";

// FN7-03: Tóm tắt chi tiết nội dung thô (chuỗi JSON Trước/Sau) thành key: value dễ đọc.
function summarizeAuditDetail(raw: string | null | undefined): string {
  if (!raw) return "";
  const text = String(raw);
  // Cố gắng phát hiện các đoạn Trước: {...} | Sau: {...} và rút ngắn
  const jsonRe = /\{[\s\S]*?\}/g;
  const matches = text.match(jsonRe);
  if (!matches || matches.length === 0) return text;
  let summary = text;
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m);
      const pairs = Object.entries(parsed)
        .slice(0, 3)
        .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(", ");
      summary = summary.replace(m, pairs || "{…}");
    } catch {
      // Bỏ qua nếu không phải JSON hợp lệ
    }
  }
  return summary;
}

interface StaffAuditLogSectionProps {
  searchAudit: string;
  setSearchAudit: (value: string) => void;
  staffLogs: AuditLogEntryWithRef[];
  openOrder: (id: string, tab: StaffTab) => void;
}

// Bảng tra cứu nhật ký thao tác nhân viên kèm nút mở nhanh đơn thuê & phân trang (UC10.4)
export function StaffAuditLogSection({
  searchAudit,
  setSearchAudit,
  staffLogs,
  openOrder,
}: StaffAuditLogSectionProps) {
  const paging = usePagination(staffLogs, 10);

  return (
    <div>
      {/* Tìm kiếm nhật ký nhân viên */}
      <div className="flex gap-3 mb-4">
        <div className="so-search-wrap">
          <input
            type="text"
            placeholder="Tìm nhật ký thao tác theo hành động, mã đơn, thiết bị..."
            value={searchAudit}
            onChange={(e) => setSearchAudit(e.target.value)}
            className="so-search-input"
          />
          <div className="so-search-icon"><Icon name="search" size={16} /></div>
        </div>
      </div>

      <div className="so-table-card responsive-table">
        <table className="so-table so-table-audit">
          <thead>
            <tr>
              {["Thời gian", "Người thực hiện", "Hành động", "Đối tượng tác động", "Chi tiết nội dung", "Thao tác"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paging.pagedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="so-td-empty">
                  Chưa có nhật ký thao tác phù hợp.
                </td>
              </tr>
            ) : (
              paging.pagedItems.map((log) => {
                // Trích xuất mã đơn thuê từ tham chiếu URL hoặc đối tượng tác động để mở nhanh
                const entityNorm = (log.targetEntity || "").toUpperCase();
                const orderMatch =
                  entityNorm === "DONTHUE" ||
                  entityNorm === "DON_THUE" ||
                  log.targetId.startsWith("DT-") ||
                  log.targetId.startsWith("ORD-") ||
                  Boolean(log.thamChieuUrl?.includes("/don-thue/"));
                const orderIdToOpen =
                  log.thamChieuUrl?.match(/\/don-thue\/(\d+)/)?.[1] || log.targetId;
                return (
                  <tr key={log.id}>
                    <td className="so-td-mono-time whitespace-nowrap">
                      {formatDateTimeVi(log.timestamp)}
                    </td>
                    <td className="so-td-bold">{log.actor}</td>
                    <td className="so-td-action">{formatBackendEnum(log.action, log.action)}</td>
                    <td className="so-td-mono-plain">
                      <span className="so-td-muted">{formatBackendEnum(log.targetEntity, log.targetEntity)}:</span>{" "}
                      <strong>{log.targetId}</strong>
                    </td>
                    <td className="so-td-detail max-w-[320px] truncate" title={log.detail}>
                      {summarizeAuditDetail(log.detail)}
                    </td>
                    <td>
                      {orderMatch && orderIdToOpen && (
                        <button
                          onClick={() => openOrder(orderIdToOpen, "orders")}
                          className="btn btn-secondary btn-sm so-btn-xs"
                        >
                          Xem đơn
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={paging.page}
        totalPages={paging.totalPages}
        totalItems={paging.totalItems}
        startIndex={paging.startIndex}
        endIndex={paging.endIndex}
        onPageChange={paging.setPage}
        itemLabel="nhật ký"
      />
    </div>
  );
}
