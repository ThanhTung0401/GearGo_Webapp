import { useState, useEffect } from "react";
import type { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { orderApi, type XemTruocHuyBackend } from "../../../services/api/orderApi";
import { surchargeApi } from "../../../services/api/surchargeApi";
import { reportApi, type BaoCaoVanHanhBackend } from "../../../services/api/reportApi";
import { fmt, type Order, type Surcharge } from "../../../store";
import { usePermissions } from "../../../features/permissions";

/**
 * Hook quản lý dữ liệu tổng quan Dashboard, xử lý tranh chấp phụ phí (UC5.3),
 * giám sát luồng đơn/đối soát (UC5.4) và cửa hàng hủy đơn (UC3.4).
 */
export function useDashboardTab(app: ReturnType<typeof useApp>) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [adminSelectedOrder, setAdminSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>("Chờ đối soát");

  // UC5.3: Xử lý tranh chấp phụ phí
  const [resolvingSurcharge, setResolvingSurcharge] = useState<{ order: Order; surcharge: Surcharge } | null>(null);
  const [resolutionType, setResolutionType] = useState<"approved" | "rejected" | "adjusted">("approved");
  const [adjustedAmount, setAdjustedAmount] = useState<number>(0);
  const [resolutionReason, setResolutionReason] = useState("");
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [resolveError, setResolveError] = useState("");

  const [exportingCsv, setExportingCsv] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // UC3.4: Cửa hàng hủy đơn (xem trước & xác nhận)
  const [storeCancelOrder, setStoreCancelOrder] = useState<Order | null>(null);
  const [storeCancelPreview, setStoreCancelPreview] = useState<XemTruocHuyBackend | null>(null);
  const [storeCancelReason, setStoreCancelReason] = useState("");
  const [storeCancelLoading, setStoreCancelLoading] = useState(false);
  const [storeCancelError, setStoreCancelError] = useState("");

  const [opsReport, setOpsReport] = useState<BaoCaoVanHanhBackend | null>(null);
  const [revenueSummary, setRevenueSummary] = useState<{ tongDoanhThuHoanTat?: number; soDonHoanTat?: number } | null>(null);
  const [depositSummary, setDepositSummary] = useState<{ tongCocChuaTatToan?: number } | null>(null);

  // Tải số liệu tổng quan thật trong tháng hiện tại từ Backend khi bật Real API
  useEffect(() => {
    if (!isRealApi) return;
    let active = true;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfNow = now.toISOString();
    Promise.allSettled([
      reportApi.layBaoCaoVanHanh({ tuNgay: startOfMonth, denNgay: endOfNow }),
      reportApi.layDoanhThuHoanTat({ tuNgay: startOfMonth, denNgay: endOfNow, soMoiTrang: 20 }),
      reportApi.layCocChuaTatToan({ soMoiTrang: 20 }),
    ]).then(([opsRes, revRes, depRes]) => {
      if (!active) return;
      if (opsRes.status === "fulfilled") setOpsReport(opsRes.value);
      if (revRes.status === "fulfilled") setRevenueSummary(revRes.value);
      if (depRes.status === "fulfilled") setDepositSummary(depRes.value);
    });
    return () => {
      active = false;
    };
  }, [isRealApi, app.orders.length, app.equipment.length]);

  const { has, data: myPerm } = usePermissions();

  const currentMonthNum = new Date().getMonth() + 1;
  const fallbackMonthRevenue = app.orders
    .filter((o) => o.status === "Hoàn tất")
    .reduce(
      (sum, o) =>
        sum + (o.rental - o.discount) + o.surcharges.filter((s) => s.status === "Đã duyệt").reduce((ss, s) => ss + s.amount, 0),
      0
    );
  const displayRevenue = isRealApi && revenueSummary ? Number(revenueSummary.tongDoanhThuHoanTat ?? 0) : fallbackMonthRevenue;
  const displayCompletedCount =
    isRealApi && revenueSummary ? Number(revenueSummary.soDonHoanTat ?? 0) : app.orders.filter((o) => o.status === "Hoàn tất").length;
  const displayRentedCount =
    isRealApi && opsReport?.tongQuan
      ? opsReport.tongQuan.soThietBiDangChoThue
      : app.equipment.filter((e) => e.equipmentStatus === "Đang thuê").length;
  const displayTotalEquip = isRealApi && opsReport?.tongQuan ? opsReport.tongQuan.tongThietBiTrongKho : app.equipment.length;
  const displayHeldDeposit =
    isRealApi && depositSummary
      ? Number(depositSummary.tongCocChuaTatToan ?? 0)
      : app.orders.filter((o) => o.status === "Đang thuê").reduce((s, o) => s + o.depositTotal, 0);
  const processingOrdersCount = app.orders.filter((o) => !["Hoàn tất", "Khách hủy", "Cửa hàng hủy", "Hết hạn"].includes(o.status)).length;

  const pendingSurcharges = app.orders.flatMap((order) =>
    order.surcharges
      .filter((surcharge) => surcharge.status === "Chờ duyệt" || surcharge.status === "Tranh chấp")
      .map((surcharge) => ({ order, surcharge }))
  );

  // Xuất CSV doanh thu tháng hiện tại nếu có quyền BaoCao.Xuat
  const handleExportDashboardReport = async () => {
    setBannerMessage(null);
    if (!isRealApi) {
      setBannerMessage({
        type: "success",
        text: "Đang ở chế độ dữ liệu mẫu; bật Real API để xuất tệp CSV đối soát tài chính từ máy chủ.",
      });
      return;
    }
    setExportingCsv(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      await reportApi.xuatCsvTaiChinh({
        loaiBaoCao: "DoanhThuHoanTat",
        tuNgay: startOfMonth,
        denNgay: now.toISOString(),
      });
      setBannerMessage({ type: "success", text: `Đã tải xuống báo cáo doanh thu tháng ${currentMonthNum}.` });
    } catch (err) {
      setBannerMessage({ type: "error", text: err instanceof Error ? err.message : "Không thể xuất báo cáo CSV." });
    } finally {
      setExportingCsv(false);
    }
  };

  // Mở modal xem chứng cứ & kết luận phụ phí (UC5.3)
  const handleOpenResolveSurcharge = (order: Order, surcharge: Surcharge) => {
    setResolvingSurcharge({ order, surcharge });
    setResolutionType("approved");
    setAdjustedAmount(surcharge.amount);
    setResolutionReason("");
    setResolveError("");
  };

  // Xử lý submit kết luận tranh chấp hoặc duyệt/từ chối/điều chỉnh phụ phí
  const handleSubmitResolveSurcharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingSurcharge) return;
    setResolveError("");
    const finalAmt =
      resolutionType === "rejected" ? 0 : resolutionType === "adjusted" ? adjustedAmount : resolvingSurcharge.surcharge.amount;
    const reasonText =
      resolutionReason.trim() ||
      (resolutionType === "approved"
        ? "Quản trị viên chấp thuận mức phí đề xuất"
        : resolutionType === "adjusted"
        ? `Đã thương lượng giảm phí còn ${fmt(adjustedAmount)}`
        : "Bác bỏ do không đủ căn cứ thu");

    if (isRealApi) {
      const surchargeId = Number(resolvingSurcharge.surcharge.id);
      if (Number.isNaN(surchargeId)) {
        setResolveError("ID phụ phí không hợp lệ.");
        return;
      }
      setResolvingLoading(true);
      try {
        if (resolvingSurcharge.surcharge.status === "Tranh chấp") {
          await surchargeApi.giaiQuyetTranhChap(surchargeId, {
            ketQua: resolutionType === "approved" ? "GiuNguyen" : resolutionType === "rejected" ? "HuyPhi" : "DieuChinh",
            lyDo: reasonText,
            soTienDeXuatSauXuLy: resolutionType === "adjusted" ? adjustedAmount : undefined,
          });
        } else if (resolutionType === "approved") {
          await surchargeApi.duyetPhi(surchargeId, reasonText);
        } else if (resolutionType === "rejected") {
          await surchargeApi.tuChoiPhi(surchargeId, reasonText);
        } else {
          await surchargeApi.capNhatPhi(surchargeId, { soTien: adjustedAmount, lyDo: reasonText });
          await surchargeApi.duyetPhi(surchargeId, reasonText);
        }
        await app.refreshOrders?.();
        setResolvingSurcharge(null);
      } catch (err) {
        setResolveError(err instanceof Error ? err.message : "Không thể xử lý kết luận phụ phí lên máy chủ.");
      } finally {
        setResolvingLoading(false);
      }
      return;
    }

    app.resolveDisputedSurcharge(resolvingSurcharge.order.id, resolvingSurcharge.surcharge.id, resolutionType, finalAmt, reasonText);
    setResolvingSurcharge(null);
  };

  // Mở modal Cửa hàng hủy đơn (UC3.4) và tải xem trước hoàn tiền nếu bật Real API
  const handleOpenStoreCancel = async (o: Order) => {
    setStoreCancelOrder(o);
    setStoreCancelPreview(null);
    setStoreCancelReason("");
    setStoreCancelError("");
    if (isRealApi) {
      const orderNumId = Number(o.id);
      if (!Number.isNaN(orderNumId)) {
        setStoreCancelLoading(true);
        try {
          const preview = await orderApi.xemTruocCuaHangHuy(orderNumId);
          setStoreCancelPreview(preview);
        } catch (err) {
          setStoreCancelError(err instanceof Error ? err.message : "Không thể tải xem trước chi phí hủy đơn.");
        } finally {
          setStoreCancelLoading(false);
        }
      }
    }
  };

  // Xác nhận cửa hàng hủy đơn và làm mới danh sách đơn
  const handleConfirmStoreCancel = async () => {
    if (!storeCancelOrder) return;
    if (!storeCancelReason.trim()) {
      return setStoreCancelError("Vui lòng nhập lý do hủy đơn.");
    }
    setStoreCancelError("");
    if (isRealApi) {
      const orderNumId = Number(storeCancelOrder.id);
      if (Number.isNaN(orderNumId)) return setStoreCancelError("ID đơn không hợp lệ.");
      setStoreCancelLoading(true);
      try {
        await orderApi.cuaHangHuy(orderNumId, {
          lyDo: storeCancelReason.trim(),
          xacNhanChiPhi: true,
          dauVanTayXemTruoc: storeCancelPreview?.dauVanTay,
        });
        await app.refreshOrders?.();
        setBannerMessage({ type: "success", text: `Đã hủy đơn ${storeCancelOrder.id} từ phía cửa hàng (UC3.4).` });
        setStoreCancelOrder(null);
      } catch (err) {
        setStoreCancelError(err instanceof Error ? err.message : "Không thể hủy đơn hàng.");
      } finally {
        setStoreCancelLoading(false);
      }
      return;
    }
    setStoreCancelOrder(null);
  };

  return {
    has, myPerm, currentMonthNum, displayRevenue, displayCompletedCount, processingOrdersCount,
    displayRentedCount, displayTotalEquip, displayHeldDeposit, pendingSurcharges,
    exportingCsv, bannerMessage, handleExportDashboardReport,
    statusFilter, setStatusFilter, adminSelectedOrder, setAdminSelectedOrder,
    resolvingSurcharge, setResolvingSurcharge, resolutionType, setResolutionType,
    adjustedAmount, setAdjustedAmount, resolutionReason, setResolutionReason,
    resolvingLoading, resolveError, handleOpenResolveSurcharge, handleSubmitResolveSurcharge,
    storeCancelOrder, setStoreCancelOrder, storeCancelPreview, storeCancelReason,
    setStoreCancelReason, storeCancelLoading, storeCancelError,
    handleOpenStoreCancel, handleConfirmStoreCancel,
  };
}
