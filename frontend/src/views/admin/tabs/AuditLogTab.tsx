import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../App";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";
import { reviewApi } from "../../../services/api/reviewApi";
import { policyApi, type KiemTraChinhSachBackend } from "../../../services/api/policyApi";
import { notificationApi, type ThongBaoGuiLoiBackend } from "../../../services/api/notificationApi";
import { paymentApi, type GiaoDichCanDoiChieuBackend } from "../../../services/api/paymentApi";
import { reconciliationApi, type DoiSoatBackend } from "../../../services/api/reconciliationApi";
import { surchargeApi } from "../../../services/api/surchargeApi";
import { auditApi } from "../../../services/api/auditApi";
import {
  mapDanhGiaToReview,
  mapNhatKyToAuditLog,
  type AuditLogEntryWithRef,
} from "../../../services/mappers/reviewNotifAuditMapper";
import { buildTaoChinhSachRequestFromConfig } from "../../../services/mappers/policyPromoMapper";
import { fmt, statusColors, type CustomerAccount, type Review, type RentalPolicyConfig, type PolicyVersion, type FinancialAdjustment, type AppNotification } from "../../../store";
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
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Nhật ký hệ thống — Audit Log (UC10.4 & UC10.4.2)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
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
        <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="alert-circle" size={16} />
          <span>{logsError}</span>
        </div>
      )}

      {exportNotice && (
        <div role="status" style={{ background: "#DCFCE7", border: "1px solid #A7F3D0", color: "#15803D", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="check" size={16} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Filter kết hợp thời gian (UC10.4 Dòng sự kiện 2) */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div style={{ position: "relative", minWidth: 260, flex: 1 }}>
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, hành động, chứng từ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: "0.85rem", background: "white" }}
          />
          <div style={{ position: "absolute", left: 10, top: 9, color: "#9CA3AF" }}><Icon name="search" size={16} /></div>
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", background: "white" }}
        >
          <option value="all">Tất cả vai trò</option>
          <option value="Quản trị viên">Quản trị viên</option>
          <option value="Nhân viên">Nhân viên kho / CSKH</option>
          <option value="Khách hàng">Khách hàng</option>
        </select>

        <div className="flex items-center gap-1.5 bg-white border border-bone rounded-lg p-1.5 px-3 text-xs shadow-xs">
          <span style={{ color: "var(--color-forest)", fontWeight: 700 }}>Thời gian:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            style={{ border: "1px solid var(--color-bone)", borderRadius: 4, padding: "2px 5px", fontSize: "0.75rem" }}
          />
          <span>→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            style={{ border: "1px solid var(--color-bone)", borderRadius: 4, padding: "2px 5px", fontSize: "0.75rem" }}
          />
        </div>
      </div>

      {/* Bảng timeline audit */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Thời gian", "Người thực hiện", "Vai trò", "Hành động", "Đối tượng tác động (UC10.4.2)", "Chi tiết nội dung", "Thao tác"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logsLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: "36px 0", textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>
                  Đang tải nhật ký thao tác hệ thống...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "36px 0", textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>
                  Không tìm thấy nhật ký biến động phù hợp với bộ lọc đã chọn.
                </td>
              </tr>
            ) : (
              filtered.map((log, i) => (
                <tr key={log.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                  <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#6B7280", whiteSpace: "nowrap" }}>
                    {log.timestamp}
                  </td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: "0.85rem", color: "var(--color-bark)" }}>
                    {log.actor}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: matchRoleValue(log.role, "Quản trị viên") ? "#FEF3C7" : matchRoleValue(log.role, "Nhân viên") ? "#E0E7FF" : "#F3F4F6",
                      color: matchRoleValue(log.role, "Quản trị viên") ? "#B45309" : matchRoleValue(log.role, "Nhân viên") ? "#3730A3" : "#4B5563"
                    }}>
                      {log.role}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-forest)" }}>
                    {log.action}
                  </td>
                  {/* Nhấn vào để mở chứng từ liên quan (UC10.4.2) */}
                  <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                    <button
                      type="button"
                      onClick={() => void handleOpenRelatedDoc(log.targetEntity, log.targetId, log)}
                      style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                      title="Nhấn để mở chứng từ đối chiếu (UC10.4.2)"
                    >
                      <span style={{ color: "#6B7280" }}>{log.targetEntity}:</span>{" "}
                      <strong style={{ color: "var(--color-forest)", textDecoration: "underline" }}>
                        {log.targetId}
                      </strong>
                    </button>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "0.8rem", color: "#374151" }}>
                    {log.detail}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(log)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "3px 8px", fontSize: "0.72rem" }}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {realApi && totalLogs > 50 && (
          <div className="flex justify-between items-center p-3" style={{ borderTop: "1px solid var(--color-bone)", background: "var(--color-cream)", fontSize: "0.78rem" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 640, width: "100%", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-bark)" }}>
                  Chi tiết sự kiện truy vết (Audit Event #{selectedEvent.id})
                </h3>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Thời điểm: {selectedEvent.timestamp}</div>
              </div>
              <button type="button" onClick={() => setSelectedEvent(null)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: "auto", fontSize: "0.85rem", maxHeight: "75vh" }}>
              <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Người thực hiện:</div>
                  <strong style={{ color: "var(--color-bark)" }}>{selectedEvent.actor}</strong>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-forest)", marginTop: 2 }}>Vai trò: {selectedEvent.role}</div>
                </div>

                <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Đối tượng biến động:</div>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>{selectedEvent.targetEntity}: {selectedEvent.targetId}</strong>
                  <div style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const ev = selectedEvent;
                        setSelectedEvent(null);
                        void handleOpenRelatedDoc(ev.targetEntity, ev.targetId, ev);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                    >
                      Mở chứng từ đối chiếu (UC10.4.2)
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 700, marginBottom: 4 }}>HÀNH ĐỘNG & NỘI DUNG BIẾN ĐỘNG:</div>
                <div style={{ fontWeight: 600, color: "var(--color-forest)", marginBottom: 6 }}>{selectedEvent.action}</div>
                <div style={{ color: "#374151", lineHeight: 1.5 }}>{selectedEvent.detail}</div>
                {selectedEvent.lyDo && (
                  <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#4B5563" }}>
                    <strong>Lý do ghi nhận:</strong> {selectedEvent.lyDo}
                  </div>
                )}
              </div>

              {(selectedEvent.duLieuTruoc || selectedEvent.duLieuSau) && (
                <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  {selectedEvent.duLieuTruoc && (
                    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 10, fontSize: "0.75rem" }}>
                      <div style={{ fontWeight: 700, color: "#991B1B", marginBottom: 4 }}>Dữ liệu trước</div>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-mono)" }}>{selectedEvent.duLieuTruoc}</pre>
                    </div>
                  )}
                  {selectedEvent.duLieuSau && (
                    <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 10, fontSize: "0.75rem" }}>
                      <div style={{ fontWeight: 700, color: "#166534", marginBottom: 4 }}>Dữ liệu sau</div>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-mono)" }}>{selectedEvent.duLieuSau}</pre>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 14, fontSize: "0.75rem", color: "#9CA3AF", fontStyle: "italic" }}>
                🔒 Nhật ký kiểm toán được niêm phong bất biến. Chức năng tra cứu chỉ hỗ trợ đọc (Read-only) và không cung cấp thao tác sửa/xóa theo chuẩn an toàn thông tin (UC10.4 Dòng phụ 4.2).
              </div>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-bone)", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setSelectedEvent(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL XEM CHỨNG TỪ LIÊN QUAN TỪ NHẬT KÝ (UC10.4.2) ─────────────── */}
      {inspectDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 760, width: "100%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-bark)" }}>
                  {inspectDoc.title}
                </h3>
                <div style={{ fontSize: "0.75rem", color: "var(--color-forest)", fontWeight: 600 }}>Chế độ tra cứu chứng từ gốc (Read-only — UC10.4.2)</div>
              </div>
              <button type="button" onClick={() => setInspectDoc(null)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1, fontSize: "0.82rem" }}>
              {inspectDoc.type === "order" && (
                <div>
                  <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Khách hàng</div>
                      <strong>{inspectDoc.data.customerName}</strong>
                      <div style={{ color: "#6B7280" }}>{inspectDoc.data.customerPhone}</div>
                    </div>
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Trạng thái</div>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-forest)" }}>{inspectDoc.data.status}</span>
                      <div style={{ color: "#6B7280" }}>Tạo lúc: {inspectDoc.data.createdAt}</div>
                    </div>
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Tổng tiền thanh toán</div>
                      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "1.1rem" }}>{fmt(inspectDoc.data.rental - inspectDoc.data.discount + inspectDoc.data.depositTotal)}</strong>
                      <div style={{ color: "#6B7280" }}>Cọc: {fmt(inspectDoc.data.depositTotal)}</div>
                    </div>
                  </div>

                  <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Danh sách thiết bị thuê:</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                        <th style={{ padding: "6px 8px" }}>Tên sản phẩm</th>
                        <th style={{ padding: "6px 8px" }}>Số lượng</th>
                        <th style={{ padding: "6px 8px" }}>Số ngày</th>
                        <th style={{ padding: "6px 8px" }}>Đơn giá</th>
                        <th style={{ padding: "6px 8px" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectDoc.data.items.map((it: any, idx: number) => (
                        <tr key={idx} style={{ borderTop: "1px solid var(--color-bone)" }}>
                          <td style={{ padding: "6px 8px", fontWeight: 600 }}>{it.productName}</td>
                          <td style={{ padding: "6px 8px" }}>{it.qty}</td>
                          <td style={{ padding: "6px 8px" }}>{it.days} ngày</td>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)" }}>{fmt(it.pricePerDay)}</td>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmt(it.pricePerDay * it.qty * it.days)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {inspectDoc.type === "import" && (
                <div>
                  <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Nhà cung cấp</div>
                      <strong>{inspectDoc.data.supplierName} ({inspectDoc.data.supplierId})</strong>
                    </div>
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Trạng thái & Ngày xác nhận</div>
                      <strong style={{ color: "var(--color-forest)" }}>{inspectDoc.data.status}</strong> — {inspectDoc.data.confirmedAt || inspectDoc.data.createdAt}
                    </div>
                  </div>

                  <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Vật phẩm nhập kho:</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                        <th style={{ padding: "6px 8px" }}>Sản phẩm</th>
                        <th style={{ padding: "6px 8px" }}>Số lượng</th>
                        <th style={{ padding: "6px 8px" }}>Đơn giá</th>
                        <th style={{ padding: "6px 8px" }}>Thành tiền</th>
                        <th style={{ padding: "6px 8px" }}>Mã sinh ra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectDoc.data.lines.map((l: any, idx: number) => (
                        <tr key={idx} style={{ borderTop: "1px solid var(--color-bone)" }}>
                          <td style={{ padding: "6px 8px", fontWeight: 600 }}>{l.productNameSnapshot || l.productId}</td>
                          <td style={{ padding: "6px 8px" }}>{l.quantity}</td>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)" }}>{fmt(l.unitPrice)}</td>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmt(l.quantity * l.unitPrice)}</td>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", color: "var(--color-amber)" }}>{l.equipmentCodes.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {inspectDoc.type === "equipment" && (
                <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Mã định danh thiết bị:</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", color: "var(--color-forest)" }}>{inspectDoc.data.id}</strong>
                  <div style={{ marginTop: 8 }}>Tình trạng hiện tại: <strong>{inspectDoc.data.condition}</strong> · Trạng thái kho: <strong>{inspectDoc.data.equipmentStatus}</strong></div>
                  <div style={{ marginTop: 4 }}>Số lượt cho thuê lũy kế: <strong>{inspectDoc.data.rentCount} lượt</strong> · Ngày nhập kho: {inspectDoc.data.importDate}</div>
                </div>
              )}

              {inspectDoc.type === "generic" && (
                <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 14 }}>
                  <div>Chứng từ tham chiếu: <strong>{inspectDoc.data.entity}</strong></div>
                  <div>Mã định danh: <strong style={{ fontFamily: "var(--font-mono)" }}>{inspectDoc.data.id}</strong></div>
                  {inspectDoc.data.thamChieuUrl && (
                    <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 4 }}>
                      Đường dẫn máy chủ: <code style={{ fontFamily: "var(--font-mono)" }}>{inspectDoc.data.thamChieuUrl}</code>
                    </div>
                  )}
                  {docLoading && (
                    <div style={{ marginTop: 10, color: "#6B7280" }}>Đang tải dữ liệu chứng từ gốc từ máy chủ...</div>
                  )}
                  {docError && (
                    <div role="alert" style={{ marginTop: 10, color: "#B91C1C" }}>{docError}</div>
                  )}
                  {inspectDoc.data.serverDoc ? (
                    <pre
                      style={{
                        marginTop: 10,
                        background: "white",
                        border: "1px solid var(--color-bone)",
                        borderRadius: 8,
                        padding: 12,
                        maxHeight: 280,
                        overflow: "auto",
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {JSON.stringify(inspectDoc.data.serverDoc, null, 2)}
                    </pre>
                  ) : (
                    !docLoading && (
                      <div style={{ marginTop: 8, color: "#6B7280" }}>Dữ liệu gốc được lưu trữ trong cơ sở dữ liệu hệ thống.</div>
                    )
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-bone)", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setInspectDoc(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
