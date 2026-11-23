import type { Dispatch, SetStateAction } from "react";
import {
  fmt,
  type ActionResult,
  type MoneyTransaction,
  type Order,
  type OrderStatus,
  type Product,
  type PromotionUsage,
  type Review,
} from "../../store";
import { makeId } from "../appStateStorage";

interface Params {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setPromotionUsages: Dispatch<SetStateAction<PromotionUsage[]>>;
  reviews: Review[];
  setReviews: Dispatch<SetStateAction<Review[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  addAuditLog: (entry: { actor: string; role: string; action: string; targetEntity: string; targetId: string; detail: string }) => void;
}

/**
 * Nghiệp vụ tính phí hủy/hủy đơn (UC3.3) và gửi/ẩn/phản hồi đánh giá (UC9.1, UC9.2).
 */
export function useCancelAndReviewActions({
  orders,
  setOrders,
  setPromotionUsages,
  reviews,
  setReviews,
  setProducts,
  addAuditLog,
}: Params) {
  const getCancellationQuote = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return { fee: 0, refund: 0 };
    const pickup = new Date(order.pickupTime.replace(" ", "T")).getTime();
    const hours = (pickup - Date.now()) / 3600000;
    const paidRental = order.rental - order.discount;
    // >48h hoàn 100%, 24h-48h khấu trừ 30%, <24h giữ toàn bộ tiền thuê
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
    if (reviews.some((r) => r.orderId === input.orderId && r.productId === input.productId)) {
      return { ok: false, message: "Sản phẩm này trong đơn đã được đánh giá trước đó." };
    }
    if (input.rating < 1 || input.rating > 5) return { ok: false, message: "Số sao đánh giá phải từ 1 đến 5." };
    if (!input.comment.trim()) return { ok: false, message: "Vui lòng nhập nội dung đánh giá." };

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
      createdAt: new Date().toLocaleString("vi-VN"),
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
          ? { ...r, storeResponse: { response: response.trim(), respondedAt: now, respondedBy: responderName } }
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

  // [REV-01] Khôi phục đánh giá đã bị ẩn ở Mock mode (khớp Real API /api/danh-gia/{id}/khoi-phuc).
  // Cập nhật status về "active", xóa hiddenReason/hiddenBy, tính lại rating/reviews của sản phẩm
  // và ghi Audit Log để thao tác có bằng chứng.
  const restoreReview = (reviewId: string, note?: string): ActionResult => {
    const rev = reviews.find((r) => r.id === reviewId);
    if (!rev) return { ok: false, message: "Không tìm thấy đánh giá cần khôi phục." };
    if (rev.status !== "hidden") return { ok: true, data: undefined };

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, status: "active", hiddenReason: undefined, hiddenBy: undefined }
          : r
      )
    );

    // Tính lại điểm sao và số lượng đánh giá hiển thị của sản phẩm
    const nextActive = reviews
      .filter((r) => r.productId === rev.productId && r.id !== reviewId && r.status === "active")
      .concat([{ ...rev, status: "active", hiddenReason: undefined, hiddenBy: undefined }]);
    const avg = nextActive.length
      ? Number((nextActive.reduce((sum, r) => sum + r.rating, 0) / nextActive.length).toFixed(1))
      : 5.0;
    setProducts((prev) =>
      prev.map((p) => (p.id === rev.productId ? { ...p, rating: avg, reviews: nextActive.length } : p))
    );

    addAuditLog({
      actor: "Quản trị viên",
      role: "Quản trị viên",
      action: "Khôi phục đánh giá (UC9.2)",
      targetEntity: "Review",
      targetId: reviewId,
      detail: note?.trim() || "Mở hiển thị lại đánh giá đã kiểm duyệt",
    });
    return { ok: true, data: undefined };
  };

  return { getCancellationQuote, cancelOrder, addReview, hideReview, replyReview, restoreReview };
}
