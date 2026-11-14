import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";
import { catalogApi, type HinhAnhSanPhamBackend } from "../../../services/api/catalogApi";
import { equipmentApi } from "../../../services/api/equipmentApi";
import { inventoryApi } from "../../../services/api/inventoryApi";
import { orderApi, type XemTruocHuyBackend } from "../../../services/api/orderApi";
import { warehouseApi, type PhanTichAnhHuongBackend } from "../../../services/api/warehouseApi";
import { supplierApi } from "../../../services/api/supplierApi";
import { importReceiptApi } from "../../../services/api/importReceiptApi";
import { promotionApi } from "../../../services/api/promotionApi";
import { surchargeApi } from "../../../services/api/surchargeApi";
import { reportApi, type BaoCaoVanHanhBackend } from "../../../services/api/reportApi";
import { mapDieuChinhKhoToReceipt, mapEquipmentStatusToBackend } from "../../../services/mappers/catalogEquipmentMapper";
import {
  fmt, statusColors, type Category, type Product, type Supplier, type Promotion, type ImportReceipt,
  type StaffAccount, type StockAdjustmentReceipt, type StockAdjustmentLine, type EquipmentStatus, type Order,
  type Equipment, type Surcharge
} from "../../../store";
import Icon from "../../../components/Icon";
import { FormModal, FormActions, fieldStyle, labelStyle } from "../forms/FormModal";
import ReconciliationSheet from "../../ReconciliationSheet";
import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../components/InventoryAuditModal";
import SupplierProfileModal from "../../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../../components/GoodsReceivingModal";
import ImportAdjustmentModal from "../../../components/ImportAdjustmentModal";
import PromotionDetailModal from "../../../components/PromotionDetailModal";
import { ImportReceiptForm } from "../forms/ImportReceiptForm";

export function InventoryTab({ app }: { app: ReturnType<typeof useApp> }) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [selectedId, setSelectedId] = useState<string | null>(app.importReceipts[0]?.id ?? null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editing, setEditing] = useState<ImportReceipt | "new" | null>(null);
  const [inspectingReceipt, setInspectingReceipt] = useState<ImportReceipt | null>(null);
  const [adjustingReceipt, setAdjustingReceipt] = useState<ImportReceipt | null>(null);
  const [cancellingReceipt, setCancellingReceipt] = useState<ImportReceipt | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Điều chỉnh phiếu nhập (UC7.10) từ API Backend
  const [serverAdjustments, setServerAdjustments] = useState<Array<{
    id: string;
    rawStatus: string;
    type: string;
    status: "Chờ duyệt" | "Đã duyệt" | "Từ chối";
    previousValue: string;
    newValue: string;
    reason: string;
    createdBy: string;
    createdAt: string;
    evidence?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
  }>>([]);
  const [rejectingAdj, setRejectingAdj] = useState<{ receiptId: string; adjId: string } | null>(null);
  const [rejectAdjReason, setRejectAdjReason] = useState("");
  const [adjLoadingId, setAdjLoadingId] = useState<string | null>(null);

  // State UC7.8: Lọc Nhà cung cấp, Trạng thái, Khoảng ngày
  const [supplierFilter, setSupplierFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const supplierOptions = ["Tất cả", ...Array.from(new Set(app.suppliers.map((s) => s.name)))];
  const statusOptions = ["Tất cả", "Nháp", "Đã nhập kho", "Đã hủy"];

  const filteredReceipts = app.importReceipts.slice().reverse().filter((receipt) => {
    const matchSupplier = supplierFilter === "Tất cả" || receipt.supplierName === supplierFilter;
    const matchStatus = statusFilter === "Tất cả" || receipt.status === statusFilter;
    const matchSearch =
      (receipt.displayCode ?? receipt.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.createdBy.toLowerCase().includes(searchQuery.toLowerCase());

    let matchDate = true;
    if (fromDate && receipt.createdAt < fromDate) matchDate = false;
    if (toDate && receipt.createdAt > toDate + " 23:59:59") matchDate = false;

    return matchSupplier && matchStatus && matchSearch && matchDate;
  });

  const selected = app.importReceipts.find((receipt) => receipt.id === selectedId);

  const loadServerReceiptAdjustments = async (receiptIdStr?: string) => {
    if (!isRealApi || !receiptIdStr) {
      setServerAdjustments([]);
      return;
    }
    const receiptIdNum = Number(receiptIdStr);
    if (Number.isNaN(receiptIdNum)) {
      setServerAdjustments([]);
      return;
    }
    try {
      const res = await inventoryApi.timPhieu({ trang: 1, soMoiTrang: 50 });
      const matching = (res.items ?? []).filter((dc) => dc.maPhieuNhapLienQuan === receiptIdNum);
      setServerAdjustments(
        matching.map((dc) => {
          const st: "Chờ duyệt" | "Đã duyệt" | "Từ chối" =
            dc.trangThai === "DaDuyet" ? "Đã duyệt" : dc.trangThai === "TuChoi" ? "Từ chối" : "Chờ duyệt";
          const firstLine = dc.chiTiet?.[0];
          return {
            id: String(dc.maPhieuDieuChinh),
            rawStatus: dc.trangThai,
            type: dc.loaiDieuChinh ?? "Điều chỉnh nhập",
            status: st,
            previousValue: firstLine?.giaTriTruoc ?? "—",
            newValue: firstLine?.giaTriSau ?? "—",
            reason: dc.lyDo ?? "",
            createdBy: dc.tenNguoiLapLucLap ?? `NV#${dc.maNguoiLap}`,
            createdAt: dc.thoiDiemLap ? new Date(dc.thoiDiemLap).toLocaleString("vi-VN") : "",
            evidence: dc.bangChung?.join(", "),
            reviewedBy: dc.tenNguoiDuyetLucDuyet,
            reviewedAt: dc.thoiDiemDuyet ? new Date(dc.thoiDiemDuyet).toLocaleString("vi-VN") : undefined,
          };
        })
      );
    } catch {
      setServerAdjustments([]);
    }
  };

  useEffect(() => {
    if (selected && selected.status === "Đã nhập kho") {
      loadServerReceiptAdjustments(selected.id);
    } else {
      setServerAdjustments([]);
    }
  }, [isRealApi, selected?.id, selected?.status]);

  const receiptTotal = (receipt: typeof app.importReceipts[number]) =>
    receipt.lines.reduce((sum, line) => {
      // Nếu đã kiểm nhận, chỉ tính tiền cho hàng được chấp nhận (đạt + lỗi nhận sửa)
      const billedQty = line.acceptedQty !== undefined || line.damagedQty !== undefined
        ? ((line.acceptedQty ?? 0) + (line.damagedQty ?? 0))
        : line.quantity;
      return sum + billedQty * line.unitPrice;
    }, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Phiếu nhập hàng</h2>
          <p style={{ color: "#6B7280", fontSize: "0.8rem" }}>Phiếu nháp không làm thay đổi tồn kho cho đến khi được kiểm nhận và xác nhận (UC7.7).</p>
        </div>
        <button onClick={() => setEditing("new")} style={{ background: "var(--color-forest)", color: "white", padding: "9px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Tạo phiếu nháp</button>
      </div>
      {message && (
        <div role="status" style={{ background: message.type === "success" ? "#DCFCE7" : "#FEE2E2", color: message.type === "success" ? "#15803D" : "#B91C1C", border: `1px solid ${message.type === "success" ? "#A7F3D0" : "#FECACA"}`, borderRadius: "9px", padding: "10px 14px", marginBottom: "14px", fontSize: "0.82rem" }}>{message.text}</div>
      )}

      {/* UC7.8: Bộ lọc Nhà cung cấp, Trạng thái & Khoảng ngày */}
      <div className="flex gap-3 mb-4 flex-wrap items-center" style={{ background: "white", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--color-bone)" }}>
        <input
          type="text"
          placeholder="🔍 Tìm mã phiếu, NCC, người lập..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.82rem" }}
        />
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          aria-label="Lọc theo nhà cung cấp"
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.82rem", background: "white" }}
        >
          {supplierOptions.map((s) => <option key={s} value={s}>{s === "Tất cả" ? "Tất cả NCC" : s}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc theo trạng thái phiếu"
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.82rem", background: "white" }}
        >
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Từ:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "6px 8px", fontSize: "0.78rem" }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Đến:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "6px 8px", fontSize: "0.78rem" }}
          />
        </div>
        {(supplierFilter !== "Tất cả" || statusFilter !== "Tất cả" || fromDate || toDate || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSupplierFilter("Tất cả");
              setStatusFilter("Tất cả");
              setFromDate("");
              setToDate("");
              setSearchQuery("");
            }}
            style={{ background: "none", border: "none", color: "#DC2626", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}
          >
            ✕ Xóa lọc
          </button>
        )}
      </div>

      <div className="responsive-two-column grid gap-5" style={{ gridTemplateColumns: "minmax(280px, 0.8fr) minmax(0, 1.4fr)" }}>
        <div className="flex flex-col gap-3">
          {filteredReceipts.map((receipt) => {
            const quantity = receipt.lines.reduce((sum, line) => sum + line.quantity, 0);
            return (
              <button key={receipt.id} onClick={() => { setSelectedId(receipt.id); setMessage(null); }} style={{ background: "white", borderRadius: "10px", padding: "14px 16px", border: `1px solid ${selectedId === receipt.id ? "var(--color-forest)" : "var(--color-bone)"}`, display: "block", cursor: "pointer", textAlign: "left" }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>{receipt.displayCode ?? receipt.id}</span>
                  <span style={{
                    background: receipt.status === "Đã nhập kho" ? "#DCFCE7" : receipt.status === "Đã hủy" ? "#F3F4F6" : "#FEF3C7",
                    color: receipt.status === "Đã nhập kho" ? "#15803D" : receipt.status === "Đã hủy" ? "#6B7280" : "#B45309",
                    padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600
                  }}>
                    {receipt.status}
                  </span>
                  {receipt.adjustments && receipt.adjustments.length > 0 && (
                    <span style={{ background: "#FEF3C7", color: "#D97706", fontSize: "0.68rem", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                      ⚡ {receipt.adjustments.filter((a) => a.status === "Chờ duyệt").length > 0 ? "Chờ duyệt điều chỉnh" : "Đã có điều chỉnh"}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.86rem" }}>{receipt.supplierName}</div>
                <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: "3px" }}>{receipt.lines.length} loại · {quantity} thiết bị · {receipt.createdBy}</div>
                <div style={{ fontWeight: 700, marginTop: "8px" }}>{fmt(receiptTotal(receipt))}</div>
              </button>
            );
          })}
          {filteredReceipts.length === 0 && (
            <div style={{ background: "white", borderRadius: 10, padding: 24, textAlign: "center", color: "#9CA3AF", border: "1px dashed var(--color-bone)" }}>
              Không tìm thấy phiếu nhập nào phù hợp tiêu chí lọc.
            </div>
          )}
        </div>

        {selected && (
          <div style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: "14px", overflow: "hidden", alignSelf: "start" }}>
            <div className="flex justify-between items-start" style={{ background: "var(--color-parchment)", padding: "16px 18px" }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontWeight: 700 }}>{selected.displayCode ?? selected.id}</div>
                <div style={{ fontWeight: 700 }}>{selected.supplierName}</div>
                <div style={{ color: "#6B7280", fontSize: "0.72rem" }}>Lập lúc {selected.createdAt} · {selected.createdBy}</div>
                {selected.supplierDocumentNumber && (
                  <div style={{ color: "#4B5563", fontSize: "0.72rem" }}>Số chứng từ NCC: <strong>{selected.supplierDocumentNumber}</strong></div>
                )}
              </div>
              <span style={{
                background: selected.status === "Đã nhập kho" ? "#DCFCE7" : selected.status === "Đã hủy" ? "#F3F4F6" : "#FEF3C7",
                color: selected.status === "Đã nhập kho" ? "#15803D" : selected.status === "Đã hủy" ? "#6B7280" : "#B45309",
                borderRadius: "999px", padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700
              }}>
                {selected.status}
              </span>
            </div>
            <div className="responsive-table">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                <thead><tr style={{ color: "#6B7280", fontSize: "0.72rem" }}>
                  {["Sản phẩm", "Số lượng", "Đơn giá", "Kiểm nhận / Phân loại", "Thành tiền"].map((heading) => <th key={heading} style={{ textAlign: heading === "Sản phẩm" || heading === "Kiểm nhận / Phân loại" ? "left" : "right", padding: "10px 14px" }}>{heading}</th>)}
                </tr></thead>
                <tbody>{selected.lines.map((line) => {
                  const product = app.products.find((item) => item.id === line.productId);
                  const isZeroPrice = line.unitPrice === 0;
                  const hasInspection = line.acceptedQty !== undefined || line.damagedQty !== undefined || line.rejectedQty !== undefined;
                  const acceptedCount = line.acceptedQty ?? line.quantity;
                  const damagedCount = line.damagedQty ?? 0;
                  const rejectedCount = line.rejectedQty ?? 0;
                  const billedCount = (line.acceptedQty !== undefined || line.damagedQty !== undefined) ? (acceptedCount + damagedCount) : line.quantity;

                  return (
                    <tr key={line.productId} style={{ borderTop: "1px solid var(--color-bone)", fontSize: "0.8rem" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600 }}>{product?.name}</div>
                        {isZeroPrice && (
                          <div style={{ fontSize: "0.7rem", color: "#D97706", marginTop: 2, background: "#FEF3C7", padding: "1px 6px", borderRadius: 4, display: "inline-block" }}>
                            🎁 Hàng tặng/KM: {line.priceZeroReason || "Quà tặng kèm đơn"}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>{line.quantity}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>{isZeroPrice ? "0 đ (Tặng)" : fmt(line.unitPrice)}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.72rem" }}>
                        {hasInspection ? (
                          <div className="flex flex-col gap-1">
                            <span style={{ color: "#15803D", fontWeight: 600 }}>✓ Đạt: {acceptedCount} thiết bị {line.acceptedCodes && line.acceptedCodes.length > 0 ? `(${line.acceptedCodes.join(", ")})` : ""}</span>
                            {damagedCount > 0 && (
                              <span style={{ color: "#B45309", fontWeight: 600 }}>⚠️ Lỗi nhận sửa: {damagedCount} ({line.damageNotes || "Chờ bảo trì"})</span>
                            )}
                            {rejectedCount > 0 && (
                              <span style={{ color: "#DC2626", fontWeight: 600 }}>✕ Từ chối trả NCC: {rejectedCount} ({line.rejectionReason || "Không đạt"})</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#6B7280" }}>Mã dự kiến: {line.equipmentCodes.join(", ") || "Chưa tạo mã"}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>
                        {fmt(billedCount * line.unitPrice)}
                        {rejectedCount > 0 && (
                          <div style={{ fontSize: "0.68rem", color: "#DC2626", fontWeight: 400 }}>- Đã trừ {rejectedCount} cái từ chối</div>
                        )}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div style={{ padding: "16px 18px", borderTop: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between" style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "12px" }}>
                <span>Tổng tiền thanh toán</span>
                <span style={{ color: "var(--color-forest)" }}>{fmt(receiptTotal(selected))}</span>
              </div>

              {selected.status === "Nháp" ? (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setEditing(selected)} style={{ flex: 1, minWidth: 100, background: "white", color: "var(--color-forest)", border: "1px solid var(--color-forest)", borderRadius: "9px", padding: "11px", cursor: "pointer", fontWeight: 700 }}>
                    ✏️ Sửa nháp (UC7.6)
                  </button>
                  <button onClick={() => {
                    setCancellingReceipt(selected);
                    setCancelReason("");
                    setCancelError("");
                  }} style={{ background: "white", color: "#B91C1C", border: "1px solid #FECACA", borderRadius: "9px", padding: "11px 16px", cursor: "pointer", fontWeight: 700 }}>
                    ✕ Hủy nháp (UC7.9)
                  </button>
                  <button onClick={() => setInspectingReceipt(selected)} style={{ flex: 1.6, minWidth: 200, background: "var(--color-forest)", color: "white", border: "none", borderRadius: "9px", padding: "11px 18px", cursor: "pointer", fontWeight: 700, fontSize: "0.88rem", boxShadow: "0 2px 8px rgba(34, 197, 94, 0.25)" }}>
                    📦 Kiểm nhận & Chốt kho (UC7.7)
                  </button>
                </div>
              ) : selected.status === "Đã hủy" ? (
                <div style={{ background: "#F3F4F6", color: "#6B7280", borderRadius: "8px", padding: "10px", fontSize: "0.8rem", textAlign: "center", fontWeight: 600 }}>
                  Phiếu đã hủy lúc {selected.cancelledAt ?? "trước đó"}. Lý do: {selected.cancelReason ?? "Không có"}. Tồn kho không thay đổi.
                </div>
              ) : (
                <div>
                  <div style={{ background: "#DCFCE7", color: "#15803D", borderRadius: "8px", padding: "10px 14px", fontSize: "0.8rem", fontWeight: 600, marginBottom: "12px" }}>
                    ✓ Đã nhập kho lúc {selected.confirmedAt}. Người kiểm: {selected.inspectedBy ?? selected.createdBy}. Phiếu gốc đã được khóa chỉnh sửa.
                  </div>

                  {/* UC7.10: Xử lý sai lệch sau chốt */}
                  <div className="flex justify-between items-center mb-2 flex-wrap gap-2" style={{ borderTop: "1px dashed var(--color-bone)", paddingTop: 12 }}>
                    <div>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-bark)" }}>Xử lý sai lệch phiếu nhập sau chốt (UC7.10)</span>
                      <p style={{ fontSize: "0.72rem", color: "#6B7280", margin: 0 }}>Ghi nhận sai sót số lượng, mã thiết bị hoặc giá vốn. Quản trị viên duyệt an toàn lịch thuê.</p>
                    </div>
                    <button
                      onClick={() => setAdjustingReceipt(selected)}
                      style={{ background: "#F59E0B", color: "white", border: "none", borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}
                    >
                      ⚡ Đề nghị điều chỉnh
                    </button>
                  </div>

                  {(isRealApi ? serverAdjustments : (selected.adjustments ?? [])).length > 0 && (
                    <div style={{ background: "var(--color-parchment)", borderRadius: "8px", padding: "10px", marginTop: "8px", border: "1px solid var(--color-bone)" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "6px", color: "#374151" }}>Lịch sử đề nghị điều chỉnh ({(isRealApi ? serverAdjustments : (selected.adjustments ?? [])).length}):</div>
                      <div className="flex flex-col gap-2">
                        {(isRealApi ? serverAdjustments : (selected.adjustments ?? [])).map((adj) => (
                          <div key={adj.id} style={{ background: "white", padding: "9px 12px", borderRadius: "6px", fontSize: "0.76rem", border: "1px solid var(--color-bone)" }}>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontWeight: 700, color: "var(--color-forest)" }}>{adj.type}</span>
                              <span style={{
                                background: adj.status === "Đã duyệt" ? "#DCFCE7" : adj.status === "Từ chối" ? "#FEE2E2" : "#FEF3C7",
                                color: adj.status === "Đã duyệt" ? "#15803D" : adj.status === "Từ chối" ? "#DC2626" : "#B45309",
                                padding: "2px 7px", borderRadius: "4px", fontWeight: 700, fontSize: "0.68rem"
                              }}>
                                {adj.status}
                              </span>
                            </div>
                            <div style={{ color: "#374151" }}>
                              Giá trị: <span style={{ textDecoration: "line-through", color: "#9CA3AF" }}>{adj.previousValue}</span> → <strong>{adj.newValue}</strong>
                            </div>
                            <div style={{ color: "#6B7280", marginTop: "2px" }}>
                              Lý do: <em>{adj.reason}</em> (Người lập: {adj.createdBy} lúc {adj.createdAt})
                            </div>
                            {adj.evidence && (
                              <div style={{ color: "#6B7280", fontSize: "0.7rem", marginTop: "1px" }}>Chứng từ kèm: {adj.evidence}</div>
                            )}

                            {adj.status === "Chờ duyệt" && (
                              <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: "1px dashed var(--color-bone)" }}>
                                <button
                                  disabled={adjLoadingId === adj.id}
                                  onClick={async () => {
                                    if (isRealApi) {
                                      const adjIdNum = Number(adj.id);
                                      if (Number.isNaN(adjIdNum)) return setMessage({ type: "error", text: "ID đề nghị không hợp lệ." });
                                      setAdjLoadingId(adj.id);
                                      try {
                                        if ((adj as { rawStatus?: string }).rawStatus === "Nhap") {
                                          await inventoryApi.guiDuyet(adjIdNum);
                                        }
                                        await inventoryApi.duyetVaApDung(adjIdNum);
                                        await Promise.all([
                                          app.refreshImportReceipts?.(),
                                          app.refreshEquipment?.(),
                                          loadServerReceiptAdjustments(selected.id),
                                        ]);
                                        setMessage({ type: "success", text: "Đã duyệt và áp dụng điều chỉnh phiếu nhập thành công (UC7.10)!" });
                                      } catch (err) {
                                        setMessage({ type: "error", text: err instanceof Error ? err.message : "Lỗi duyệt điều chỉnh phiếu nhập." });
                                      } finally {
                                        setAdjLoadingId(null);
                                      }
                                      return;
                                    }
                                    const res = app.approveImportAdjustment(selected.id, adj.id, "Quản trị viên");
                                    setMessage(res.ok ? { type: "success", text: "Đã duyệt và áp dụng điều chỉnh phiếu nhập thành công (UC7.10)!" } : { type: "error", text: res.message });
                                  }}
                                  style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: "5px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                                >
                                  {adjLoadingId === adj.id ? "Đang duyệt..." : "✓ Duyệt (UC7.10)"}
                                </button>
                                <button
                                  disabled={adjLoadingId === adj.id}
                                  onClick={() => {
                                    setRejectingAdj({ receiptId: selected.id, adjId: adj.id });
                                    setRejectAdjReason("");
                                  }}
                                  style={{ background: "white", color: "#DC2626", border: "1px solid #FECACA", borderRadius: "5px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                                >
                                  ✕ Từ chối
                                </button>
                              </div>
                            )}
                            {adj.status === "Đã duyệt" && (
                              <div style={{ fontSize: "0.7rem", color: "#15803D", marginTop: "4px", fontWeight: 600 }}>
                                ✓ Đã duyệt bởi {adj.reviewedBy} lúc {adj.reviewedAt}
                              </div>
                            )}
                            {adj.status === "Từ chối" && (
                              <div style={{ fontSize: "0.7rem", color: "#DC2626", marginTop: "4px", fontWeight: 600 }}>
                                ✕ Từ chối bởi {adj.reviewedBy}: {adj.reviewNotes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editing && <ImportReceiptForm app={app} receipt={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}

      {/* UC7.9: Modal hủy phiếu nhập nháp */}
      {cancellingReceipt && (
        <FormModal
          title={`Hủy phiếu nhập nháp: ${cancellingReceipt.displayCode ?? cancellingReceipt.id}`}
          description="Thao tác hủy nháp không làm thay đổi tồn kho và bắt buộc lưu lý do (UC7.9)."
          onClose={() => setCancellingReceipt(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!cancelReason.trim()) {
                return setCancelError("Vui lòng nhập lý do hủy phiếu nhập.");
              }
              if (isRealApi) {
                const idNum = Number(cancellingReceipt.id);
                if (Number.isNaN(idNum)) return setCancelError("ID phiếu nhập không hợp lệ.");
                setCancelLoading(true);
                try {
                  await importReceiptApi.huyPhieu(idNum, cancelReason.trim());
                  await app.refreshImportReceipts?.();
                  setCancellingReceipt(null);
                  setMessage({ type: "success", text: "Đã hủy phiếu nháp thành công. Kho không thay đổi." });
                } catch (err) {
                  setCancelError(err instanceof Error ? err.message : "Không thể hủy phiếu nhập trên máy chủ.");
                } finally {
                  setCancelLoading(false);
                }
                return;
              }
              const result = app.cancelImportReceipt(cancellingReceipt.id, cancelReason.trim());
              if (!result.ok) return setCancelError(result.message);
              setCancellingReceipt(null);
              setMessage({ type: "success", text: "Đã hủy phiếu nháp thành công. Kho không thay đổi." });
            }}
            className="grid gap-4 mt-4"
          >
            <label style={labelStyle}>
              Lý do hủy phiếu (Bắt buộc)
              <textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="VD: Nhà cung cấp báo hết hàng / Lập nhầm sản phẩm..." style={fieldStyle} />
            </label>
            {cancelError && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: 10, borderRadius: 8 }}>{cancelError}</div>}
            <FormActions onClose={() => setCancellingReceipt(null)} loading={cancelLoading} submitLabel="Xác nhận hủy phiếu" />
          </form>
        </FormModal>
      )}

      {/* UC7.10: Modal từ chối đề nghị điều chỉnh phiếu nhập */}
      {rejectingAdj && (
        <FormModal
          title="Từ chối đề nghị điều chỉnh phiếu nhập"
          description="Nhập lý do từ chối để lưu vết kiểm toán (UC7.10)."
          onClose={() => setRejectingAdj(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const lyDo = rejectAdjReason.trim() || "Không đủ căn cứ chứng từ";
              if (isRealApi) {
                const adjIdNum = Number(rejectingAdj.adjId);
                if (Number.isNaN(adjIdNum)) return;
                setAdjLoadingId(rejectingAdj.adjId);
                try {
                  await inventoryApi.tuChoi(adjIdNum, lyDo);
                  await Promise.all([
                    app.refreshImportReceipts?.(),
                    loadServerReceiptAdjustments(rejectingAdj.receiptId),
                  ]);
                  setRejectingAdj(null);
                  setMessage({ type: "success", text: "Đã từ chối đề nghị điều chỉnh phiếu nhập." });
                } catch (err) {
                  setMessage({ type: "error", text: err instanceof Error ? err.message : "Lỗi từ chối đề nghị điều chỉnh." });
                } finally {
                  setAdjLoadingId(null);
                }
                return;
              }
              const res = app.rejectImportAdjustment(rejectingAdj.receiptId, rejectingAdj.adjId, lyDo);
              setMessage(res.ok ? { type: "success", text: "Đã từ chối đề nghị điều chỉnh." } : { type: "error", text: res.message });
              setRejectingAdj(null);
            }}
            className="grid gap-4 mt-4"
          >
            <label style={labelStyle}>
              Lý do từ chối
              <textarea rows={2} value={rejectAdjReason} onChange={(e) => setRejectAdjReason(e.target.value)} placeholder="Không đủ căn cứ chứng từ..." style={fieldStyle} />
            </label>
            <FormActions onClose={() => setRejectingAdj(null)} loading={adjLoadingId === rejectingAdj.adjId} submitLabel="Xác nhận từ chối" />
          </form>
        </FormModal>
      )}

      {/* UC7.7: Modal kiểm nhận hàng thực tế tại kho */}
      {inspectingReceipt && (
        <GoodsReceivingModal
          receipt={inspectingReceipt}
          app={app}
          onClose={() => setInspectingReceipt(null)}
          onSuccess={() => {
            setInspectingReceipt(null);
            setMessage({ type: "success", text: "Đã hoàn tất kiểm nhận hàng và nhập kho thành công (UC7.7)!" });
          }}
        />
      )}

      {/* UC7.10: Modal lập đề nghị điều chỉnh sau chốt */}
      {adjustingReceipt && (
        <ImportAdjustmentModal
          receipt={adjustingReceipt}
          app={app}
          onClose={() => setAdjustingReceipt(null)}
          onSuccess={() => {
            setAdjustingReceipt(null);
            loadServerReceiptAdjustments(adjustingReceipt.id);
            setMessage({ type: "success", text: "Đã gửi đề nghị điều chỉnh phiếu nhập sau chốt thành công. Đang ở trạng thái Chờ duyệt (UC7.10)." });
          }}
        />
      )}
    </div>
  );
}

// ─── Suppliers (UC7.1 - UC7.4) ────────────────────────────────────────────────
