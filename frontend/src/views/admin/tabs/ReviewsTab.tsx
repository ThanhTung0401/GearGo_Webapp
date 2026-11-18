import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../App";
import { isRealApiEnabled } from "../../../services/apiClient";

import { reviewApi } from "../../../services/api/reviewApi";

import { mapDanhGiaToReview } from "../../../services/mappers/reviewNotifAuditMapper";

import { fmt, type Review } from "../../../store";
import Icon from "../../../components/Icon";
export function ReviewsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const realApi = app.realApi || isRealApiEnabled();
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [search, setSearch] = useState("");
  const [hideModalReview, setHideModalReview] = useState<Review | null>(null);
  const [hideReason, setHideReason] = useState("Vi phạm ngôn từ / Thô tục");
  const [orderBasisReview, setOrderBasisReview] = useState<Review | null>(null);
  const [replyModalReview, setReplyModalReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");

  // State đồng bộ API đánh giá thật (/api/v1/admin/danh-gia)
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
    app.addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Bỏ ẩn đánh giá",
      targetEntity: "Review",
      targetId: rev.id,
      detail: "Mở hiển thị lại đánh giá đã kiểm duyệt",
    });
  };

  const orderBasisDetail = orderBasisReview
    ? app.orders.find(
        (o) =>
          o.id === orderBasisReview.orderId ||
          String(o.backendId ?? "") === orderBasisReview.orderId
      )
    : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="adm-page-title">
            Kiểm duyệt đánh giá sản phẩm (UC9.2)
          </h2>
          <p className="adm-page-subtitle">
            Kiểm tra và xử lý đánh giá theo quy tắc khách quan: Đánh giá điểm thấp không phải lý do vi phạm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {realApi && (
            <button
              type="button"
              disabled={reviewLoading}
              onClick={() => void loadReviews()}
              className="btn btn-secondary btn-sm"
            >
              <span className="icon-label"><Icon name="refresh" size={14} /> Làm mới</span>
            </button>
          )}
          <span className="badge badge-success px-3 py-1.5 text-[0.8rem]">
            Tổng cộng {sourceReviews.length} đánh giá
          </span>
        </div>
      </div>

      {reviewError && (
        <div role="alert" className="adm-alert is-error">
          <Icon name="alert-circle" size={16} />
          <span>{reviewError}</span>
        </div>
      )}

      {reviewSuccess && (
        <div role="status" className="adm-alert is-success">
          <Icon name="check" size={16} />
          <span>{reviewSuccess}</span>
        </div>
      )}

      {/* Thông điệp nghiệp vụ bất biến UC9.2 */}
      <div className="adm-alert is-info mb-4">
        <span className="text-lg">⚖️</span>
        <div className="text-[0.8rem]">
          <strong>Quy tắc bất biến kiểm duyệt (UC9.2):</strong> Điểm đánh giá thấp (1 - 2 sao) tự nó không phải căn cứ vi phạm. Hệ thống bảo vệ tính khách quan của phản hồi, không cho phép sửa đổi điểm số hoặc bình luận của khách. Quản trị viên chỉ ẩn khi nội dung chứa từ ngữ thô tục, quảng cáo spam hoặc hình ảnh phản cảm.
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="adm-input-icon-wrap adm-input-icon-wrap--fixed">
          <input
            type="text"
            placeholder="Tìm theo sản phẩm, khách hàng, nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="adm-input-with-icon"
          />
          <div className="adm-input-icon"><Icon name="search" size={16} /></div>
        </div>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(Number(e.target.value))}
          className="adm-select"
        >
          <option value={0}>Tất cả số sao</option>
          <option value={5}>5 sao ★★★★★</option>
          <option value={4}>4 sao ★★★★</option>
          <option value={3}>3 sao ★★★</option>
          <option value={2}>2 sao ★★</option>
          <option value={1}>1 sao ★</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="adm-select"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hiển thị công khai</option>
          <option value="hidden">Đã ẩn vi phạm</option>
        </select>
      </div>

      {/* Reviews list */}
      <div className="flex flex-col gap-3">
        {reviewLoading ? (
          <div className="adm-empty-box">
            Đang tải danh sách đánh giá từ máy chủ...
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty-box">
            Không tìm thấy đánh giá nào phù hợp.
          </div>
        ) : (
          filtered.map((rev) => (
            <div key={rev.id} className="adm-review-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <strong className="text-[0.95rem] text-[var(--color-bark)]">{rev.productName || rev.productId}</strong>
                  <span className="text-[#E07A43] font-bold text-[0.85rem]">{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</span>
                  <span className="adm-pill is-slate">Đơn #{rev.orderId}</span>
                  <span className={`adm-pill ${rev.status === "active" ? "is-success" : "is-danger"}`}>
                    {rev.status === "active" ? "✓ Đang hiển thị" : "✕ Đã ẩn vi phạm"}
                  </span>
                  <span className="adm-pill is-success adm-pill--xs">
                    ✓ Đã xác thực đơn thuê thực tế
                  </span>
                </div>

                <div className="adm-review-comment">
                  "{rev.comment}"
                </div>

                {/* Ảnh đính kèm (UC9.1.2) */}
                {rev.images && rev.images.length > 0 && (
                  <div className="flex gap-2 items-center mb-2.5 flex-wrap">
                    <span className="text-[0.75rem] text-[#64748B] font-semibold">Ảnh dã ngoại:</span>
                    {rev.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Ảnh đánh giá ${idx + 1}`}
                        className="adm-review-img"
                        onClick={() => window.open(img, "_blank")}
                        title="Click để xem ảnh kích thước gốc"
                      />
                    ))}
                  </div>
                )}

                {/* Phản hồi chính thức của cửa hàng (storeResponse) */}
                {(rev.storeResponse || rev.response) && (
                  <div className="adm-review-reply-box">
                    <div className="text-[0.74rem] font-bold text-[#166534] flex justify-between gap-2 flex-wrap">
                      <span>💬 Phản hồi từ GearGo ({rev.storeResponse?.respondedBy || "Cửa hàng"})</span>
                      <span className="font-normal text-[#64748B]">{rev.storeResponse?.respondedAt}</span>
                    </div>
                    <p className="mt-1 mb-0 text-[0.8rem] text-[#14532D]">{rev.storeResponse?.response || rev.response}</p>
                  </div>
                )}

                <div className="adm-hint-text text-[0.75rem]">
                  Người gửi: <strong>{rev.customerName}</strong> ({rev.customerId}) · Ngày gửi: {rev.createdAt}
                  {rev.hiddenReason && (
                    <span className="text-[#B91C1C] ml-2">
                      · Lý do ẩn: <strong>{rev.hiddenReason}</strong> ({rev.hiddenBy || "Admin"})
                    </span>
                  )}
                </div>
              </div>

              {/* Nhóm nút hành động */}
              <div className="adm-review-actions">
                {/* Nút xem căn cứ đơn thuê (UC9.2.1) */}
                <button
                  type="button"
                  onClick={() => setOrderBasisReview(rev)}
                  className="adm-btn-outline py-1.5 px-2.5 text-center"
                >
                  📋 Căn cứ đơn thuê
                </button>

                {/* Nút viết phản hồi từ cửa hàng */}
                <button
                  type="button"
                  onClick={() => {
                    setReplyModalReview(rev);
                    setReplyText(rev.storeResponse?.response || rev.response || "");
                    setReplyError("");
                  }}
                  className="adm-btn-success-outline py-1.5 px-2.5 text-center"
                >
                  💬 {rev.storeResponse ? "Sửa phản hồi" : "Phản hồi"}
                </button>

                {/* Nút Ẩn / Bỏ ẩn */}
                {rev.status === "active" ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => {
                      setHideModalReview(rev);
                      setHideReason("Vi phạm ngôn từ / Thô tục");
                      setHideError("");
                    }}
                    className="adm-btn-danger-outline py-1.5 px-2.5 text-center"
                  >
                    ✕ Ẩn vi phạm
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleRestoreReview(rev)}
                    className="adm-btn-parchment py-1.5 px-2.5 text-center text-[var(--color-forest)] font-bold"
                  >
                    ✓ Bỏ ẩn
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Căn cứ đơn thuê (UC9.2.1) */}
      {orderBasisReview && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-560">
            <div className="modal-header">
              <h3 className="modal-title">Căn cứ đơn thuê thực tế (UC9.2.1)</h3>
              <button onClick={() => setOrderBasisReview(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <div className="adm-card--slate mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="adm-cell-title">Đơn thuê #{orderBasisReview.orderId}</span>
                  <span className="badge badge-success">{orderBasisDetail?.status || "Hoàn tất"}</span>
                </div>
                <div className="adm-grid-2 text-[0.78rem] text-[#475569] gap-1.5">
                  <div>Khách thuê: <strong>{orderBasisReview.customerName}</strong></div>
                  <div>Mã khách hàng: <strong>{orderBasisReview.customerId}</strong></div>
                  <div>Sản phẩm đánh giá: <strong>{orderBasisReview.productName}</strong></div>
                  <div>Ngày đặt: <strong>{orderBasisDetail?.createdAt || "Chuyến đi gần nhất"}</strong></div>
                </div>
              </div>

              {orderBasisDetail && (
                <div className="mb-3">
                  <div className="adm-label--sub mb-1.5">Danh sách thiết bị trong đơn:</div>
                  <div className="adm-table-wrap rounded-lg">
                    {orderBasisDetail.items.map((it, idx) => (
                      <div key={idx} className={`flex justify-between py-2 px-3 text-[0.78rem] ${idx < orderBasisDetail.items.length - 1 ? "border-b border-[#E2E8F0]" : ""}`}>
                        <span>{it.productName} (x{it.qty})</span>
                        <span className="text-[#64748B]">{it.days} ngày · {fmt((it.price ?? it.pricePerDay) * it.qty * it.days)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-[0.8rem] font-bold">
                    <span>Tổng tiền thanh toán đơn:</span>
                    <span className="text-[var(--color-forest)]">{fmt(orderBasisDetail.total)}</span>
                  </div>
                </div>
              )}

              <div className="adm-alert is-warning adm-alert--block mb-0 text-[0.75rem]">
                ✓ Đơn thuê đã được nghiệm thu và hoàn tất bàn giao / trả đồ đầy đủ. Đánh giá của khách hàng đủ điều kiện hiển thị công khai.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setOrderBasisReview(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Phản hồi chính thức từ GearGo (UC9.2) */}
      {replyModalReview && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-md">
            <div className="modal-header">
              <h3 className="modal-title">Phản hồi chính thức từ GearGo (UC9.2)</h3>
              <button onClick={() => setReplyModalReview(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {replyError && (
                <div role="alert" className="adm-alert adm-alert--compact is-error">
                  <Icon name="alert-circle" size={15} />
                  <span>{replyError}</span>
                </div>
              )}
              <div className="adm-card--slate mb-3 text-[0.8rem]">
                <div className="font-bold text-[var(--color-bark)]">{replyModalReview.customerName} đánh giá {replyModalReview.rating} sao:</div>
                <div className="italic text-[#475569] mt-0.5">"{replyModalReview.comment}"</div>
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Nội dung phản hồi từ Cửa hàng / Admin</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="GearGo trân trọng cảm ơn quý khách đã phản hồi..."
                  className="form-textarea text-[0.85rem]"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  setReplyModalReview(null);
                  setReplyError("");
                }}
                className="btn btn-secondary btn-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmReply()}
                className="btn btn-primary btn-sm"
                disabled={actionBusy || !replyText.trim()}
              >
                {actionBusy ? "Đang lưu..." : "Lưu và phát hành phản hồi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ẩn đánh giá vi phạm */}
      {hideModalReview && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-sm">
            <div className="modal-header">
              <h3 className="modal-title">Ẩn đánh giá vi phạm</h3>
              <button onClick={() => setHideModalReview(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {hideError && (
                <div role="alert" className="adm-alert adm-alert--compact is-error">
                  <Icon name="alert-circle" size={15} />
                  <span>{hideError}</span>
                </div>
              )}
              <div className="adm-alert is-error adm-alert--block text-[0.75rem] mb-3">
                <strong>LƯU Ý NGHIỆP VỤ BẮT BUỘC:</strong> Điểm đánh giá 1-2 sao tự nó KHÔNG phải lý do vi phạm. Chỉ được ẩn khi nhận xét có từ ngữ thô tục, quảng cáo spam hoặc hình ảnh phản cảm.
              </div>
              <p className="text-[0.82rem] text-[#4B5563] mb-2">
                Chọn căn cứ vi phạm chuẩn:
              </p>
              <select
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                className="adm-field adm-field--compact mb-3"
              >
                <option value="Vi phạm ngôn từ / Thô tục">Vi phạm ngôn từ / Xúc phạm thô tục</option>
                <option value="Chứa liên kết quảng cáo spam">Chứa liên kết quảng cáo spam</option>
                <option value="Hình ảnh phản cảm, không liên quan dã ngoại">Hình ảnh phản cảm, không liên quan dã ngoại</option>
                <option value="Tiết lộ thông tin cá nhân trái phép">Tiết lộ thông tin cá nhân trái phép</option>
                <option value="Thông tin hoàn toàn sai sự thật">Thông tin hoàn toàn sai sự thật (đã xác minh đối chiếu)</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => {
                    setHideModalReview(null);
                    setHideError("");
                  }}
                  className="btn btn-secondary btn-md adm-btn-flex"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleConfirmHide()}
                  className="btn btn-md adm-btn-flex adm-btn-danger-solid"
                >
                  {actionBusy ? "Đang xử lý..." : "Xác nhận ẩn"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. Cấu hình Chính Sách Thuê & Hủy (UC8.1 & UC8.1.1) ───────────────────────
