import { useApp } from "../../App";
import { reconciliationApi, refundApi, type DoiSoatBackend } from "../../services/api";
import { fmt, type Order } from "../../store";

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
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 520, width: "100%", padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  EP5.4-HOAN → GỌI UC5.6
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Lập Lệnh Hoàn Tiền Cọc: Đơn {order.id}
                </h3>
              </div>
              <button type="button" onClick={() => setShowRefundModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, marginBottom: 16, border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: "0.85rem", color: "#4B5563" }}>Số tiền hoàn cọc cho khách:</span>
                <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", color: "var(--color-forest)" }}>{fmt(refundAmount)}</strong>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 4 }}>
                Khách thụ hưởng: <strong>{order.customerName}</strong> ({order.customerPhone})
              </div>
            </div>

            {/* Kênh hoàn tiền */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 6 }}>Kênh hoàn tiền:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "bank", label: "🏦 Chuyển khoản ngân hàng" },
                  { key: "cash", label: "💵 Tiền mặt tại quầy" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setRefundMethod(m.key as typeof refundMethod)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: 8,
                      border: refundMethod === m.key ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
                      background: refundMethod === m.key ? "#F0FDF4" : "white",
                      fontWeight: refundMethod === m.key ? 700 : 500,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {refundMethod === "bank" && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, border: "1px solid var(--color-bone)", marginBottom: 14 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: "0.75rem", color: "#6B7280", display: "block", marginBottom: 2 }}>Ngân hàng thụ hưởng:</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem", background: "white" }}
                  >
                    {["Vietcombank", "MB Bank", "Techcombank", "ACB", "VPBank", "Vietinbank", "BIDV"].map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6B7280", display: "block", marginBottom: 2 }}>Số tài khoản:</label>
                    <input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6B7280", display: "block", marginBottom: 2 }}>Tên chủ tài khoản:</label>
                    <input
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.85rem", textTransform: "uppercase" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {refundMethod === "cash" && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, border: "1px solid var(--color-bone)", marginBottom: 14, fontSize: "0.8rem", color: "#4B5563" }}>
                Khách hàng nhận <strong>{fmt(refundAmount)}</strong> tiền mặt tại quầy và ký vào Phiếu chi hoàn cọc.
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Ghi chú hoàn cọc:</label>
              <input
                placeholder="Ví dụ: Hoàn cọc đơn thuê sau khi đối soát đầy đủ..."
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowRefundModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>
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
                      if (ds.trangThai === "DaXacNhan") {
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
                style={{
                  background: reconBusy ? "#9CA3AF" : "var(--color-forest)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: reconBusy ? "not-allowed" : "pointer",
                }}
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

