import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../App";
import { isRealApiEnabled } from "../../../services/apiClient";

import { auditApi } from "../../../services/api/auditApi";
import { mapNhatKyToAuditLog, type AuditLogEntryWithRef } from "../../../services/mappers/reviewNotifAuditMapper";

import { fmt } from "../../../store";
import Icon from "../../../components/Icon";
function getDefaultAuditDates(): { from: string; to: string } {
  const now = new Date();
  const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return {
    from: past.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function escapeCsvCell(raw: unknown): string {
  const s = String(raw ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

// ─── 6. Nhật Ký Hệ Thống - Audit Log (UC10.4 & UC10.4.2) ─────────────────────────
export function AuditLogTab({ app }: { app: ReturnType<typeof useApp> }) {
  const realApi = app.realApi || isRealApiEnabled();
  const defaultRange = getDefaultAuditDates();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  // State đồng bộ API nhật ký thật (/api/v1/admin/nhat-ky)
  const [apiLogs, setApiLogs] = useState<AuditLogEntryWithRef[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [exportNotice, setExportNotice] = useState("");

  // State mở xem chứng từ liên quan từ nhật ký (UC10.4.2)
  const [inspectDoc, setInspectDoc] = useState<{
    type: "order" | "import" | "equipment" | "generic";
    id: string;
    title: string;
    data?: any;
  } | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");

  // State xem chi tiết biến động sự kiện (UC10.4 Bước 4)
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEntryWithRef | null>(null);

  const loadAuditLogs = useCallback(
    async (targetPage = page) => {
      if (!realApi) return;
      setLogsLoading(true);
      setLogsError("");
      try {
        const res = await auditApi.traCuu({
          tuKhoa: search.trim() || undefined,
          tuNgay: fromDate || undefined,
          denNgay: toDate || undefined,
          trang: targetPage,
          soMoiTrang: 50,
        });
        setApiLogs((res.items ?? []).map(mapNhatKyToAuditLog));
        setTotalLogs(Number(res.totalItems ?? (res.items ?? []).length));
      } catch (err) {
        setLogsError(err instanceof Error ? err.message : "Không thể tải nhật ký thao tác hệ thống từ máy chủ.");
      } finally {
        setLogsLoading(false);
      }
    },
    [realApi, search, fromDate, toDate, page]
  );

  useEffect(() => {
    if (!realApi) return;
    const timer = window.setTimeout(() => {
      void loadAuditLogs(page);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [realApi, page, loadAuditLogs]);

  // Hàm kiểm tra ngày nằm trong khoảng lọc (dành cho dữ liệu mock)
  const isWithinRange = (dateStr?: string) => {
    if (!dateStr) return true;
    let d: Date;
    const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      d = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    } else {
      d = new Date(dateStr.replace(" ", "T"));
    }
    if (isNaN(d.getTime())) return true;
    const start = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const end = toDate ? new Date(toDate + "T23:59:59") : null;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  const matchRoleValue = (entryRole: string, selected: string): boolean => {
    if (selected === "all") return true;
    const norm = entryRole.toLowerCase();
    if (selected === "Quản trị viên") return norm.includes("quản trị") || norm.includes("quantrivien") || norm.includes("admin");
    if (selected === "Nhân viên") return norm.includes("nhân viên") || norm.includes("nhanvien") || norm.includes("staff");
    if (selected === "Khách hàng") return norm.includes("khách") || norm.includes("khachhang") || norm.includes("customer");
    return entryRole === selected;
  };

  const sourceLogs: AuditLogEntryWithRef[] = realApi ? apiLogs : app.auditLogs;

  const filtered = sourceLogs.filter((l) => {
    const matchSearch =
      realApi ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.targetEntity.toLowerCase().includes(search.toLowerCase()) ||
      l.targetId.toLowerCase().includes(search.toLowerCase()) ||
      l.detail.toLowerCase().includes(search.toLowerCase());
    const matchRole = matchRoleValue(l.role, roleFilter);
    const matchDate = realApi ? true : isWithinRange(l.timestamp);
    return matchSearch && matchRole && matchDate;
  });

  // Xử lý mở chứng từ liên quan (UC10.4.2)
  const handleOpenRelatedDoc = async (targetEntity: string, targetId: string, logEntry?: AuditLogEntryWithRef) => {
    setDocError("");
    setDocLoading(false);

    // 1. Kiểm tra nếu là Đơn hàng (DT-... hoặc backendId)
    const order = app.orders.find(
      (o) => o.id === targetId || o.displayCode === targetId || String(o.backendId ?? "") === targetId
    );
    if (order && (targetEntity.toLowerCase().includes("order") || targetEntity.toLowerCase().includes("don") || targetId.startsWith("DT-"))) {
      setInspectDoc({
        type: "order",
        id: order.displayCode || order.id,
        title: `Chứng từ đơn thuê — ${order.displayCode || order.id}`,
        data: order,
      });
      return;
    }

    // 2. Kiểm tra nếu là Phiếu nhập kho (PN-...)
    const receipt = app.importReceipts.find((r) => r.id === targetId || r.displayCode === targetId);
    if (receipt && (targetEntity.toLowerCase().includes("import") || targetEntity.toLowerCase().includes("phieunhap") || targetId.startsWith("PN-"))) {
      setInspectDoc({
        type: "import",
        id: receipt.displayCode || receipt.id,
        title: `Chứng từ phiếu nhập kho — ${receipt.displayCode || receipt.id}`,
        data: receipt,
      });
      return;
    }

    // 3. Kiểm tra nếu là Thiết bị
    const equip = app.equipment.find((e) => e.id === targetId || e.displayCode === targetId);
    if (equip) {
      setInspectDoc({
        type: "equipment",
        id: equip.displayCode || equip.id,
        title: `Hồ sơ vòng đời thiết bị — ${equip.displayCode || equip.id}`,
        data: equip,
      });
      return;
    }

    // 4. Nạp chứng từ gốc trực tiếp từ URL tham chiếu backend nếu có
    if (realApi && logEntry?.thamChieuUrl) {
      setInspectDoc({
        type: "generic",
        id: targetId,
        title: `Chứng từ tham chiếu: ${targetEntity} #${targetId}`,
        data: { entity: targetEntity, id: targetId, thamChieuUrl: logEntry.thamChieuUrl, serverDoc: null },
      });
      setDocLoading(true);
      try {
        const doc = await auditApi.xemChungTuThamChieu(logEntry.thamChieuUrl);
        setInspectDoc({
          type: "generic",
          id: targetId,
          title: `Chứng từ tham chiếu: ${targetEntity} #${targetId}`,
          data: { entity: targetEntity, id: targetId, thamChieuUrl: logEntry.thamChieuUrl, serverDoc: doc },
        });
      } catch (err) {
        setDocError(err instanceof Error ? err.message : "Không thể tải dữ liệu chứng từ tham chiếu từ máy chủ.");
      } finally {
        setDocLoading(false);
      }
      return;
    }

    // 5. Mở thông tin tham chiếu chung
    setInspectDoc({
      type: "generic",
      id: targetId,
      title: `Chứng từ tham chiếu: ${targetEntity} #${targetId}`,
      data: { entity: targetEntity, id: targetId },
    });
  };

  const handleExportCsv = () => {
    const header = ["Thời gian", "Người thực hiện", "Vai trò", "Hành động", "Loại đối tượng", "Mã đối tượng", "Chi tiết"];
    const lines = [
      header.map(escapeCsvCell).join(","),
      ...filtered.map((row) =>
        [row.timestamp, row.actor, row.role, row.action, row.targetEntity, row.targetId, row.detail]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Audit_Logs_Export_${toDate || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportNotice(`Đã xuất ${filtered.length} bản ghi nhật ký ra tệp CSV.`);
    window.setTimeout(() => setExportNotice(""), 4000);
  };

  return (
    <div>
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
              onClick={() => void loadAuditLogs(page)}
              className="btn btn-secondary btn-sm"
            >
              <span className="icon-label"><Icon name="refresh" size={14} /> Làm mới</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
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
                      <span className={`adm-pill ${matchRoleValue(log.role, "Quản trị viên") ? "is-warning" : matchRoleValue(log.role, "Nhân viên") ? "is-purple" : "is-neutral"}`}>
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
                        onClick={() => void handleOpenRelatedDoc(log.targetEntity, log.targetId, log)}
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
                        onClick={() => setSelectedEvent(log)}
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

      {/* ─── MODAL XEM CHI TIẾT SỰ KIỆN BIẾN ĐỘNG (UC10.4 Bước 4) ───────────── */}
      {selectedEvent && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-dialog is-lg max-w-[640px]">
            <div className="adm-modal-header-clean">
              <div>
                <h3 className="adm-card-title">
                  Chi tiết sự kiện truy vết (Audit Event #{selectedEvent.id})
                </h3>
                <div className="adm-hint-text">Thời điểm: {selectedEvent.timestamp}</div>
              </div>
              <button type="button" onClick={() => setSelectedEvent(null)} className="adm-btn-ghost">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="adm-modal-body-scroll text-[0.85rem]">
              <div className="adm-grid-2 mb-4">
                <div className="adm-card--parchment">
                  <div className="adm-hint-text">Người thực hiện:</div>
                  <strong className="text-[var(--color-bark)]">{selectedEvent.actor}</strong>
                  <div className="text-[0.72rem] text-[var(--color-forest)] mt-0.5">Vai trò: {selectedEvent.role}</div>
                </div>

                <div className="adm-card--parchment">
                  <div className="adm-hint-text">Đối tượng biến động:</div>
                  <strong className="adm-cell-mono">{selectedEvent.targetEntity}: {selectedEvent.targetId}</strong>
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const ev = selectedEvent;
                        setSelectedEvent(null);
                        void handleOpenRelatedDoc(ev.targetEntity, ev.targetId, ev);
                      }}
                      className="btn btn-secondary btn-sm adm-btn-xs text-[0.7rem]"
                    >
                      Mở chứng từ đối chiếu (UC10.4.2)
                    </button>
                  </div>
                </div>
              </div>

              <div className="adm-card--soft p-3.5">
                <div className="text-[0.75rem] text-[#6B7280] font-bold mb-1">HÀNH ĐỘNG & NỘI DUNG BIẾN ĐỘNG:</div>
                <div className="font-semibold text-[var(--color-forest)] mb-1.5">{selectedEvent.action}</div>
                <div className="text-[#374151] leading-relaxed">{selectedEvent.detail}</div>
                {selectedEvent.lyDo && (
                  <div className="mt-2 text-[0.78rem] text-[#4B5563]">
                    <strong>Lý do ghi nhận:</strong> {selectedEvent.lyDo}
                  </div>
                )}
              </div>

              {(selectedEvent.duLieuTruoc || selectedEvent.duLieuSau) && (
                <div className="adm-grid-2 mt-3">
                  {selectedEvent.duLieuTruoc && (
                    <div className="adm-audit-diff-before">
                      <div className="font-bold text-[#991B1B] mb-1">Dữ liệu trước</div>
                      <pre className="adm-audit-pre">{selectedEvent.duLieuTruoc}</pre>
                    </div>
                  )}
                  {selectedEvent.duLieuSau && (
                    <div className="adm-audit-diff-after">
                      <div className="font-bold text-[#166534] mb-1">Dữ liệu sau</div>
                      <pre className="adm-audit-pre">{selectedEvent.duLieuSau}</pre>
                    </div>
                  )}
                </div>
              )}

              <div className="adm-audit-seal-note">
                🔒 Nhật ký kiểm toán được niêm phong bất biến. Chức năng tra cứu chỉ hỗ trợ đọc (Read-only) và không cung cấp thao tác sửa/xóa theo chuẩn an toàn thông tin (UC10.4 Dòng phụ 4.2).
              </div>
            </div>

            <div className="adm-modal-footer-clean">
              <button type="button" onClick={() => setSelectedEvent(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL XEM CHỨNG TỪ LIÊN QUAN TỪ NHẬT KÝ (UC10.4.2) ─────────────── */}
      {inspectDoc && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-dialog is-xl">
            <div className="adm-modal-header-clean">
              <div>
                <h3 className="adm-card-title">
                  {inspectDoc.title}
                </h3>
                <div className="text-[0.75rem] text-[var(--color-forest)] font-semibold">Chế độ tra cứu chứng từ gốc (Read-only — UC10.4.2)</div>
              </div>
              <button type="button" onClick={() => setInspectDoc(null)} className="adm-btn-ghost">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="adm-modal-body-scroll text-[0.82rem]">
              {inspectDoc.type === "order" && (
                <div>
                  <div className="adm-grid-3 mb-4">
                    <div className="adm-card--parchment p-2.5">
                      <div className="adm-hint-text">Khách hàng</div>
                      <strong>{inspectDoc.data.customerName}</strong>
                      <div className="text-[#6B7280]">{inspectDoc.data.customerPhone}</div>
                    </div>
                    <div className="adm-card--parchment p-2.5">
                      <div className="adm-hint-text">Trạng thái</div>
                      <span className="text-[0.75rem] font-bold text-[var(--color-forest)]">{inspectDoc.data.status}</span>
                      <div className="text-[#6B7280]">Tạo lúc: {inspectDoc.data.createdAt}</div>
                    </div>
                    <div className="adm-card--parchment p-2.5">
                      <div className="adm-hint-text">Tổng tiền thanh toán</div>
                      <strong className="adm-cell-mono text-[var(--color-forest)] text-[1.1rem]">{fmt(inspectDoc.data.rental - inspectDoc.data.discount + inspectDoc.data.depositTotal)}</strong>
                      <div className="text-[#6B7280]">Cọc: {fmt(inspectDoc.data.depositTotal)}</div>
                    </div>
                  </div>

                  <h4 className="font-bold mb-2">Danh sách thiết bị thuê:</h4>
                  <div className="adm-table-scroll mb-4">
                    <table className="adm-table adm-table--sm">
                      <thead>
                        <tr>
                          <th>Tên sản phẩm</th>
                          <th>Số lượng</th>
                          <th>Số ngày</th>
                          <th>Đơn giá</th>
                          <th>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectDoc.data.items.map((it: any, idx: number) => (
                          <tr key={idx}>
                            <td className="font-semibold">{it.productName}</td>
                            <td>{it.qty}</td>
                            <td>{it.days} ngày</td>
                            <td className="adm-cell-mono">{fmt(it.pricePerDay)}</td>
                            <td className="adm-cell-mono font-bold">{fmt(it.pricePerDay * it.qty * it.days)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {inspectDoc.type === "import" && (
                <div>
                  <div className="adm-grid-2 mb-4">
                    <div className="adm-card--parchment p-2.5">
                      <div className="adm-hint-text">Nhà cung cấp</div>
                      <strong>{inspectDoc.data.supplierName} ({inspectDoc.data.supplierId})</strong>
                    </div>
                    <div className="adm-card--parchment p-2.5">
                      <div className="adm-hint-text">Trạng thái & Ngày xác nhận</div>
                      <strong className="text-[var(--color-forest)]">{inspectDoc.data.status}</strong> — {inspectDoc.data.confirmedAt || inspectDoc.data.createdAt}
                    </div>
                  </div>

                  <h4 className="font-bold mb-2">Vật phẩm nhập kho:</h4>
                  <div className="adm-table-scroll">
                    <table className="adm-table adm-table--sm">
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>Số lượng</th>
                          <th>Đơn giá</th>
                          <th>Thành tiền</th>
                          <th>Mã sinh ra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectDoc.data.lines.map((l: any, idx: number) => (
                          <tr key={idx}>
                            <td className="font-semibold">{l.productNameSnapshot || l.productId}</td>
                            <td>{l.quantity}</td>
                            <td className="adm-cell-mono">{fmt(l.unitPrice)}</td>
                            <td className="adm-cell-mono font-bold">{fmt(l.quantity * l.unitPrice)}</td>
                            <td className="adm-cell-mono text-[var(--color-amber)]">{l.equipmentCodes.join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {inspectDoc.type === "equipment" && (
                <div className="adm-card--parchment p-3.5">
                  <div className="adm-hint-text text-[0.75rem]">Mã định danh thiết bị:</div>
                  <strong className="adm-cell-mono text-[1.2rem] text-[var(--color-forest)]">{inspectDoc.data.id}</strong>
                  <div className="mt-2">Tình trạng hiện tại: <strong>{inspectDoc.data.condition}</strong> · Trạng thái kho: <strong>{inspectDoc.data.equipmentStatus}</strong></div>
                  <div className="mt-1">Số lượt cho thuê lũy kế: <strong>{inspectDoc.data.rentCount} lượt</strong> · Ngày nhập kho: {inspectDoc.data.importDate}</div>
                </div>
              )}

              {inspectDoc.type === "generic" && (
                <div className="adm-card--parchment p-3.5">
                  <div>Chứng từ tham chiếu: <strong>{inspectDoc.data.entity}</strong></div>
                  <div>Mã định danh: <strong className="adm-cell-mono">{inspectDoc.data.id}</strong></div>
                  {inspectDoc.data.thamChieuUrl && (
                    <div className="adm-hint-text text-[0.75rem] mt-1">
                      Đường dẫn máy chủ: <code className="adm-cell-mono">{inspectDoc.data.thamChieuUrl}</code>
                    </div>
                  )}
                  {docLoading && (
                    <div className="mt-2.5 text-[#6B7280]">Đang tải dữ liệu chứng từ gốc từ máy chủ...</div>
                  )}
                  {docError && (
                    <div role="alert" className="mt-2.5 text-[#B91C1C]">{docError}</div>
                  )}
                  {inspectDoc.data.serverDoc ? (
                    <pre className="adm-audit-pre-box">
                      {JSON.stringify(inspectDoc.data.serverDoc, null, 2)}
                    </pre>
                  ) : (
                    !docLoading && (
                      <div className="mt-2 text-[#6B7280]">Dữ liệu gốc được lưu trữ trong cơ sở dữ liệu hệ thống.</div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="adm-modal-footer-clean">
              <button type="button" onClick={() => setInspectDoc(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
