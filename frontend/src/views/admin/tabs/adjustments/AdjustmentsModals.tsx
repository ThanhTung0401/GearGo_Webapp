import Icon from "../../../../components/Icon";
import { fmt, type FinancialAdjustment, type ImportReceipt, type Order } from "../../../../store";
import { type GiaoDichCanDoiChieuBackend } from "../../../../services/api/paymentApi";
import { type DoiSoatBackend } from "../../../../services/api/reconciliationApi";
import { type ReconcileOutcome } from "./useAdjustmentsTab";

interface AdjustmentsModalsProps {
  realApi: boolean;
  orders: Order[];
  importReceipts: ImportReceipt[];
  reconcileTarget: GiaoDichCanDoiChieuBackend | null;
  setReconcileTarget: (v: GiaoDichCanDoiChieuBackend | null) => void;
  reconcileOutcome: ReconcileOutcome;
  setReconcileOutcome: (v: ReconcileOutcome) => void;
  reconcileNote: string;
  setReconcileNote: (v: string) => void;
  reconcileRefundAmount: number;
  setReconcileRefundAmount: (v: number) => void;
  reconcileBusy: boolean;
  reconcileModalError: string;
  onConfirmReconcilePayment: (e: React.FormEvent) => void;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  type: FinancialAdjustment["type"];
  setType: (v: FinancialAdjustment["type"]) => void;
  amount: number;
  setAmount: (v: number) => void;
  orderId: string;
  setOrderId: (v: string) => void;
  importReceiptId: string;
  setImportReceiptId: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  orderDoiSoat: DoiSoatBackend | null;
  orderSurchargeIds: Array<{ id: number; label: string }>;
  selectedSurchargeId: string;
  setSelectedSurchargeId: (v: string) => void;
  orderLookupLoading: boolean;
  orderLookupError: string;
  modalError: string;
  submitBusy: boolean;
  onSubmitAdjustment: (e: React.FormEvent) => void;
}

/**
 * Hai modal nghiệp vụ của tab Điều chỉnh tài chính:
 * 1. Đối chiếu giao dịch thanh toán ngoại lệ.
 * 2. Lập chứng từ điều chỉnh bù trừ sau chốt đối soát (UC5.7).
 */
export function AdjustmentsModals(props: AdjustmentsModalsProps) {
  const {
    realApi,
    orders,
    importReceipts,
    reconcileTarget,
    setReconcileTarget,
    reconcileOutcome,
    setReconcileOutcome,
    reconcileNote,
    setReconcileNote,
    reconcileRefundAmount,
    setReconcileRefundAmount,
    reconcileBusy,
    reconcileModalError,
    onConfirmReconcilePayment,
    showModal,
    setShowModal,
    type,
    setType,
    amount,
    setAmount,
    orderId,
    setOrderId,
    importReceiptId,
    setImportReceiptId,
    reason,
    setReason,
    orderDoiSoat,
    orderSurchargeIds,
    selectedSurchargeId,
    setSelectedSurchargeId,
    orderLookupLoading,
    orderLookupError,
    modalError,
    submitBusy,
    onSubmitAdjustment,
  } = props;

  return (
    <>
      {/* Modal Đối chiếu giao dịch ngoại lệ */}
      {reconcileTarget && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-md">
            <div className="modal-header">
              <h3 className="modal-title">Đối chiếu giao dịch {reconcileTarget.maYeuCau}</h3>
              <button type="button" onClick={() => setReconcileTarget(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={onConfirmReconcilePayment} className="modal-body flex flex-col gap-3">
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
                  onChange={(e) => setReconcileOutcome(e.target.value as ReconcileOutcome)}
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
            <form onSubmit={onSubmitAdjustment} className="modal-body flex flex-col gap-4">
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
                  onChange={(e) => setType(e.target.value as FinancialAdjustment["type"])}
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
                    {orders.map((o) => (
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
                    {importReceipts.map((r) => (
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
    </>
  );
}
