import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { orderApi, type XemTruocHuyBackend } from "../../../services/api";
import { Order } from "../../../store";

export type OrdersQuickFilter = "all" | "delivery_today" | "pickup_today" | "overdue" | "partial";

export const ORDER_STATUS_FILTERS = [
  "Tất cả",
  "Đã xác nhận",
  "Đang chuẩn bị",
  "Sẵn sàng nhận",
  "Đang thuê",
  "Trả một phần",
  "Quá hạn",
  "Chờ đối soát",
  "Hoàn tất",
];

// Hook quản lý bộ lọc ca trực, chi tiết hồ sơ đơn và quy trình ghi nhận No-Show (UC4.5)
export function useOrdersTab(
  app: ReturnType<typeof useApp>,
  hydrateOperationalOrder: (id: string) => Promise<void>
) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tất cả");
  const [quickFilter, setQuickFilter] = useState<OrdersQuickFilter>("all");
  const [viewingDetailOrderId, setViewingDetailOrderId] = useState<string | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<Order | null>(null);
  const [noShowNote, setNoShowNote] = useState("Đã gọi điện nhắc 2 lần nhưng không nghe máy / Khách không đến quầy");
  const [noShowSubmitting, setNoShowSubmitting] = useState(false);
  const [noShowError, setNoShowError] = useState("");
  const [noShowPreview, setNoShowPreview] = useState<XemTruocHuyBackend | null>(null);

  const viewingDetailOrder = viewingDetailOrderId
    ? app.orders.find((o) => o.id === viewingDetailOrderId) ?? null
    : null;

  // Đếm nhanh số lượng đơn theo nghiệp vụ vận hành trong ca (UC4.5)
  const deliveryTodayCount = app.orders.filter((o) =>
    ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status)
  ).length;
  const pickupTodayCount = app.orders.filter((o) => ["Đang thuê", "Quá hạn"].includes(o.status)).length;
  const overdueCount = app.orders.filter((o) => app.checkOrderOverdue(o).isOverdue).length;
  const partialCount = app.orders.filter((o) => {
    if (o.status !== "Đang thuê") return false;
    const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
    return returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;
  }).length;

  const handleOpenDetail = (order: Order) => {
    setViewingDetailOrderId(order.id);
    void hydrateOperationalOrder(order.id);
  };

  // Mở modal No-Show và tải xem trước chính sách khấu trừ nếu kết nối API thật
  const handleOpenNoShow = (o: Order) => {
    setNoShowTarget(o);
    setNoShowError("");
    setNoShowPreview(null);
    setNoShowNote("Đã gọi điện nhắc 2 lần nhưng không nghe máy / Khách không đến quầy");
    if (app.realApi || isRealApiEnabled()) {
      void orderApi
        .xemTruocKhongDenNhan(Number(o.backendId ?? o.id))
        .then(setNoShowPreview)
        .catch(() => {});
    }
  };

  // Xác nhận ghi nhận khách vắng mặt (hỗ trợ cả backend thật và mock)
  const handleSubmitNoShow = async () => {
    if (!noShowTarget || !noShowNote.trim()) return;
    if (app.realApi) {
      setNoShowSubmitting(true);
      setNoShowError("");
      try {
        await orderApi.ghiNhanKhongDenNhan(Number(noShowTarget.backendId ?? noShowTarget.id), {
          ghiChu: noShowNote.trim(),
          xuLyHuy: false,
          dauVanTayXemTruoc: noShowPreview?.dauVanTay,
        });
        await hydrateOperationalOrder(noShowTarget.id);
        await app.refreshOrders?.();
        setNoShowTarget(null);
      } catch (err) {
        setNoShowError(err instanceof Error ? err.message : "Không thể ghi nhận khách vắng mặt.");
      } finally {
        setNoShowSubmitting(false);
      }
      return;
    }

    const res = app.reportCustomerNoShow(noShowTarget.id, noShowNote.trim(), app.currentUser?.name || "Nhân viên kho");
    if (res.ok) {
      setNoShowTarget(null);
    } else {
      setNoShowError(res.message);
    }
  };

  // Lọc danh sách đơn kết hợp bộ lọc nhanh, trạng thái và từ khóa tìm kiếm
  const filtered = app.orders.filter((o) => {
    const isOverdue = app.checkOrderOverdue(o).isOverdue;
    const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
    const isPartial = o.status === "Đang thuê" && returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;

    let matchQuick = true;
    if (quickFilter === "delivery_today") matchQuick = ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status);
    if (quickFilter === "pickup_today") matchQuick = ["Đang thuê", "Quá hạn"].includes(o.status);
    if (quickFilter === "overdue") matchQuick = isOverdue;
    if (quickFilter === "partial") matchQuick = isPartial;

    let matchStatus = filter === "Tất cả" || o.status === filter;
    if (filter === "Quá hạn") matchStatus = isOverdue;
    if (filter === "Trả một phần") matchStatus = isPartial;

    const q = search.toLowerCase();
    const matchSearch =
      (o.displayCode || o.id).toLowerCase().includes(q) ||
      o.id.includes(search) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(search);
    return matchQuick && matchStatus && matchSearch;
  });

  return {
    search,
    setSearch,
    filter,
    setFilter,
    quickFilter,
    setQuickFilter,
    viewingDetailOrder,
    setViewingDetailOrderId,
    noShowTarget,
    setNoShowTarget,
    noShowNote,
    setNoShowNote,
    noShowSubmitting,
    noShowError,
    noShowPreview,
    deliveryTodayCount,
    pickupTodayCount,
    overdueCount,
    partialCount,
    filtered,
    handleOpenDetail,
    handleOpenNoShow,
    handleSubmitNoShow,
  };
}
