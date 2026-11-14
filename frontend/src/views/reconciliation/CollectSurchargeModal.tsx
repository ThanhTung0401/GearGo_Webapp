import { useApp } from "../../App";
import { paymentApi, reconciliationApi, type DoiSoatBackend, type YeuCauThuBackend } from "../../services/api";
import { fmt, type Order } from "../../store";

interface Props {
  order: Order;
  app: ReturnType<typeof useApp>;
  donId: number;
  extraAmount: number;
  collectMethod: "cash" | "pos" | "qr";
  setCollectMethod: (v: "cash" | "pos" | "qr") => void;
  cashTendered: number;
  setCashTendered: (v: number) => void;
  posTerminalCode: string;
  setPosTerminalCode: (v: string) => void;
  posAuthCode: string;
  setPosAuthCode: (v: string) => void;
  collectNote: string;
  setCollectNote: (v: string) => void;
  pendingCollectReq: YeuCauThuBackend | null;
  setPendingCollectReq: (v: YeuCauThuBackend | null) => void;
  doiSoatBackend: DoiSoatBackend | null;
  ensureConfirmedDoiSoat: () => Promise<DoiSoatBackend>;
  syncAfterMutation: () => Promise<void>;
  reconBusy: boolean;
  setReconBusy: (v: boolean) => void;
  setReconError: (v: string | null) => void;
  setReconSuccess: (v: string | null) => void;
  onClose: () => void;
}

export function CollectSurchargeModal(props: Props) {
  const {
    order, app, donId, extraAmount, collectMethod, setCollectMethod,
    cashTendered, setCashTendered, posTerminalCode, setPosTerminalCode,
    posAuthCode, setPosAuthCode, collectNote, setCollectNote,
    pendingCollectReq, setPendingCollectReq, doiSoatBackend, ensureConfirmedDoiSoat,
    syncAfterMutation, reconBusy, setReconBusy,
    setReconError, setReconSuccess, onClose,
  } = props;
  const showCollectModal = true;
  const setShowCollectModal = (open: boolean) => { if (!open) onClose(); };
  return (
    <>
      {showCollectModal && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 520, width: "100%", padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  EP5.4-THU → GỌI UC5.5
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Thu Tiền Bổ Sung: Đơn {order.id}
                </h3>
              </div>
              <button type="button" onClick={() => setShowCollectModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, marginBottom: 16, border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: "0.85rem", color: "#4B5563" }}>Số tiền cần thu thêm:</span>
                <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", color: "#DC2626" }}>{fmt(extraAmount)}</strong>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 4 }}>
                Khách hàng: <strong>{order.customerName}</strong> ({order.customerPhone})
              </div>
            </div>

            {/* Chọn kênh thu tiền */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 6 }}>Phương thức thanh toán:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "cash", label: "💵 Tiền mặt" },
                  { key: "pos", label: "💳 Thẻ POS" },
                  { key: "qr", label: "📱 VietQR" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setCollectMethod(m.key as typeof collectMethod)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: 8,
                      border: collectMethod === m.key ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
                      background: collectMethod === m.key ? "#F0FDF4" : "white",
                      fontWeight: collectMethod === m.key ? 700 : 500,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {collectMethod === "cash" && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, border: "1px solid var(--color-bone)", marginBottom: 14 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Số tiền khách đưa (đ):</label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 700, marginBottom: 8 }}
                />
                <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
                  <span style={{ color: "#6B7280" }}>Tiền thối lại cho khách:</span>
                  <strong style={{ fontFamily: "var(--font-mono)", color: cashTendered >= extraAmount ? "var(--color-forest)" : "#DC2626" }}>
                    {cashTendered >= extraAmount ? fmt(cashTendered - extraAmount) : "Chưa đủ tiền (Dòng 5.2)"}
                  </strong>
                </div>
              </div>
            )}

            {collectMethod === "pos" && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, border: "1px solid var(--color-bone)", marginBottom: 14 }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6B7280", display: "block" }}>Mã máy POS:</label>
                    <input
                      value={posTerminalCode}
                      onChange={(e) => setPosTerminalCode(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6B7280", display: "block" }}>Mã chuẩn chi (Auth Code):</label>
                    <input
                      value={posAuthCode}
                      onChange={(e) => setPosAuthCode(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#15803D" }}>✓ Đã kết nối POS tại quầy tiếp tân</div>
              </div>
            )}

            {collectMethod === "qr" && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 14, border: "1px solid var(--color-bone)", marginBottom: 14, textAlign: "center" }}>
                <div style={{ width: 110, height: 110, margin: "0 auto 8px", background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, display: "grid", placeItems: "center", fontSize: "2rem" }}>
                  📱
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-bark)" }}>Quét mã VietQR chuyển khoản nhanh</div>
                <div style={{ fontSize: "0.72rem", color: "#6B7280", fontFamily: "var(--font-mono)" }}>Nội dung: GG {order.id} THUTHEM</div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Ghi chú chứng từ thu:</label>
              <input
                placeholder="Ví dụ: Khách thanh toán phụ phí hỏng thiết bị tại quầy..."
                value={collectNote}
                onChange={(e) => setCollectNote(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
              />
            </div>

            {pendingCollectReq && (
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: "0.8rem" }}>
                <div className="flex justify-between items-center mb-1">
                  <strong>Mã yêu cầu thu bổ sung: {pendingCollectReq.maYeuCau}</strong>
                  <span style={{ fontWeight: 700, color: pendingCollectReq.trangThai === "ThanhCong" ? "#15803D" : "#B45309" }}>
                    {pendingCollectReq.trangThai}
                  </span>
                </div>
                {pendingCollectReq.paymentUrl && (
                  <div style={{ marginTop: 6 }}>
                    <a href={pendingCollectReq.paymentUrl} target="_blank" rel="noreferrer" style={{ color: "#1D4ED8", textDecoration: "underline", fontWeight: 600 }}>
                      Mở cổng thanh toán VNPAY →
                    </a>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    disabled={reconBusy}
                    onClick={async () => {
                      setReconBusy(true);
                      setReconError(null);
                      try {
                        const updated = await paymentApi.layTrangThaiGiaoDich(pendingCollectReq.maYeuCau);
                        setPendingCollectReq(updated);
                        if (updated.trangThai === "ThanhCong" && doiSoatBackend) {
                          await reconciliationApi.chotDoiSoat(doiSoatBackend.maDoiSoat);
                          setReconSuccess("Giao dịch thu bổ sung thành công và đã chốt đối soát.");
                          setShowCollectModal(false);
                          await syncAfterMutation();
                        }
                      } catch (err) {
                        setReconError(err instanceof Error ? err.message : "Không kiểm tra được trạng thái giao dịch.");
                      } finally {
                        setReconBusy(false);
                      }
                    }}
                    style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Kiểm tra trạng thái GD
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCollectModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>
                Hủy
              </button>
              <button
                type="button"
                disabled={(collectMethod === "cash" && cashTendered < extraAmount) || reconBusy}
                onClick={async () => {
                  const methodStr = collectMethod === "cash" ? "Tiền mặt tại quầy" : collectMethod === "pos" ? `Thẻ POS (${posTerminalCode}/${posAuthCode})` : "Quét VietQR";
                  if (app.realApi) {
                    setReconBusy(true);
                    setReconError(null);
                    try {
                      let ds = await ensureConfirmedDoiSoat();
                      if (ds.trangThai === "DaXacNhan") {
                        ds = await reconciliationApi.yeuCauXuLyTien(ds.maDoiSoat);
                      }
                      const reqThu = await paymentApi.taoThuBoSung(
                        ds.maDoiSoat,
                        collectMethod === "cash" ? "TienMat" : collectMethod === "qr" ? "VietQR" : "VNPAY"
                      );
                      setPendingCollectReq(reqThu);
                      if (reqThu.trangThai === "ThanhCong") {
                        await reconciliationApi.chotDoiSoat(ds.maDoiSoat);
                        setReconSuccess(`Đã thu bổ sung ${fmt(extraAmount)} và chốt đối soát đơn ${order.displayCode || order.id}.`);
                        setShowCollectModal(false);
                        await syncAfterMutation();
                      } else {
                        setReconSuccess(`Đã tạo yêu cầu thu bổ sung ${reqThu.maYeuCau} (${reqThu.trangThai}).`);
                        await syncAfterMutation();
                      }
                    } catch (err) {
                      setReconError(err instanceof Error ? err.message : "Không thể lập yêu cầu thu bổ sung.");
                    } finally {
                      setReconBusy(false);
                    }
                    return;
                  }

                  app.settleOrder(order.id, true, {
                    method: methodStr,
                    amount: extraAmount,
                    note: collectNote || `Thu thêm tại quầy qua ${methodStr}`,
                  });
                  setShowCollectModal(false);
                }}
                style={{
                  background: (collectMethod === "cash" && cashTendered < extraAmount) || reconBusy ? "#9CA3AF" : "var(--color-forest)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: (collectMethod === "cash" && cashTendered < extraAmount) || reconBusy ? "not-allowed" : "pointer",
                }}
              >
                {reconBusy ? "Đang xử lý..." : "✓ Xác nhận thu bổ sung → Khóa & Hoàn tất"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

