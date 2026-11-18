import { useApp } from "../../App";
import { reconciliationApi, surchargeApi, type DoiSoatBackend } from "../../services/api";
import { fmt, type Order, type Surcharge } from "../../store";

interface Props {
  order: Order;
  app: ReturnType<typeof useApp>;
  userRole: "staff" | "admin";
  depositCollected: number;
  totalApprovedSurcharges: number;
  approvedSurcharges: Surcharge[];
  doiSoatBackend: DoiSoatBackend | null;
  syncAfterMutation: () => Promise<void>;
  setReconBusy: (v: boolean) => void;
  setReconError: (v: string | null) => void;
  adjType: "Thu bù" | "Hoàn trả" | "Bù trừ chiết khấu";
  setAdjType: (v: "Thu bù" | "Hoàn trả" | "Bù trừ chiết khấu") => void;
  adjAmount: number;
  setAdjAmount: (v: number) => void;
  adjReason: string;
  setAdjReason: (v: string) => void;
  adjMessage: string;
  setAdjMessage: (v: string) => void;
  adjSurchargeId: string;
  setAdjSurchargeId: (v: string) => void;
  onClose: () => void;
}

export function FinancialAdjustmentModal(props: Props) {
  const {
    order, app, userRole, depositCollected, totalApprovedSurcharges, approvedSurcharges,
    doiSoatBackend, syncAfterMutation, setReconBusy, setReconError,
    adjType, setAdjType, adjAmount, setAdjAmount,
    adjReason, setAdjReason, adjMessage, setAdjMessage,
    adjSurchargeId, setAdjSurchargeId, onClose,
  } = props;
  const showAdjustmentModal = true;
  const setShowAdjustmentModal = (open: boolean) => { if (!open) onClose(); };
  return (
    <>
      {/* ─── MODAL UC5.7: ĐIỀU CHỈNH TÀI CHÍNH SAU CHỐT ────────────────────────── */}
      {showAdjustmentModal && (
        <div role="dialog" aria-modal="true" className="modal-overlay recon-adj-overlay">
          <div className="modal-container recon-adj-container">
            <div className="modal-header flex justify-between items-center mb-4 pb-3 border-b border-bone">
              <div>
                <span className="recon-modal-badge-warning">
                  UC5.7: ĐIỀU CHỈNH TÀI CHÍNH SAU CHỐT
                </span>
                <h3 className="modal-title font-bold text-base text-bark mt-1">
                  Lập hồ sơ sửa sai tài chính cho Đơn {order.id}
                </h3>
              </div>
              <button onClick={() => setShowAdjustmentModal(false)} className="btn btn-ghost btn-sm text-lg recon-modal-close-icon">×</button>
            </div>

            <div className="recon-adj-summary">
              <div className="grid grid-cols-2 gap-2 mb-2 recon-adj-grid">
                <div>Chứng từ gốc: <strong>{order.id} (Đã khóa)</strong></div>
                <div>Khách hàng: <strong>{order.customerName}</strong></div>
                <div>Cọc ban đầu: <strong>{fmt(depositCollected)}</strong></div>
                <div>Phụ phí đã chốt: <strong>{fmt(totalApprovedSurcharges)}</strong></div>
              </div>
              <div className="recon-adj-immutable-note">
                💡 <em>Quy tắc bất biến: Hệ thống tạo chứng từ điều chỉnh bù trừ mới, KHÔNG ghi đè hoặc xóa số liệu đối soát gốc.</em>
              </div>
            </div>

            {adjMessage ? (
              <div className="recon-adj-success-box">
                <div className="recon-adj-success-icon">✓</div>
                <strong className="recon-adj-success-msg">{adjMessage}</strong>
                <div className="recon-adj-success-actions">
                  <button
                    type="button"
                    onClick={() => setShowAdjustmentModal(false)}
                    className="btn btn-primary btn-sm"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!adjReason.trim() || adjAmount <= 0) return;
                  if (app.realApi) {
                    setReconBusy(true);
                    setReconError(null);
                    try {
                      let createdAdjSurchargeId: number | undefined;
                      if (adjSurchargeId) {
                        const origId = Number(adjSurchargeId);
                        if (Number.isFinite(origId)) {
                          const signedAmount =
                            adjType === "Hoàn trả" || adjType === "Bù trừ chiết khấu"
                              ? -Math.abs(adjAmount)
                              : Math.abs(adjAmount);
                          const resFee = await surchargeApi.lapDieuChinhPhi(origId, {
                            soTienDieuChinhCoDau: signedAmount,
                            lyDo: adjReason.trim(),
                          });
                          createdAdjSurchargeId = resFee.maPhuPhi;
                        }
                      }
                      if (doiSoatBackend?.maDoiSoat) {
                        await reconciliationApi.lapDieuChinh(doiSoatBackend.maDoiSoat, {
                          lyDoDieuChinh: adjReason.trim(),
                          danhSachMaPhuPhiDieuChinh: createdAdjSurchargeId ? [createdAdjSurchargeId] : undefined,
                          ghiChu: `${adjType}: ${fmt(adjAmount)}`,
                        });
                      }
                      setAdjMessage(
                        `Đã lập chứng từ điều chỉnh bù trừ ${fmt(adjAmount)} cho đơn ${order.displayCode || order.id} trên máy chủ.`
                      );
                      await syncAfterMutation();
                    } catch (err) {
                      setReconError(err instanceof Error ? err.message : "Không thể lập chứng từ điều chỉnh sau chốt.");
                    } finally {
                      setReconBusy(false);
                    }
                    return;
                  }

                  app.saveFinancialAdjustment({
                    orderId: order.id,
                    type: adjType,
                    amount: adjAmount,
                    reason: adjReason,
                    status: "Đã duyệt",
                    createdBy: "Quản trị viên",
                    approvedBy: "Quản trị viên",
                  });
                  setAdjMessage(`Đã lập thành công chứng từ điều chỉnh bù trừ ${fmt(adjAmount)} cho đơn ${order.displayCode || order.id}.`);
                }}
                className="flex flex-col gap-3"
              >
                {app.realApi && approvedSurcharges.some((s) => s.backendId) && (
                  <div>
                    <label className="recon-adj-label">
                      Phụ phí gốc cần điều chỉnh (tùy chọn):
                    </label>
                    <select
                      value={adjSurchargeId}
                      onChange={(e) => setAdjSurchargeId(e.target.value)}
                      className="form-select recon-adj-select"
                    >
                      <option value="">-- Lập đối soát điều chỉnh tổng hợp --</option>
                      {approvedSurcharges
                        .filter((s) => s.backendId)
                        .map((s) => (
                          <option key={s.id} value={String(s.backendId)}>
                            {s.type} ({fmt(s.amount)}) - {s.reason}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="recon-adj-label">
                    Nghiệp vụ điều chỉnh bù trừ:
                  </label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as typeof adjType)}
                    className="form-select recon-adj-select"
                  >
                    <option value="Hoàn trả">Hoàn trả thêm cho khách (Phát hiện trừ cọc thừa/đồ tìm thấy)</option>
                    <option value="Thu bù">Thu bù thêm tiền (Phát hiện hư hại phát sinh chưa tính đủ)</option>
                    <option value="Bù trừ chiết khấu">Bù trừ sai sót mã giảm giá/chính sách</option>
                  </select>
                </div>

                <div>
                  <label className="recon-adj-label">
                    Số tiền chênh lệch cần điều chỉnh (đ): *
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(Number(e.target.value))}
                    required
                    className="form-input recon-adj-input-amount"
                  />
                </div>

                <div>
                  <label className="recon-adj-label">
                    Lý do sai lệch & Căn cứ điều chỉnh: *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="Ví dụ: Khách tìm thấy cọc lều bị sót và đem gửi trả lại vào ngày hôm sau, cửa hàng hoàn lại 50.000đ tiền phụ phí đã trừ..."
                    className="form-textarea recon-adj-textarea"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-bone flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowAdjustmentModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm recon-adj-submit-btn"
                  >
                    Lưu chứng từ điều chỉnh (UC5.7)
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

