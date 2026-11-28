import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { paymentApi, type GiaoDichCanDoiChieuBackend } from "../../../services/api/paymentApi";
import { reconciliationApi, type DoiSoatBackend } from "../../../services/api/reconciliationApi";
import { surchargeApi } from "../../../services/api/surchargeApi";
import { fmt, type FinancialAdjustment } from "../../../store";

export type ReconcileOutcome = "HopLe_XacNhan" | "HopLe_HoanTienThua" | "TuChoi";

/**
 * Hook quản lý điều chỉnh tài chính sau đối soát (UC5.7) và đối chiếu giao dịch thanh toán ngoại lệ.
 */
export function useAdjustmentsTab(app: ReturnType<typeof useApp>) {
  const realApi = app.realApi || isRealApiEnabled();
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<FinancialAdjustment["type"]>("Thu bù");
  const [amount, setAmount] = useState<number>(100000);
  const [orderId, setOrderId] = useState("");
  const [importReceiptId, setImportReceiptId] = useState("");
  const [reason, setReason] = useState("");

  // State kết nối API thật: đối chiếu ngoại lệ thanh toán & điều chỉnh đối soát sau chốt
  const [pendingPayments, setPendingPayments] = useState<GiaoDichCanDoiChieuBackend[]>([]);
  const [serverAdjustments, setServerAdjustments] = useState<FinancialAdjustment[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState("");

  const [reconcileTarget, setReconcileTarget] = useState<GiaoDichCanDoiChieuBackend | null>(null);
  const [reconcileOutcome, setReconcileOutcome] = useState<ReconcileOutcome>("HopLe_XacNhan");
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
      const [items, dieuChinhList] = await Promise.all([
        paymentApi.layDanhSachCanDoiChieu(),
        reconciliationApi.layDanhSachDieuChinh().catch(() => [] as DoiSoatBackend[]),
      ]);
      setPendingPayments(items ?? []);
      // Map các biên bản điều chỉnh sau chốt từ DB sang FinancialAdjustment để không mất khi F5
      setServerAdjustments(
        (dieuChinhList ?? []).map((ds) => {
          const thuThem = Number(ds.soTienCanThuThem ?? 0);
          const hoanLai = Number(ds.soTienCanHoan ?? 0);
          const rawAmount = thuThem > 0 ? thuThem : hoanLai > 0 ? hoanLai : Math.abs(Number(ds.tongPhuPhiDuocDuyet ?? 0));
          return {
            id: `DS-DC-${ds.maDoiSoat}`,
            type: thuThem > 0 ? "Thu bù" : "Hoàn trả",
            amount: rawAmount,
            orderId: ds.maDonHienThi || String(ds.maDonThue),
            reason: ds.lyDoDieuChinh || "Điều chỉnh sau chốt đối soát",
            createdAt: ds.thoiDiemLap,
            createdBy: ds.nguoiLap || "Quản trị viên",
            approvedBy: ds.nguoiChot || ds.nguoiLap || "Quản trị viên",
            status: ds.trangThai === "DaChot" ? "Đã duyệt" : "Chờ duyệt",
          };
        })
      );
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Không thể tải danh sách giao dịch cần đối chiếu ngoại lệ.");
    } finally {
      setPayLoading(false);
    }
  }, [realApi]);

  useEffect(() => {
    void loadPendingPayments();
  }, [loadPendingPayments]);

  // Quy đổi mã đơn thuê (mã hiển thị hoặc id nội bộ) sang backendId số
  const resolveOrderBackendId = (rawOrderId: string): number | null => {
    if (!rawOrderId) return null;
    const matched = app.orders.find((o) => o.id === rawOrderId || o.displayCode === rawOrderId);
    if (matched?.backendId) return matched.backendId;
    // [ADJ-03]: nếu không khớp trong app.orders:
    //  - chuỗi thuần số → parse trực tiếp
    //  - mã hiển thị "ORD-2026-001"/"DT-20261123-05" → lấy cụm số CUỐI sau dấu "-"
    //    thay vì replace(/\D/g,"") (sẽ gộp 2026001/2026112305 sai với ID thực).
    if (/^\d+$/.test(rawOrderId)) {
      const parsed = Number(rawOrderId);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }
    const tail = rawOrderId.match(/-(\d+)$/)?.[1] ?? rawOrderId.match(/(\d+)$/)?.[1];
    const parsedTail = tail ? Number(tail) : NaN;
    return Number.isInteger(parsedTail) && parsedTail > 0 ? parsedTail : null;
  };

  // Tự động tra cứu biên bản đối soát và danh sách phụ phí khi chọn đơn hàng trong modal
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

  // Xác nhận kết luận đối chiếu giao dịch thanh toán ngoại lệ
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
    // [ADJ-04]: chặn hoàn vượt tổng tiền giao dịch gốc để không bị Backend từ chối 400.
    if (reconcileOutcome === "HopLe_HoanTienThua" && reconcileRefundAmount > Number(reconcileTarget.tongSoTien ?? 0)) {
      setReconcileModalError("Số tiền hoàn không được vượt quá tổng số tiền giao dịch.");
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

  // Lập chứng từ điều chỉnh bù trừ (gọi API điều chỉnh đối soát/phụ phí hoặc lưu store cục bộ)
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
      if (!orderDoiSoat || orderDoiSoat.trangThai !== "DaChot") {
        setModalError("Vui lòng chọn một đơn thuê đã hoàn tất (có biên bản đối soát đã chốt) để lưu chứng từ điều chỉnh vào hệ thống.");
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
          soTienDieuChinhCoDau: signedAmount,
          ghiChu: reason.trim(),
        } as any);
        await Promise.all([loadPendingPayments(), app.refreshOrders?.()]);
        setPaySuccess(`Đã lập & lưu chứng từ điều chỉnh sau chốt cho đơn #${orderDoiSoat.maDonHienThi || orderDoiSoat.maDonThue}.`);
        setShowModal(false);
        setReason("");
        setOrderId("");
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

  const openReconcileModal = (g: GiaoDichCanDoiChieuBackend) => {
    setReconcileTarget(g);
    setReconcileOutcome("HopLe_XacNhan");
    setReconcileNote("");
    setReconcileRefundAmount(Number(g.tongSoTien || 0));
    setReconcileModalError("");
  };

  return {
    realApi,
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
    pendingPayments,
    serverAdjustments,
    payLoading,
    payError,
    paySuccess,
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
    orderDoiSoat,
    orderSurchargeIds,
    selectedSurchargeId,
    setSelectedSurchargeId,
    orderLookupLoading,
    orderLookupError,
    modalError,
    setModalError,
    submitBusy,
    loadPendingPayments,
    handleConfirmReconcilePayment,
    handleSubmit,
    openReconcileModal,
  };
}
