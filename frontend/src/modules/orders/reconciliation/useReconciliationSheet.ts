import { useState, useEffect, useCallback } from "react";
import type { useApp } from "../../../context/AppContext";
import {
  reconciliationApi,
  refundApi,
  surchargeApi,
  type DoiSoatBackend,
  type XemTruocDoiSoatBackend,
  type HoanTienTheoDonBackend,
  type YeuCauThuBackend,
} from "../../../services/api";
import { mapPhuPhiToSurcharge } from "../../../services/mappers";
import type { Order, Surcharge, MoneyTransaction, ReturnReceipt } from "../../../store";
import { computeReconciliationMetrics } from "./reconciliationUtils";

export interface UseReconciliationSheetParams {
  order: Order;
  app: ReturnType<typeof useApp>;
  onAfterMutation?: () => Promise<void> | void;
}

/**
 * Hook quản lý toàn bộ trạng thái, đồng bộ API và nghiệp vụ UC5.4 - UC5.7
 * cho bảng đối soát cọc & hoàn tất đơn.
 */
export function useReconciliationSheet({ order, app, onAfterMutation }: UseReconciliationSheetParams) {
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
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState(order.customerName.toUpperCase());
  const [refundNote, setRefundNote] = useState("");

  // Đồng bộ lại tên chủ tài khoản nhận hoàn cọc mỗi khi đổi đơn
  // FN5-15: reset đầy đủ state hoàn cọc (kênh, ngân hàng, ghi chú) để không lẫn dữ liệu đơn cũ
  useEffect(() => {
    setBankHolder((order.customerName || "").toUpperCase());
    setBankAccount("");
    setBankName("Vietcombank");
    setRefundMethod("bank");
    setRefundNote("");
  }, [order.id, order.customerName]);

  // FN5-14: Reset toàn bộ state backend và các modal con khi đổi đơn để tránh hiển thị dữ liệu đơn cũ.
  useEffect(() => {
    setPreviewBackend(null);
    setDoiSoatBackend(null);
    setRefundsBackend(null);
    setSurchargesBackend(null);
    setPendingCollectReq(null);
    setShowCollectModal(false);
    setShowRefundModal(false);
    setShowAdjustmentModal(false);
    setReconError(null);
    setReconSuccess(null);
  }, [order.id]);

  // Trạng thái modal UC5.7: Điều chỉnh tài chính sau chốt
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjType, setAdjType] = useState<"Thu bù" | "Hoàn trả" | "Bù trừ chiết khấu">("Hoàn trả");
  const [adjAmount, setAdjAmount] = useState<number>(50000);
  const [adjReason, setAdjReason] = useState("");
  const [adjMessage, setAdjMessage] = useState("");
  const [adjSurchargeId, setAdjSurchargeId] = useState<string>("");

  const donId = order.backendId ?? Number(order.id);

  // Tải song song dữ liệu xem trước, bảng đối soát, hoàn tiền và phụ phí từ backend
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

  const metrics = computeReconciliationMetrics(order, Boolean(app.realApi), previewBackend, doiSoatBackend, surchargesBackend);

  // Đảm bảo bảng đối soát tồn tại và đã xác nhận ở backend trước khi thao tác tiền/chốt
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

  // Bọc các thao tác backend chung trạng thái busy/error/success + đồng bộ lại đơn
  const runBackendAction = async (task: () => Promise<string>, fallbackErr: string) => {
    setReconBusy(true);
    setReconError(null);
    try {
      const successMsg = await task();
      setReconSuccess(successMsg);
      await syncAfterMutation();
    } catch (err) {
      setReconError(err instanceof Error ? err.message : fallbackErr);
    } finally {
      setReconBusy(false);
    }
  };

  const handleConfirmStep4 = async () => {
    setReconError(null);
    setReconSuccess(null);
    if (app.realApi) {
      await runBackendAction(async () => {
        await ensureConfirmedDoiSoat();
        return "Đã lập và xác nhận bảng tính đối soát.";
      }, "Không thể xác nhận bảng đối soát.");
      return;
    }
    const res = app.confirmReconciliation(order.id);
    if (!res.ok) setReconError(res.message);
  };

  const handleFinalizeBalanced = async () => {
    setReconError(null);
    setReconSuccess(null);
    if (app.realApi) {
      await runBackendAction(async () => {
        let ds = await ensureConfirmedDoiSoat();
        ds = await reconciliationApi.chotDoiSoat(ds.maDoiSoat);
        setDoiSoatBackend(ds);
        return "Đã chốt đối soát cân bằng 0 đ và hoàn tất đơn.";
      }, "Không thể chốt đối soát đơn.");
      return;
    }
    const res = app.finalizeOrderWithoutPayment(order.id, "Chốt đối soát cân bằng không phát sinh chênh lệch tiền (Dòng 5.1)");
    if (!res.ok) setReconError(res.message);
  };

  const handleApproveSurchargeInline = async (ps: Surcharge) => {
    setReconError(null);
    if (app.realApi) {
      if (!ps.backendId) return;
      await runBackendAction(async () => {
        await surchargeApi.duyetPhi(ps.backendId!);
        return "Đã duyệt phụ phí.";
      }, "Không thể duyệt phụ phí (cần quyền Quản trị viên).");
      return;
    }
    app.approveSurcharge(order.id, ps.id);
  };

  const handleRejectSurchargeInline = async (ps: Surcharge) => {
    setReconError(null);
    if (app.realApi) {
      if (!ps.backendId) return;
      await runBackendAction(async () => {
        await surchargeApi.tuChoiPhi(ps.backendId!, "Từ chối khi rà soát điều kiện đối soát");
        return "Đã từ chối phụ phí.";
      }, "Không thể từ chối phụ phí.");
      return;
    }
    app.rejectSurcharge(order.id, ps.id);
  };

  const handleProcessRefund = (maHoanTien: number, maYeuCau?: string | null) =>
    runBackendAction(async () => {
      await refundApi.xuLyHoan(maHoanTien, refundNote || "Thực hiện hoàn tiền cọc từ bảng đối soát");
      return `Đã xử lý hoàn tiền ${maYeuCau || maHoanTien}.`;
    }, "Không thể xử lý hoàn tiền.");

  const handleCheckRefund = (maHoanTien: number, maYeuCau?: string | null) =>
    runBackendAction(async () => {
      await refundApi.doiChieuHoan(maHoanTien);
      return `Đã đối chiếu trạng thái hoàn tiền ${maYeuCau || maHoanTien}.`;
    }, "Không thể đối chiếu hoàn tiền.");

  const handleLockReconciliation = async () => {
    if (!doiSoatBackend) return;
    await runBackendAction(async () => {
      await reconciliationApi.chotDoiSoat(doiSoatBackend.maDoiSoat);
      return "Đã chốt khóa đối soát & hoàn tất đơn hàng.";
    }, "Chưa đủ điều kiện chốt đối soát (kiểm tra giao dịch tiền còn chờ).");
  };

  return {
    donId, viewingTx, setViewingTx, viewingSurcharge, setViewingSurcharge,
    viewingReturnReceipt, setViewingReturnReceipt, showPrintModal, setShowPrintModal,
    previewBackend, doiSoatBackend, refundsBackend, pendingCollectReq, setPendingCollectReq,
    reconLoading, reconBusy, setReconBusy, reconError, setReconError, reconSuccess, setReconSuccess,
    showCollectModal, setShowCollectModal, collectMethod, setCollectMethod,
    cashTendered, setCashTendered, posTerminalCode, setPosTerminalCode,
    posAuthCode, setPosAuthCode, collectNote, setCollectNote,
    showRefundModal, setShowRefundModal, refundMethod, setRefundMethod,
    bankName, setBankName, bankAccount, setBankAccount, bankHolder, setBankHolder,
    refundNote, setRefundNote, showAdjustmentModal, setShowAdjustmentModal,
    adjType, setAdjType, adjAmount, setAdjAmount, adjReason, setAdjReason,
    adjMessage, setAdjMessage, adjSurchargeId, setAdjSurchargeId,
    ...metrics,
    ensureConfirmedDoiSoat, syncAfterMutation, handleConfirmStep4, handleFinalizeBalanced,
    handleApproveSurchargeInline, handleRejectSurchargeInline,
    handleProcessRefund, handleCheckRefund, handleLockReconciliation,
  };
}
