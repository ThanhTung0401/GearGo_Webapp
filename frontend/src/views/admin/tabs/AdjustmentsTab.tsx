import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../App";
import { isRealApiEnabled } from "../../../services/apiClient";

import { paymentApi, type GiaoDichCanDoiChieuBackend } from "../../../services/api/paymentApi";
import { reconciliationApi, type DoiSoatBackend } from "../../../services/api/reconciliationApi";
import { surchargeApi } from "../../../services/api/surchargeApi";

import { fmt, type FinancialAdjustment } from "../../../store";
import Icon from "../../../components/Icon";
export function AdjustmentsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const realApi = app.realApi || isRealApiEnabled();
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<FinancialAdjustment["type"]>("Thu bù");
  const [amount, setAmount] = useState<number>(100000);
  const [orderId, setOrderId] = useState("");
  const [importReceiptId, setImportReceiptId] = useState("");
  const [reason, setReason] = useState("");

  // State kết nối API thật: đối chiếu ngoại lệ thanh toán & điều chỉnh đối soát sau chốt
  const [pendingPayments, setPendingPayments] = useState<GiaoDichCanDoiChieuBackend[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState("");

  const [reconcileTarget, setReconcileTarget] = useState<GiaoDichCanDoiChieuBackend | null>(null);
  const [reconcileOutcome, setReconcileOutcome] = useState<"HopLe_XacNhan" | "HopLe_HoanTienThua" | "TuChoi">("HopLe_XacNhan");
  const [reconcileNote, setReconcileNote] = useState("");
  const [reconcileRefundAmount, setReconcileRefundAmount] = useState<number>(0);
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileModalError, setReconcileModalError] = useState("");

  // Tra cứu biên bản đối soát gốc & phụ phí của đơn được chọn để điều chỉnh sau chốt (UC5.7)
  const [orderDoiSoat, setOrderDoiSoat] = useState<DoiSoatBackend | null>(null);
  const [orderSurchargeIds, setOrderSurchargeIds] = useState<Array<{ id: number; label: string }>>([]);
  const [selectedSurchargeId, setSelectedSurchargeId] = useState("");
  const [orderLookupLoading, setOrderLookupLoading] = useState(false);
  const [orderLookupError, setOrderLookupError] = useState("");
  const [modalError, setModalError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);

  const loadPendingPayments = useCallback(async () => {
    if (!realApi) return;
    setPayLoading(true);
    setPayError("");
    try {
      const items = await paymentApi.layDanhSachCanDoiChieu();
      setPendingPayments(items ?? []);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Không thể tải danh sách giao dịch cần đối chiếu ngoại lệ.");
    } finally {
      setPayLoading(false);
    }
  }, [realApi]);

  useEffect(() => {
    void loadPendingPayments();
  }, [loadPendingPayments]);

  const resolveOrderBackendId = (rawOrderId: string): number | null => {
    if (!rawOrderId) return null;
    const matched = app.orders.find((o) => o.id === rawOrderId || o.displayCode === rawOrderId);
    if (matched?.backendId) return matched.backendId;
    const parsed = Number(rawOrderId.replace(/\D/g, ""));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  useEffect(() => {
    if (!realApi || !showModal || !orderId) {
      setOrderDoiSoat(null);
      setOrderSurchargeIds([]);
      setSelectedSurchargeId("");
      setOrderLookupError("");
      return;
    }
    const maDonThue = resolveOrderBackendId(orderId);
    if (!maDonThue) {
      setOrderLookupError("Không xác định được mã đơn thuê hợp lệ trên máy chủ.");
      return;
    }
    let cancelled = false;
    setOrderLookupLoading(true);
    setOrderLookupError("");
    void Promise.all([
      reconciliationApi.layTheoDon(maDonThue).catch(() => null),
      surchargeApi.layTheoDon(maDonThue).catch(() => []),
    ])
      .then(([ds, phis]) => {
        if (cancelled) return;
        setOrderDoiSoat(ds);
        if (!ds) {
          setOrderLookupError("Đơn hàng này chưa có biên bản đối soát gốc (UC5.4) để lập điều chỉnh sau chốt.");
        }
        const list = (phis ?? []).map((p) => ({
          id: p.maPhuPhi,
          label: `#${p.maPhuPhi} · ${p.loaiPhi} (${fmt(p.soTien)}) — ${p.trangThaiDuyet}`,
        }));
        setOrderSurchargeIds(list);
      })
      .finally(() => {
        if (!cancelled) setOrderLookupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [realApi, showModal, orderId]);

  const handleConfirmReconcilePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileTarget) return;
    if (!reconcileNote.trim()) {
      setReconcileModalError("Vui lòng nhập ghi chú kết luận đối chiếu giao dịch.");
      return;
    }
    if (reconcileOutcome === "HopLe_HoanTienThua" && reconcileRefundAmount <= 0) {
      setReconcileModalError("Số tiền hoàn lại cho khách phải lớn hơn 0.");
      return;
    }
    setReconcileBusy(true);
    setReconcileModalError("");
    setPaySuccess("");
    try {
      await paymentApi.doiChieuGiaoDich(reconcileTarget.maThanhToan, {
        ketLuan: reconcileOutcome,
        ghiChu: reconcileNote.trim(),
        soTienHoan: reconcileOutcome === "HopLe_HoanTienThua" ? Number(reconcileRefundAmount) : undefined,
      });
      await Promise.all([loadPendingPayments(), app.refreshOrders?.()]);
      setPaySuccess(`Đã hoàn tất đối chiếu giao dịch ${reconcileTarget.maYeuCau}.`);
      setReconcileTarget(null);
      setReconcileNote("");
    } catch (err) {
      setReconcileModalError(err instanceof Error ? err.message : "Không thể lưu kết quả đối chiếu giao dịch.");
    } finally {
      setReconcileBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (realApi) {
      setModalError("");
      if (!reason.trim()) {
        setModalError("Vui lòng nhập lý do điều chỉnh bù trừ.");
        return;
      }
      if (!orderId && importReceiptId) {
        setModalError("Sai lệch phiếu nhập kho (UC7.10) được kiểm soát và duyệt tại mục Điều chỉnh kho.");
        return;
      }
      if (!orderDoiSoat) {
        setModalError("Vui lòng chọn đơn thuê đã có biên bản đối soát gốc để lập điều chỉnh tài chính sau chốt (UC5.7).");
        return;
      }

      const signedAmount =
        type === "Hoàn trả" || type === "Bù trừ chiết khấu"
          ? -Math.abs(Number(amount || 0))
          : Math.abs(Number(amount || 0));

      setSubmitBusy(true);
      setPaySuccess("");
      try {
        let adjustedSurchargeIds: number[] | undefined;
        if (selectedSurchargeId) {
          const createdPhi = await surchargeApi.lapDieuChinhPhi(Number(selectedSurchargeId), {
            soTienDieuChinhCoDau: signedAmount,
            lyDo: reason.trim(),
          });
          adjustedSurchargeIds = [createdPhi.maPhuPhi];
        }
        await reconciliationApi.lapDieuChinh(orderDoiSoat.maDoiSoat, {
          lyDoDieuChinh: reason.trim(),
          danhSachMaPhuPhiDieuChinh: adjustedSurchargeIds,
          ghiChu: reason.trim(),
        });
        await Promise.all([loadPendingPayments(), app.refreshOrders?.()]);
        setPaySuccess(`Đã lập biên bản điều chỉnh sau chốt cho đơn #${orderDoiSoat.maDonHienThi || orderDoiSoat.maDonThue}.`);
        setShowModal(false);
        setReason("");
        setSelectedSurchargeId("");
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "Không thể lập chứng từ điều chỉnh tài chính trên máy chủ.");
      } finally {
        setSubmitBusy(false);
      }
      return;
    }

    app.saveFinancialAdjustment({
      type,
      amount,
      orderId: orderId || undefined,
      importReceiptId: importReceiptId || undefined,
      reason,
      status: "Đã duyệt",
      createdBy: "Quản trị viên",
      approvedBy: "Quản trị viên",
    });
    setShowModal(false);
    setReason("");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="adm-page-title">
            Điều chỉnh tài chính & Sai lệch phiếu nhập (UC5.7, UC7.10)
          </h2>
          <p className="adm-page-subtitle">
            Đối chiếu giao dịch thanh toán ngoại lệ, lập chứng từ bù trừ sau đối soát đơn hoặc xử lý sai lệch nhập kho.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {realApi && (
            <button
              type="button"
              disabled={payLoading}
              onClick={() => void loadPendingPayments()}
              className="btn btn-secondary btn-md"
            >
              <span className="icon-label"><Icon name="refresh" size={14} /> Làm mới đối chiếu</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setModalError("");
              setShowModal(true);
            }}
            className="btn btn-primary btn-md"
          >
            + Lập chứng từ điều chỉnh
          </button>
        </div>
      </div>

      {payError && (
        <div role="alert" className="adm-alert is-error mb-0">
          <Icon name="alert-circle" size={16} />
          <span>{payError}</span>
        </div>
      )}

      {paySuccess && (
        <div role="status" className="adm-alert is-success mb-0">
          <Icon name="check" size={16} />
          <span>{paySuccess}</span>
        </div>
      )}

      {/* Giao dịch thanh toán cần đối chiếu ngoại lệ (/api/v1/thanh-toan/can-doi-chieu) */}
      {realApi && (
        <div className="adm-table-wrap bg-[#F8F6F0]">
          <div className="px-4.5 py-3.5 border-b border-[var(--color-bone)] flex justify-between items-center">
            <div>
              <h3 className="adm-section-heading text-base m-0">
                Giao dịch thanh toán cần đối chiếu ngoại lệ ({pendingPayments.length})
              </h3>
              <p className="adm-hint-text text-[0.75rem] mt-0.5 mb-0">
                Xử lý các giao dịch lệch số tiền, trùng thanh toán hoặc cần hoàn tiền thừa qua cổng thanh toán.
              </p>
            </div>
          </div>
          <div className="responsive-table">
            <table className="adm-table adm-table--zebra adm-table--md bg-white">
              <thead>
                <tr>
                  {["Mã GD", "Đơn thuê", "Phương thức", "Số tiền", "Lý do cần đối chiếu", "Trạng thái", "Thời điểm", "Thao tác"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payLoading ? (
                  <tr>
                    <td colSpan={8} className="adm-table-empty">
                      Đang tải danh sách giao dịch cần đối chiếu...
                    </td>
                  </tr>
                ) : pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="adm-table-empty text-[#1B3F2F]">
                      Không có giao dịch thanh toán ngoại lệ nào đang chờ đối chiếu.
                    </td>
                  </tr>
                ) : (
                  pendingPayments.map((g) => (
                    <tr key={g.maThanhToan}>
                      <td className="adm-cell-code">
                        {g.maYeuCau}
                      </td>
                      <td className="adm-cell-mono">#{g.maDonThue}</td>
                      <td>{g.phuongThuc}</td>
                      <td className="adm-cell-mono font-bold text-[#B45309]">
                        {fmt(g.tongSoTien)}
                      </td>
                      <td className="text-[#374151]">{g.lyDoCanDoiChieu || "Chênh lệch đối soát cổng thanh toán"}</td>
                      <td>
                        <span className="adm-pill is-warning">
                          {g.trangThaiDoiChieu || g.trangThai}
                        </span>
                      </td>
                      <td className="adm-hint-text text-[0.74rem]">
                        {new Date(g.thoiDiemTao).toLocaleString("vi-VN")}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setReconcileTarget(g);
                            setReconcileOutcome("HopLe_XacNhan");
                            setReconcileNote("");
                            setReconcileRefundAmount(Number(g.tongSoTien || 0));
                            setReconcileModalError("");
                          }}
                          className="adm-btn-amber-sm"
                        >
                          Đối chiếu
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bảng chứng từ */}
      <div className="adm-table-wrap">
        <div className="adm-table-scroll">
          <table className="adm-table adm-table--zebra adm-table--md">
            <thead>
              <tr>
                {["Số chứng từ", "Loại điều chỉnh", "Chứng từ liên quan", "Số tiền (đ)", "Lý do bù trừ", "Người lập / Duyệt", "Thời gian", "Trạng thái"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {app.financialAdjustments.map((a) => (
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
                    <div className="text-[0.7rem] text-[#15803D]">Duyệt: {a.approvedBy || "Hệ thống"}</div>
                  </td>
                  <td className="adm-hint-text text-[0.75rem]">{a.createdAt}</td>
                  <td>
                    <span className="badge badge-success text-[0.72rem]">{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Đối chiếu giao dịch ngoại lệ */}
      {reconcileTarget && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-md">
            <div className="modal-header">
              <h3 className="modal-title">Đối chiếu giao dịch {reconcileTarget.maYeuCau}</h3>
              <button type="button" onClick={() => setReconcileTarget(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={(e) => void handleConfirmReconcilePayment(e)} className="modal-body flex flex-col gap-3">
              {reconcileModalError && (
                <div role="alert" className="adm-alert adm-alert--compact is-error mb-0">
                  <Icon name="alert-circle" size={15} />
                  <span>{reconcileModalError}</span>
                </div>
              )}
              <div className="adm-card--cream text-[0.8rem] p-2.5">
                <div>Đơn thuê: <strong>#{reconcileTarget.maDonThue}</strong> · Phương thức: <strong>{reconcileTarget.phuongThuc}</strong></div>
                <div>Số tiền giao dịch: <strong className="text-[#B45309]">{fmt(reconcileTarget.tongSoTien)}</strong></div>
              </div>
              <div>
                <label className="adm-label--sub">Kết luận đối chiếu</label>
                <select
                  value={reconcileOutcome}
                  onChange={(e) => setReconcileOutcome(e.target.value as any)}
                  className="adm-field adm-field--compact"
                >
                  <option value="HopLe_XacNhan">Hợp lệ — Xác nhận ghi nhận thanh toán</option>
                  <option value="HopLe_HoanTienThua">Hợp lệ — Cần hoàn tiền thừa cho khách</option>
                  <option value="TuChoi">Từ chối — Không ghi nhận giao dịch</option>
                </select>
              </div>
              {reconcileOutcome === "HopLe_HoanTienThua" && (
                <div>
                  <label className="adm-label--sub">Số tiền cần hoàn (VNĐ)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={reconcileRefundAmount}
                    onChange={(e) => setReconcileRefundAmount(Number(e.target.value))}
                    className="adm-field adm-field--compact"
                  />
                </div>
              )}
              <div>
                <label className="adm-label--sub">Ghi chú kết luận *</label>
                <textarea
                  required
                  rows={2}
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  placeholder="Ghi rõ căn cứ sao kê / mã giao dịch ngân hàng..."
                  className="adm-field adm-field--compact"
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button" disabled={reconcileBusy} onClick={() => setReconcileTarget(null)} className="btn btn-secondary btn-md adm-btn-flex">Hủy</button>
                <button type="submit" disabled={reconcileBusy} className="btn btn-primary btn-md adm-btn-flex">
                  {reconcileBusy ? "Đang lưu..." : "Xác nhận đối chiếu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lập chứng từ */}
      {showModal && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-520">
            <div className="modal-header">
              <h3 className="modal-title">Lập chứng từ điều chỉnh bù trừ</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={(e) => void handleSubmit(e)} className="modal-body flex flex-col gap-4">
              {modalError && (
                <div role="alert" className="adm-alert adm-alert--compact is-error mb-0">
                  <Icon name="alert-circle" size={15} />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="adm-label--block">Loại điều chỉnh</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="adm-field"
                >
                  <option value="Thu bù">Thu bù phụ phí sau hoàn tất</option>
                  <option value="Hoàn trả">Hoàn trả chênh lệch cọc</option>
                  <option value="Bù trừ chiết khấu">Bù trừ chiết khấu phát sinh</option>
                  <option value="Sai lệch kiểm kê">Sai lệch kiểm kê</option>
                </select>
              </div>

              <div className="adm-grid-2">
                <div>
                  <label className="adm-label--block">Đơn hàng liên quan</label>
                  <select
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="adm-field"
                  >
                    <option value="">Không có</option>
                    {app.orders.map((o) => (
                      <option key={o.id} value={o.id}>{o.displayCode || o.id} ({o.customerName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="adm-label--block">Phiếu nhập liên quan</label>
                  <select
                    value={importReceiptId}
                    onChange={(e) => setImportReceiptId(e.target.value)}
                    className="adm-field"
                  >
                    <option value="">Không có</option>
                    {app.importReceipts.map((r) => (
                      <option key={r.id} value={r.id}>{r.id} ({r.supplierName})</option>
                    ))}
                  </select>
                </div>
              </div>

              {realApi && orderId && (
                <div className="adm-card--cream text-[0.78rem] p-2.5">
                  {orderLookupLoading ? (
                    <span className="text-[#6B7280]">Đang kiểm tra biên bản đối soát &amp; phụ phí của đơn...</span>
                  ) : orderDoiSoat ? (
                    <div className="flex flex-col gap-2">
                      <div>
                        Biên bản đối soát gốc: <strong className="text-[#1B3F2F]">#{orderDoiSoat.maDoiSoat}</strong> ({orderDoiSoat.trangThai})
                      </div>
                      {orderSurchargeIds.length > 0 && (
                        <div>
                          <label className="adm-label--xs">
                            Phụ phí gốc cần lập dòng điều chỉnh kèm (tùy chọn):
                          </label>
                          <select
                            value={selectedSurchargeId}
                            onChange={(e) => setSelectedSurchargeId(e.target.value)}
                            className="adm-field adm-field--sm"
                          >
                            <option value="">Chỉ lập điều chỉnh trên biên bản đối soát</option>
                            {orderSurchargeIds.map((p) => (
                              <option key={p.id} value={String(p.id)}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#B91C1C]">{orderLookupError || "Đơn chưa có biên bản đối soát."}</span>
                  )}
                </div>
              )}

              <div>
                <label className="adm-label--block">Số tiền điều chỉnh (VNĐ)</label>
                <input
                  required
                  type="number"
                  min="1000"
                  step="5000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="adm-field"
                />
              </div>

              <div>
                <label className="adm-label--block">Lý do điều chỉnh</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ghi rõ nguyên nhân sai lệch hoặc thỏa thuận bồi thường..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="adm-field"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" disabled={submitBusy} onClick={() => setShowModal(false)} className="btn btn-secondary btn-md adm-btn-flex">Hủy</button>
                <button type="submit" disabled={submitBusy} className="btn btn-primary btn-md adm-btn-flex">
                  {submitBusy ? "Đang lưu..." : "Lưu chứng từ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

