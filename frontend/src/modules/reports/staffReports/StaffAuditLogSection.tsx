import type { AuditLogEntryWithRef } from "../../../services/mappers";
import Icon from "../../../components/Icon";
import { type StaffTab } from "../../orders/returnMapping";

interface StaffAuditLogSectionProps {
  searchAudit: string;
  setSearchAudit: (value: string) => void;
  staffLogs: AuditLogEntryWithRef[];
  openOrder: (id: string, tab: StaffTab) => void;
}

// Bảng tra cứu nhật ký thao tác nhân viên kèm nút mở nhanh đơn thuê (UC10.4)
export function StaffAuditLogSection({
  searchAudit,
  setSearchAudit,
  staffLogs,
  openOrder,
}: StaffAuditLogSectionProps) {
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
            {staffLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="so-td-empty">
                  Chưa có nhật ký thao tác phù hợp.
                </td>
              </tr>
            ) : (
              staffLogs.map((log) => {
                // Trích xuất mã đơn thuê từ tham chiếu URL hoặc đối tượng tác động để mở nhanh
                const orderMatch =
                  log.targetEntity === "DonThue" ||
                  log.targetId.startsWith("DT-") ||
                  Boolean(log.thamChieuUrl?.includes("/don-thue/"));
                const orderIdToOpen =
                  log.thamChieuUrl?.match(/\/don-thue\/(\d+)/)?.[1] || log.targetId;
                return (
                  <tr key={log.id}>
                    <td className="so-td-mono-time">
                      {log.timestamp}
                    </td>
                    <td className="so-td-bold">{log.actor}</td>
                    <td className="so-td-action">{log.action}</td>
                    <td className="so-td-mono-plain">
                      <span className="so-td-muted">{log.targetEntity}:</span> <strong>{log.targetId}</strong>
                    </td>
                    <td className="so-td-detail">{log.detail}</td>
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
    </div>
  );
}
