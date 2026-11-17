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
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Điều chỉnh tài chính & Sai lệch phiếu nhập (UC5.7, UC7.10)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Đối chiếu giao dịch thanh toán ngoại lệ, lập chứng từ bù trừ sau đối soát đơn hoặc xử lý sai lệch nhập kho.
          </p>
        </div>
        <div className="flex gap-2">
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
        <div
          role="alert"
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="alert-circle" size={16} />
          <span>{payError}</span>
        </div>
      )}

      {paySuccess && (
        <div
          role="status"
          style={{
            background: "#DCFCE7",
            border: "1px solid #A7F3D0",
            color: "#15803D",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="check" size={16} />
          <span>{paySuccess}</span>
        </div>
      )}

      {/* Giao dịch thanh toán cần đối chiếu ngoại lệ (/api/v1/thanh-toan/can-doi-chieu) */}
      {realApi && (
        <div style={{ background: "#F8F6F0", borderRadius: 12, border: "1px solid #E2DDD1", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #E2DDD1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#11231B", margin: 0 }}>
                Giao dịch thanh toán cần đối chiếu ngoại lệ ({pendingPayments.length})
              </h3>
              <p style={{ fontSize: "0.75rem", color: "#6B7280", margin: "2px 0 0" }}>
                Xử lý các giao dịch lệch số tiền, trùng thanh toán hoặc cần hoàn tiền thừa qua cổng thanh toán.
              </p>
            </div>
          </div>
          <div className="responsive-table">
            <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
              <thead>
                <tr style={{ background: "#F1ECE2", fontSize: "0.78rem", fontWeight: 700, color: "#11231B" }}>
                  {["Mã GD", "Đơn thuê", "Phương thức", "Số tiền", "Lý do cần đối chiếu", "Trạng thái", "Thời điểm", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: "0.82rem" }}>
                      Đang tải danh sách giao dịch cần đối chiếu...
                    </td>
                  </tr>
                ) : pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 20, textAlign: "center", color: "#1B3F2F", fontSize: "0.82rem" }}>
                      Không có giao dịch thanh toán ngoại lệ nào đang chờ đối chiếu.
                    </td>
                  </tr>
                ) : (
                  pendingPayments.map((g, i) => (
                    <tr key={g.maThanhToan} style={{ borderTop: "1px solid #E2DDD1", background: i % 2 === 0 ? "white" : "#F8F6F0", fontSize: "0.8rem" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#1B3F2F" }}>
                        {g.maYeuCau}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)" }}>#{g.maDonThue}</td>
                      <td style={{ padding: "10px 12px" }}>{g.phuongThuc}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#B45309" }}>
                        {fmt(g.tongSoTien)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>{g.lyDoCanDoiChieu || "Chênh lệch đối soát cổng thanh toán"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: "#FEF3C7", color: "#92400E", padding: "2px 7px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                          {g.trangThaiDoiChieu || g.trangThai}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.74rem", color: "#6B7280" }}>
                        {new Date(g.thoiDiemTao).toLocaleString("vi-VN")}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setReconcileTarget(g);
                            setReconcileOutcome("HopLe_XacNhan");
                            setReconcileNote("");
                            setReconcileRefundAmount(Number(g.tongSoTien || 0));
                            setReconcileModalError("");
                          }}
                          style={{ background: "#E07A43", color: "white", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
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
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Số chứng từ", "Loại điều chỉnh", "Chứng từ liên quan", "Số tiền (đ)", "Lý do bù trừ", "Người lập / Duyệt", "Thời gian", "Trạng thái"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {app.financialAdjustments.map((a, i) => (
              <tr key={a.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 700, color: "var(--color-forest)" }}>
                  {a.id}
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", fontWeight: 600 }}>{a.type}</td>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                  {a.orderId || a.importReceiptId || "—"}
                </td>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "#B45309" }}>
                  {fmt(a.amount)}
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: "#374151" }}>{a.reason}</td>
                <td style={{ padding: "11px 14px", fontSize: "0.8rem" }}>
                  <div>{a.createdBy}</div>
                  <div style={{ fontSize: "0.7rem", color: "#15803D" }}>Duyệt: {a.approvedBy || "Hệ thống"}</div>
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.75rem", color: "#6B7280" }}>{a.createdAt}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span className="badge badge-success" style={{ fontSize: "0.72rem" }}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Đối chiếu giao dịch ngoại lệ */}
      {reconcileTarget && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Đối chiếu giao dịch {reconcileTarget.maYeuCau}</h3>
              <button type="button" onClick={() => setReconcileTarget(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={(e) => void handleConfirmReconcilePayment(e)} className="modal-body flex flex-col gap-3">
              {reconcileModalError && (
                <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "8px 10px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="alert-circle" size={15} />
                  <span>{reconcileModalError}</span>
                </div>
              )}
              <div style={{ background: "#F8F6F0", borderRadius: 8, padding: 10, border: "1px solid #E2DDD1", fontSize: "0.8rem" }}>
                <div>Đơn thuê: <strong>#{reconcileTarget.maDonThue}</strong> · Phương thức: <strong>{reconcileTarget.phuongThuc}</strong></div>
                <div>Số tiền giao dịch: <strong style={{ color: "#B45309" }}>{fmt(reconcileTarget.tongSoTien)}</strong></div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>Kết luận đối chiếu</label>
                <select
                  value={reconcileOutcome}
                  onChange={(e) => setReconcileOutcome(e.target.value as any)}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 9, fontSize: "0.84rem", background: "white" }}
                >
                  <option value="HopLe_XacNhan">Hợp lệ — Xác nhận ghi nhận thanh toán</option>
                  <option value="HopLe_HoanTienThua">Hợp lệ — Cần hoàn tiền thừa cho khách</option>
                  <option value="TuChoi">Từ chối — Không ghi nhận giao dịch</option>
                </select>
              </div>
              {reconcileOutcome === "HopLe_HoanTienThua" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>Số tiền cần hoàn (VNĐ)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={reconcileRefundAmount}
                    onChange={(e) => setReconcileRefundAmount(Number(e.target.value))}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 9, fontSize: "0.84rem" }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>Ghi chú kết luận *</label>
                <textarea
                  required
                  rows={2}
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  placeholder="Ghi rõ căn cứ sao kê / mã giao dịch ngân hàng..."
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 9, fontSize: "0.84rem" }}
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button" disabled={reconcileBusy} onClick={() => setReconcileTarget(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button type="submit" disabled={reconcileBusy} className="btn btn-primary btn-md" style={{ flex: 1 }}>
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
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">Lập chứng từ điều chỉnh bù trừ</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={(e) => void handleSubmit(e)} className="modal-body flex flex-col gap-4">
              {modalError && (
                <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "8px 10px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="alert-circle" size={15} />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Loại điều chỉnh</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", background: "white" }}
                >
                  <option value="Thu bù">Thu bù phụ phí sau hoàn tất</option>
                  <option value="Hoàn trả">Hoàn trả chênh lệch cọc</option>
                  <option value="Bù trừ chiết khấu">Bù trừ chiết khấu phát sinh</option>
                  <option value="Sai lệch kiểm kê">Sai lệch kiểm kê</option>
                </select>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Đơn hàng liên quan</label>
                  <select
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", background: "white" }}
                  >
                    <option value="">Không có</option>
                    {app.orders.map((o) => (
                      <option key={o.id} value={o.id}>{o.displayCode || o.id} ({o.customerName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Phiếu nhập liên quan</label>
                  <select
                    value={importReceiptId}
                    onChange={(e) => setImportReceiptId(e.target.value)}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", background: "white" }}
                  >
                    <option value="">Không có</option>
                    {app.importReceipts.map((r) => (
                      <option key={r.id} value={r.id}>{r.id} ({r.supplierName})</option>
                    ))}
                  </select>
                </div>
              </div>

              {realApi && orderId && (
                <div style={{ background: "#F8F6F0", borderRadius: 8, padding: 10, border: "1px solid #E2DDD1", fontSize: "0.78rem" }}>
                  {orderLookupLoading ? (
                    <span style={{ color: "#6B7280" }}>Đang kiểm tra biên bản đối soát &amp; phụ phí của đơn...</span>
                  ) : orderDoiSoat ? (
                    <div className="flex flex-col gap-2">
                      <div>
                        Biên bản đối soát gốc: <strong style={{ color: "#1B3F2F" }}>#{orderDoiSoat.maDoiSoat}</strong> ({orderDoiSoat.trangThai})
                      </div>
                      {orderSurchargeIds.length > 0 && (
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: 3 }}>
                            Phụ phí gốc cần lập dòng điều chỉnh kèm (tùy chọn):
                          </label>
                          <select
                            value={selectedSurchargeId}
                            onChange={(e) => setSelectedSurchargeId(e.target.value)}
                            style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 6, padding: "6px 8px", fontSize: "0.78rem", background: "white" }}
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
                    <span style={{ color: "#B91C1C" }}>{orderLookupError || "Đơn chưa có biên bản đối soát."}</span>
                  )}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Số tiền điều chỉnh (VNĐ)</label>
                <input
                  required
                  type="number"
                  min="1000"
                  step="5000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.9rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Lý do điều chỉnh</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ghi rõ nguyên nhân sai lệch hoặc thỏa thuận bồi thường..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem" }}
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" disabled={submitBusy} onClick={() => setShowModal(false)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button type="submit" disabled={submitBusy} className="btn btn-primary btn-md" style={{ flex: 1 }}>
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

