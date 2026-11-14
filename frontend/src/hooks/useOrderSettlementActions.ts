import type { Dispatch, SetStateAction } from "react";
import {
  fmt,
  type ActionResult,
  type MoneyTransaction,
  type Order,
  type OrderStatus,
  type Product,
  type PromotionUsage,
  type ReconciliationStatement,
  type Review,
  type Role,
} from "../store";
import { makeId } from "./appStateStorage";

interface UseOrderSettlementActionsParams {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setPromotionUsages: Dispatch<SetStateAction<PromotionUsage[]>>;
  reviews: Review[];
  setReviews: Dispatch<SetStateAction<Review[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  currentUser: { name: string; role: Role } | null;
  addAuditLog: (entry: {
    actor: string;
    role: string;
    action: string;
    targetEntity: string;
    targetId: string;
    detail: string;
  }) => void;
}

/**
 * Hook đối soát, quyết toán cọc/phụ phí, hủy đơn và đánh giá sản phẩm.
 */
export function useOrderSettlementActions(params: UseOrderSettlementActionsParams) {
  const { orders, setOrders, setPromotionUsages, reviews, setReviews, setProducts, currentUser, addAuditLog } = params;

  const confirmReconciliation = (orderId: string, note?: string): ActionResult<ReconciliationStatement> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng cần đối soát." };

    const debt = order.assignedEquipment.filter((ae) => !ae.returnedAt);
    if (debt.length > 0) {
      return { ok: false, message: `Còn ${debt.length} thiết bị chưa nhận trả/chưa kết luận mất. Vui lòng giải quyết trước khi đối soát!` };
    }
    const pendingSurcharges = order.surcharges.filter((s) => s.status === "Chờ duyệt");
    if (pendingSurcharges.length > 0) {
      return { ok: false, message: `Còn ${pendingSurcharges.length} phụ phí đang chờ duyệt. Vui lòng phê duyệt hoặc từ chối trước!` };
    }
    const disputedSurcharges = order.surcharges.filter((s) => s.status === "Tranh chấp");
    if (disputedSurcharges.length > 0) {
      return { ok: false, message: `Có ${disputedSurcharges.length} phụ phí đang tranh chấp. Cần thỏa thuận xong với khách trước!` };
    }

    const now = new Date().toLocaleString("vi-VN");
    const approved = order.surcharges.filter((s) => s.status === "Đã duyệt").reduce((sum, s) => sum + s.amount, 0);

    const priorRefund = (order.transactions || [])
      .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
      .reduce((s, t) => s + t.amount, 0);
    const priorCollect = (order.transactions || [])
      .filter((t) => t.type === "Thu thêm" && t.status === "Thành công")
      .reduce((s, t) => s + t.amount, 0);
    const priorSettled = priorCollect - priorRefund;
    const netDifference = order.depositTotal - approved - priorSettled;

    const statement: ReconciliationStatement = {
      confirmedAt: now,
      confirmedBy: currentUser?.name || "Nhân viên",
      depositCollected: order.depositTotal,
      totalApprovedSurcharges: approved,
      totalPriorSettlements: priorSettled,
      netDifference,
      settlementType: netDifference === 0 ? "balanced" : netDifference > 0 ? "refund" : "collect",
      status: "confirmed",
      note: note || "Đã xác nhận căn cứ bảng đối soát cọc",
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, reconciliation: statement } : o)));

    addAuditLog({
      actor: currentUser?.name || "Nhân viên",
      role: currentUser?.role || "staff",
      action: "Xác nhận bảng đối soát (UC5.4 Bước 4)",
      targetEntity: "Order",
      targetId: orderId,
      detail: `Căn cứ: Cọc ${fmt(order.depositTotal)}, Phí duyệt: ${fmt(approved)}, Đã xử lý trước: ${fmt(priorSettled)}, Chênh lệch: ${fmt(Math.abs(netDifference))} (${netDifference > 0 ? "Phải hoàn" : netDifference < 0 ? "Phải thu" : "Cân bằng 0đ"})`,
    });

    return { ok: true, data: statement };
  };

  const finalizeOrderWithoutPayment = (orderId: string, note?: string): ActionResult => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    if (order.status !== "Chờ đối soát") return { ok: false, message: "Đơn hàng phải ở trạng thái Chờ đối soát." };

    const debt = order.assignedEquipment.filter((ae) => !ae.returnedAt);
    if (debt.length > 0) return { ok: false, message: `Còn ${debt.length} thiết bị chưa trả` };
    const pendingSurcharges = order.surcharges.filter((s) => s.status === "Chờ duyệt");
    if (pendingSurcharges.length > 0) return { ok: false, message: `Còn ${pendingSurcharges.length} phụ phí chưa duyệt` };

    const approved = order.surcharges.filter((s) => s.status === "Đã duyệt").reduce((sum, s) => sum + s.amount, 0);
    const priorRefund = (order.transactions || [])
      .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
      .reduce((s, t) => s + t.amount, 0);
    const priorCollect = (order.transactions || [])
      .filter((t) => t.type === "Thu thêm" && t.status === "Thành công")
      .reduce((s, t) => s + t.amount, 0);
    const priorSettled = priorCollect - priorRefund;
    const netDifference = order.depositTotal - approved - priorSettled;

    if (netDifference !== 0) {
      return { ok: false, message: `Số tiền chênh lệch là ${fmt(Math.abs(netDifference))}, không thể chốt theo luồng chênh lệch 0 đ (Dòng 5.1)!` };
    }

    const now = new Date().toLocaleString("vi-VN");
    const statement: ReconciliationStatement = {
      confirmedAt: order.reconciliation?.confirmedAt || now,
      confirmedBy: order.reconciliation?.confirmedBy || currentUser?.name || "Nhân viên",
      depositCollected: order.depositTotal,
      totalApprovedSurcharges: approved,
      totalPriorSettlements: priorSettled,
      netDifference: 0,
      settlementType: "balanced",
      status: "locked",
      lockedAt: now,
      lockedBy: currentUser?.name || "Nhân viên",
      note: note || "Chốt đối soát cân bằng không phát sinh chênh lệch tiền (Dòng 5.1)",
    };

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "Hoàn tất",
              reconciledAt: now,
              reconciliation: statement,
              statusHistory: [...o.statusHistory, { status: "Hoàn tất" as OrderStatus, at: now, by: currentUser?.name || "Nhân viên" }],
            }
          : o
      )
    );

    addAuditLog({
      actor: currentUser?.name || "Nhân viên",
      role: currentUser?.role || "staff",
      action: "Khóa đối soát & Hoàn tất đơn (UC5.4 Bước 5.1/6/7)",
      targetEntity: "Order",
      targetId: orderId,
      detail: `Khóa đối soát chênh lệch 0 đ - Chuyển Hoàn tất đơn ${orderId}`,
    });

    return { ok: true, data: undefined };
  };

  const settleOrder = (orderId: string, succeed = true, details?: { method?: string; note?: string; amount?: number }) => {
    const now = new Date().toLocaleString("vi-VN");
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId || o.status !== "Chờ đối soát") return o;
        const approved = o.surcharges.filter((s) => s.status === "Đã duyệt").reduce((sum, s) => sum + s.amount, 0);

        const priorRefund = (o.transactions || [])
          .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
          .reduce((s, t) => s + t.amount, 0);
        const priorCollect = (o.transactions || [])
          .filter((t) => t.type === "Thu thêm" && t.status === "Thành công")
          .reduce((s, t) => s + t.amount, 0);
        const priorSettled = priorCollect - priorRefund;
        const difference = o.depositTotal - approved - priorSettled;

        const amount = details?.amount ?? Math.abs(difference);
        const defaultNote = succeed ? (difference >= 0 ? "Hoàn cọc thành công" : "Thu thêm thành công") : "Giao dịch đối soát thất bại";
        const fullNote = details?.note || (details?.method ? `${defaultNote} qua ${details.method}` : defaultNote);
        const transaction: MoneyTransaction = {
          id: `GD-${Date.now()}`,
          type: difference >= 0 ? "Hoàn cọc" : "Thu thêm",
          amount,
          status: succeed ? "Thành công" : "Thất bại",
          createdAt: now,
          completedAt: now,
          note: fullNote,
        };

        if (succeed) {
          addAuditLog({
            actor: currentUser?.name || "Nhân viên",
            role: currentUser?.role || "staff",
            action: difference >= 0 ? "Hoàn cọc đối soát (UC5.6)" : "Thu thêm đối soát (UC5.5)",
            targetEntity: "Order",
            targetId: orderId,
            detail: `${fullNote} - Số tiền: ${fmt(amount)}`,
          });
        }

        const updatedStatement: ReconciliationStatement = {
          ...(o.reconciliation || {
            confirmedAt: now,
            confirmedBy: currentUser?.name || "Nhân viên",
            depositCollected: o.depositTotal,
            totalApprovedSurcharges: approved,
            totalPriorSettlements: priorSettled,
            netDifference: difference,
            settlementType: difference >= 0 ? "refund" : "collect",
          }),
          status: succeed ? "locked" : o.reconciliation?.status || "confirmed",
          lockedAt: succeed ? now : undefined,
          lockedBy: succeed ? currentUser?.name || "Nhân viên" : undefined,
        };

        return succeed
          ? {
              ...o,
              status: "Hoàn tất",
              reconciledAt: now,
              reconciliation: updatedStatement,
              transactions: [...(o.transactions ?? []), transaction],
              statusHistory: [...o.statusHistory, { status: "Hoàn tất" as OrderStatus, at: now, by: currentUser?.name || "Nhân viên" }],
            }
          : {
              ...o,
              reconciliation: updatedStatement,
              transactions: [...(o.transactions ?? []), transaction],
            };
      })
    );
  };

  const getCancellationQuote = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return { fee: 0, refund: 0 };
    const pickup = new Date(order.pickupTime.replace(" ", "T")).getTime();
    const hours = (pickup - Date.now()) / 3600000;
    const paidRental = order.rental - order.discount;
    // Mục 119 đặc tả: >48h hoàn 100%, 24h-48h khấu trừ 30%, <24h giữ toàn bộ tiền thuê
    const feeRate = hours >= 48 ? 0 : hours >= 24 ? 0.3 : 1.0;
    const wasPaid = Boolean(order.paidAt);
    const fee = wasPaid ? Math.round(paidRental * feeRate) : 0;
    return { fee, refund: wasPaid ? paidRental + order.depositTotal - fee : 0 };
  };

  const cancelOrder = (orderId: string, reason?: string) => {
    const cancellationReason = reason || "Khách hàng yêu cầu hủy đơn";
    const quote = getCancellationQuote(orderId);
    const now = new Date().toLocaleString("vi-VN");
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId || !["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status)) return o;
        const refundTransaction: MoneyTransaction | null = o.paidAt
          ? {
              id: `GD-${Date.now()}`,
              type: "Hoàn tiền hủy",
              amount: quote.refund,
              status: "Thành công",
              createdAt: now,
              completedAt: now,
              note: `Phí hủy được giữ lại: ${fmt(quote.fee)}. Lý do: ${cancellationReason}`,
            }
          : null;
        return {
          ...o,
          status: "Khách hủy",
          cancellationFee: quote.fee,
          cancellationRefund: quote.refund,
          cancellationReason,
          transactions: refundTransaction ? [...(o.transactions ?? []), refundTransaction] : o.transactions ?? [],
          statusHistory: [...o.statusHistory, { status: "Khách hủy" as OrderStatus, at: now, by: `Khách hàng (${cancellationReason})` }],
        };
      })
    );
    setPromotionUsages((current) =>
      current.map((usage) =>
        usage.orderId === orderId && usage.status === "reserved" ? { ...usage, status: "released", releasedAt: new Date().toISOString() } : usage
      )
    );
  };

  const addReview = (input: { orderId: string; productId: string; rating: number; comment: string; images?: string[] }): ActionResult<Review> => {
    const order = orders.find((o) => o.id === input.orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn thuê tương ứng." };
    if (order.status !== "Hoàn tất") return { ok: false, message: "Chỉ đơn thuê đã hoàn tất mới được phép đánh giá." };
    const item = order.items.find((i) => i.productId === input.productId);
    if (!item) return { ok: false, message: "Sản phẩm không thuộc đơn thuê này." };
    const alreadyReviewed = reviews.some((r) => r.orderId === input.orderId && r.productId === input.productId);
    if (alreadyReviewed) return { ok: false, message: "Sản phẩm này trong đơn đã được đánh giá trước đó." };
    if (input.rating < 1 || input.rating > 5) return { ok: false, message: "Số sao đánh giá phải từ 1 đến 5." };
    if (!input.comment.trim()) return { ok: false, message: "Vui lòng nhập nội dung đánh giá." };

    const now = new Date().toLocaleString("vi-VN");
    const newReview: Review = {
      id: makeId("REV"),
      orderId: input.orderId,
      productId: input.productId,
      productName: item.productName,
      customerId: order.customerId,
      customerName: order.customerName,
      rating: Math.round(input.rating),
      comment: input.comment.trim(),
      images: input.images ?? [],
      createdAt: now,
      status: "active",
    };

    setReviews((prev) => [newReview, ...prev]);

    const activeReviews = [...reviews.filter((r) => r.productId === input.productId && r.status === "active"), newReview];
    const avg = Number((activeReviews.reduce((sum, r) => sum + r.rating, 0) / activeReviews.length).toFixed(1));
    setProducts((prev) => prev.map((p) => (p.id === input.productId ? { ...p, rating: avg, reviews: activeReviews.length } : p)));

    return { ok: true, data: newReview };
  };

  const hideReview = (reviewId: string, reason: string): ActionResult => {
    const rev = reviews.find((r) => r.id === reviewId);
    if (!rev) return { ok: false, message: "Không tìm thấy đánh giá." };
    if (!reason.trim()) return { ok: false, message: "Vui lòng nhập lý do ẩn đánh giá." };

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status: "hidden", hiddenReason: reason.trim(), hiddenBy: "Quản trị viên" } : r))
    );

    const remaining = reviews.filter((r) => r.productId === rev.productId && r.id !== reviewId && r.status === "active");
    const avg = remaining.length ? Number((remaining.reduce((sum, r) => sum + r.rating, 0) / remaining.length).toFixed(1)) : 5.0;
    setProducts((prev) => prev.map((p) => (p.id === rev.productId ? { ...p, rating: avg, reviews: remaining.length } : p)));

    return { ok: true, data: undefined };
  };

  const replyReview = (reviewId: string, response: string, responderName = "Quản trị viên"): ActionResult => {
    const rev = reviews.find((r) => r.id === reviewId);
    if (!rev) return { ok: false, message: "Không tìm thấy đánh giá tương ứng." };
    if (!response.trim()) return { ok: false, message: "Vui lòng nhập nội dung phản hồi của cửa hàng." };

    const now = new Date().toLocaleString("vi-VN");
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              storeResponse: {
                response: response.trim(),
                respondedAt: now,
                respondedBy: responderName,
              },
            }
          : r
      )
    );

    addAuditLog({
      actor: responderName,
      role: "Quản trị viên",
      action: "Phản hồi đánh giá (UC9.2)",
      targetEntity: "Review",
      targetId: reviewId,
      detail: `Phản hồi cho khách hàng ${rev.customerName} tại sản phẩm ${rev.productName || rev.productId}`,
    });

    return { ok: true, data: undefined };
  };

  return {
    confirmReconciliation,
    finalizeOrderWithoutPayment,
    settleOrder,
    getCancellationQuote,
    cancelOrder,
    addReview,
    hideReview,
    replyReview,
  };
}
