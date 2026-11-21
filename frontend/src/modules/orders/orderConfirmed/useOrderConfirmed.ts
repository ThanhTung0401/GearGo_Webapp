import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { orderApi, paymentApi } from "../../../services/api";
import { mapDonChiTietToOrder } from "../../../services/mappers";
import { parseServerTimestamp } from "../customerUtils";

/**
 * Hook quản lý đồng hồ giữ chỗ 15 phút, xác nhận thanh toán VietQR và đối chiếu cổng ngân hàng (UC3.2 & UC5.1).
 */
export function useOrderConfirmed() {
  const app = useApp();
  const [seconds, setSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [checkingGateway, setCheckingGateway] = useState(false);
  const [gatewayMessage, setGatewayMessage] = useState("");
  const [payError, setPayError] = useState("");

  const order = app.newOrderId ? app.orders.find((o) => o.id === app.newOrderId) : null;
  const paid = order?.status === "Đã xác nhận";
  const cancelled = order?.status === "Khách hủy" || order?.status === "Cửa hàng hủy";
  const expiresAtMs = parseServerTimestamp(order?.expiresAt);
  const expired =
    order?.status === "Hết hạn" ||
    (Number.isFinite(expiresAtMs) &&
      seconds === 0 &&
      !paid &&
      !cancelled &&
      order?.status === "Chờ thanh toán" &&
      expiresAtMs <= Date.now());
  const latestPayment = order?.transactions
    ?.filter((transaction) => transaction.type === "Thanh toán ban đầu")
    .at(-1);
  const displayOrderCode = order?.displayCode || order?.id || "";

  // Khi mở trang xác nhận ở chế độ API thật, tải full chi tiết đơn hàng từ backend
  useEffect(() => {
    if (!app.realApi || !app.newOrderId) return;
    const numericId = Number(app.newOrderId);
    if (!Number.isFinite(numericId)) return;
    void orderApi
      .layChiTietDon(numericId)
      .then((dto) => {
        app.upsertOrder?.(
          mapDonChiTietToOrder(dto, {
            customerId: app.currentUser?.id,
            customerName: app.currentUser?.name,
          })
        );
      })
      .catch(() => {});
  }, [app.realApi, app.newOrderId]);

  // Bộ đếm ngược thời gian giữ chỗ thanh toán 15 phút (UC3.2)
  useEffect(() => {
    if (!order?.expiresAt || paid || order?.status === "Hết hạn") return;
    const targetMs = parseServerTimestamp(order.expiresAt);
    if (!Number.isFinite(targetMs)) return;

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
      setSeconds(remaining);
      // Tự động làm mới trạng thái từ backend khi hết giờ giữ chỗ
      if (remaining === 0 && app.realApi) {
        void orderApi
          .layChiTietDon(Number(order.backendId ?? order.id))
          .then((dto) =>
            app.upsertOrder?.(
              mapDonChiTietToOrder(dto, {
                customerId: app.currentUser?.id,
                customerName: app.currentUser?.name,
              })
            )
          )
          .catch(() => {});
      }
    };
    updateCountdown();
    const t = setInterval(updateCountdown, 1000);
    return () => clearInterval(t);
  }, [paid, order?.status, order?.expiresAt, app.realApi]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const totalAmount = order ? order.rental - order.discount + order.depositTotal : 0;
  // Ánh xạ 3 trạng thái thanh toán của đơn sang lớp banner tương ứng
  const bannerStateClass = paid ? "is-paid" : expired ? "is-expired" : "is-pending";

  const refreshOrderDetail = async () => {
    if (!order) return null;
    const dto = await orderApi.layChiTietDon(Number(order.backendId ?? order.id));
    const mapped = mapDonChiTietToOrder(dto, {
      customerId: app.currentUser?.id,
      customerName: app.currentUser?.name,
    });
    app.upsertOrder?.(mapped);
    return mapped;
  };

  // Xác nhận thanh toán (realApi gửi API thanh toán VietQR; mock mô phỏng thành công/thất bại)
  const handlePay = async (succeed: boolean) => {
    if (!order) return;
    if (app.realApi) {
      setProcessing(true);
      setPayError("");
      try {
        await paymentApi.xacNhanThanhToan({
          maDonThue: Number(order.backendId ?? order.id),
          phuongThucThanhToan: "VietQR",
          soTienDaTra: totalAmount,
          maGiaoDichDoiTac: `VQR-${displayOrderCode || order.id}-${Date.now()}`,
        });
        await refreshOrderDetail();
        void app.refreshCatalog?.();
      } catch (err) {
        setPayError(err instanceof Error ? err.message : "Xác nhận thanh toán thất bại.");
      } finally {
        setProcessing(false);
      }
      return;
    }

    setProcessing(true);
    window.setTimeout(() => {
      app.payOrder(order.id, succeed);
      setProcessing(false);
    }, 650);
  };

  // Kiểm tra trạng thái giao dịch từ cổng ngân hàng (Dòng phụ 4.1)
  const handleCheckGateway = async () => {
    setCheckingGateway(true);
    setGatewayMessage("");
    setPayError("");
    if (app.realApi) {
      try {
        const updated = await refreshOrderDetail();
        if (updated?.status === "Đã xác nhận") {
          setGatewayMessage("Hệ thống đã ghi nhận giao dịch thành công và xác nhận giữ chỗ cho đơn của bạn.");
        } else if (updated?.status === "Hết hạn") {
          setGatewayMessage("Đơn hàng đã hết thời hạn giữ chỗ 15 phút.");
        } else {
          setGatewayMessage("Đơn hàng đang chờ thanh toán. Nếu bạn vừa chuyển khoản xong, vui lòng đợi vài giây hoặc bấm xác nhận bên dưới.");
        }
      } catch (err) {
        setPayError(err instanceof Error ? err.message : "Không thể kiểm tra trạng thái giao dịch.");
      } finally {
        setCheckingGateway(false);
      }
      return;
    }
    setTimeout(() => {
      setCheckingGateway(false);
      setGatewayMessage("Hệ thống đang đối chiếu tự động với cổng MB Bank. Nếu bạn vừa chuyển tiền, trạng thái sẽ cập nhật trong vài giây.");
    }, 800);
  };

  // Hủy đơn khi thanh toán không thành công hoặc khách hủy để giải phóng thiết bị ngay về kho
  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    setPayError("");
    try {
      if (app.realApi) {
        await orderApi.huyDon(Number(order.backendId ?? order.id), "Khách hủy thanh toán / giải phóng giữ chỗ");
        await refreshOrderDetail();
        void app.refreshCatalog?.();
        void app.refreshOrders?.();
      } else {
        app.cancelOrder(order.id, "Khách hủy thanh toán / giải phóng giữ chỗ");
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Không thể hủy đơn lúc này.");
    } finally {
      setCancelling(false);
    }
  };

  return {
    app,
    order,
    paid,
    cancelled,
    expired,
    seconds,
    mm,
    ss,
    latestPayment,
    displayOrderCode,
    totalAmount,
    bannerStateClass,
    processing,
    cancelling,
    checkingGateway,
    gatewayMessage,
    payError,
    handlePay,
    handleCancelOrder,
    handleCheckGateway,
  };
}
