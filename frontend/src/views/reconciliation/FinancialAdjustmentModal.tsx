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
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10000, display: "grid", placeItems: "center", padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 540, width: "100%", padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <div className="modal-header flex justify-between items-center mb-4 pb-3 border-b border-bone">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#FEF3C7", color: "#B45309", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC5.7: ĐIỀU CHỈNH TÀI CHÍNH SAU CHỐT
                </span>
                <h3 className="modal-title font-bold text-base text-bark mt-1">
                  Lập hồ sơ sửa sai tài chính cho Đơn {order.id}
                </h3>
              </div>
              <button onClick={() => setShowAdjustmentModal(false)} className="btn btn-ghost btn-sm text-lg" style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: "0.8rem" }}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>Chứng từ gốc: <strong>{order.id} (Đã khóa)</strong></div>
                <div>Khách hàng: <strong>{order.customerName}</strong></div>
                <div>Cọc ban đầu: <strong>{fmt(depositCollected)}</strong></div>
                <div>Phụ phí đã chốt: <strong>{fmt(totalApprovedSurcharges)}</strong></div>
              </div>
              <div style={{ color: "#4B5563", fontSize: "0.75rem", borderTop: "1px dashed var(--color-bone)", paddingTop: 6 }}>
                💡 <em>Quy tắc bất biến: Hệ thống tạo chứng từ điều chỉnh bù trừ mới, KHÔNG ghi đè hoặc xóa số liệu đối soát gốc.</em>
              </div>
            </div>

            {adjMessage ? (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 16, textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: "1.4rem", color: "#16A34A", marginBottom: 6 }}>✓</div>
                <strong style={{ color: "#15803D", fontSize: "0.9rem" }}>{adjMessage}</strong>
                <div style={{ marginTop: 12 }}>
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
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                      Phụ phí gốc cần điều chỉnh (tùy chọn):
                    </label>
                    <select
                      value={adjSurchargeId}
                      onChange={(e) => setAdjSurchargeId(e.target.value)}
                      className="form-select"
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
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
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Nghiệp vụ điều chỉnh bù trừ:
                  </label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as typeof adjType)}
                    className="form-select"
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
                  >
                    <option value="Hoàn trả">Hoàn trả thêm cho khách (Phát hiện trừ cọc thừa/đồ tìm thấy)</option>
                    <option value="Thu bù">Thu bù thêm tiền (Phát hiện hư hại phát sinh chưa tính đủ)</option>
                    <option value="Bù trừ chiết khấu">Bù trừ sai sót mã giảm giá/chính sách</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Số tiền chênh lệch cần điều chỉnh (đ): *
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(Number(e.target.value))}
                    required
                    className="form-input"
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.85rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Lý do sai lệch & Căn cứ điều chỉnh: *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="Ví dụ: Khách tìm thấy cọc lều bị sót và đem gửi trả lại vào ngày hôm sau, cửa hàng hoàn lại 50.000đ tiền phụ phí đã trừ..."
                    className="form-textarea"
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.8rem" }}
                  />
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-bone">
                  <button
                    type="button"
                    onClick={() => setShowAdjustmentModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{ background: "#B45309", borderColor: "#B45309", color: "white", fontWeight: 700 }}
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

