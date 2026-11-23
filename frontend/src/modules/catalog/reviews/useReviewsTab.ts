import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { reviewApi } from "../../../services/api/reviewApi";
import { mapDanhGiaToReview } from "../../../services/mappers/reviewNotifAuditMapper";
import { type Review } from "../../../store";

/**
 * Hook quản lý kiểm duyệt đánh giá sản phẩm (UC9.2, UC9.2.1):
 * lọc theo sao/trạng thái, phản hồi cửa hàng, ẩn vi phạm và khôi phục hiển thị.
 */
export function useReviewsTab(app: ReturnType<typeof useApp>) {
  const realApi = app.realApi || isRealApiEnabled();
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [search, setSearch] = useState("");
  const [hideModalReview, setHideModalReview] = useState<Review | null>(null);
  const [hideReason, setHideReason] = useState("Vi phạm ngôn từ / Thô tục");
  const [orderBasisReview, setOrderBasisReview] = useState<Review | null>(null);
  const [replyModalReview, setReplyModalReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");

  // State đồng bộ API đánh giá thật (/api/danh-gia)
  const [apiReviews, setApiReviews] = useState<Review[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [hideError, setHideError] = useState("");
  const [replyError, setReplyError] = useState("");

  const loadReviews = useCallback(async () => {
    if (!realApi) return;
    setReviewLoading(true);
    setReviewError("");
    try {
      const res = await reviewApi.adminTimKiem({
        trangThai: statusFilter === "active" ? "HienThi" : statusFilter === "hidden" ? "BiAn" : undefined,
        soMoiTrang: 50,
      });
      setApiReviews((res.items ?? []).map(mapDanhGiaToReview));
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Không thể tải danh sách đánh giá từ máy chủ.");
    } finally {
      setReviewLoading(false);
    }
  }, [realApi, statusFilter]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const sourceReviews = realApi ? apiReviews : app.reviews;

  const filtered = sourceReviews.filter((r) => {
    const matchRating = ratingFilter === 0 || r.rating === ratingFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSearch =
      (r.productName || "").toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase());
    return matchRating && matchStatus && matchSearch;
  });

  // Xác nhận ẩn đánh giá vi phạm kèm lý do chuẩn (UC9.2)
  const handleConfirmHide = async () => {
    if (!hideModalReview) return;
    if (realApi) {
      const reviewId = Number(hideModalReview.id);
      if (!Number.isFinite(reviewId) || reviewId <= 0) {
        setHideError("Mã đánh giá không hợp lệ để kiểm duyệt.");
        return;
      }
      setActionBusy(true);
      setHideError("");
      setReviewSuccess("");
      try {
        await reviewApi.adminAn(reviewId, hideReason);
        await Promise.all([loadReviews(), app.refreshReviews?.()]);
        setReviewSuccess(`Đã ẩn đánh giá #${hideModalReview.id} với lý do vi phạm.`);
        setHideModalReview(null);
      } catch (err) {
        setHideError(err instanceof Error ? err.message : "Không thể ẩn đánh giá trên máy chủ.");
      } finally {
        setActionBusy(false);
      }
      return;
    }
    app.hideReview(hideModalReview.id, hideReason);
    setHideModalReview(null);
  };

  // Gửi phản hồi chính thức của cửa hàng cho đánh giá của khách
  const handleConfirmReply = async () => {
    if (!replyModalReview || !replyText.trim()) return;
    if (realApi) {
      const reviewId = Number(replyModalReview.id);
      if (!Number.isFinite(reviewId) || reviewId <= 0) {
        setReplyError("Mã đánh giá không hợp lệ để gửi phản hồi.");
        return;
      }
      setActionBusy(true);
      setReplyError("");
      setReviewSuccess("");
      try {
        await reviewApi.phanHoi(reviewId, replyText.trim());
        await Promise.all([loadReviews(), app.refreshReviews?.()]);
        setReviewSuccess(`Đã phát hành phản hồi chính thức cho đánh giá #${replyModalReview.id}.`);
        setReplyModalReview(null);
        setReplyText("");
      } catch (err) {
        setReplyError(err instanceof Error ? err.message : "Không thể lưu phản hồi đánh giá.");
      } finally {
        setActionBusy(false);
      }
      return;
    }
    app.replyReview(replyModalReview.id, replyText.trim());
    setReplyModalReview(null);
    setReplyText("");
  };

  // Khôi phục hiển thị đánh giá đã từng bị ẩn
  const handleRestoreReview = async (rev: Review) => {
    if (realApi) {
      const reviewId = Number(rev.id);
      if (!Number.isFinite(reviewId) || reviewId <= 0) {
        setReviewError("Mã đánh giá không hợp lệ để khôi phục.");
        return;
      }
      setActionBusy(true);
      setReviewError("");
      setReviewSuccess("");
      try {
        await reviewApi.adminKhoiPhuc(reviewId, "Mở hiển thị lại đánh giá đã kiểm duyệt");
        await Promise.all([loadReviews(), app.refreshReviews?.()]);
        setReviewSuccess(`Đã khôi phục hiển thị đánh giá #${rev.id}.`);
      } catch (err) {
        setReviewError(err instanceof Error ? err.message : "Không thể khôi phục hiển thị đánh giá.");
      } finally {
        setActionBusy(false);
      }
      return;
    }
    // [REV-01] Mock mode: gọi app.restoreReview để thực sự đổi status và tính lại
    // điểm sao sản phẩm thay vì chỉ ghi Audit Log (bug cũ).
    const res = app.restoreReview(rev.id, "Mở hiển thị lại đánh giá đã kiểm duyệt");
    if (!res.ok) {
      setReviewError(res.message);
    } else {
      setReviewSuccess(`Đã khôi phục hiển thị đánh giá #${rev.id}.`);
    }
  };

  // Tìm đơn thuê gốc làm căn cứ xác thực đánh giá (UC9.2.1)
  const orderBasisDetail = orderBasisReview
    ? app.orders.find(
        (o) =>
          o.id === orderBasisReview.orderId ||
          String(o.backendId ?? "") === orderBasisReview.orderId
      )
    : null;

  return {
    realApi,
    ratingFilter,
    setRatingFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    hideModalReview,
    setHideModalReview,
    hideReason,
    setHideReason,
    orderBasisReview,
    setOrderBasisReview,
    replyModalReview,
    setReplyModalReview,
    replyText,
    setReplyText,
    reviewLoading,
    actionBusy,
    reviewError,
    reviewSuccess,
    hideError,
    setHideError,
    replyError,
    setReplyError,
    loadReviews,
    sourceReviews,
    filtered,
    handleConfirmHide,
    handleConfirmReply,
    handleRestoreReview,
    orderBasisDetail,
  };
}
