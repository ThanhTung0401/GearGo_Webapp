import { useState, useEffect, useCallback } from "react";
import { useApp } from "../App";
import { reconciliationApi, refundApi, surchargeApi, type DoiSoatBackend, type XemTruocDoiSoatBackend, type HoanTienTheoDonBackend, type YeuCauThuBackend } from "../services/api";
import { mapPhuPhiToSurcharge } from "../services/mappers";
import { fmt, statusColors, type Order, type Surcharge, type MoneyTransaction, type ReturnReceipt } from "../store";
import { CollectSurchargeModal } from "./reconciliation/CollectSurchargeModal";
import { RefundDepositModal } from "./reconciliation/RefundDepositModal";
import { ReconciliationTraceModals } from "./reconciliation/ReconciliationTraceModals";
import { FinancialAdjustmentModal } from "./reconciliation/FinancialAdjustmentModal";

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

  // Xác định lớp CSS trạng thái chênh lệch quyết toán: cân bằng / hoàn cọc / thu thêm
  const netStateClass = isBalanced ? "" : netDifference > 0 ? "is-refund" : "is-collect";

  return (
    <div className="recon-sheet">
      {/* ─── Header: Tên nghiệp vụ & Trạng thái ────────────────────────────── */}
      <div className="recon-header">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Đổi màu nhãn UC5.4 sang xanh lá khi đơn đã khóa hoàn tất */}
            <span className={`recon-uc-badge ${isOrderCompleted ? "is-completed" : ""}`}>
              UC5.4: ĐỐI SOÁT CỌC & HOÀN TẤT ĐƠN
            </span>
            <span className="recon-role-meta">Tác nhân: {userRole === "admin" ? "Quản trị viên" : "Nhân viên kho"}</span>
          </div>
          <h3 className="recon-header-title">
            Bảng Đối Soát Cọc & Quyết Toán: Đơn {order.displayCode || order.id}
          </h3>
          <div className="recon-header-sub">
            Khách hàng: <strong>{order.customerName}</strong> {order.customerPhone ? `(${order.customerPhone})` : ""} · Nhận: {order.pickupTime} · Hẹn trả: {order.returnTime}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isOrderCompleted ? (
            <div className="locked-seal">
              <span>🔒</span> ĐÃ KHÓA & HOÀN TẤT
            </div>
          ) : (
            <span
              className="recon-status-pill"
              style={{
                background: statusColors[order.status]?.bg || "#F3F4F6",
                color: statusColors[order.status]?.text || "#374151",
              }}
            >
              {order.status}
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className="recon-close-btn">
              Đóng
            </button>
          )}
        </div>
      </div>

      <div className="recon-body">
        {reconError && (
          <div className="recon-alert-error">
            {reconError}
          </div>
        )}
        {reconSuccess && (
          <div className="recon-alert-success">
            {reconSuccess}
          </div>
        )}
        {reconLoading && (
          <div className="recon-loading-note">
            Đang tải dữ liệu đối soát & hoàn tiền từ máy chủ...
          </div>
        )}
        {/* ─── Thanh tiến trình 3 bước UC5.4 ─────────────────────────────────── */}
        <div className="reconcile-step-flow recon-step-flow">
          <div className={`reconcile-step-item ${isBlocked ? "active" : "completed"}`}>
            <span className="reconcile-step-badge">{isBlocked ? "1" : "✓"}</span>
            <span>1. Kiểm tra thiết bị & Phụ phí</span>
          </div>
          <span className="recon-step-arrow">→</span>
          {/* Bước 2 active khi đủ tiền điều kiện và chưa khóa; completed khi đơn đã hoàn tất */}
          <div className={`reconcile-step-item ${!isBlocked && !isOrderCompleted ? "active" : isOrderCompleted ? "completed" : ""}`}>
            <span className="reconcile-step-badge">{isOrderCompleted ? "✓" : "2"}</span>
            <span>2. Bảng đối soát & Xác nhận</span>
          </div>
          <span className="recon-step-arrow">→</span>
          <div className={`reconcile-step-item ${isOrderCompleted ? "active completed" : ""}`}>
            <span className="reconcile-step-badge">{isOrderCompleted ? "✓" : "3"}</span>
            <span>3. Quyết toán tiền & Khóa đối soát</span>
          </div>
        </div>

        {/* ─── DÒNG SỰ KIỆN PHỤ 1.1: CẢNH BÁO CHƯA ĐỦ ĐIỀU KIỆN ──────────────── */}
        {isBlocked ? (
          <div className="recon-blocker-box">
            <div className="flex items-center gap-2 mb-2">
              <span className="recon-blocker-icon">⛔</span>
              <strong className="recon-blocker-title">
                Chưa cho phép chốt đối soát (Dòng sự kiện phụ 1.1)
              </strong>
            </div>
            <p className="recon-blocker-desc">
              Đơn hàng chưa thỏa mãn tiền điều kiện. Hệ thống yêu cầu giải quyết dứt điểm các mục còn tồn đọng sau đây trước khi đối soát:
            </p>

            <div className="flex flex-col gap-2">
              {app.realApi && previewBackend && previewBackend.vuongMac.length > 0 && (
                <div className="recon-blocker-item">
                  <strong className="recon-blocker-item-title">Kiểm tra điều kiện từ máy chủ:</strong>
                  <ul className="recon-blocker-list">
                    {previewBackend.vuongMac.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {debtEquipment.length > 0 && (
                <div className="recon-blocker-item-row">
                  <div>
                    <strong className="recon-blocker-item-heading">
                      Thiết bị chưa nhận trả / chưa có kết luận: {debtEquipment.length} thiết bị
                    </strong>
                    <div className="recon-muted-xs">
                      Mã: {debtEquipment.map((d) => d.equipmentDisplayCode || d.equipmentId).join(", ")}
                    </div>
                  </div>
                  <span className="recon-pill-danger">
                    Cần lập Phiếu nhận trả
                  </span>
                </div>
              )}

              {pendingSurcharges.map((ps) => (
                <div key={ps.id} className="recon-blocker-item-row">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="recon-pill-warning-sm">Phụ phí chờ duyệt</span>
                      <strong className="recon-surcharge-name">{ps.type} ({ps.equipmentId})</strong>
                      <span className="recon-mono-danger">+{fmt(ps.amount)}</span>
                    </div>
                    <div className="recon-muted-xs">Lý do: {ps.reason} · Người đề xuất: {ps.createdBy}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={reconBusy}
                      onClick={() => handleApproveSurchargeInline(ps)}
                      className="recon-btn-approve-inline"
                    >
                      ✓ Duyệt phụ phí
                    </button>
                    <button
                      type="button"
                      disabled={reconBusy}
                      onClick={() => handleRejectSurchargeInline(ps)}
                      className="recon-btn-reject-inline"
                    >
                      ✕ Từ chối
                    </button>
                  </div>
                </div>
              ))}

              {disputedSurcharges.map((ds) => (
                <div key={ds.id} className="recon-blocker-item-row">
                  <div>
                    <strong className="recon-dispute-title">Phụ phí đang tranh chấp: {ds.type} ({fmt(ds.amount)})</strong>
                    <div className="recon-muted-xs">Khách hàng phản hồi: {ds.customerResponse || "Chưa đồng thuận mức phí"}</div>
                  </div>
                  <span className="recon-pill-warning">
                    Cần thương lượng xong
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="recon-ready-box">
            <span className="recon-ready-icon">✓</span>
            <div className="recon-ready-text">
              <strong>Đủ điều kiện đối soát (Tiền điều kiện đạt):</strong> 100% thiết bị đã kết luận nhận trả; toàn bộ phụ phí đã được duyệt/xử lý.
            </div>
          </div>
        )}

        {/* ─── DÒNG 2 & LƯU Ý: BẢNG ĐỐI SOÁT CỌC & QUYẾT TOÁN TỔNG HỢP ─────────── */}
        <div className="reconcile-sheet-card">
          <div className="reconcile-sheet-header recon-sheet-header">
            <div>
              <strong className="recon-sheet-heading">
                Bảng Kê Quyết Toán Đối Soát Cọc
              </strong>
              <div className="recon-muted-xs">
                Số dư = Nghĩa vụ hợp lệ trừ tiền đã xử lý (Không cộng cọc vào doanh thu)
              </div>
            </div>
            <div className="flex gap-2">
              {isOrderCompleted && (
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="recon-print-btn"
                >
                  🖨️ In biên bản A4
                </button>
              )}
            </div>
          </div>

          {/* Dòng 1: Cọc thực thu ban đầu */}
          <div className="reconcile-sheet-row recon-sheet-row recon-row-subtle">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
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
              <div className="recon-muted-xs">
                Thanh toán lúc đặt đơn qua Cổng thanh toán / Chuyển khoản
              </div>
            </div>
            <div className="recon-amount-positive">
              +{fmt(depositCollected)}
            </div>
          </div>

          {/* Dòng 2: Chi tiết các khoản phụ phí đã duyệt (Căn cứ điều chỉnh) */}
          <div className="recon-surcharges-section">
            <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
              <strong className="recon-row-label">
                2. Các khoản phụ phí đã duyệt (Căn cứ điều chỉnh):
              </strong>
              <span className={`recon-surcharge-total ${totalApprovedSurcharges > 0 ? "has-amount" : ""}`}>
                −{fmt(totalApprovedSurcharges)}
              </span>
            </div>

            {approvedSurcharges.length === 0 ? (
              <div className="recon-empty-surcharge">
                ✓ Thiết bị hoàn trả đầy đủ, nguyên vẹn — Không phát sinh phụ phí bồi thường hoặc trễ hạn.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 recon-surcharge-list">
                {approvedSurcharges.map((s) => {
                  // Tìm phiếu nhận trả liên quan (Dòng 3: Truy về chứng từ gốc)
                  const relatedReceipt = (order.returnReceipts || []).find((r) =>
                    r.items.some((it) => it.equipmentId === s.equipmentId && it.surchargeAmount === s.amount)
                  );

                  return (
                    <div key={s.id} className="recon-surcharge-item">
                      <div>
                        <span className="recon-surcharge-type">{s.type}</span> — Thiết bị: <span className="recon-mono-bold">{s.equipmentId}</span>
                        <span className="recon-surcharge-reason">({s.reason})</span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
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
                        <span className="recon-mono-danger">
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
          <div className="reconcile-sheet-row recon-sheet-row recon-row-subtle">
            <div>
              <strong>3. Các khoản đã thu thêm / hoàn cọc trước đó:</strong>
              <div className="recon-muted-xs">
                Thu thêm trước đó: {fmt(priorCollect)} · Đã hoàn trước đó: {fmt(priorRefund)}
              </div>
            </div>
            <div className="recon-prior-amount">
              {priorSettled !== 0 ? (priorSettled > 0 ? `+${fmt(priorSettled)}` : `−${fmt(Math.abs(priorSettled))}`) : "0 đ"}
            </div>
          </div>

          {/* Dòng 4: TỔNG KẾT CHÊNH LỆCH ĐỐI SOÁT (Net Settlement Difference) */}
          {/* Nền đỏ nhạt khi cần thu thêm, nền xanh lá nhạt khi cân bằng hoặc hoàn cọc */}
          <div className={`recon-net-box ${!isBalanced && netDifference <= 0 ? "is-collect" : ""}`}>
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <span className="recon-net-eyebrow">
                  Kết luận chênh lệch đối soát:
                </span>
                <div className={`recon-net-title ${netStateClass}`}>
                  {isBalanced
                    ? "✓ Cân bằng tuyệt đối (0 đ) — Không phát sinh nghĩa vụ tiền"
                    : netDifference > 0
                    ? `Cửa hàng phải HOÀN TRẢ CỌC cho khách: +${fmt(refundAmount)}`
                    : `Khách hàng cần THANH TOÁN BỔ SUNG: −${fmt(extraAmount)}`}
                </div>
                <div className="recon-net-formula">
                  Căn cứ tính: Cọc {fmt(depositCollected)} − Phụ phí {fmt(totalApprovedSurcharges)} {priorSettled !== 0 ? `− Đã xử lý ${fmt(priorSettled)}` : ""} = {fmt(Math.abs(netDifference))}
                </div>
              </div>

              <div className="recon-net-right">
                <div className={`recon-net-value ${netStateClass}`}>
                  {fmt(Math.abs(netDifference))}
                </div>
                <span className="recon-net-code">
                  {isBalanced ? "Dòng 5.1" : netDifference > 0 ? "EP5.4-HOAN (UC5.6)" : "EP5.4-THU (UC5.5)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── DÒNG 4: XÁC NHẬN BẢNG ĐỐI SOÁT & THỰC HIỆN NGHĨA VỤ TIỀN ────────── */}
        {!isOrderCompleted && (
          <div className="recon-action-panel">
            {/* Trạng thái xác nhận bảng đối soát (Bước 4) */}
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <div>
                <strong className="recon-action-heading">
                  Quy trình chốt đối soát & tất toán đơn:
                </strong>
                {isConfirmed ? (
                  <div className="recon-status-confirmed">
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
                  <div className="recon-status-pending">
                    Bước 4: Xác nhận căn cứ số liệu trước khi tiến hành giao dịch tiền.
                  </div>
                )}
              </div>

              {!isConfirmed && (
                <button
                  type="button"
                  disabled={isBlocked || reconBusy}
                  onClick={handleConfirmStep4}
                  className={`recon-confirm-btn ${isBlocked || reconBusy ? "is-disabled" : ""}`}
                >
                  {reconBusy ? "Đang xác nhận..." : "Xác nhận bảng đối soát (Bước 4)"}
                </button>
              )}
            </div>

            {/* Chi tiết các lệnh hoàn tiền & thu bổ sung backend đang mở */}
            {app.realApi && refundsBackend && refundsBackend.items.length > 0 && (
              <div className="recon-refunds-box">
                <div className="recon-refunds-title">
                  Lệnh hoàn tiền trên máy chủ ({refundsBackend.items.length} lệnh · Đã hoàn: {fmt(refundsBackend.tongDaHoan)})
                </div>
                <div className="flex flex-col gap-2">
                  {refundsBackend.items.map((ht) => {
                    // Ánh xạ trạng thái lệnh hoàn tiền sang modifier class
                    const txBadgeClass =
                      ht.trangThai === "ThanhCong"
                        ? "is-success"
                        : ht.trangThai === "ThatBai"
                        ? "is-failed"
                        : "";
                    return (
                      <div key={ht.maHoanTien} className="recon-refund-row">
                        <div>
                          <strong className="recon-mono-forest">{ht.maYeuCau || `HT-${ht.maHoanTien}`}</strong>
                          <span className="recon-refund-label">{ht.nhanHienThi}</span>
                          <span className="recon-refund-amt">{fmt(ht.soTien)}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`recon-tx-badge ${txBadgeClass}`}>
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
                                className="recon-btn-process-refund"
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
                                className="recon-btn-check-refund"
                              >
                                Đối chiếu
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                  className={`recon-btn-settle is-balanced ${isBlocked || reconBusy ? "is-disabled" : ""}`}
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
                  className={`recon-btn-settle is-collect ${isBlocked || reconBusy ? "is-disabled" : ""}`}
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
                  className={`recon-btn-settle ${isBlocked || reconBusy ? "is-disabled" : ""}`}
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
                  className="recon-btn-lock"
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
                  className="recon-btn-sim-fail"
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
          <div className="recon-completed-box">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="recon-completed-icon">🎉</span>
                  <strong className="recon-completed-title">
                    Đơn hàng Đã Khóa Đối Soát & Hoàn Tất Thành Công (Dòng 7)
                  </strong>
                </div>
                <div className="recon-completed-meta">
                  Thời điểm khóa: <strong>{order.reconciledAt}</strong> · Người chốt: <strong>{order.reconciliation?.lockedBy || "Nhân viên"}</strong>
                </div>
                <div className="recon-completed-desc">
                  Mọi nghĩa vụ thiết bị và tiền cọc đã được quyết toán triệt để. Dữ liệu đã khóa để phục vụ 4 trụ cột báo cáo tài chính.
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="recon-btn-print-a4"
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
                    className="recon-btn-adjust"
                    title="Sửa sai tài chính sau khi đã đối soát có liên kết chứng từ gốc (UC5.7)"
                  >
                    📑 Lập điều chỉnh sau chốt (UC5.7)
                  </button>
                )}
              </div>
            </div>

            {/* Lịch sử giao dịch tiền của đơn */}
            <div className="recon-tx-history">
              <strong className="recon-tx-history-title">Lịch sử chứng từ tiền liên quan ({order.transactions?.length || 0} giao dịch):</strong>
              <div className="flex flex-col gap-1.5 mt-2">
                {order.transactions?.map((tx) => {
                  // Phân loại màu số tiền theo loại giao dịch (hoàn cọc / thu thêm / mặc định)
                  const txAmountClass =
                    tx.type === "Hoàn cọc" ? "is-refund" : tx.type === "Thu thêm" ? "is-collect" : "";
                  return (
                    <div key={tx.id} className="recon-tx-row">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="recon-mono-forest-bold">{tx.id}</span>
                        <span className="recon-tx-type">{tx.type}</span>
                        <span className="recon-tx-note">({tx.note})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`recon-tx-amount ${txAmountClass}`}>
                          {fmt(tx.amount)}
                        </span>
                        <span className={`recon-tx-status-pill ${tx.status === "Thành công" ? "is-success" : ""}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      {showCollectModal && (
        <CollectSurchargeModal
          order={order}
          app={app}
          donId={donId}
          extraAmount={extraAmount}
          collectMethod={collectMethod}
          setCollectMethod={setCollectMethod}
          cashTendered={cashTendered}
          setCashTendered={setCashTendered}
          posTerminalCode={posTerminalCode}
          setPosTerminalCode={setPosTerminalCode}
          posAuthCode={posAuthCode}
          setPosAuthCode={setPosAuthCode}
          collectNote={collectNote}
          setCollectNote={setCollectNote}
          pendingCollectReq={pendingCollectReq}
          setPendingCollectReq={setPendingCollectReq}
          doiSoatBackend={doiSoatBackend}
          ensureConfirmedDoiSoat={ensureConfirmedDoiSoat}
          syncAfterMutation={syncAfterMutation}
          reconBusy={reconBusy}
          setReconBusy={setReconBusy}
          setReconError={setReconError}
          setReconSuccess={setReconSuccess}
          onClose={() => setShowCollectModal(false)}
        />
      )}
      {showRefundModal && (
        <RefundDepositModal
          order={order}
          app={app}
          donId={donId}
          refundAmount={refundAmount}
          refundMethod={refundMethod}
          setRefundMethod={setRefundMethod}
          bankName={bankName}
          setBankName={setBankName}
          bankAccount={bankAccount}
          setBankAccount={setBankAccount}
          bankHolder={bankHolder}
          setBankHolder={setBankHolder}
          refundNote={refundNote}
          setRefundNote={setRefundNote}
          ensureConfirmedDoiSoat={ensureConfirmedDoiSoat}
          syncAfterMutation={syncAfterMutation}
          reconBusy={reconBusy}
          setReconBusy={setReconBusy}
          setReconError={setReconError}
          setReconSuccess={setReconSuccess}
          onClose={() => setShowRefundModal(false)}
        />
      )}
      <ReconciliationTraceModals
        order={order}
        viewingTx={viewingTx}
        setViewingTx={setViewingTx}
        viewingReturnReceipt={viewingReturnReceipt}
        setViewingReturnReceipt={setViewingReturnReceipt}
        viewingSurcharge={viewingSurcharge}
        setViewingSurcharge={setViewingSurcharge}
        showPrintModal={showPrintModal}
        setShowPrintModal={setShowPrintModal}
        depositCollected={depositCollected}
        totalApprovedSurcharges={totalApprovedSurcharges}
        approvedSurcharges={approvedSurcharges}
        priorSettled={priorSettled}
        netDifference={netDifference}
        refundAmount={refundAmount}
        extraAmount={extraAmount}
        isBalanced={isBalanced}
        initialTransaction={initialTransaction}
      />
      {showAdjustmentModal && (
        <FinancialAdjustmentModal
          order={order}
          app={app}
          userRole={userRole}
          depositCollected={depositCollected}
          totalApprovedSurcharges={totalApprovedSurcharges}
          approvedSurcharges={approvedSurcharges}
          doiSoatBackend={doiSoatBackend}
          syncAfterMutation={syncAfterMutation}
          setReconBusy={setReconBusy}
          setReconError={setReconError}
          adjType={adjType}
          setAdjType={setAdjType}
          adjAmount={adjAmount}
          setAdjAmount={setAdjAmount}
          adjReason={adjReason}
          setAdjReason={setAdjReason}
          adjMessage={adjMessage}
          setAdjMessage={setAdjMessage}
          adjSurchargeId={adjSurchargeId}
          setAdjSurchargeId={setAdjSurchargeId}
          onClose={() => setShowAdjustmentModal(false)}
        />
      )}
    </div>
  );
}
