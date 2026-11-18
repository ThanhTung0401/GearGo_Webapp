import Icon from "../../../../components/Icon";
import { type AuditLogEntryWithRef } from "../../../../services/mappers/reviewNotifAuditMapper";
import { matchAuditRoleValue } from "./useAuditLogTab";

interface AuditLogTableProps {
  realApi: boolean;
  search: string;
  setSearch: (v: string) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  fromDate: string;
  setFromDate: (v: string) => void;
  toDate: string;
  setToDate: (v: string) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalLogs: number;
  logsLoading: boolean;
  logsError: string;
  exportNotice: string;
  filtered: AuditLogEntryWithRef[];
  onRefresh: () => void;
  onExportCsv: () => void;
  onOpenRelatedDoc: (targetEntity: string, targetId: string, log: AuditLogEntryWithRef) => void;
  onSelectEvent: (log: AuditLogEntryWithRef) => void;
}

/**
 * Thanh tiêu đề, bộ lọc thời gian/vai trò và bảng nhật ký kiểm toán hệ thống (UC10.4).
 */
export function AuditLogTable(props: AuditLogTableProps) {
  const {
    realApi,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    page,
    setPage,
    totalLogs,
    logsLoading,
    logsError,
    exportNotice,
    filtered,
    onRefresh,
    onExportCsv,
    onOpenRelatedDoc,
    onSelectEvent,
  } = props;

  return (
    <>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="adm-page-title">
            Nhật ký hệ thống — Audit Log (UC10.4 & UC10.4.2)
          </h2>
          <p className="adm-page-subtitle">
            Truy vết toàn bộ thao tác quan trọng: phân quyền, đổi trạng thái đơn, sửa xóa chứng từ, đổi chính sách. Không cho phép sửa xóa qua giao diện tra cứu (Read-only).
          </p>
        </div>
        <div className="flex gap-2">
          {realApi && (
            <button
              type="button"
              disabled={logsLoading}
              onClick={onRefresh}
              className="btn btn-secondary btn-sm"
            >
              <span className="icon-label"><Icon name="refresh" size={14} /> Làm mới</span>
            </button>
          )}
          <button
            type="button"
            onClick={onExportCsv}
            className="btn btn-secondary btn-sm"
          >
            <span className="icon-label"><Icon name="chart" size={14} /> Xuất file CSV</span>
          </button>
        </div>
      </div>

      {logsError && (
        <div role="alert" className="adm-alert is-error">
          <Icon name="alert-circle" size={16} />
          <span>{logsError}</span>
        </div>
      )}

      {exportNotice && (
        <div role="status" className="adm-alert is-success">
          <Icon name="check" size={16} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Filter kết hợp thời gian (UC10.4 Dòng sự kiện 2) */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="adm-input-icon-wrap">
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, hành động, chứng từ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="adm-input-with-icon"
          />
          <div className="adm-input-icon"><Icon name="search" size={16} /></div>
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="adm-select"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="Quản trị viên">Quản trị viên</option>
          <option value="Nhân viên">Nhân viên kho / CSKH</option>
          <option value="Khách hàng">Khách hàng</option>
        </select>

        <div className="adm-date-range">
          <span className="adm-date-range-label">Thời gian:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="adm-date-input adm-date-input--xs"
          />
          <span>→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="adm-date-input adm-date-input--xs"
          />
        </div>
      </div>

      {/* Bảng timeline audit */}
      <div className="adm-table-wrap">
        <div className="adm-table-scroll">
          <table className="adm-table adm-table--zebra adm-table--md">
            <thead>
              <tr>
                {["Thời gian", "Người thực hiện", "Vai trò", "Hành động", "Đối tượng tác động (UC10.4.2)", "Chi tiết nội dung", "Thao tác"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={7} className="adm-table-empty py-9">
                    Đang tải nhật ký thao tác hệ thống...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="adm-table-empty py-9">
                    Không tìm thấy nhật ký biến động phù hợp với bộ lọc đã chọn.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="adm-cell-mono adm-hint-text whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="adm-cell-title">
                      {log.actor}
                    </td>
                    <td>
                      <span className={`adm-pill ${matchAuditRoleValue(log.role, "Quản trị viên") ? "is-warning" : matchAuditRoleValue(log.role, "Nhân viên") ? "is-purple" : "is-neutral"}`}>
                        {log.role}
                      </span>
                    </td>
                    <td className="text-[0.82rem] font-semibold text-[var(--color-forest)]">
                      {log.action}
                    </td>
                    {/* Nhấn vào để mở chứng từ liên quan (UC10.4.2) */}
                    <td className="adm-cell-mono text-[0.78rem]">
                      <button
                        type="button"
                        onClick={() => onOpenRelatedDoc(log.targetEntity, log.targetId, log)}
                        className="adm-btn-link"
                        title="Nhấn để mở chứng từ đối chiếu (UC10.4.2)"
                      >
                        <span className="text-[#6B7280]">{log.targetEntity}:</span>{" "}
                        <strong className="text-[var(--color-forest)] underline">
                          {log.targetId}
                        </strong>
                      </button>
                    </td>
                    <td className="text-[0.8rem] text-[#374151]">
                      {log.detail}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onSelectEvent(log)}
                        className="btn btn-secondary btn-sm adm-btn-xs"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {realApi && totalLogs > 50 && (
          <div className="adm-table-pagination">
            <span>Trang {page} · Tổng {totalLogs} bản ghi</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || logsLoading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn-secondary btn-sm">
                Trước
              </button>
              <button type="button" disabled={page * 50 >= totalLogs || logsLoading} onClick={() => setPage((p) => p + 1)} className="btn btn-secondary btn-sm">
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
