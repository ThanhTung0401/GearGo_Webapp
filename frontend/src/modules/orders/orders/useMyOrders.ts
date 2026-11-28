import { useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import type { Surcharge } from "../../../store";
import {
  orderApi,
  paymentApi,
  type DonChiTietBackend,
  type PhieuBanGiaoKhachBackend,
  type XemTruocHuyBackend,
} from "../../../services/api";
import { mapDonChiTietToOrder } from "../../../services/mappers";

export type ViewingRecordType = "bbbg" | "pnt" | "reconciliation" | null;

export interface ExtraPayStatus {
  maYeuCau?: string;
  paymentUrl?: string | null;
  message: string;
}

export const ORDER_STATUS_OPTIONS = [
  "Tất cả",
  "Chờ thanh toán",
  "Đã xác nhận",
  "Đang chuẩn bị",
  "Sẵn sàng nhận",
  "Đang thuê",
  "Đã nhận trả",
  "Chờ đối soát",
  "Hoàn tất",
  "Hết hạn",
  "Đã hủy",
];

/**
 * Hook quản lý danh sách đơn thuê, xem chi tiết chứng từ, hủy đơn (UC3.4),
 * khiếu nại phụ phí (UC5.2) và thanh toán thu bổ sung sau đối soát (UC5.5).
 */
export function useMyOrders() {
  const app = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelPreview, setCancelPreview] = useState<XemTruocHuyBackend | null>(null);
  const [cancelPreviewLoading, setCancelPreviewLoading] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [statusTab, setStatusTab] = useState<string>("Tất cả");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewingRecord, setViewingRecord] = useState<ViewingRecordType>(null);

  // UC5.2 Dòng 5.1: Khiếu nại phụ phí
  const [disputeSurchargeTarget, setDisputeSurchargeTarget] = useState<Surcharge | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // UC3.3 & UC5.5: Dữ liệu bàn giao, chính sách gắn với đơn & thu bổ sung đối soát
  const [rawOrderDetail, setRawOrderDetail] = useState<DonChiTietBackend | null>(null);
  const [orderHandovers, setOrderHandovers] = useState<PhieuBanGiaoKhachBackend[]>([]);
  const [orderPolicy, setOrderPolicy] = useState<Record<string, unknown> | null>(null);
  const [extraPayBusy, setExtraPayBusy] = useState(false);
  const [extraPayStatus, setExtraPayStatus] = useState<ExtraPayStatus | null>(null);

  // Tự động mở đúng đơn thuê khi người dùng bấm "Xem đơn" từ chuông thông báo
  useEffect(() => {
    const openTarget = (rawId: string | null) => {
      if (!rawId) return;
      sessionStorage.removeItem("geargo_open_order_id");
      setStatusTab("Tất cả");
      const matched = app.orders.find(
        (o) => o.id === rawId || String(o.backendId) === rawId || o.displayCode === rawId
      );
      const targetOrderId = matched?.id ?? rawId;
      setSelected(targetOrderId);
      setActionError("");
      if (app.realApi) {
        setLoadingDetail(true);
        void refreshOrderById(targetOrderId)
          .catch((err) => {
            setActionError(err instanceof Error ? err.message : "Không thể tải chi tiết đơn thuê.");
          })
          .finally(() => setLoadingDetail(false));
      }
    };

    openTarget(sessionStorage.getItem("geargo_open_order_id"));

    const onOpenOrder = (e: Event) => {
      const custom = e as CustomEvent<{ orderId?: string }>;
      openTarget(custom.detail?.orderId ?? sessionStorage.getItem("geargo_open_order_id"));
    };
    window.addEventListener("geargo:open-order", onOpenOrder);
    return () => window.removeEventListener("geargo:open-order", onOpenOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.realApi]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const myOrders = app.orders.filter((o) => {
    const matchTab =
      statusTab === "Tất cả"
        ? true
        : statusTab === "Hết hạn"
        ? o.status === "Hết hạn" || (o.status as string) === "Hết hạn thanh toán"
        : statusTab === "Đã hủy"
        ? o.status === "Khách hủy" || o.status === "Cửa hàng hủy"
        : o.status === statusTab;
    if (!matchTab) return false;
    if (!normalizedSearch) return true;
    const codeMatch = (o.displayCode || o.id).toLowerCase().includes(normalizedSearch) || o.id.toLowerCase().includes(normalizedSearch);
    const productMatch = o.items.some((item) => item.productName.toLowerCase().includes(normalizedSearch));
    return codeMatch || productMatch;
  });

  const detail = app.orders.find((o) => o.id === selected);
  const localCancellationQuote = cancelling ? app.getCancellationQuote(cancelling) : null;
  const cancellingOrder = cancelling ? app.orders.find((o) => o.id === cancelling) : null;

  // Tải lại chi tiết đơn hàng từ backend kèm biên bản bàn giao và chính sách áp dụng tại thời điểm đặt
  const refreshOrderById = async (orderId: string | number) => {
    const numericId = Number(orderId);
    const dto = await orderApi.layChiTietDon(numericId);
    setRawOrderDetail(dto);
    app.upsertOrder?.(
      mapDonChiTietToOrder(dto, {
        customerId: app.currentUser?.id,
        customerName: app.currentUser?.name,
      })
    );
    const [bgRes, csRes] = await Promise.allSettled([
      orderApi.layBanGiaoDon(numericId),
      orderApi.layChinhSachDon(numericId),
    ]);
    if (bgRes.status === "fulfilled") {
      setOrderHandovers(bgRes.value ?? []);
    } else {
      setOrderHandovers([]);
    }
    if (csRes.status === "fulfilled" && csRes.value && typeof csRes.value === "object") {
      setOrderPolicy(csRes.value as Record<string, unknown>);
    } else {
      setOrderPolicy(null);
    }
  };

  // Khi bấm vào 1 đơn ở realApi, tải full chi tiết chứng từ (BBBG, PNT, phụ phí, đối soát)
  const handleSelectOrder = async (orderId: string) => {
    if (selected === orderId) {
      setSelected(null);
      return;
    }
    setSelected(orderId);
    setActionError("");
    if (app.realApi) {
      setLoadingDetail(true);
      try {
        await refreshOrderById(orderId);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Không thể tải chi tiết đơn thuê.");
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  // Mở modal hủy và lấy báo giá hoàn tiền từ backend (UC3.4)
  const handleOpenCancel = async (orderId: string) => {
    setCancelling(orderId);
    setCancelReason("");
    setActionError("");
    setCancelPreview(null);
    if (!app.realApi) return;

    const target = app.orders.find((o) => o.id === orderId);
    if (target?.status === "Chờ thanh toán") return;

    setCancelPreviewLoading(true);
    try {
      const preview = await orderApi.xemTruocHuy(Number(orderId));
      setCancelPreview(preview);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể kiểm tra chính sách hủy đơn.");
    } finally {
      setCancelPreviewLoading(false);
    }
  };

  // Gửi xác nhận hủy đơn thuê (phân nhánh đơn chưa thanh toán vs đã xác nhận)
  const handleConfirmCancel = async () => {
    if (!cancelling || !cancelReason.trim()) return;
    if (!app.realApi) {
      app.cancelOrder(cancelling, cancelReason);
      setCancelling(null);
      return;
    }
    setCancelSubmitting(true);
    setActionError("");
    try {
      if (cancellingOrder?.status === "Chờ thanh toán") {
        await orderApi.huyDonChuaThanhToan(Number(cancelling), cancelReason.trim());
      } else {
        await orderApi.khachHuyDon(Number(cancelling), {
          lyDo: cancelReason.trim(),
          xacNhanChiPhi: true,
          dauVanTayXemTruoc: cancelPreview?.dauVanTay ?? undefined,
        });
      }
      await refreshOrderById(cancelling);
      void app.refreshCatalog?.();
      setCancelling(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể hủy đơn thuê.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Khởi tạo giao dịch thu bổ sung sau đối soát (UC5.5)
  const handleExtraPay = async (maDoiSoat: number, orderId: string) => {
    setExtraPayBusy(true);
    setActionError("");
    try {
      const yeuCau = await paymentApi.taoThuBoSung(maDoiSoat, "VNPAY");
      if (yeuCau.paymentUrl) {
        window.open(yeuCau.paymentUrl, "_blank");
      }
      setExtraPayStatus({
        maYeuCau: yeuCau.maYeuCau,
        paymentUrl: yeuCau.paymentUrl,
        message: yeuCau.paymentUrl
          ? `Đã tạo yêu cầu thu bổ sung (${yeuCau.maYeuCau}). Vui lòng hoàn tất trên cổng thanh toán.`
          : `Đã ghi nhận yêu cầu thu bổ sung (${yeuCau.maYeuCau}) - Trạng thái: ${yeuCau.trangThai}.`,
      });
      await refreshOrderById(orderId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể tạo giao dịch thu bổ sung.");
    } finally {
      setExtraPayBusy(false);
    }
  };

  // Kiểm tra trạng thái giao dịch thu bổ sung từ cổng thanh toán
  const handleCheckExtraPayStatus = async (maYeuCau: string, orderId: string) => {
    try {
      const st = await paymentApi.layTrangThaiGiaoDich(maYeuCau);
      setExtraPayStatus((prev) =>
        prev ? { ...prev, message: `Trạng thái giao dịch ${st.maYeuCau}: ${st.trangThai}` } : prev
      );
      await refreshOrderById(orderId);
    } catch {
      /* bỏ qua lỗi kiểm tra tạm thời */
    }
  };

  return {
    app,
    selected,
    setSelected,
    loadingDetail,
    cancelling,
    setCancelling,
    cancelReason,
    setCancelReason,
    cancelPreview,
    cancelPreviewLoading,
    cancelSubmitting,
    actionError,
    setActionError,
    statusTab,
    setStatusTab,
    searchQuery,
    setSearchQuery,
    viewingRecord,
    setViewingRecord,
    disputeSurchargeTarget,
    setDisputeSurchargeTarget,
    disputeReason,
    setDisputeReason,
    disputeSubmitting,
    setDisputeSubmitting,
    rawOrderDetail,
    orderHandovers,
    orderPolicy,
    extraPayBusy,
    extraPayStatus,
    myOrders,
    detail,
    localCancellationQuote,
    cancellingOrder,
    refreshOrderById,
    handleSelectOrder,
    handleOpenCancel,
    handleConfirmCancel,
    handleExtraPay,
    handleCheckExtraPayStatus,
  };
}
