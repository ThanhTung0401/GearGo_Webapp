import type { Dispatch, SetStateAction } from "react";
import {
  fmt,
  type ActionResult,
  type CartItem,
  type Equipment,
  type MoneyTransaction,
  type Order,
  type OrderStatus,
  type Product,
  type Promotion,
  type PromotionUsage,
} from "../store";
import { makeId, normalizeCode, REAL_MODE } from "./appStateStorage";

interface UseCartAndOrderActionsParams {
  pickupDate: string;
  returnDate: string;
  pickupHour: string;
  returnHour: string;
  products: Product[];
  equipment: Equipment[];
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setPromotions: Dispatch<SetStateAction<Promotion[]>>;
  setPromotionUsages: Dispatch<SetStateAction<PromotionUsage[]>>;
  setNewOrderId: Dispatch<SetStateAction<string | null>>;
  setAppliedPromoCode: Dispatch<SetStateAction<string>>;
  evaluatePromotion: (
    rawCode: string,
    rental: number,
    items: { productId: string; rental: number }[]
  ) => ActionResult<{ promotion: Promotion; discount: number }>;
}

/**
 * Hook tính lịch thuê, tồn khả dụng, giỏ thuê và đặt/thanh toán đơn hàng.
 */
export function useCartAndOrderActions(params: UseCartAndOrderActionsParams) {
  const {
    pickupDate,
    returnDate,
    pickupHour,
    returnHour,
    products,
    equipment,
    orders,
    setOrders,
    cart,
    setCart,
    setPromotions,
    setPromotionUsages,
    setNewOrderId,
    setAppliedPromoCode,
    evaluatePromotion,
  } = params;

  const hasValidRentalPeriod = () => {
    if (!pickupDate || !returnDate) return false;
    const pHour = pickupHour || "09:00";
    const rHour = returnHour || "09:00";
    const start = new Date(`${pickupDate}T${pHour}:00`).getTime();
    const end = new Date(`${returnDate}T${rHour}:00`).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && end > start;
  };

  const getDays = () => {
    if (!hasValidRentalPeriod()) return 0;
    const pHour = pickupHour || "09:00";
    const rHour = returnHour || "09:00";
    const start = new Date(`${pickupDate}T${pHour}:00`).getTime();
    const end = new Date(`${returnDate}T${rHour}:00`).getTime();
    const diffHours = (end - start) / 3600000;
    // Quy tắc 8.1 & 8.2 đặc tả: 24h tính 1 ngày, phần lẻ làm tròn lên, tối thiểu 1 ngày
    return Math.max(1, Math.ceil(diffHours / 24));
  };

  const getAvailable = (productId: string) => {
    const prod = products.find((p) => p.id === productId) as (Product & { availableCount?: number }) | undefined;
    if (REAL_MODE && prod && prod.availableCount !== undefined) {
      return Math.max(0, prod.availableCount);
    }
    if (!hasValidRentalPeriod()) return 0;
    const requestedStart = new Date(`${pickupDate}T${pickupHour || "09:00"}:00`).getTime();
    const requestedEnd = new Date(`${returnDate}T${returnHour || "09:00"}:00`).getTime();
    const total = equipment.filter(
      (e) => e.productId === productId && !["Đang bảo trì", "Thất lạc", "Ngừng sử dụng"].includes(e.equipmentStatus)
    ).length;
    const booked = orders
      .filter((o) => {
        if (o.status === "Chờ thanh toán") {
          if (!o.expiresAt) return true;
          const expMs = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(o.expiresAt) ? o.expiresAt : `${o.expiresAt}Z`).getTime();
          return !Number.isFinite(expMs) || expMs > Date.now();
        }
        return ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang thuê"].includes(o.status);
      })
      .filter((o) => {
        const orderStart = new Date(o.pickupTime.replace(" ", "T")).getTime();
        const orderEnd = new Date(o.returnTime.replace(" ", "T")).getTime();
        return requestedStart < orderEnd && requestedEnd > orderStart;
      })
      .reduce((sum, o) => {
        const item = o.items.find((i) => i.productId === productId);
        return sum + (item?.qty ?? 0);
      }, 0);
    return Math.max(0, total - booked);
  };

  const addToCart = (productId: string, qty = 1) =>
    setCart((prev) => {
      const product = products.find((item) => item.id === productId && item.status === "active");
      if (!product) return prev;
      const available = hasValidRentalPeriod() ? getAvailable(productId) : Number.MAX_SAFE_INTEGER;
      const ex = prev.find((c) => c.productId === productId);
      if (ex) return prev.map((c) => (c.productId === productId ? { ...c, qty: Math.min(available, c.qty + qty) } : c));
      return available > 0 ? [...prev, { productId, qty: Math.min(available, Math.max(1, qty)) }] : prev;
    });

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((c) => c.productId !== productId));

  const updateCartQty = (productId: string, delta: number) =>
    setCart((prev) =>
      prev.map((c) =>
        c.productId === productId
          ? {
              ...c,
              qty: Math.max(1, Math.min(hasValidRentalPeriod() ? Math.max(1, getAvailable(productId)) : Number.MAX_SAFE_INTEGER, c.qty + delta)),
            }
          : c
      )
    );

  const createOrder = (promoCode: string): string => {
    if (!hasValidRentalPeriod() || cart.length === 0) {
      throw new Error("Khoảng thuê hoặc giỏ thuê không hợp lệ.");
    }
    const unavailable = cart.find((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return !product || product.status !== "active" || item.qty > getAvailable(item.productId);
    });
    if (unavailable) throw new Error("Một sản phẩm đã tạm dừng hoặc không còn đủ số lượng cho thời gian đã chọn.");
    const days = getDays();
    const items = cart.map((c) => {
      const p = products.find((prod) => prod.id === c.productId)!;
      return {
        productId: p.id,
        productName: p.name,
        qty: c.qty,
        days,
        pricePerDay: p.pricePerDay,
        depositPerUnit: p.deposit,
        compensation: p.compensation,
      };
    });
    const rental = items.reduce((s, i) => s + i.pricePerDay * i.qty * i.days, 0);
    const depositTotal = items.reduce((s, i) => s + i.depositPerUnit * i.qty, 0);
    const promotionResult = promoCode.trim()
      ? evaluatePromotion(
          promoCode,
          rental,
          items.map((item) => ({ productId: item.productId, rental: item.pricePerDay * item.qty * item.days }))
        )
      : null;
    if (promotionResult && !promotionResult.ok) throw new Error(promotionResult.message);
    const discount = promotionResult?.ok ? promotionResult.data.discount : 0;
    const id = `DT-${Date.now().toString().slice(-8)}`;
    const now = new Date().toLocaleString("vi-VN");
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const order: Order = {
      id,
      customerId: "KH002",
      customerName: "Nguyễn Văn An",
      customerPhone: "0901 234 567",
      items,
      pickupTime: `${pickupDate} ${pickupHour || "09:00"}`,
      returnTime: `${returnDate} ${returnHour || "09:00"}`,
      rental,
      discount,
      depositTotal,
      promoCode: promoCode || undefined,
      status: "Chờ thanh toán",
      createdAt: now,
      expiresAt,
      assignedEquipment: [],
      surcharges: [],
      transactions: [],
      statusHistory: [{ status: "Chờ thanh toán", at: now, by: "Hệ thống" }],
    };
    setOrders((prev) => [...prev, order]);
    if (promotionResult?.ok) {
      setPromotionUsages((current) => [
        ...current,
        {
          id: makeId("PROMO-USE"),
          promotionId: promotionResult.data.promotion.id,
          orderId: id,
          reservedAt: nowIso,
          expiresAt,
          discountAmount: discount,
          status: "reserved",
        },
      ]);
    }
    setNewOrderId(id);
    setCart([]);
    setAppliedPromoCode("");
    return id;
  };

  const payOrder = (orderId: string, succeed = true) => {
    const now = new Date().toLocaleString("vi-VN");
    const payableOrder = orders.find((order) => order.id === orderId && order.status === "Chờ thanh toán");
    if (succeed && payableOrder?.promoCode) {
      setPromotions((current) =>
        current.map((promotion) =>
          normalizeCode(promotion.code) === normalizeCode(payableOrder.promoCode ?? "")
            ? { ...promotion, usedCount: promotion.usedCount + 1 }
            : promotion
        )
      );
      setPromotionUsages((current) =>
        current.map((usage) => (usage.orderId === orderId && usage.status === "reserved" ? { ...usage, status: "used", usedAt: new Date().toISOString() } : usage))
      );
    }
    setOrders((prev) =>
      prev.map((o) => {
        // UC5.1: Sinh mã đối soát ngân hàng Bank Reference Code (ví dụ FT241025...)
        const refCode = `FT${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
        const transaction: MoneyTransaction = {
          id: `GD-${Date.now()}`,
          type: "Thanh toán ban đầu",
          amount: o.rental - o.discount + o.depositTotal,
          status: succeed ? "Thành công" : "Thất bại",
          createdAt: now,
          completedAt: succeed ? now : undefined,
          note: succeed ? "Thanh toán trực tuyến VietQR 24/7 thành công" : "Ngân hàng/Cổng thanh toán từ chối giao dịch",
          referenceCode: succeed ? refCode : undefined,
          method: "VietQR 24/7",
        };
        return succeed
          ? {
              ...o,
              status: "Đã xác nhận",
              paidAt: now,
              transactions: [...(o.transactions ?? []), transaction],
              statusHistory: [...o.statusHistory, { status: "Đã xác nhận" as OrderStatus, at: now, by: "Hệ thống" }],
            }
          : { ...o, transactions: [...(o.transactions ?? []), transaction] };
      })
    );
  };

  return {
    hasValidRentalPeriod,
    getDays,
    getAvailable,
    addToCart,
    removeFromCart,
    updateCartQty,
    createOrder,
    payOrder,
    fmt,
  };
}
