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
  const [paymentChannel, setPaymentChannel] = useState<"vnpay" | "cash">(() =>
    sessionStorage.getItem("geargo_checkout_payment_channel") === "cash" ? "cash" : "vnpay"
  );
  const [cashOutcome, setCashOutcome] = useState<"success" | "fail">("success");

  // Đọc kết quả VNPay Sandbox khi cổng thanh toán redirect về /order-confirmed?vnpay=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vnpayStatus = params.get("vnpay");
    if (!vnpayStatus) return;

    const returnedOrderId = params.get("orderId");
    const msg = params.get("msg") || "";
    const code = params.get("code") || "";

    if (returnedOrderId && returnedOrderId !== "0") {
      app.setNewOrderId(returnedOrderId);
    }

    if (vnpayStatus === "success") {
      setGatewayMessage(msg || "Thanh toán VNPay Sandbox thành công! Đơn thuê đã được xác nhận.");
      setPayError("");
      void app.refreshOrders?.();
      void app.refreshCatalog?.();
    } else {
      setPayError(msg || `Thanh toán VNPay không thành công (Mã lỗi: ${code || "99"}).`);
    }

    // Dọn query params để F5 không lặp lại thông báo cũ
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Thanh toán bằng VNPay Sandbox (chuyển hướng trực tiếp sang cổng sandbox.vnpayment.vn)
  const handlePayWithVnPay = async () => {
    if (!order) return;
    setProcessing(true);
    setPayError("");
    try {
      const res = await paymentApi.taoVnPayUrl({
        maDonThue: Number(order.backendId ?? order.id),
        frontendReturnBaseUrl: window.location.origin,
      });
      if (!res.paymentUrl) throw new Error("Không nhận được đường dẫn thanh toán từ VNPay.");
      window.location.href = res.paymentUrl;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Không thể khởi tạo giao dịch VNPay Sandbox.");
      setProcessing(false);
    }
  };

  // Xác nhận thanh toán tiền mặt (hỗ trợ chọn Thành công hoặc Thất bại để kiểm thử)
  const handlePay = async (succeed: boolean) => {
    if (!order) return;
    if (!succeed) {
      setPayError("Thanh toán tiền mặt thất bại — giao dịch chưa được ghi nhận, đơn thuê vẫn ở trạng thái Chờ thanh toán.");
      if (!app.realApi) {
        app.payOrder(order.id, false);
      }
      return;
    }

    if (app.realApi) {
      setProcessing(true);
      setPayError("");
      try {
        await paymentApi.xacNhanThanhToan({
          maDonThue: Number(order.backendId ?? order.id),
          phuongThucThanhToan: "TienMat",
          soTienDaTra: totalAmount,
          maGiaoDichDoiTac: `CASH-${displayOrderCode || order.id}-${Date.now()}`,
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
      app.payOrder(order.id, true);
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
        await orderApi.huyDonChuaThanhToan(Number(order.backendId ?? order.id), "Khách hủy thanh toán / giải phóng giữ chỗ");
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
    paymentChannel,
    setPaymentChannel,
    cashOutcome,
    setCashOutcome,
    handlePay,
    handlePayWithVnPay,
    handleCancelOrder,
    handleCheckGateway,
  };
}
