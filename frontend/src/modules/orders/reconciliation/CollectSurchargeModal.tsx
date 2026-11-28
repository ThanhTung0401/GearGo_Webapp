import { useState } from "react";
import { useApp } from "../../../App";
import { paymentApi, reconciliationApi, type DoiSoatBackend, type YeuCauThuBackend } from "../../../services/api";
import { fmt, type Order } from "../../../store";

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
  const [cashOutcome, setCashOutcome] = useState<"success" | "fail">("success");
  const showCollectModal = true;
  const setShowCollectModal = (open: boolean) => { if (!open) onClose(); };
  // Điều kiện vô hiệu hóa nút xác nhận thu bổ sung
  const isSubmitDisabled = (collectMethod === "cash" && cashOutcome === "success" && cashTendered < extraAmount) || reconBusy;
  return (
    <>
      {showCollectModal && (
        <div role="dialog" aria-modal="true" className="recon-modal-backdrop">
          <div className="recon-modal-card">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="recon-modal-badge-danger">
                  EP5.4-THU → GỌI UC5.5
                </span>
                <h3 className="recon-modal-title">
                  Thu Tiền Bổ Sung: Đơn {order.id}
                </h3>
              </div>
              <button type="button" onClick={() => setShowCollectModal(false)} className="recon-modal-close-icon">✕</button>
            </div>

            <div className="recon-modal-summary">
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span className="recon-modal-summary-label">Số tiền cần thu thêm:</span>
                <strong className="recon-modal-amount-danger">{fmt(extraAmount)}</strong>
              </div>
              <div className="recon-modal-subtext">
                Khách hàng: <strong>{order.customerName}</strong> ({order.customerPhone})
              </div>
            </div>

            {/* Chọn kênh thu tiền */}
            <div className="recon-field-group">
              <label className="recon-field-label-bold">Phương thức thanh toán:</label>
              <div className="grid grid-cols-3 gap-2 recon-method-grid-3">
                {[
                  { key: "cash", label: "💵 Tiền mặt" },
                  { key: "pos", label: "💳 Thẻ POS" },
                  { key: "qr", label: "🏦 VNPay Sandbox" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setCollectMethod(m.key as typeof collectMethod)}
                    className={`recon-method-btn ${collectMethod === m.key ? "is-active" : ""}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {collectMethod === "cash" && (
              <div className="recon-method-panel">
                <label className="recon-field-label-sm">Số tiền khách đưa (đ):</label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(Number(e.target.value))}
                  className="recon-input-cash"
                />
                <div className="flex justify-between text-xs pt-1 border-t border-gray-200 gap-2 flex-wrap">
                  <span className="recon-text-muted">Tiền thối lại cho khách:</span>
                  <strong className={`recon-change-val ${cashTendered >= extraAmount ? "is-enough" : ""}`}>
                    {cashTendered >= extraAmount ? fmt(cashTendered - extraAmount) : "Chưa đủ tiền (Dòng 5.2)"}
                  </strong>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-1.5">Kết quả thu tiền mặt:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCashOutcome("success")}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-bold border cursor-pointer ${
                        cashOutcome === "success"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-gray-700 border-gray-300"
                      }`}
                    >
                      ✓ Thành công
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashOutcome("fail")}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-bold border cursor-pointer ${
                        cashOutcome === "fail"
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-gray-700 border-gray-300"
                      }`}
                    >
                      ✕ Thất bại (Fail)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {collectMethod === "pos" && (
              <div className="recon-method-panel">
                <div className="grid grid-cols-2 gap-2 mb-2 recon-pos-grid">
                  <div>
                    <label className="recon-field-label-xs">Mã máy POS:</label>
                    <input
                      value={posTerminalCode}
                      onChange={(e) => setPosTerminalCode(e.target.value)}
                      className="recon-input-sm"
                    />
                  </div>
                  <div>
                    <label className="recon-field-label-xs">Mã chuẩn chi (Auth Code):</label>
                    <input
                      value={posAuthCode}
                      onChange={(e) => setPosAuthCode(e.target.value)}
                      className="recon-input-sm"
                    />
                  </div>
                </div>
                <div className="recon-pos-status">✓ Đã kết nối POS tại quầy tiếp tân</div>
              </div>
            )}

            {collectMethod === "qr" && (
              <div className="recon-method-panel is-qr">
                <div className="recon-qr-box">
                  🏦
                </div>
                <div className="recon-qr-title">Cổng thanh toán VNPay Sandbox (v2.1.0)</div>
                <div className="recon-qr-code">Chuyển hướng sang sandbox.vnpayment.vn · Thẻ test NCB: 9704198526191432198 (OTP: 123456)</div>
              </div>
            )}

            <div className="recon-field-group-lg">
              <label className="recon-field-label-sm">Ghi chú chứng từ thu:</label>
              <input
                placeholder="Ví dụ: Khách thanh toán phụ phí hỏng thiết bị tại quầy..."
                value={collectNote}
                onChange={(e) => setCollectNote(e.target.value)}
                className="recon-input-note"
              />
            </div>

            {pendingCollectReq && (
              <div className="recon-pending-req-box">
                <div className="flex justify-between items-center mb-1 gap-2 flex-wrap">
                  <strong>Mã yêu cầu thu bổ sung: {pendingCollectReq.maYeuCau}</strong>
                  <span className={`recon-req-status ${pendingCollectReq.trangThai === "ThanhCong" ? "is-success" : ""}`}>
                    {pendingCollectReq.trangThai}
                  </span>
                </div>
                {pendingCollectReq.paymentUrl && (
                  <div className="recon-vnpay-wrap">
                    <a href={pendingCollectReq.paymentUrl} target="_blank" rel="noreferrer" className="recon-vnpay-link">
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
                    className="recon-btn-check-tx"
                  >
                    Kiểm tra trạng thái GD
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 flex-wrap">
              <button type="button" onClick={() => setShowCollectModal(false)} className="recon-modal-btn-cancel">
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmitDisabled}
                onClick={async () => {
                  if (collectMethod === "cash" && cashOutcome === "fail") {
                    setReconError("Thanh toán tiền mặt thất bại — giao dịch chưa được ghi nhận, bảng đối soát giữ nguyên chưa chốt.");
                    return;
                  }
                  const methodStr = collectMethod === "cash" ? "Tiền mặt tại quầy" : collectMethod === "pos" ? `Thẻ POS (${posTerminalCode}/${posAuthCode})` : "Quét VietQR";
                  if (app.realApi) {
                    setReconBusy(true);
                    setReconError(null);
                    try {
                      let ds = await ensureConfirmedDoiSoat();
                      if (ds.trangThai === "ChoChot" || ds.trangThai === "DaXacNhan") {
                        ds = await reconciliationApi.yeuCauXuLyTien(ds.maDoiSoat);
                      }
                      if (collectMethod === "qr") {
                        // Luồng VNPay Sandbox thật: tạo URL thanh toán có chữ ký HMAC-SHA512 và chuyển hướng
                        const vnpRes = await paymentApi.taoVnPayUrl({
                          maDoiSoat: ds.maDoiSoat,
                          frontendReturnBaseUrl: window.location.origin,
                        });
                        if (!vnpRes.paymentUrl) throw new Error("Không tạo được URL VNPay Sandbox.");
                        window.location.href = vnpRes.paymentUrl;
                        return;
                      }
                      const reqThu = await paymentApi.taoThuBoSung(
                        ds.maDoiSoat,
                        collectMethod === "cash" ? "TienMat" : "POS"
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
                className={`recon-modal-btn-submit ${isSubmitDisabled ? "is-disabled" : ""}`}
              >
                {reconBusy
                  ? "Đang xử lý..."
                  : collectMethod === "qr"
                  ? "🏦 Thanh toán qua VNPay Sandbox →"
                  : "✓ Xác nhận thu bổ sung → Khóa & Hoàn tất"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

