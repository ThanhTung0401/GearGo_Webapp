import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { orderApi, type XemTruocHuyBackend } from "../../../services/api";

import { fmt, statusColors, Order } from "../../../store";

import { type StaffTab } from "../returnMapping";
export function OrdersTab({ app, openOrder, hydrateOperationalOrder }: { app: ReturnType<typeof useApp>; selectedOrderId: string | null; setSelectedOrderId: (id: string | null) => void; openOrder: (id: string, tab: StaffTab) => void; hydrateOperationalOrder: (id: string) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tất cả");
  const [quickFilter, setQuickFilter] = useState<"all" | "delivery_today" | "pickup_today" | "overdue" | "partial">("all");
  const [viewingDetailOrderId, setViewingDetailOrderId] = useState<string | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<Order | null>(null);
  const [noShowNote, setNoShowNote] = useState("Đã gọi điện nhắc 2 lần nhưng không nghe máy / Khách không đến quầy");
  const [noShowSubmitting, setNoShowSubmitting] = useState(false);
  const [noShowError, setNoShowError] = useState("");
  const [noShowPreview, setNoShowPreview] = useState<XemTruocHuyBackend | null>(null);
  const statuses = ["Tất cả", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang thuê", "Trả một phần", "Quá hạn", "Chờ đối soát", "Hoàn tất"];

  const viewingDetailOrder = viewingDetailOrderId ? app.orders.find((o) => o.id === viewingDetailOrderId) ?? null : null;

  // Đếm nhanh số lượng theo nghiệp vụ vận hành (UC4.5)
  const deliveryTodayCount = app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status)).length;
  const pickupTodayCount = app.orders.filter((o) => ["Đang thuê", "Quá hạn"].includes(o.status)).length;
  const overdueCount = app.orders.filter((o) => app.checkOrderOverdue(o).isOverdue).length;
  const partialCount = app.orders.filter((o) => {
    if (o.status !== "Đang thuê") return false;
    const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
    return returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;
  }).length;

  const handleOpenDetail = (order: Order) => {
    setViewingDetailOrderId(order.id);
    void hydrateOperationalOrder(order.id);
  };

  const handleSubmitNoShow = async () => {
    if (!noShowTarget || !noShowNote.trim()) return;
    if (app.realApi) {
      setNoShowSubmitting(true);
      setNoShowError("");
      try {
        await orderApi.ghiNhanKhongDenNhan(Number(noShowTarget.backendId ?? noShowTarget.id), {
          ghiChu: noShowNote.trim(),
          xuLyHuy: false,
          dauVanTayXemTruoc: noShowPreview?.dauVanTay,
        });
        await hydrateOperationalOrder(noShowTarget.id);
        await app.refreshOrders?.();
        setNoShowTarget(null);
      } catch (err) {
        setNoShowError(err instanceof Error ? err.message : "Không thể ghi nhận khách vắng mặt.");
      } finally {
        setNoShowSubmitting(false);
      }
      return;
    }

    const res = app.reportCustomerNoShow(noShowTarget.id, noShowNote.trim(), app.currentUser?.name || "Nhân viên kho");
    if (res.ok) {
      setNoShowTarget(null);
    } else {
      setNoShowError(res.message);
    }
  };

  const filtered = app.orders.filter((o) => {
    const isOverdue = app.checkOrderOverdue(o).isOverdue;
    const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
    const isPartial = o.status === "Đang thuê" && returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;

    let matchQuick = true;
    if (quickFilter === "delivery_today") matchQuick = ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status);
    if (quickFilter === "pickup_today") matchQuick = ["Đang thuê", "Quá hạn"].includes(o.status);
    if (quickFilter === "overdue") matchQuick = isOverdue;
    if (quickFilter === "partial") matchQuick = isPartial;

    let matchStatus = filter === "Tất cả" || o.status === filter;
    if (filter === "Quá hạn") matchStatus = isOverdue;
    if (filter === "Trả một phần") matchStatus = isPartial;

    const q = search.toLowerCase();
    const matchSearch =
      (o.displayCode || o.id).toLowerCase().includes(q) ||
      o.id.includes(search) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(search);
    return matchQuick && matchStatus && matchSearch;
  });

  return (
    <div>
      {/* UC4.5: Thanh lọc nhanh vận hành trong ca */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="so-filter-label">Bộ lọc ca trực:</span>
        {[
          { key: "all", label: `Tất cả (${app.orders.length})` },
          { key: "delivery_today", label: `🚚 Cần giao hôm nay (${deliveryTodayCount})` },
          { key: "pickup_today", label: `📦 Cần thu hôm nay (${pickupTodayCount})` },
          { key: "overdue", label: `⚠️ Quá hạn (${overdueCount})` },
          { key: "partial", label: `🔄 Trả 1 phần (${partialCount})` },
        ].map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => { setQuickFilter(btn.key as typeof quickFilter); setFilter("Tất cả"); }}
            /* Kích hoạt trạng thái lọc nhanh hiện tại qua modifier .is-active */
            className={`so-pill-btn ${quickFilter === btn.key ? "is-active" : ""}`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          placeholder="🔍 Tìm mã đơn, tên khách, SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input flex-1 min-w-[220px]"
        />
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setQuickFilter("all"); }}
          aria-label="Lọc trạng thái đơn"
          className="form-select max-w-[200px]"
        >
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Bọc bảng bằng .responsive-table bên trong .staff-table-wrap để cuộn ngang mượt trên màn hình 390px */}
      <div className="staff-table-wrap">
        <div className="responsive-table">
          <table className="staff-table so-zebra-table so-table-compact">
            <thead>
              <tr>
                {["Mã đơn", "Khách hàng", "Sản phẩm", "Lịch thuê", "Tổng thu", "Trạng thái", "Thao tác"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
                const isOverdue = app.checkOrderOverdue(o).isOverdue;
                const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
                const isPartial = o.status === "Đang thuê" && returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;
                const canReportNoShow = ["Sẵn sàng nhận", "Đang chuẩn bị", "Đã xác nhận"].includes(o.status);

                return (
                  <tr key={o.id}>
                    <td className="so-td-mono">
                      <button onClick={() => handleOpenDetail(o)} className="so-link-btn">
                        {o.displayCode || o.id}
                      </button>
                      {o.noShowReported && (
                        <div className="so-noshow-tag">
                          ⚠️ Khách vắng mặt
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="so-customer-name">{o.customerName}</div>
                      <div className="so-customer-phone">{o.customerPhone}</div>
                    </td>
                    <td className="so-td-muted">
                      {/* Bảo vệ an toàn khi API chi tiết chưa trả về tên sản phẩm trên dòng đơn */}
                      {o.items.length > 0 ? o.items.map((it) => `${(it.productName || "Thiết bị").split("–")[0].trim()} ×${it.qty}`).join(", ") : `${o.assignedEquipment.length} thiết bị đã gán`}
                    </td>
                    <td className="so-td-schedule">
                      <div>📤 {o.pickupTime ? o.pickupTime.replace("T", " ").slice(0, 16) : "—"}</div>
                      <div className={`so-schedule-return ${isOverdue ? "is-overdue" : ""}`}>📥 {o.returnTime ? o.returnTime.replace("T", " ").slice(0, 16) : "—"}</div>
                    </td>
                    <td className="so-td-amount">
                      {fmt(o.rental - o.discount + o.depositTotal)}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        {/* Màu trạng thái lấy động từ statusColors */}
                        <span className="so-status-pill" style={{ background: sc.bg, color: sc.text }}>{o.status}</span>
                        {isPartial && <span className="so-badge-partial-sm">Trả {returnedCnt}/{o.assignedEquipment.length} món</span>}
                        {isOverdue && <span className="so-badge-overdue-sm">Quá hạn</span>}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => openOrder(o.id, o.status === "Đang thuê" || o.status === "Chờ đối soát" ? "return" : "handover")}
                          className="btn btn-primary btn-sm"
                        >
                          {o.status === "Đang thuê" ? "Nhận trả" : o.status === "Chờ đối soát" ? "Đối soát" : o.status === "Sẵn sàng nhận" ? "Bàn giao" : "Chuẩn bị"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDetail(o)}
                          className="so-btn-soft"
                        >
                          Hồ sơ
                        </button>

                        {canReportNoShow && !o.noShowReported && (
                          <button
                            type="button"
                            onClick={() => {
                              setNoShowTarget(o);
                              setNoShowError("");
                              setNoShowPreview(null);
                              setNoShowNote("Đã gọi điện nhắc 2 lần nhưng không nghe máy / Khách không đến quầy");
                              if (app.realApi || isRealApiEnabled()) {
                                void orderApi
                                  .xemTruocKhongDenNhan(Number(o.backendId ?? o.id))
                                  .then(setNoShowPreview)
                                  .catch(() => {});
                              }
                            }}
                            className="so-btn-noshow"
                            title="Ghi nhận khách không đến nhận đồ theo UC4.5 Dòng 836"
                          >
                            No-show
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* UC4.5 Bước 3: Modal Xem Toàn Diện Hồ Sơ Vận Hành Đơn Hàng */}
      {viewingDetailOrder && (
        <div className="so-modal-overlay">
          <div className="so-modal-card-lg">
            <div className="flex justify-between items-start mb-4 border-b border-bone pb-3">
              <div>
                <span className="so-modal-tag is-parchment">
                  HỒ SƠ VẬN HÀNH ĐƠN HÀNG (UC4.5)
                </span>
                <h3 className="so-modal-title">
                  Chi tiết đơn #{viewingDetailOrder.displayCode || viewingDetailOrder.id} — {viewingDetailOrder.customerName}
                </h3>
                <div className="so-modal-sub">
                  SĐT: <strong>{viewingDetailOrder.customerPhone}</strong> · Trạng thái: <strong>{viewingDetailOrder.status}</strong>
                </div>
              </div>
              <button onClick={() => setViewingDetailOrderId(null)} className="so-modal-close">✕</button>
            </div>

            {/* Thông tin lịch trình & tài chính */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-parchment rounded-lg mb-4 text-xs">
              <div>
                <span className="text-gray-500 block">📤 Hẹn nhận:</span>
                <strong>{viewingDetailOrder.pickupTime}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">📥 Hẹn trả:</span>
                <strong>{viewingDetailOrder.returnTime}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">💰 Tiền thuê & cọc:</span>
                <strong className="text-forest font-mono">{fmt(viewingDetailOrder.rental - viewingDetailOrder.discount + viewingDetailOrder.depositTotal)}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">📦 Tổng thiết bị:</span>
                <strong>{viewingDetailOrder.items.reduce((sum, it) => sum + it.qty, 0)} món</strong>
              </div>
            </div>

            {/* Cảnh báo No-Show hoặc Thiếu đồ nếu có */}
            {viewingDetailOrder.noShowReported && (
              <div className="so-alert-danger-sm">
                <strong>⚠️ BIÊN BẢN KHÁCH VẮNG MẶT (No-Show):</strong> {viewingDetailOrder.noShowReported.note}
                <div className="so-alert-danger-sm-sub">Ghi nhận lúc: {viewingDetailOrder.noShowReported.reportedAt} bởi {viewingDetailOrder.noShowReported.staffName}</div>
              </div>
            )}

            {/* Danh sách thiết bị phân công & Biên bản bàn giao */}
            <div className="mb-4">
              <h4 className="so-sub-heading-sm">
                1. Thiết bị phân công ({viewingDetailOrder.assignedEquipment.length} serial):
              </h4>
              <div className="flex flex-col gap-1">
                {viewingDetailOrder.assignedEquipment.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Chưa phân công serial (Đơn đang chờ soạn hàng).</p>
                ) : (
                  viewingDetailOrder.assignedEquipment.map((ae) => (
                    <div key={ae.equipmentId} className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs border border-bone">
                      <div>
                        <strong className="font-mono text-forest">{ae.equipmentDisplayCode || ae.equipmentId}</strong> {ae.assignedAt ? `(Gán lúc: ${ae.assignedAt})` : ""}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${ae.returnedAt ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                        {ae.returnedAt ? `✓ Đã trả (${ae.returnCondition || "Tốt"})` : "Đang thuê"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BBBG nếu có */}
            {viewingDetailOrder.handoverRecord && (
              <div className="mb-4 bg-green-50 border border-green-200 p-3 rounded-lg text-xs">
                <div className="flex justify-between items-center mb-1">
                  <strong className="text-green-800 font-mono">{viewingDetailOrder.handoverRecord.id}</strong>
                  <span className="text-green-700">Đã bàn giao: {viewingDetailOrder.handoverRecord.handoverAt}</span>
                </div>
                <div className="text-gray-600">
                  Người nhận: <strong>{viewingDetailOrder.handoverRecord.receiverName || viewingDetailOrder.customerName}</strong> ({viewingDetailOrder.handoverRecord.receiverPhone || viewingDetailOrder.customerPhone}) · CCCD: {viewingDetailOrder.handoverRecord.receiverIdCard || "Đã đối chiếu"}
                </div>
              </div>
            )}

            {/* Lịch sử các đợt nhận trả PNT */}
            {(viewingDetailOrder.returnReceipts?.length || 0) > 0 && (
              <div className="mb-4">
                <h4 className="so-sub-heading-sm">
                  2. Lịch sử nhận trả ({viewingDetailOrder.returnReceipts?.length} phiếu):
                </h4>
                <div className="flex flex-col gap-1">
                  {viewingDetailOrder.returnReceipts?.map((rc) => (
                    <div key={rc.id} className="flex justify-between items-center bg-amber-50 border border-amber-200 p-2 rounded text-xs">
                      <div>
                        <strong className="font-mono text-amber-900">{rc.id}</strong> — Đợt {rc.returnRound} ({rc.items.length} món)
                        <div className="text-gray-500 text-[11px]">{rc.returnedAt} · NV: {rc.staffName}</div>
                      </div>
                      <span className="font-bold text-amber-800">{rc.isFinalReturn ? "Trả đợt cuối" : "Trả một phần"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lịch sử trạng thái */}
            <div className="mb-4">
              <h4 className="so-sub-heading-sm">
                3. Nhật ký chuyển trạng thái (Audit timeline):
              </h4>
              <div className="flex flex-col gap-1 text-xs text-gray-600">
                {viewingDetailOrder.statusHistory.map((sh, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono">{sh.at}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 font-bold">{sh.status}</span>
                    <span className="text-gray-500">bởi {sh.by}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-bone pt-3">
              <button
                onClick={() => {
                  const targetTab: StaffTab = viewingDetailOrder.status === "Đang thuê" || viewingDetailOrder.status === "Chờ đối soát" ? "return" : "handover";
                  openOrder(viewingDetailOrder.id, targetTab);
                  setViewingDetailOrderId(null);
                }}
                className="btn btn-primary btn-sm"
              >
                Chuyển đến màn hình thao tác →
              </button>
              <button onClick={() => setViewingDetailOrderId(null)} className="btn btn-secondary btn-sm">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ghi nhận khách không đến nhận đồ (UC4.5 No-Show) */}
      {noShowTarget && (
        <div className="so-modal-overlay">
          <div className="so-modal-card-460">
            <h3 className="so-modal-title-danger">
              Ghi nhận khách không đến nhận (No-Show)
            </h3>
            <p className="so-modal-desc-dark">
              Đơn <strong>#{noShowTarget.displayCode || noShowTarget.id}</strong> — {noShowTarget.customerName} ({noShowTarget.customerPhone})
            </p>
            {noShowPreview && (
              <div className="so-preview-warn">
                <div>Nhánh chính sách: <strong>{noShowPreview.nhanhChinhSach}</strong></div>
                <div>Dự kiến giữ lại: <strong>{fmt(noShowPreview.tienThueGiuLai)}</strong> · Dự kiến hoàn: <strong>{fmt(noShowPreview.tongHoan)}</strong></div>
                {noShowPreview.canhBao?.length > 0 && (
                  <div className="so-preview-warn-alert">{noShowPreview.canhBao.join(" | ")}</div>
                )}
              </div>
            )}
            <textarea
              rows={3}
              value={noShowNote}
              onChange={(e) => setNoShowNote(e.target.value)}
              placeholder="Ghi chú số lần gọi nhắc / lý do khách không đến..."
              className="so-textarea"
            />
            {noShowError && (
              <div role="alert" className="so-form-error">
                {noShowError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNoShowTarget(null)} className="btn btn-secondary btn-sm">
                Hủy
              </button>
              <button
                type="button"
                disabled={noShowSubmitting || !noShowNote.trim()}
                onClick={() => void handleSubmitNoShow()}
                className="btn btn-danger btn-sm"
              >
                {noShowSubmitting ? "Đang ghi nhận..." : "Xác nhận ghi nhận No-Show"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Handover Tab (UC4.1 Chuẩn bị kho & Phân công serial | UC4.2 Tiếp khách & Bàn giao tại quầy) ──────
