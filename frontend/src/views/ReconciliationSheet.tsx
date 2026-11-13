import { useState, useEffect, useCallback } from "react";
import { useApp } from "../App";
import {
  reconciliationApi,
  paymentApi,
  refundApi,
  surchargeApi,
  type DoiSoatBackend,
  type XemTruocDoiSoatBackend,
  type HoanTienTheoDonBackend,
  type YeuCauThuBackend,
} from "../services/api";
import { mapPhuPhiToSurcharge } from "../services/mappers";
import {
  fmt,
  statusColors,
  type Order,
  type Surcharge,
  type MoneyTransaction,
  type ReturnReceipt,
} from "../store";

interface ReconciliationSheetProps {
  order: Order;
  app: ReturnType<typeof useApp>;
  userRole?: "staff" | "admin";
  onClose?: () => void;
  onAfterMutation?: () => Promise<void> | void;
}

/**
 * UC5.4: Đối soát cọc và hoàn tất đơn (Reconciliation & Order Completion)
 * Tác nhân: Nhân viên, Quản trị viên
 * Đầy đủ 7 bước chính + Dòng sự kiện phụ 1.1, 5.1, 5.2
 */
export default function ReconciliationSheet({ order, app, userRole = "staff", onClose, onAfterMutation }: ReconciliationSheetProps) {
  // Trạng thái cho các modal truy vết chứng từ gốc (Dòng 3)
  const [viewingTx, setViewingTx] = useState<MoneyTransaction | null>(null);
  const [viewingSurcharge, setViewingSurcharge] = useState<Surcharge | null>(null);
  const [viewingReturnReceipt, setViewingReturnReceipt] = useState<ReturnReceipt | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // State đồng bộ API thật đối soát 7 bước, thu bổ sung, hoàn cọc
  const [previewBackend, setPreviewBackend] = useState<XemTruocDoiSoatBackend | null>(null);
  const [doiSoatBackend, setDoiSoatBackend] = useState<DoiSoatBackend | null>(null);
  const [refundsBackend, setRefundsBackend] = useState<HoanTienTheoDonBackend | null>(null);
  const [surchargesBackend, setSurchargesBackend] = useState<Surcharge[] | null>(null);
  const [pendingCollectReq, setPendingCollectReq] = useState<YeuCauThuBackend | null>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconBusy, setReconBusy] = useState(false);
  const [reconError, setReconError] = useState<string | null>(null);
  const [reconSuccess, setReconSuccess] = useState<string | null>(null);

  // Trạng thái modal UC5.5: Thu tiền bổ sung tại quầy
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectMethod, setCollectMethod] = useState<"cash" | "pos" | "qr">("cash");
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [posTerminalCode, setPosTerminalCode] = useState("POS-T1-01");
  const [posAuthCode, setPosAuthCode] = useState("AUTH-8892");
  const [collectNote, setCollectNote] = useState("");

  // Trạng thái modal UC5.6: Hoàn tiền cọc qua ngân hàng / tiền mặt
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundMethod, setRefundMethod] = useState<"bank" | "cash">("bank");
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankAccount, setBankAccount] = useState("1029384756");
  const [bankHolder, setBankHolder] = useState(order.customerName.toUpperCase());
  const [refundNote, setRefundNote] = useState("");

  // Trạng thái modal UC5.7: Điều chỉnh tài chính sau chốt
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjType, setAdjType] = useState<"Thu bù" | "Hoàn trả" | "Bù trừ chiết khấu">("Hoàn trả");
  const [adjAmount, setAdjAmount] = useState<number>(50000);
  const [adjReason, setAdjReason] = useState("");
  const [adjMessage, setAdjMessage] = useState("");
  const [adjSurchargeId, setAdjSurchargeId] = useState<string>("");

  const donId = order.backendId ?? Number(order.id);

  const loadReconcileState = useCallback(async () => {
    if (!app.realApi || !Number.isFinite(donId)) return;
    setReconLoading(true);
    setReconError(null);
    try {
      const [preview, ds, refunds, surcharges] = await Promise.all([
        reconciliationApi.xemTruoc(donId).catch(() => null),
        reconciliationApi.layTheoDon(donId).catch(() => null),
        refundApi.layTheoDon(donId).catch(() => null),
        surchargeApi.layTheoDon(donId).catch(() => null),
      ]);
      setPreviewBackend(preview);
      setDoiSoatBackend(ds);
      setRefundsBackend(refunds);
      setSurchargesBackend(surcharges ? surcharges.map(mapPhuPhiToSurcharge) : null);
    } catch (err) {
      setReconError(err instanceof Error ? err.message : "Không thể tải dữ liệu đối soát đơn.");
    } finally {
      setReconLoading(false);
    }
  }, [app.realApi, donId]);

  useEffect(() => {
    setReconSuccess(null);
    setReconError(null);
    setPendingCollectReq(null);
    void loadReconcileState();
  }, [loadReconcileState]);

  const effectiveSurcharges = app.realApi && surchargesBackend ? surchargesBackend : order.surcharges;

  // ─── 1. KIỂM TRA TIỀN ĐIỀU KIỆN & DÒNG SỰ KIỆN PHỤ 1.1 ──────────────────────
  const debtEquipment = order.assignedEquipment.filter((ae) => !ae.returnedAt);
  const pendingSurcharges = effectiveSurcharges.filter((s) => s.status === "Chờ duyệt");
  const disputedSurcharges = effectiveSurcharges.filter((s) => s.status === "Tranh chấp");
  const isBlocked = app.realApi && previewBackend
    ? !previewBackend.duDieuKien || pendingSurcharges.length > 0 || disputedSurcharges.length > 0
    : debtEquipment.length > 0 || pendingSurcharges.length > 0 || disputedSurcharges.length > 0;

  // ─── 2. TÍNH TOÁN CĂN CỨ BẢNG ĐỐI SOÁT (DÒNG 2 & LƯU Ý) ─────────────────────
  const depositCollected = app.realApi
    ? Number(doiSoatBackend?.tienCocDuocDoiSoat ?? previewBackend?.tienCocDuocDoiSoat ?? order.depositTotal)
    : order.depositTotal;

  const approvedSurcharges = effectiveSurcharges.filter((s) => s.status === "Đã duyệt");
  const totalApprovedSurcharges = app.realApi
    ? Number(doiSoatBackend?.tongPhuPhiDuocDuyet ?? previewBackend?.tongPhuPhiDuocDuyet ?? approvedSurcharges.reduce((sum, s) => sum + s.amount, 0))
    : approvedSurcharges.reduce((sum, s) => sum + s.amount, 0);

  const priorRefund = (order.transactions || [])
    .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const priorCollect = (order.transactions || [])
    .filter((t) => t.type === "Thu thêm" && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const priorSettled = priorCollect - priorRefund;

  const mockNetDifference = depositCollected - totalApprovedSurcharges - priorSettled;
  const refundAmount = app.realApi
    ? Number(doiSoatBackend?.soTienCanHoan ?? previewBackend?.soTienCanHoan ?? Math.max(0, mockNetDifference))
    : Math.max(0, mockNetDifference);
  const extraAmount = app.realApi
    ? Number(doiSoatBackend?.soTienCanThuThem ?? previewBackend?.soTienCanThuThem ?? Math.max(0, -mockNetDifference))
    : Math.max(0, -mockNetDifference);
  const netDifference = refundAmount > 0 ? refundAmount : -extraAmount;
  const isBalanced = refundAmount === 0 && extraAmount === 0;

  const isOrderCompleted = order.status === "Hoàn tất" || doiSoatBackend?.trangThai === "DaChot";
  const isConfirmed =
    Boolean(order.reconciliation?.confirmedAt) ||
    doiSoatBackend?.trangThai === "DaXacNhan" ||
    doiSoatBackend?.trangThai === "DangXuLyTien" ||
    isOrderCompleted;

  const initialTransaction = (order.transactions || []).find((t) => t.type === "Thanh toán ban đầu");

  /** Đảm bảo bảng đối soát tồn tại và đã xác nhận ở backend trước khi thao tác tiền/chốt. */
  const ensureConfirmedDoiSoat = async (): Promise<DoiSoatBackend> => {
    let ds = doiSoatBackend;
    if (!ds) {
      ds = await reconciliationApi.lapDoiSoat(donId, "Lập bảng đối soát từ cổng vận hành");
    }
    if (ds.trangThai === "ChoChot") {
      const fingerprint = previewBackend?.dauVanTayBangTinh || ds.dauVanTayBangTinh || "";
      ds = await reconciliationApi.xacNhanBangTinh(ds.maDoiSoat, fingerprint, "Xác nhận bảng tính đối soát");
    }
    setDoiSoatBackend(ds);
    return ds;
  };

  const syncAfterMutation = async () => {
    await Promise.all([
      loadReconcileState(),
      app.refreshOrders?.(),
      onAfterMutation ? Promise.resolve(onAfterMutation()) : Promise.resolve(),
    ]);
  };

  const handleConfirmStep4 = async () => {
    setReconError(null);
    setReconSuccess(null);
    if (app.realApi) {
      setReconBusy(true);
      try {
        await ensureConfirmedDoiSoat();
        setReconSuccess("Đã lập và xác nhận bảng tính đối soát.");
        await syncAfterMutation();
      } catch (err) {
        setReconError(err instanceof Error ? err.message : "Không thể xác nhận bảng đối soát.");
      } finally {
        setReconBusy(false);
      }
      return;
    }
    const res = app.confirmReconciliation(order.id);
    if (!res.ok) setReconError(res.message);
  };

  const handleFinalizeBalanced = async () => {
    setReconError(null);
    setReconSuccess(null);
    if (app.realApi) {
      setReconBusy(true);
      try {
        let ds = await ensureConfirmedDoiSoat();
        ds = await reconciliationApi.chotDoiSoat(ds.maDoiSoat);
        setDoiSoatBackend(ds);
        setReconSuccess("Đã chốt đối soát cân bằng 0 đ và hoàn tất đơn.");
        await syncAfterMutation();
      } catch (err) {
        setReconError(err instanceof Error ? err.message : "Không thể chốt đối soát đơn.");
      } finally {
        setReconBusy(false);
      }
      return;
    }
    const res = app.finalizeOrderWithoutPayment(order.id, "Chốt đối soát cân bằng không phát sinh chênh lệch tiền (Dòng 5.1)");
    if (!res.ok) setReconError(res.message);
  };

  const handleApproveSurchargeInline = async (ps: Surcharge) => {
    setReconError(null);
    if (app.realApi) {
      if (!ps.backendId) return;
      setReconBusy(true);
      try {
        await surchargeApi.duyetPhi(ps.backendId);
        setReconSuccess("Đã duyệt phụ phí.");
        await syncAfterMutation();
      } catch (err) {
        setReconError(err instanceof Error ? err.message : "Không thể duyệt phụ phí (cần quyền Quản trị viên).");
      } finally {
        setReconBusy(false);
      }
      return;
    }
    app.approveSurcharge(order.id, ps.id);
  };

  const handleRejectSurchargeInline = async (ps: Surcharge) => {
    setReconError(null);
    if (app.realApi) {
      if (!ps.backendId) return;
      setReconBusy(true);
      try {
        await surchargeApi.tuChoiPhi(ps.backendId, "Từ chối khi rà soát điều kiện đối soát");
        setReconSuccess("Đã từ chối phụ phí.");
        await syncAfterMutation();
      } catch (err) {
        setReconError(err instanceof Error ? err.message : "Không thể từ chối phụ phí.");
      } finally {
        setReconBusy(false);
      }
      return;
    }
    app.rejectSurcharge(order.id, ps.id);
  };

  return (
    <div style={{ background: "white", borderRadius: 16, border: "1px solid var(--color-bone)", overflow: "hidden", boxShadow: "0 2px 12px rgba(17,35,27,0.04)" }}>
      {/* ─── Header: Tên nghiệp vụ & Trạng thái ────────────────────────────── */}
      <div style={{ background: "var(--color-parchment)", padding: "18px 24px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "0.72rem", background: isOrderCompleted ? "#DCFCE7" : "var(--color-forest)", color: isOrderCompleted ? "#15803D" : "white", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
              UC5.4: ĐỐI SOÁT CỌC & HOÀN TẤT ĐƠN
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Tác nhân: {userRole === "admin" ? "Quản trị viên" : "Nhân viên kho"}</span>
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", color: "var(--color-bark)", margin: "4px 0 2px" }}>
            Bảng Đối Soát Cọc & Quyết Toán: Đơn {order.displayCode || order.id}
          </h3>
          <div style={{ fontSize: "0.82rem", color: "#4B5563" }}>
            Khách hàng: <strong>{order.customerName}</strong> {order.customerPhone ? `(${order.customerPhone})` : ""} · Nhận: {order.pickupTime} · Hẹn trả: {order.returnTime}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOrderCompleted ? (
            <div className="locked-seal">
              <span>🔒</span> ĐÃ KHÓA & HOÀN TẤT
            </div>
          ) : (
            <span style={{ background: statusColors[order.status]?.bg || "#F3F4F6", color: statusColors[order.status]?.text || "#374151", padding: "6px 12px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 700 }}>
              {order.status}
            </span>
          )}
          {onClose && (
            <button onClick={onClose} style={{ border: "1px solid var(--color-bone)", background: "white", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
              Đóng
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {reconError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 600 }}>
            {reconError}
          </div>
        )}
        {reconSuccess && (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 600 }}>
            {reconSuccess}
          </div>
        )}
        {reconLoading && (
          <div style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 10 }}>
            Đang tải dữ liệu đối soát & hoàn tiền từ máy chủ...
          </div>
        )}
        {/* ─── Thanh tiến trình 3 bước UC5.4 ─────────────────────────────────── */}
        <div className="reconcile-step-flow">
          <div className={`reconcile-step-item ${isBlocked ? "active" : "completed"}`}>
            <span className="reconcile-step-badge">{isBlocked ? "1" : "✓"}</span>
            <span>1. Kiểm tra thiết bị & Phụ phí</span>
          </div>
          <span style={{ color: "var(--color-bone)" }}>→</span>
          <div className={`reconcile-step-item ${!isBlocked && !isOrderCompleted ? "active" : isOrderCompleted ? "completed" : ""}`}>
            <span className="reconcile-step-badge">{isOrderCompleted ? "✓" : "2"}</span>
            <span>2. Bảng đối soát & Xác nhận</span>
          </div>
          <span style={{ color: "var(--color-bone)" }}>→</span>
          <div className={`reconcile-step-item ${isOrderCompleted ? "active completed" : ""}`}>
            <span className="reconcile-step-badge">{isOrderCompleted ? "✓" : "3"}</span>
            <span>3. Quyết toán tiền & Khóa đối soát</span>
          </div>
        </div>

        {/* ─── DÒNG SỰ KIỆN PHỤ 1.1: CẢNH BÁO CHƯA ĐỦ ĐIỀU KIỆN ──────────────── */}
        {isBlocked ? (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: "1.2rem" }}>⛔</span>
              <strong style={{ color: "#DC2626", fontSize: "0.95rem" }}>
                Chưa cho phép chốt đối soát (Dòng sự kiện phụ 1.1)
              </strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#991B1B", marginBottom: 12 }}>
              Đơn hàng chưa thỏa mãn tiền điều kiện. Hệ thống yêu cầu giải quyết dứt điểm các mục còn tồn đọng sau đây trước khi đối soát:
            </p>

            <div className="flex flex-col gap-2">
              {app.realApi && previewBackend && previewBackend.vuongMac.length > 0 && (
                <div style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px" }}>
                  <strong style={{ color: "#B91C1C", fontSize: "0.84rem" }}>Kiểm tra điều kiện từ máy chủ:</strong>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: "0.78rem", color: "#7F1D1D" }}>
                    {previewBackend.vuongMac.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {debtEquipment.length > 0 && (
                <div style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ color: "#B91C1C", fontSize: "0.85rem" }}>
                      Thiết bị chưa nhận trả / chưa có kết luận: {debtEquipment.length} thiết bị
                    </strong>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                      Mã: {debtEquipment.map((d) => d.equipmentDisplayCode || d.equipmentId).join(", ")}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", background: "#FEE2E2", color: "#991B1B", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    Cần lập Phiếu nhận trả
                  </span>
                </div>
              )}

              {pendingSurcharges.map((ps) => (
                <div key={ps.id} style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ background: "#FEF3C7", color: "#B45309", padding: "2px 6px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700 }}>Phụ phí chờ duyệt</span>
                      <strong style={{ fontSize: "0.85rem" }}>{ps.type} ({ps.equipmentId})</strong>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#DC2626", fontWeight: 700 }}>+{fmt(ps.amount)}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Lý do: {ps.reason} · Người đề xuất: {ps.createdBy}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={reconBusy}
                      onClick={() => handleApproveSurchargeInline(ps)}
                      style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      ✓ Duyệt phụ phí
                    </button>
                    <button
                      type="button"
                      disabled={reconBusy}
                      onClick={() => handleRejectSurchargeInline(ps)}
                      style={{ background: "white", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: 6, padding: "5px 12px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      ✕ Từ chối
                    </button>
                  </div>
                </div>
              ))}

              {disputedSurcharges.map((ds) => (
                <div key={ds.id} style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ color: "#B45309", fontSize: "0.85rem" }}>Phụ phí đang tranh chấp: {ds.type} ({fmt(ds.amount)})</strong>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Khách hàng phản hồi: {ds.customerResponse || "Chưa đồng thuận mức phí"}</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", background: "#FEF3C7", color: "#B45309", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    Cần thương lượng xong
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.1rem", color: "#16A34A" }}>✓</span>
            <div style={{ fontSize: "0.82rem", color: "#15803D" }}>
              <strong>Đủ điều kiện đối soát (Tiền điều kiện đạt):</strong> 100% thiết bị đã kết luận nhận trả; toàn bộ phụ phí đã được duyệt/xử lý.
            </div>
          </div>
        )}

        {/* ─── DÒNG 2 & LƯU Ý: BẢNG ĐỐI SOÁT CỌC & QUYẾT TOÁN TỔNG HỢP ─────────── */}
        <div className="reconcile-sheet-card">
          <div className="reconcile-sheet-header">
            <div>
              <strong style={{ fontSize: "0.95rem", color: "var(--color-bark)" }}>
                Bảng Kê Quyết Toán Đối Soát Cọc
              </strong>
              <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                Số dư = Nghĩa vụ hợp lệ trừ tiền đã xử lý (Không cộng cọc vào doanh thu)
              </div>
            </div>
            <div className="flex gap-2">
              {isOrderCompleted && (
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "5px 12px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  🖨️ In biên bản A4
                </button>
              )}
            </div>
          </div>

          {/* Dòng 1: Cọc thực thu ban đầu */}
          <div className="reconcile-sheet-row" style={{ background: "#FAFAFA" }}>
            <div>
              <div className="flex items-center gap-2">
                <strong>1. Tiền cọc thực thu ban đầu:</strong>
                {initialTransaction && (
                  <button
                    type="button"
                    onClick={() => setViewingTx(initialTransaction)}
                    className="reconcile-trace-btn"
                    title="Truy về chứng từ thu ban đầu (Dòng 3)"
                  >
                    🔍 Xem GD: {initialTransaction.id}
                  </button>
                )}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                Thanh toán lúc đặt đơn qua Cổng thanh toán / Chuyển khoản
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem", color: "var(--color-forest)" }}>
              +{fmt(depositCollected)}
            </div>
          </div>

          {/* Dòng 2: Chi tiết các khoản phụ phí đã duyệt (Căn cứ điều chỉnh) */}
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #F3F4F6" }}>
            <div className="flex justify-between items-center mb-2">
              <strong style={{ fontSize: "0.86rem", color: "var(--color-bark)" }}>
                2. Các khoản phụ phí đã duyệt (Căn cứ điều chỉnh):
              </strong>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: totalApprovedSurcharges > 0 ? "#DC2626" : "#6B7280" }}>
                −{fmt(totalApprovedSurcharges)}
              </span>
            </div>

            {approvedSurcharges.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: "#9CA3AF", fontStyle: "italic", paddingLeft: 12 }}>
                ✓ Thiết bị hoàn trả đầy đủ, nguyên vẹn — Không phát sinh phụ phí bồi thường hoặc trễ hạn.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5" style={{ paddingLeft: 12 }}>
                {approvedSurcharges.map((s) => {
                  // Tìm phiếu nhận trả liên quan (Dòng 3: Truy về chứng từ gốc)
                  const relatedReceipt = (order.returnReceipts || []).find((r) =>
                    r.items.some((it) => it.equipmentId === s.equipmentId && it.surchargeAmount === s.amount)
                  );

                  return (
                    <div key={s.id} style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{s.type}</span> — Thiết bị: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{s.equipmentId}</span>
                        <span style={{ color: "#6B7280", marginLeft: 6 }}>({s.reason})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {relatedReceipt && (
                          <button
                            type="button"
                            onClick={() => setViewingReturnReceipt(relatedReceipt)}
                            className="reconcile-trace-btn"
                            title="Truy về Phiếu nhận trả (Dòng 3)"
                          >
                            📄 PNT: {relatedReceipt.id}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewingSurcharge(s)}
                          className="reconcile-trace-btn"
                          title="Xem chi tiết phiếu phụ phí"
                        >
                          🔍 Chi tiết phí
                        </button>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626" }}>
                          −{fmt(s.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dòng 3: Các khoản đã thu bổ sung / hoàn trước đó (nếu có) */}
          <div className="reconcile-sheet-row" style={{ background: "#FAFAFA" }}>
            <div>
              <strong>3. Các khoản đã thu thêm / hoàn cọc trước đó:</strong>
              <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                Thu thêm trước đó: {fmt(priorCollect)} · Đã hoàn trước đó: {fmt(priorRefund)}
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.9rem", color: "#4B5563" }}>
              {priorSettled !== 0 ? (priorSettled > 0 ? `+${fmt(priorSettled)}` : `−${fmt(Math.abs(priorSettled))}`) : "0 đ"}
            </div>
          </div>

          {/* Dòng 4: TỔNG KẾT CHÊNH LỆCH ĐỐI SOÁT (Net Settlement Difference) */}
          <div style={{ background: isBalanced ? "#F0FDF4" : netDifference > 0 ? "#F0FDF4" : "#FEF2F2", padding: "16px 20px", borderTop: "2px solid var(--color-bone)" }}>
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#6B7280" }}>
                  Kết luận chênh lệch đối soát:
                </span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: isBalanced ? "#15803D" : netDifference > 0 ? "var(--color-forest)" : "#DC2626", marginTop: 2 }}>
                  {isBalanced
                    ? "✓ Cân bằng tuyệt đối (0 đ) — Không phát sinh nghĩa vụ tiền"
                    : netDifference > 0
                    ? `Cửa hàng phải HOÀN TRẢ CỌC cho khách: +${fmt(refundAmount)}`
                    : `Khách hàng cần THANH TOÁN BỔ SUNG: −${fmt(extraAmount)}`}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 4 }}>
                  Căn cứ tính: Cọc {fmt(depositCollected)} − Phụ phí {fmt(totalApprovedSurcharges)} {priorSettled !== 0 ? `− Đã xử lý ${fmt(priorSettled)}` : ""} = {fmt(Math.abs(netDifference))}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: isBalanced ? "#15803D" : netDifference > 0 ? "var(--color-forest)" : "#DC2626" }}>
                  {fmt(Math.abs(netDifference))}
                </div>
                <span style={{ fontSize: "0.72rem", background: "white", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--color-bone)", fontWeight: 600 }}>
                  {isBalanced ? "Dòng 5.1" : netDifference > 0 ? "EP5.4-HOAN (UC5.6)" : "EP5.4-THU (UC5.5)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── DÒNG 4: XÁC NHẬN BẢNG ĐỐI SOÁT & THỰC HIỆN NGHĨA VỤ TIỀN ────────── */}
        {!isOrderCompleted && (
          <div style={{ background: "var(--color-parchment)", borderRadius: 12, padding: "18px 20px", border: "1px solid var(--color-bone)", marginTop: 16 }}>
            {/* Trạng thái xác nhận bảng đối soát (Bước 4) */}
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <div>
                <strong style={{ fontSize: "0.9rem", color: "var(--color-bark)" }}>
                  Quy trình chốt đối soát & tất toán đơn:
                </strong>
                {isConfirmed ? (
                  <div style={{ fontSize: "0.78rem", color: "#15803D", marginTop: 2 }}>
                    ✓ Đã xác nhận bảng đối soát{" "}
                    {doiSoatBackend?.thoiDiemLap || order.reconciliation?.confirmedAt
                      ? `lúc ${doiSoatBackend?.thoiDiemLap || order.reconciliation?.confirmedAt}`
                      : ""}{" "}
                    {doiSoatBackend?.nguoiLap || order.reconciliation?.confirmedBy
                      ? `bởi ${doiSoatBackend?.nguoiLap || order.reconciliation?.confirmedBy}`
                      : ""}
                    . (Sẵn sàng bước quyết toán tiền / khóa đối soát)
                  </div>
                ) : (
                  <div style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: 2 }}>
                    Bước 4: Xác nhận căn cứ số liệu trước khi tiến hành giao dịch tiền.
                  </div>
                )}
              </div>

              {!isConfirmed && (
                <button
                  type="button"
                  disabled={isBlocked || reconBusy}
                  onClick={handleConfirmStep4}
                  style={{
                    background: isBlocked ? "#E5E7EB" : "var(--color-moss)",
                    color: isBlocked ? "#9CA3AF" : "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: isBlocked || reconBusy ? "not-allowed" : "pointer",
                  }}
                >
                  {reconBusy ? "Đang xác nhận..." : "Xác nhận bảng đối soát (Bước 4)"}
                </button>
              )}
            </div>

            {/* Chi tiết các lệnh hoàn tiền & thu bổ sung backend đang mở */}
            {app.realApi && refundsBackend && refundsBackend.items.length > 0 && (
              <div style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 8 }}>
                  Lệnh hoàn tiền trên máy chủ ({refundsBackend.items.length} lệnh · Đã hoàn: {fmt(refundsBackend.tongDaHoan)})
                </div>
                <div className="flex flex-col gap-2">
                  {refundsBackend.items.map((ht) => (
                    <div key={ht.maHoanTien} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: "0.78rem" }}>
                      <div>
                        <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{ht.maYeuCau || `HT-${ht.maHoanTien}`}</strong>
                        <span style={{ marginLeft: 8 }}>{ht.nhanHienThi}</span>
                        <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmt(ht.soTien)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ background: ht.trangThai === "ThanhCong" ? "#DCFCE7" : ht.trangThai === "ThatBai" ? "#FEE2E2" : "#FEF3C7", color: ht.trangThai === "ThanhCong" ? "#15803D" : ht.trangThai === "ThatBai" ? "#DC2626" : "#B45309", padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontSize: "0.7rem" }}>
                          {ht.trangThai}
                        </span>
                        {ht.trangThai !== "ThanhCong" && (
                          <>
                            <button
                              type="button"
                              disabled={reconBusy}
                              onClick={async () => {
                                setReconBusy(true);
                                setReconError(null);
                                try {
                                  await refundApi.xuLyHoan(ht.maHoanTien, refundNote || "Thực hiện hoàn tiền cọc từ bảng đối soát");
                                  setReconSuccess(`Đã xử lý hoàn tiền ${ht.maYeuCau || ht.maHoanTien}.`);
                                  await syncAfterMutation();
                                } catch (err) {
                                  setReconError(err instanceof Error ? err.message : "Không thể xử lý hoàn tiền.");
                                } finally {
                                  setReconBusy(false);
                                }
                              }}
                              style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              Xử lý hoàn
                            </button>
                            <button
                              type="button"
                              disabled={reconBusy}
                              onClick={async () => {
                                setReconBusy(true);
                                setReconError(null);
                                try {
                                  await refundApi.doiChieuHoan(ht.maHoanTien);
                                  setReconSuccess(`Đã đối chiếu trạng thái hoàn tiền ${ht.maYeuCau || ht.maHoanTien}.`);
                                  await syncAfterMutation();
                                } catch (err) {
                                  setReconError(err instanceof Error ? err.message : "Không thể đối chiếu hoàn tiền.");
                                } finally {
                                  setReconBusy(false);
                                }
                              }}
                              style={{ background: "white", color: "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                            >
                              Đối chiếu
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Các nút hành động nghiệp vụ theo Bước 5–7 */}
            <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-dashed border-gray-300">
              {isBalanced ? (
                <button
                  type="button"
                  disabled={isBlocked || reconBusy}
                  onClick={handleFinalizeBalanced}
                  style={{
                    background: isBlocked ? "#9CA3AF" : "var(--color-forest)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 24px",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: isBlocked || reconBusy ? "not-allowed" : "pointer",
                  }}
                >
                  ✓ Chốt đối soát & Chuyển Hoàn tất đơn (Chênh lệch 0 đ) →
                </button>
              ) : extraAmount > 0 ? (
                <button
                  type="button"
                  disabled={isBlocked || reconBusy}
                  onClick={() => {
                    setCashTendered(extraAmount);
                    setShowCollectModal(true);
                  }}
                  style={{
                    background: isBlocked ? "#9CA3AF" : "#DC2626",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: isBlocked || reconBusy ? "not-allowed" : "pointer",
                  }}
                >
                  Thu thêm bổ sung: {fmt(extraAmount)} (UC5.5) →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBlocked || reconBusy}
                  onClick={() => {
                    setBankHolder(order.customerName.toUpperCase());
                    setShowRefundModal(true);
                  }}
                  style={{
                    background: isBlocked ? "#9CA3AF" : "var(--color-forest)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: isBlocked || reconBusy ? "not-allowed" : "pointer",
                  }}
                >
                  Lập & xử lý hoàn tiền cọc: {fmt(refundAmount)} (UC5.6) →
                </button>
              )}

              {app.realApi && doiSoatBackend && doiSoatBackend.trangThai !== "ChoChot" && doiSoatBackend.trangThai !== "DaChot" && (
                <button
                  type="button"
                  disabled={reconBusy}
                  onClick={async () => {
                    setReconBusy(true);
                    setReconError(null);
                    try {
                      await reconciliationApi.chotDoiSoat(doiSoatBackend.maDoiSoat);
                      setReconSuccess("Đã chốt khóa đối soát & hoàn tất đơn hàng.");
                      await syncAfterMutation();
                    } catch (err) {
                      setReconError(err instanceof Error ? err.message : "Chưa đủ điều kiện chốt đối soát (kiểm tra giao dịch tiền còn chờ).");
                    } finally {
                      setReconBusy(false);
                    }
                  }}
                  style={{
                    background: "var(--color-bark)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 18px",
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    cursor: reconBusy ? "not-allowed" : "pointer",
                  }}
                >
                  Khóa đối soát & Hoàn tất đơn
                </button>
              )}

              {!app.realApi && (
                <button
                  type="button"
                  onClick={() => {
                    app.settleOrder(order.id, false, { note: "Khách chưa đủ tiền / Ngân hàng báo lỗi giao dịch" });
                  }}
                  style={{
                    background: "white",
                    color: "#B91C1C",
                    border: "1px solid #FECACA",
                    borderRadius: 8,
                    padding: "10px 16px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                  title="Mô phỏng khoản thu bổ sung chưa đủ hoặc giao dịch hoàn tiền thất bại (Dòng 5.2)"
                >
                  Mô phỏng GD thất bại (Dòng 5.2)
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── DÒNG 7: XEM KẾT QUẢ CHỐT & KHÓA ĐỐI SOÁT (ĐƠN HOÀN TẤT) ────────── */}
        {isOrderCompleted && (
          <div style={{ background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: 12, padding: "20px 24px", marginTop: 18 }}>
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "1.4rem" }}>🎉</span>
                  <strong style={{ fontSize: "1.15rem", color: "var(--color-forest)" }}>
                    Đơn hàng Đã Khóa Đối Soát & Hoàn Tất Thành Công (Dòng 7)
                  </strong>
                </div>
                <div style={{ fontSize: "0.84rem", color: "#166534", marginTop: 4 }}>
                  Thời điểm khóa: <strong>{order.reconciledAt}</strong> · Người chốt: <strong>{order.reconciliation?.lockedBy || "Nhân viên"}</strong>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: 4 }}>
                  Mọi nghĩa vụ thiết bị và tiền cọc đã được quyết toán triệt để. Dữ liệu đã khóa để phục vụ 4 trụ cột báo cáo tài chính.
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  🖨️ In Biên Bản Đối Soát A4
                </button>
                {userRole === "admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdjAmount(50000);
                      setAdjReason("");
                      setAdjMessage("");
                      setShowAdjustmentModal(true);
                    }}
                    style={{ background: "#FFFBEB", border: "1px solid #FCD34D", color: "#B45309", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    title="Sửa sai tài chính sau khi đã đối soát có liên kết chứng từ gốc (UC5.7)"
                  >
                    📑 Lập điều chỉnh sau chốt (UC5.7)
                  </button>
                )}
              </div>
            </div>

            {/* Lịch sử giao dịch tiền của đơn */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed #86EFAC" }}>
              <strong style={{ fontSize: "0.82rem", color: "#166534" }}>Lịch sử chứng từ tiền liên quan ({order.transactions?.length || 0} giao dịch):</strong>
              <div className="flex flex-col gap-1.5 mt-2">
                {order.transactions?.map((tx) => (
                  <div key={tx.id} style={{ background: "white", border: "1px solid #BBF7D0", borderRadius: 6, padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem" }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{tx.id}</span>
                      <span style={{ fontWeight: 600 }}>{tx.type}</span>
                      <span style={{ color: "#6B7280" }}>({tx.note})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: tx.type === "Hoàn cọc" ? "var(--color-forest)" : tx.type === "Thu thêm" ? "#DC2626" : "inherit" }}>
                        {fmt(tx.amount)}
                      </span>
                      <span style={{ background: tx.status === "Thành công" ? "#DCFCE7" : "#FEE2E2", color: tx.status === "Thành công" ? "#15803D" : "#DC2626", padding: "1px 6px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 700 }}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL UC5.5: THU THÊM TIỀN TẠI QUẦY (TIỀN MẶT, POS, QR) ─────────── */}
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

      {/* ─── DÒNG 3: MODAL TRUY VẾT GIAO DỊCH THU CỌC BAN ĐẦU ─────────────────── */}
      {viewingTx && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 480, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "var(--color-forest)", color: "white", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  CHỨNG TỪ THU BAN ĐẦU (DÒNG 3)
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Mã giao dịch: {viewingTx.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingTx(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, fontSize: "0.84rem", display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Loại giao dịch:</span><strong>{viewingTx.type}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Thời gian thực hiện:</span><strong>{viewingTx.createdAt}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Số tiền giao dịch:</span><strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(viewingTx.amount)}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Trạng thái:</span><span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{viewingTx.status}</span></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Nội dung / Ghi chú:</span><span>{viewingTx.note || "Thanh toán thành công"}</span></div>
            </div>

            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setViewingTx(null)} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DÒNG 3: MODAL TRUY VẾT PHIẾU NHẬN TRẢ (PNT) ───────────────────────── */}
      {viewingReturnReceipt && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 580, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span style={{ fontSize: "0.72rem", background: viewingReturnReceipt.isFinalReturn ? "#DCFCE7" : "#FFF7ED", color: viewingReturnReceipt.isFinalReturn ? "#15803D" : "#C2410C", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                  CHỨNG TỪ GỐC: {viewingReturnReceipt.isFinalReturn ? "PHIẾU TRẢ CUỐI CÙNG" : `PHIẾU TRẢ ĐỢT ${viewingReturnReceipt.returnRound}`}
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Phiếu Nhận Trả: {viewingReturnReceipt.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingReturnReceipt(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.82rem", marginBottom: 14 }}>
              <div><strong>Đơn hàng:</strong> {viewingReturnReceipt.orderId} · <strong>Ngày nhận:</strong> {viewingReturnReceipt.returnedAt}</div>
              <div><strong>Nhân viên nghiệm thu:</strong> {viewingReturnReceipt.staffName} · <strong>Ghi chú:</strong> {viewingReturnReceipt.note || "Không có"}</div>
            </div>

            <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>Chi tiết thiết bị trong biên bản:</strong>
            <div className="flex flex-col gap-2 mt-2 mb-4">
              {viewingReturnReceipt.items.map((it) => (
                <div key={it.equipmentId} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{it.equipmentId}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Tình trạng: <strong>{it.condition}</strong> {it.note ? `— ${it.note}` : ""}</div>
                  </div>
                  {it.surchargeAmount > 0 && (
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626", fontSize: "0.85rem" }}>
                      +{fmt(it.surchargeAmount)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => window.print()} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>
                🖨 In phiếu PNT
              </button>
              <button type="button" onClick={() => setViewingReturnReceipt(null)} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DÒNG 3: MODAL TRUY VẾT PHIẾU PHỤ PHÍ ─────────────────────────────── */}
      {viewingSurcharge && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 480, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  CHỨNG TỪ PHỤ PHÍ (DÒNG 3)
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Phiếu Phụ Phí: {viewingSurcharge.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingSurcharge(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, fontSize: "0.84rem", display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Loại phụ phí:</span><strong>{viewingSurcharge.type}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Mã thiết bị:</span><strong style={{ fontFamily: "var(--font-mono)" }}>{viewingSurcharge.equipmentId}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Số tiền phạt/bồi thường:</span><strong style={{ fontFamily: "var(--font-mono)", color: "#DC2626" }}>{fmt(viewingSurcharge.amount)}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Lý do & Tình trạng:</span><span>{viewingSurcharge.reason}</span></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Người đề xuất:</span><strong>{viewingSurcharge.createdBy}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Trạng thái duyệt:</span><span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{viewingSurcharge.status}</span></div>
            </div>

            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setViewingSurcharge(null)} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DÒNG 7: MODAL IN BIÊN BẢN ĐỐI SOÁT CHUẨN A4 ──────────────────────── */}
      {showPrintModal && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 680, width: "100%", padding: 36, boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
            {/* Header Biên bản in */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid var(--color-forest)", paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-forest)", margin: 0 }}>
                  GEARGO OUTDOOR RENTALS
                </h2>
                <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>Hệ thống cho thuê thiết bị cắm trại & dã ngoại chuyên nghiệp</div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Hotline: 1900-GEARGO · Website: geargo.vn</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-bark)" }}>BIÊN BẢN ĐỐI SOÁT CỌC</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-moss)" }}>BBDS-{order.id}</div>
                <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Ngày lập: {order.reconciledAt || new Date().toLocaleString("vi-VN")}</div>
              </div>
            </div>

            {/* Thông tin đơn và khách hàng */}
            <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 14, fontSize: "0.82rem", marginBottom: 20 }}>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Mã đơn thuê:</strong> {order.id}</div>
                <div><strong>Khách hàng:</strong> {order.customerName}</div>
                <div><strong>Số điện thoại:</strong> {order.customerPhone}</div>
                <div><strong>Kỳ thuê:</strong> {order.pickupTime} → {order.returnTime}</div>
              </div>
            </div>

            {/* Bảng số liệu quyết toán chi tiết */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", marginBottom: 20 }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-bone)" }}>Hạng mục tài chính</th>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-bone)" }}>Căn cứ chứng từ</th>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", textAlign: "right" }}>Số tiền (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)" }}><strong>1. Tiền cọc ban đầu</strong></td>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", color: "#6B7280" }}>{initialTransaction ? initialTransaction.id : "Đã thanh toán"}</td>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>+{fmt(depositCollected)}</td>
                </tr>
                {approvedSurcharges.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)" }}>
                      2. Phụ phí: {s.type} ({s.equipmentId})
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{s.reason}</div>
                    </td>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", color: "#6B7280" }}>Phiếu duyệt {s.id}</td>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", textAlign: "right", fontFamily: "var(--font-mono)", color: "#DC2626" }}>−{fmt(s.amount)}</td>
                  </tr>
                ))}
                {priorSettled !== 0 && (
                  <tr>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)" }}>3. Khoản đã thu/hoàn trước</td>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", color: "#6B7280" }}>Giao dịch đối soát trước</td>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {priorSettled > 0 ? `+${fmt(priorSettled)}` : `−${fmt(Math.abs(priorSettled))}`}
                    </td>
                  </tr>
                )}
                <tr style={{ background: "#F0FDF4", fontWeight: 800 }}>
                  <td colSpan={2} style={{ padding: "10px 12px", border: "1px solid var(--color-bone)" }}>
                    SỐ DƯ QUYẾT TOÁN CUỐI CÙNG (
                    {isBalanced ? "CÂN BẰNG 0 Đ" : netDifference > 0 ? "HOÀN TRẢ KHÁCH" : "THU THÊM"}
                    )
                  </td>
                  <td style={{ padding: "10px 12px", border: "1px solid var(--color-bone)", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "1.05rem", color: isBalanced ? "#15803D" : netDifference > 0 ? "var(--color-forest)" : "#DC2626" }}>
                    {fmt(Math.abs(netDifference))}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Chữ ký hai bên */}
            <div className="grid grid-cols-2 gap-8 text-center pt-6" style={{ fontSize: "0.82rem" }}>
              <div>
                <strong>ĐẠI DIỆN KHÁCH HÀNG</strong>
                <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: 60 }} />
                <strong>{order.customerName}</strong>
              </div>
              <div>
                <strong>ĐẠI DIỆN GEARGO</strong>
                <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>(Người chốt đối soát)</div>
                <div style={{ height: 60 }} />
                <strong>{order.reconciliation?.lockedBy || "NV Kho Mai"}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-8 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => window.print()} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>
                🖨 Xác nhận In / Xuất PDF
              </button>
              <button type="button" onClick={() => setShowPrintModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
