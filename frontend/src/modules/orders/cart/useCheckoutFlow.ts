import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { ApiError } from "../../../services/apiClient";
import { rentalCartApi, orderApi, type GioThueBackend, type BaoGiaThayDoiDetail } from "../../../services/api";
import { mapDonChiTietToOrder } from "../../../services/mappers";
import { toIsoDateTime } from "../customerUtils";

export type CheckoutPaymentMethod = "qr" | "store" | "wallet";

export interface QuoteChangeModalState {
  message: string;
  oldTotal: number;
  newTotal: number;
  newRental: number;
  newDiscount: number;
  newDeposit: number;
}

/**
 * Hook quản lý luồng xác nhận đặt thuê, khóa idempotency và xử lý biến động báo giá (UC3.2, UC3.2.1, UC3.2.2).
 */
export function useCheckoutFlow() {
  const app = useApp();
  const [checkoutError, setCheckoutError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [backendQuote, setBackendQuote] = useState<GioThueBackend | null>(null);
  const [receiverName, setReceiverName] = useState(app.currentUser?.name || (app.realApi ? "" : "Nguyễn Văn An"));
  const [receiverPhone, setReceiverPhone] = useState(app.currentUser?.phone || (app.realApi ? "" : "0901 234 567"));
  const [receiverEmail, setReceiverEmail] = useState(app.currentUser?.email || (app.realApi ? "" : "customer@geargo.vn"));
  const [orderNote, setOrderNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("qr");
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Khóa chống tạo đơn trùng (IdempotencyKey) cố định cho phiên checkout hiện tại
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `ck-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  // Modal xác nhận khi báo giá/khuyến mãi thay đổi trước lúc đặt đơn (UC3.2.2)
  const [quoteChangeModal, setQuoteChangeModal] = useState<QuoteChangeModalState | null>(null);

  // Đồng bộ thông tin người nhận từ tài khoản hiện hành và lấy báo giá chốt mới nhất từ backend
  useEffect(() => {
    if (app.currentUser) {
      setReceiverName((prev) => prev || app.currentUser?.name || "");
      setReceiverPhone((prev) => prev || app.currentUser?.phone || "");
      setReceiverEmail((prev) => prev || app.currentUser?.email || "");
    }
    if (app.realApi && app.currentUser) {
      const syncAndFetchQuote = async () => {
        if (app.hasValidRentalPeriod()) {
          const gioNhan = toIsoDateTime(app.pickupDate, app.pickupHour);
          const gioTra = toIsoDateTime(app.returnDate, app.returnHour);
          await rentalCartApi.datThoiGian(gioNhan, gioTra).catch(() => {});
        }
        const quote = await rentalCartApi.layGio();
        setBackendQuote(quote);
      };
      void syncAndFetchQuote().catch(() => {});
    }
  }, [app.realApi, app.currentUser?.id, app.pickupDate, app.pickupHour, app.returnDate, app.returnHour]);

  const localDays = app.getDays();
  const days = app.realApi && backendQuote?.baoGia ? backendQuote.baoGia.soNgayThue : localDays;

  const localRental = app.cart.reduce((s, c) => {
    const p = app.products.find((prod) => prod.id === c.productId);
    return s + (p ? p.pricePerDay * c.qty * localDays : 0);
  }, 0);
  const localDepositTotal = app.cart.reduce((s, c) => {
    const p = app.products.find((prod) => prod.id === c.productId);
    return s + (p ? p.deposit * c.qty : 0);
  }, 0);

  const promoCode = backendQuote?.maKhuyenMaiApDung || app.appliedPromoCode;
  const promoResult = !app.realApi && promoCode
    ? app.evaluatePromotion(
        promoCode,
        localRental,
        app.cart.map((item) => {
          const product = app.products.find((entry) => entry.id === item.productId);
          return { productId: item.productId, rental: product ? product.pricePerDay * item.qty * localDays : 0 };
        })
      )
    : null;
  const rental = app.realApi && backendQuote?.baoGia ? Number(backendQuote.baoGia.tongTienThueTruocGiam) : localRental;
  const depositTotal = app.realApi && backendQuote?.baoGia ? Number(backendQuote.baoGia.tongTienCoc) : localDepositTotal;
  const discount =
    app.realApi && backendQuote?.baoGia
      ? Number(backendQuote.baoGia.tongTienGiam)
      : promoResult?.ok
      ? promoResult.data.discount
      : 0;
  const grand = Math.max(0, rental - discount) + depositTotal;

  // Thực hiện đặt đơn (UC3.2: Khởi tạo giữ chỗ & kiểm tra biến động báo giá UC3.2.2)
  const handleConfirm = async (dongYThayDoiGia = false) => {
    if (!agreedTerms) {
      setCheckoutError("Quý khách vui lòng xác nhận đồng ý với điều khoản thuê và chính sách hoàn cọc của GearGo.");
      return;
    }
    if (!receiverName.trim() || !receiverPhone.trim()) {
      setCheckoutError("Vui lòng nhập đầy đủ họ tên và số điện thoại người nhận.");
      return;
    }

    if (app.realApi) {
      setSubmitting(true);
      setCheckoutError("");
      try {
        const created = await orderApi.taoDon({
          gioNhanDuKien: toIsoDateTime(app.pickupDate, app.pickupHour),
          gioTraDuKien: toIsoDateTime(app.returnDate, app.returnHour),
          tenNguoiNhan: receiverName.trim(),
          soDienThoaiNguoiNhan: receiverPhone.trim(),
          emailLienHe: receiverEmail.trim() || app.currentUser?.email || "",
          ghiChu: orderNote.trim() || undefined,
          maKhuyenMai: promoCode || undefined,
          idempotencyKey,
          giaTamTinhKyVong: grand,
          dongYThayDoiGia,
          chiTiet: app.cart.map((c) => ({
            maSanPham: Number(c.productId),
            soLuong: c.qty,
          })),
        });
        setQuoteChangeModal(null);
        // Tải full chi tiết đơn hàng vừa tạo để đồng bộ vào state dùng chung
        const fullDto = await orderApi.layChiTietDon(created.maDonThue);
        const mappedOrder = mapDonChiTietToOrder(fullDto, {
          customerId: app.currentUser?.id,
          customerName: app.currentUser?.name,
          ghiChu: orderNote.trim() || undefined,
        });
        app.upsertOrder?.(mappedOrder);
        app.setCartItems?.([]);
        app.setAppliedPromoCode("");
        app.setNewOrderId(mappedOrder.id);
        void app.refreshCatalog?.();
        app.setPage("order-confirmed");
      } catch (error) {
        if (error instanceof ApiError && error.code === "BAO_GIA_THAY_DOI") {
          const detailQuote =
            error.detail && typeof error.detail === "object"
              ? (error.detail as Partial<BaoGiaThayDoiDetail>)
              : undefined;

          if (detailQuote && typeof detailQuote.tongThanhToanDuKien === "number") {
            setQuoteChangeModal({
              message: error.message,
              oldTotal: grand,
              newTotal: Number(detailQuote.tongThanhToanDuKien),
              newRental: Number(detailQuote.tongTienThueTruocGiam ?? rental),
              newDiscount: Number(detailQuote.tongTienGiam ?? 0),
              newDeposit: Number(detailQuote.tongTienCoc ?? depositTotal),
            });
          } else {
            // Dự phòng tải lại báo giá mới nhất từ giỏ thuê nếu backend không trả chi tiết
            try {
              const refreshed = await rentalCartApi.layGio();
              setBackendQuote(refreshed);
              const newRental = Number(refreshed.baoGia?.tongTienThueTruocGiam ?? rental);
              const newDiscount = Number(refreshed.baoGia?.tongTienGiam ?? 0);
              const newDeposit = Number(refreshed.baoGia?.tongTienCoc ?? depositTotal);
              setQuoteChangeModal({
                message: error.message,
                oldTotal: grand,
                newTotal: Math.max(0, newRental - newDiscount) + newDeposit,
                newRental,
                newDiscount,
                newDeposit,
              });
            } catch {
              setQuoteChangeModal({
                message: error.message,
                oldTotal: grand,
                newTotal: grand,
                newRental: rental,
                newDiscount: discount,
                newDeposit: depositTotal,
              });
            }
          }
        } else {
          setCheckoutError(error instanceof Error ? error.message : "Không thể tạo đơn thuê trên máy chủ.");
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      app.createOrder(promoCode);
      app.setPage("order-confirmed");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Không thể tạo đơn thuê.");
    }
  };

  return {
    app,
    checkoutError,
    submitting,
    receiverName,
    setReceiverName,
    receiverPhone,
    setReceiverPhone,
    receiverEmail,
    setReceiverEmail,
    orderNote,
    setOrderNote,
    paymentMethod,
    setPaymentMethod,
    agreedTerms,
    setAgreedTerms,
    quoteChangeModal,
    setQuoteChangeModal,
    days,
    promoCode,
    rental,
    depositTotal,
    discount,
    grand,
    handleConfirm,
  };
}
