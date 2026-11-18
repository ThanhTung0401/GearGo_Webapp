import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { inventoryApi } from "../../../services/api/inventoryApi";

import { importReceiptApi } from "../../../services/api/importReceiptApi";

import { fmt, type ImportReceipt } from "../../../store";

import { FormModal, FormActions } from "../forms/FormModal";

import GoodsReceivingModal from "../../../components/GoodsReceivingModal";
import ImportAdjustmentModal from "../../../components/ImportAdjustmentModal";

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
          <h2 className="adm-page-title adm-page-title--compact">Phiếu nhập hàng</h2>
          <p className="adm-page-subtitle adm-page-subtitle--sm">Phiếu nháp không làm thay đổi tồn kho cho đến khi được kiểm nhận và xác nhận (UC7.7).</p>
        </div>
        <button onClick={() => setEditing("new")} className="adm-btn-primary">+ Tạo phiếu nháp</button>
      </div>
      {message && (
        <div role="status" className={`adm-alert ${message.type === "success" ? "is-success" : "is-error-solid"}`}>{message.text}</div>
      )}

      {/* UC7.8: Bộ lọc Nhà cung cấp, Trạng thái & Khoảng ngày */}
      <div className="adm-toolbar">
        <input
          type="text"
          placeholder="🔍 Tìm mã phiếu, NCC, người lập..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="adm-search-input"
        />
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          aria-label="Lọc theo nhà cung cấp"
          className="adm-select adm-select--sm"
        >
          {supplierOptions.map((s) => <option key={s} value={s}>{s === "Tất cả" ? "Tất cả NCC" : s}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc theo trạng thái phiếu"
          className="adm-select adm-select--sm"
        >
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <span className="adm-count-text text-xs">Từ:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="adm-date-input"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="adm-count-text text-xs">Đến:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="adm-date-input"
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
            className="adm-clear-filter-btn"
          >
            ✕ Xóa lọc
          </button>
        )}
      </div>

      <div className="responsive-two-column adm-inventory-grid">
        <div className="flex flex-col gap-3">
          {filteredReceipts.map((receipt) => {
            const quantity = receipt.lines.reduce((sum, line) => sum + line.quantity, 0);
            const pillClass = receipt.status === "Đã nhập kho" ? "is-success" : receipt.status === "Đã hủy" ? "is-neutral" : "is-warning";
            return (
              <button
                key={receipt.id}
                onClick={() => { setSelectedId(receipt.id); setMessage(null); }}
                className={`adm-receipt-card ${selectedId === receipt.id ? "is-selected" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="adm-cell-code">{receipt.displayCode ?? receipt.id}</span>
                  <span className={`adm-pill adm-pill--round adm-pill--xs ${pillClass}`}>
                    {receipt.status}
                  </span>
                  {receipt.adjustments && receipt.adjustments.length > 0 && (
                    <span className="adm-pill is-warning adm-pill--xs">
                      ⚡ {receipt.adjustments.filter((a) => a.status === "Chờ duyệt").length > 0 ? "Chờ duyệt điều chỉnh" : "Đã có điều chỉnh"}
                    </span>
                  )}
                </div>
                <div className="font-semibold text-[0.86rem]">{receipt.supplierName}</div>
                <div className="adm-hint-text mt-1">{receipt.lines.length} loại · {quantity} thiết bị · {receipt.createdBy}</div>
                <div className="font-bold mt-2">{fmt(receiptTotal(receipt))}</div>
              </button>
            );
          })}
          {filteredReceipts.length === 0 && (
            <div className="adm-empty-box p-6">
              Không tìm thấy phiếu nhập nào phù hợp tiêu chí lọc.
            </div>
          )}
        </div>

        {selected && (
          <div className="adm-card self-start">
            <div className="adm-card-header flex justify-between items-start gap-2">
              <div>
                <div className="adm-cell-code text-sm">{selected.displayCode ?? selected.id}</div>
                <div className="font-bold">{selected.supplierName}</div>
                <div className="adm-hint-text font-normal">Lập lúc {selected.createdAt} · {selected.createdBy}</div>
                {selected.supplierDocumentNumber && (
                  <div className="text-[0.72rem] text-[#4B5563] font-normal">Số chứng từ NCC: <strong>{selected.supplierDocumentNumber}</strong></div>
                )}
              </div>
              <span className={`adm-pill adm-pill--round ${selected.status === "Đã nhập kho" ? "is-success" : selected.status === "Đã hủy" ? "is-neutral" : "is-warning"}`}>
                {selected.status}
              </span>
            </div>
            <div className="responsive-table">
              <table className="adm-table adm-table--min adm-table--md">
                <thead><tr>
                  {["Sản phẩm", "Số lượng", "Đơn giá", "Kiểm nhận / Phân loại", "Thành tiền"].map((heading) => (
                    <th key={heading} className={heading === "Sản phẩm" || heading === "Kiểm nhận / Phân loại" ? "" : "adm-cell-right"}>{heading}</th>
                  ))}
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
                    <tr key={line.productId}>
                      <td>
                        <div className="font-semibold">{product?.name}</div>
                        {isZeroPrice && (
                          <div className="adm-pill is-warning adm-pill--xs mt-0.5 font-normal">
                            🎁 Hàng tặng/KM: {line.priceZeroReason || "Quà tặng kèm đơn"}
                          </div>
                        )}
                      </td>
                      <td className="adm-cell-right">{line.quantity}</td>
                      <td className="adm-cell-right">{isZeroPrice ? "0 đ (Tặng)" : fmt(line.unitPrice)}</td>
                      <td className="text-[0.72rem]">
                        {hasInspection ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[#15803D] font-semibold">✓ Đạt: {acceptedCount} thiết bị {line.acceptedCodes && line.acceptedCodes.length > 0 ? `(${line.acceptedCodes.join(", ")})` : ""}</span>
                            {damagedCount > 0 && (
                              <span className="text-[#B45309] font-semibold">⚠️ Lỗi nhận sửa: {damagedCount} ({line.damageNotes || "Chờ bảo trì"})</span>
                            )}
                            {rejectedCount > 0 && (
                              <span className="text-[#DC2626] font-semibold">✕ Từ chối trả NCC: {rejectedCount} ({line.rejectionReason || "Không đạt"})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#6B7280]">Mã dự kiến: {line.equipmentCodes.join(", ") || "Chưa tạo mã"}</span>
                        )}
                      </td>
                      <td className="adm-cell-right font-bold">
                        {fmt(billedCount * line.unitPrice)}
                        {rejectedCount > 0 && (
                          <div className="text-[0.68rem] text-[#DC2626] font-normal">- Đã trừ {rejectedCount} cái từ chối</div>
                        )}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div className="adm-receipt-footer">
              <div className="adm-receipt-total">
                <span>Tổng tiền thanh toán</span>
                <span className="text-[var(--color-forest)]">{fmt(receiptTotal(selected))}</span>
              </div>

              {selected.status === "Nháp" ? (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setEditing(selected)} className="adm-btn-forest-outline flex-1 min-w-[100px] py-2.5">
                    ✏️ Sửa nháp (UC7.6)
                  </button>
                  <button onClick={() => {
                    setCancellingReceipt(selected);
                    setCancelReason("");
                    setCancelError("");
                  }} className="adm-btn-danger-outline px-4 py-2.5 font-bold">
                    ✕ Hủy nháp (UC7.9)
                  </button>
                  <button onClick={() => setInspectingReceipt(selected)} className="adm-btn-primary flex-[1.6] min-w-[200px] py-2.5 font-bold shadow-sm">
                    📦 Kiểm nhận & Chốt kho (UC7.7)
                  </button>
                </div>
              ) : selected.status === "Đã hủy" ? (
                <div className="adm-pill is-neutral w-full justify-center py-2.5 text-[0.8rem] whitespace-normal text-center">
                  Phiếu đã hủy lúc {selected.cancelledAt ?? "trước đó"}. Lý do: {selected.cancelReason ?? "Không có"}. Tồn kho không thay đổi.
                </div>
              ) : (
                <div>
                  <div className="adm-alert is-success mb-3 font-semibold">
                    ✓ Đã nhập kho lúc {selected.confirmedAt}. Người kiểm: {selected.inspectedBy ?? selected.createdBy}. Phiếu gốc đã được khóa chỉnh sửa.
                  </div>

                  {/* UC7.10: Xử lý sai lệch sau chốt */}
                  <div className="flex justify-between items-center mb-2 flex-wrap gap-2 border-t border-dashed border-[var(--color-bone)] pt-3">
                    <div>
                      <span className="text-[0.82rem] font-bold text-[var(--color-bark)]">Xử lý sai lệch phiếu nhập sau chốt (UC7.10)</span>
                      <p className="adm-hint-text m-0">Ghi nhận sai sót số lượng, mã thiết bị hoặc giá vốn. Quản trị viên duyệt an toàn lịch thuê.</p>
                    </div>
                    <button
                      onClick={() => setAdjustingReceipt(selected)}
                      className="adm-btn-amber-sm px-3.5 py-2"
                    >
                      ⚡ Đề nghị điều chỉnh
                    </button>
                  </div>

                  {(isRealApi ? serverAdjustments : (selected.adjustments ?? [])).length > 0 && (
                    <div className="adm-adj-box">
                      <div className="text-[0.75rem] font-bold mb-1.5 text-[#374151]">Lịch sử đề nghị điều chỉnh ({(isRealApi ? serverAdjustments : (selected.adjustments ?? [])).length}):</div>
                      <div className="flex flex-col gap-2">
                        {(isRealApi ? serverAdjustments : (selected.adjustments ?? [])).map((adj) => (
                          <div key={adj.id} className="adm-adj-item">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-[var(--color-forest)]">{adj.type}</span>
                              <span className={`adm-pill adm-pill--xs ${adj.status === "Đã duyệt" ? "is-success" : adj.status === "Từ chối" ? "is-danger" : "is-warning"}`}>
                                {adj.status}
                              </span>
                            </div>
                            <div className="text-[#374151]">
                              Giá trị: <span className="line-through text-[#9CA3AF]">{adj.previousValue}</span> → <strong>{adj.newValue}</strong>
                            </div>
                            <div className="text-[#6B7280] mt-0.5">
                              Lý do: <em>{adj.reason}</em> (Người lập: {adj.createdBy} lúc {adj.createdAt})
                            </div>
                            {adj.evidence && (
                              <div className="text-[#6B7280] text-[0.7rem] mt-0.5">Chứng từ kèm: {adj.evidence}</div>
                            )}

                            {adj.status === "Chờ duyệt" && (
                              <div className="flex gap-2 mt-2 pt-2 border-t border-dashed border-[var(--color-bone)]">
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
                                  className="adm-btn-forest-solid adm-btn-xs"
                                >
                                  {adjLoadingId === adj.id ? "Đang duyệt..." : "✓ Duyệt (UC7.10)"}
                                </button>
                                <button
                                  disabled={adjLoadingId === adj.id}
                                  onClick={() => {
                                    setRejectingAdj({ receiptId: selected.id, adjId: adj.id });
                                    setRejectAdjReason("");
                                  }}
                                  className="adm-btn-danger-outline adm-btn-xs"
                                >
                                  ✕ Từ chối
                                </button>
                              </div>
                            )}
                            {adj.status === "Đã duyệt" && (
                              <div className="text-[0.7rem] text-[#15803D] mt-1 font-semibold">
                                ✓ Đã duyệt bởi {adj.reviewedBy} lúc {adj.reviewedAt}
                              </div>
                            )}
                            {adj.status === "Từ chối" && (
                              <div className="text-[0.7rem] text-[#DC2626] mt-1 font-semibold">
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
            <label className="adm-label">
              Lý do hủy phiếu (Bắt buộc)
              <textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="VD: Nhà cung cấp báo hết hàng / Lập nhầm sản phẩm..." className="adm-field" />
            </label>
            {cancelError && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{cancelError}</div>}
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
            <label className="adm-label">
              Lý do từ chối
              <textarea rows={2} value={rejectAdjReason} onChange={(e) => setRejectAdjReason(e.target.value)} placeholder="Không đủ căn cứ chứng từ..." className="adm-field" />
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
