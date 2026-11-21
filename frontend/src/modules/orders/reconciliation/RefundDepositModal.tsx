import { useApp } from "../../../App";
import { reconciliationApi, refundApi, type DoiSoatBackend } from "../../../services/api";
import { fmt, type Order } from "../../../store";

interface Props {
  order: Order;
  app: ReturnType<typeof useApp>;
  donId: number;
  refundAmount: number;
  refundMethod: "bank" | "cash";
  setRefundMethod: (v: "bank" | "cash") => void;
  bankName: string;
  setBankName: (v: string) => void;
  bankAccount: string;
  setBankAccount: (v: string) => void;
  bankHolder: string;
  setBankHolder: (v: string) => void;
  refundNote: string;
  setRefundNote: (v: string) => void;
  ensureConfirmedDoiSoat: () => Promise<DoiSoatBackend>;
  syncAfterMutation: () => Promise<void>;
  reconBusy: boolean;
  setReconBusy: (v: boolean) => void;
  setReconError: (v: string | null) => void;
  setReconSuccess: (v: string | null) => void;
  onClose: () => void;
}

export function RefundDepositModal(props: Props) {
  const {
    order, app, donId, refundAmount, refundMethod, setRefundMethod,
    bankName, setBankName, bankAccount, setBankAccount, bankHolder, setBankHolder,
    refundNote, setRefundNote, ensureConfirmedDoiSoat, syncAfterMutation, reconBusy, setReconBusy,
    setReconError, setReconSuccess, onClose,
  } = props;
  const showRefundModal = true;
  const setShowRefundModal = (open: boolean) => { if (!open) onClose(); };
  return (
    <>
      {/* ─── MODAL UC5.6: HOÀN TIỀN CỌC (NGÂN HÀNG / TIỀN MẶT) ───────────────── */}
      {showRefundModal && (
        <div role="dialog" aria-modal="true" className="recon-modal-backdrop">
          <div className="recon-modal-card">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="recon-modal-badge-success">
                  EP5.4-HOAN → GỌI UC5.6
                </span>
                <h3 className="recon-modal-title">
                  Lập Lệnh Hoàn Tiền Cọc: Đơn {order.id}
                </h3>
              </div>
              <button type="button" onClick={() => setShowRefundModal(false)} className="recon-modal-close-icon">✕</button>
            </div>

            <div className="recon-modal-summary">
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span className="recon-modal-summary-label">Số tiền hoàn cọc cho khách:</span>
                <strong className="recon-modal-amount-forest">{fmt(refundAmount)}</strong>
              </div>
              <div className="recon-modal-subtext">
                Khách thụ hưởng: <strong>{order.customerName}</strong> ({order.customerPhone})
              </div>
            </div>

            {/* Kênh hoàn tiền */}
            <div className="recon-field-group">
              <label className="recon-field-label-bold">Kênh hoàn tiền:</label>
              <div className="grid grid-cols-2 gap-2 recon-method-grid-2">
                {[
                  { key: "bank", label: "🏦 Chuyển khoản ngân hàng" },
                  { key: "cash", label: "💵 Tiền mặt tại quầy" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setRefundMethod(m.key as typeof refundMethod)}
                    className={`recon-method-btn ${refundMethod === m.key ? "is-active" : ""}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {refundMethod === "bank" && (
              <div className="recon-method-panel">
                <div className="recon-bank-field">
                  <label className="recon-field-label-xs-mb">Ngân hàng thụ hưởng:</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="recon-select-bank"
                  >
                    {["Vietcombank", "MB Bank", "Techcombank", "ACB", "VPBank", "Vietinbank", "BIDV"].map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 recon-bank-grid">
                  <div>
                    <label className="recon-field-label-xs-mb">Số tài khoản:</label>
                    <input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="recon-input-bank-acc"
                    />
                  </div>
                  <div>
                    <label className="recon-field-label-xs-mb">Tên chủ tài khoản:</label>
                    <input
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      className="recon-input-bank-holder"
                    />
                  </div>
                </div>
              </div>
            )}

            {refundMethod === "cash" && (
              <div className="recon-method-panel is-cash-note">
                Khách hàng nhận <strong>{fmt(refundAmount)}</strong> tiền mặt tại quầy và ký vào Phiếu chi hoàn cọc.
              </div>
            )}

            <div className="recon-field-group-lg">
              <label className="recon-field-label-sm">Ghi chú hoàn cọc:</label>
              <input
                placeholder="Ví dụ: Hoàn cọc đơn thuê sau khi đối soát đầy đủ..."
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                className="recon-input-note"
              />
            </div>

            <div className="flex justify-end gap-2 flex-wrap">
              <button type="button" onClick={() => setShowRefundModal(false)} className="recon-modal-btn-cancel">
                Hủy
              </button>
              <button
                type="button"
                disabled={reconBusy}
                onClick={async () => {
                  const methodStr = refundMethod === "bank" ? `Chuyển khoản ${bankName} (${bankAccount} - ${bankHolder})` : "Tiền mặt tại quầy";
                  if (app.realApi) {
                    setReconBusy(true);
                    setReconError(null);
                    try {
                      let ds = await ensureConfirmedDoiSoat();
                      if (ds.trangThai === "ChoChot" || ds.trangThai === "DaXacNhan") {
                        ds = await reconciliationApi.yeuCauXuLyTien(ds.maDoiSoat);
                      }
                      const hoanData = await refundApi.layTheoDon(donId);
                      for (const ht of hoanData.items.filter((x) => x.trangThai !== "ThanhCong")) {
                        await refundApi.xuLyHoan(ht.maHoanTien, refundNote || methodStr);
                      }
                      // Thử chốt đối soát nếu toàn bộ nghĩa vụ hoàn tiền đã thành công
                      try {
                        await reconciliationApi.chotDoiSoat(ds.maDoiSoat);
                        setReconSuccess(`Đã hoàn cọc ${fmt(refundAmount)} và khóa đối soát đơn ${order.displayCode || order.id}.`);
                      } catch {
                        setReconSuccess(`Đã gửi lệnh xử lý hoàn tiền cọc ${fmt(refundAmount)}. Kiểm tra trạng thái lệnh hoàn ở bảng trên để chốt đối soát.`);
                      }
                      setShowRefundModal(false);
                      await syncAfterMutation();
                    } catch (err) {
                      setReconError(err instanceof Error ? err.message : "Không thể thực hiện lệnh hoàn tiền cọc.");
                    } finally {
                      setReconBusy(false);
                    }
                    return;
                  }

                  app.settleOrder(order.id, true, {
                    method: methodStr,
                    amount: refundAmount,
                    note: refundNote || `Hoàn cọc đơn thuê ${order.id} qua ${methodStr}`,
                  });
                  setShowRefundModal(false);
                }}
                className={`recon-modal-btn-submit ${reconBusy ? "is-disabled" : ""}`}
              >
                {reconBusy ? "Đang xử lý..." : "✓ Xác nhận hoàn cọc → Khóa & Hoàn tất"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

