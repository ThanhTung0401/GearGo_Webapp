import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { rentalCartApi, type GioThueBackend } from "../../../services/api";
import { toIsoDateTime } from "../customerUtils";

export interface CartAvailabilityInfo {
  productId: string;
  avail: number;
  isOver: boolean;
  isOutOfStock: boolean;
}

/**
 * Hook quản lý giỏ thiết bị thuê, lịch nhận/trả, kiểm tra khả dụng và áp mã ưu đãi (UC3.1, UC3.1.1, UC3.1.2).
 */
export function useCartFlow() {
  const app = useApp();
  const [promoCode, setPromoCode] = useState(app.appliedPromoCode);
  const [promoApplied, setPromoApplied] = useState(Boolean(app.appliedPromoCode));
  const [promoError, setPromoError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [backendCart, setBackendCart] = useState<GioThueBackend | null>(null);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartApiError, setCartApiError] = useState("");

  // Đồng bộ giỏ thuê & báo giá thật từ backend khi đang ở chế độ realApi và đã đăng nhập
  const loadBackendCart = useCallback(async () => {
    if (!app.realApi || !app.currentUser) {
      setBackendCart(null);
      return;
    }
    try {
      const res = await rentalCartApi.layGio();
      setBackendCart(res);
      app.setCartItems?.(
        res.chiTiet.map((item) => ({
          productId: String(item.maSanPham),
          qty: item.soLuong,
        }))
      );
      if (res.maKhuyenMaiApDung) {
        setPromoCode(res.maKhuyenMaiApDung);
        setPromoApplied(true);
        app.setAppliedPromoCode(res.maKhuyenMaiApDung);
      } else {
        setPromoApplied(false);
      }
      setCartApiError("");
    } catch (err) {
      setCartApiError(err instanceof Error ? err.message : "Không thể tải giỏ thuê từ máy chủ.");
    }
  }, [app.realApi, app.currentUser?.id]);

  useEffect(() => {
    void loadBackendCart();
  }, [loadBackendCart]);

  // Đồng bộ tồn kho khả dụng theo lịch thuê ngay khi mở Giỏ hàng (kể cả khách chưa đăng nhập)
  useEffect(() => {
    if (!app.realApi || !app.hasValidRentalPeriod()) return;
    const gioNhan = toIsoDateTime(app.pickupDate, app.pickupHour || "09:00");
    const gioTra = toIsoDateTime(app.returnDate, app.returnHour || "09:00");
    void app.refreshCatalog?.({ gioNhan, gioTra });
  }, [app.realApi, app.pickupDate, app.pickupHour, app.returnDate, app.returnHour]);

  const localDays = app.getDays();
  const days = app.realApi && backendCart?.baoGia ? backendCart.baoGia.soNgayThue : localDays;
  const datesValid = app.hasValidRentalPeriod();

  // Tính tổng tiền thuê theo số ngày và số lượng (UC3.1.1: block 24h)
  const localRental = app.cart.reduce((s, c) => {
    const p = app.products.find((prod) => prod.id === c.productId);
    return s + (p ? p.pricePerDay * c.qty * localDays : 0);
  }, 0);

  // Tính tổng tiền cọc bảo đảm (UC3.1.1: cọc tách riêng không phụ thuộc ngày thuê)
  const localDepositTotal = app.cart.reduce((s, c) => {
    const p = app.products.find((prod) => prod.id === c.productId);
    return s + (p ? p.deposit * c.qty : 0);
  }, 0);

  const promotionItems = app.cart.map((item) => {
    const product = app.products.find((entry) => entry.id === item.productId);
    return { productId: item.productId, rental: product ? product.pricePerDay * item.qty * localDays : 0 };
  });

  // Đánh giá mã ưu đãi (UC3.1.2: Chỉ giảm trên tiền thuê, không giảm tiền cọc)
  const promoResult = !app.realApi && promoApplied ? app.evaluatePromotion(promoCode, localRental, promotionItems) : null;
  const rental = app.realApi && backendCart?.baoGia ? Number(backendCart.baoGia.tongTienThueTruocGiam) : localRental;
  const depositTotal = app.realApi && backendCart?.baoGia ? Number(backendCart.baoGia.tongTienCoc) : localDepositTotal;
  const discount =
    app.realApi && backendCart?.baoGia
      ? Number(backendCart.baoGia.tongTienGiam)
      : promoResult?.ok
      ? promoResult.data.discount
      : 0;
  const grand = Math.max(0, rental - discount) + depositTotal;

  // Cập nhật khung giờ nhận/trả và đồng bộ báo giá + khả dụng tồn kho từ backend
  const handleScheduleChange = async (
    nextPickupDate: string,
    nextPickupHour: string,
    nextReturnDate: string,
    nextReturnHour: string
  ) => {
    app.setPickupDate(nextPickupDate);
    app.setPickupHour(nextPickupHour);
    app.setReturnDate(nextReturnDate);
    app.setReturnHour(nextReturnHour);
    if (!app.realApi) return;

    const gioNhan = toIsoDateTime(nextPickupDate, nextPickupHour);
    const gioTra = toIsoDateTime(nextReturnDate, nextReturnHour);
    void app.refreshCatalog?.({ gioNhan, gioTra });
    if (app.currentUser && new Date(gioTra).getTime() > new Date(gioNhan).getTime()) {
      setCartBusy(true);
      try {
        await rentalCartApi.datThoiGian(gioNhan, gioTra);
        await loadBackendCart();
      } catch (err) {
        setCartApiError(err instanceof Error ? err.message : "Không thể cập nhật lịch thuê.");
      } finally {
        setCartBusy(false);
      }
    }
  };

  // Điều chỉnh số lượng món trong giỏ
  const handleQtyDelta = async (productId: string, delta: number) => {
    if (!app.realApi || !app.currentUser) {
      app.updateCartQty(productId, delta);
      return;
    }
    const line = backendCart?.chiTiet.find((item) => String(item.maSanPham) === productId);
    setCartBusy(true);
    setCartApiError("");
    try {
      if (!line) {
        if (delta > 0) await rentalCartApi.themVaoGio(Number(productId), delta);
      } else {
        const nextQty = line.soLuong + delta;
        if (nextQty <= 0) {
          await rentalCartApi.xoaChiTiet(line.maChiTietGio);
        } else {
          await rentalCartApi.capNhatSoLuong(line.maChiTietGio, nextQty);
        }
      }
      await loadBackendCart();
    } catch (err) {
      setCartApiError(err instanceof Error ? err.message : "Không thể cập nhật số lượng thiết bị.");
    } finally {
      setCartBusy(false);
    }
  };

  // Xóa thiết bị khỏi giỏ thuê
  const handleRemoveItem = async (productId: string) => {
    if (!app.realApi || !app.currentUser) {
      app.removeFromCart(productId);
      return;
    }
    const line = backendCart?.chiTiet.find((item) => String(item.maSanPham) === productId);
    if (!line) {
      app.removeFromCart(productId);
      return;
    }
    setCartBusy(true);
    try {
      await rentalCartApi.xoaChiTiet(line.maChiTietGio);
      await loadBackendCart();
    } catch (err) {
      setCartApiError(err instanceof Error ? err.message : "Không thể xóa thiết bị khỏi giỏ.");
    } finally {
      setCartBusy(false);
    }
  };

  // Áp dụng mã khuyến mãi (UC3.1.2)
  const applyPromo = async () => {
    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError("Vui lòng nhập mã khuyến mãi.");
      return;
    }
    if (app.realApi) {
      if (!app.currentUser) {
        setShowAuthModal(true);
        return;
      }
      setCartBusy(true);
      setPromoError("");
      try {
        await rentalCartApi.apMaKhuyenMai(cleanCode);
        await loadBackendCart();
        setPromoCode(cleanCode);
        setPromoApplied(true);
        app.setAppliedPromoCode(cleanCode);
      } catch (err) {
        setPromoApplied(false);
        app.setAppliedPromoCode("");
        setPromoError(err instanceof Error ? err.message : "Mã khuyến mãi không hợp lệ hoặc chưa đạt điều kiện.");
      } finally {
        setCartBusy(false);
      }
      return;
    }

    const result = app.evaluatePromotion(cleanCode, localRental, promotionItems);
    if (result.ok) {
      setPromoApplied(true);
      app.setAppliedPromoCode(result.data.promotion.code);
      setPromoCode(result.data.promotion.code);
      setPromoError("");
    } else {
      setPromoApplied(false);
      app.setAppliedPromoCode("");
      setPromoError(result.message);
    }
  };

  // Gỡ bỏ mã khuyến mãi hiện hành
  const removePromo = async () => {
    if (app.realApi && app.currentUser) {
      setCartBusy(true);
      try {
        await rentalCartApi.boMaKhuyenMai();
        await loadBackendCart();
      } catch (err) {
        setPromoError(err instanceof Error ? err.message : "Không thể gỡ mã khuyến mãi.");
      } finally {
        setCartBusy(false);
      }
    }
    setPromoApplied(false);
    setPromoCode("");
    setPromoError("");
    app.setAppliedPromoCode("");
  };

  // Kiểm tra khả dụng tồn kho từng dòng cho lịch thuê đã chọn (UC3.1 dòng 3, dòng phụ 2.1)
  const cartAvailability: CartAvailabilityInfo[] = app.cart.map((c) => {
    const serverLine = backendCart?.chiTiet.find((item) => String(item.maSanPham) === c.productId);
    const avail = serverLine ? serverLine.soLuongKhaDung : app.getAvailable(c.productId);
    const isOver = c.qty > avail;
    const isOutOfStock = avail <= 0 || Boolean(serverLine?.ngungKinhDoanh);
    return { productId: c.productId, avail, isOver, isOutOfStock };
  });

  const hasStockError = cartAvailability.some((item) => item.isOver || item.isOutOfStock);

  const handleProceedToCheckout = () => {
    if (!app.currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (hasStockError || !datesValid) return;
    app.setPage("checkout");
  };

  return {
    app,
    promoCode,
    setPromoCode,
    promoApplied,
    promoError,
    showAuthModal,
    setShowAuthModal,
    cartBusy,
    cartApiError,
    days,
    datesValid,
    rental,
    depositTotal,
    discount,
    grand,
    cartAvailability,
    hasStockError,
    handleScheduleChange,
    handleQtyDelta,
    handleRemoveItem,
    applyPromo,
    removePromo,
    handleProceedToCheckout,
  };
}
