import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../App";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";
import { reviewApi } from "../../../services/api/reviewApi";
import { policyApi, type KiemTraChinhSachBackend } from "../../../services/api/policyApi";
import { notificationApi, type ThongBaoGuiLoiBackend } from "../../../services/api/notificationApi";
import { paymentApi, type GiaoDichCanDoiChieuBackend } from "../../../services/api/paymentApi";
import { reconciliationApi, type DoiSoatBackend } from "../../../services/api/reconciliationApi";
import { surchargeApi } from "../../../services/api/surchargeApi";
import { auditApi } from "../../../services/api/auditApi";
import {
  mapDanhGiaToReview,
  mapNhatKyToAuditLog,
  type AuditLogEntryWithRef,
} from "../../../services/mappers/reviewNotifAuditMapper";
import { buildTaoChinhSachRequestFromConfig } from "../../../services/mappers/policyPromoMapper";
import { fmt, statusColors, type CustomerAccount, type Review, type RentalPolicyConfig, type PolicyVersion, type FinancialAdjustment, type AppNotification } from "../../../store";
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
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Kiểm duyệt đánh giá sản phẩm (UC9.2)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
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
          <span className="badge badge-success" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
            Tổng cộng {sourceReviews.length} đánh giá
          </span>
        </div>
      </div>

      {reviewError && (
        <div
          role="alert"
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="alert-circle" size={16} />
          <span>{reviewError}</span>
        </div>
      )}

      {reviewSuccess && (
        <div
          role="status"
          style={{
            background: "#DCFCE7",
            border: "1px solid #A7F3D0",
            color: "#15803D",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="check" size={16} />
          <span>{reviewSuccess}</span>
        </div>
      )}

      {/* Thông điệp nghiệp vụ bất biến UC9.2 */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1.2rem" }}>⚖️</span>
        <div style={{ fontSize: "0.8rem", color: "#1E40AF" }}>
          <strong>Quy tắc bất biến kiểm duyệt (UC9.2):</strong> Điểm đánh giá thấp (1 - 2 sao) tự nó không phải căn cứ vi phạm. Hệ thống bảo vệ tính khách quan của phản hồi, không cho phép sửa đổi điểm số hoặc bình luận của khách. Quản trị viên chỉ ẩn khi nội dung chứa từ ngữ thô tục, quảng cáo spam hoặc hình ảnh phản cảm.
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div style={{ position: "relative", minWidth: 260 }}>
          <input
            type="text"
            placeholder="Tìm theo sản phẩm, khách hàng, nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: "0.85rem", background: "white" }}
          />
          <div style={{ position: "absolute", left: 10, top: 9, color: "#9CA3AF" }}><Icon name="search" size={16} /></div>
        </div>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(Number(e.target.value))}
          style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", background: "white" }}
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
          style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", background: "white" }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hiển thị công khai</option>
          <option value="hidden">Đã ẩn vi phạm</option>
        </select>
      </div>

      {/* Reviews list */}
      <div className="flex flex-col gap-3">
        {reviewLoading ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 30, textAlign: "center", color: "#6B7280" }}>
            Đang tải danh sách đánh giá từ máy chủ...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 30, textAlign: "center", color: "#6B7280" }}>
            Không tìm thấy đánh giá nào phù hợp.
          </div>
        ) : (
          filtered.map((rev) => (
            <div
              key={rev.id}
              style={{
                background: "white",
                borderRadius: 12,
                border: "1px solid var(--color-bone)",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <strong style={{ fontSize: "0.95rem", color: "var(--color-bark)" }}>{rev.productName || rev.productId}</strong>
                  <span style={{ color: "#E07A43", fontWeight: 700, fontSize: "0.85rem" }}>{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</span>
                  <span style={{ fontSize: "0.75rem", color: "#64748B", background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>Đơn #{rev.orderId}</span>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: rev.status === "active" ? "#DCFCE7" : "#FEE2E2",
                    color: rev.status === "active" ? "#15803D" : "#DC2626"
                  }}>
                    {rev.status === "active" ? "✓ Đang hiển thị" : "✕ Đã ẩn vi phạm"}
                  </span>
                  <span style={{ fontSize: "0.68rem", background: "#ECFDF5", color: "#059669", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                    ✓ Đã xác thực đơn thuê thực tế
                  </span>
                </div>

                <div style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.5, marginBottom: 8, fontStyle: "italic" }}>
                  "{rev.comment}"
                </div>

                {/* Ảnh đính kèm (UC9.1.2) */}
                {rev.images && rev.images.length > 0 && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>Ảnh dã ngoại:</span>
                    {rev.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Ảnh đánh giá ${idx + 1}`}
                        style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #CBD5E1", cursor: "pointer" }}
                        onClick={() => window.open(img, "_blank")}
                        title="Click để xem ảnh kích thước gốc"
                      />
                    ))}
                  </div>
                )}

                {/* Phản hồi chính thức của cửa hàng (storeResponse) */}
                {(rev.storeResponse || rev.response) && (
                  <div style={{ background: "#F0FDF4", borderLeft: "3px solid #16A34A", borderRadius: "0 8px 8px 0", padding: "8px 12px", marginBottom: 8 }}>
                    <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#166534", display: "flex", justifyContent: "space-between" }}>
                      <span>💬 Phản hồi từ GearGo ({rev.storeResponse?.respondedBy || "Cửa hàng"})</span>
                      <span style={{ fontWeight: 400, color: "#64748B" }}>{rev.storeResponse?.respondedAt}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#14532D" }}>{rev.storeResponse?.response || rev.response}</p>
                  </div>
                )}

                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                  Người gửi: <strong>{rev.customerName}</strong> ({rev.customerId}) · Ngày gửi: {rev.createdAt}
                  {rev.hiddenReason && (
                    <span style={{ color: "#B91C1C", marginLeft: 8 }}>
                      · Lý do ẩn: <strong>{rev.hiddenReason}</strong> ({rev.hiddenBy || "Admin"})
                    </span>
                  )}
                </div>
              </div>

              {/* Nhóm nút hành động */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 150 }}>
                {/* Nút xem căn cứ đơn thuê (UC9.2.1) */}
                <button
                  type="button"
                  onClick={() => setOrderBasisReview(rev)}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    color: "#334155",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center"
                  }}
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
                  style={{
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    color: "#15803D",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center"
                  }}
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
                    style={{
                      background: "white",
                      border: "1px solid #FECACA",
                      color: "#DC2626",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    ✕ Ẩn vi phạm
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleRestoreReview(rev)}
                    style={{
                      background: "var(--color-parchment)",
                      border: "1px solid var(--color-bone)",
                      color: "var(--color-forest)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center"
                    }}
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
          <div className="modal-container" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 className="modal-title">Căn cứ đơn thuê thực tế (UC9.2.1)</h3>
              <button onClick={() => setOrderBasisReview(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 12, border: "1px solid #E2E8F0", marginBottom: 12 }}>
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)" }}>Đơn thuê #{orderBasisReview.orderId}</span>
                  <span className="badge badge-success">{orderBasisDetail?.status || "Hoàn tất"}</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#475569", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div>Khách thuê: <strong>{orderBasisReview.customerName}</strong></div>
                  <div>Mã khách hàng: <strong>{orderBasisReview.customerId}</strong></div>
                  <div>Sản phẩm đánh giá: <strong>{orderBasisReview.productName}</strong></div>
                  <div>Ngày đặt: <strong>{orderBasisDetail?.createdAt || "Chuyến đi gần nhất"}</strong></div>
                </div>
              </div>

              {orderBasisDetail && (
                <div className="mb-3">
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 6 }}>Danh sách thiết bị trong đơn:</div>
                  <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                    {orderBasisDetail.items.map((it, idx) => (
                      <div key={idx} style={{ padding: "8px 12px", borderBottom: idx < orderBasisDetail.items.length - 1 ? "1px solid #E2E8F0" : "none", display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                        <span>{it.productName} (x{it.qty})</span>
                        <span style={{ color: "#64748B" }}>{it.days} ngày · {fmt((it.price ?? it.pricePerDay) * it.qty * it.days)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "0.8rem", fontWeight: 700 }}>
                    <span>Tổng tiền thanh toán đơn:</span>
                    <span style={{ color: "var(--color-forest)" }}>{fmt(orderBasisDetail.total)}</span>
                  </div>
                </div>
              )}

              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: 10, fontSize: "0.75rem", color: "#92400E" }}>
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
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Phản hồi chính thức từ GearGo (UC9.2)</h3>
              <button onClick={() => setReplyModalReview(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {replyError && (
                <div
                  role="alert"
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    color: "#B91C1C",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: "0.78rem",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon name="alert-circle" size={15} />
                  <span>{replyError}</span>
                </div>
              )}
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 10, border: "1px solid #E2E8F0", marginBottom: 12, fontSize: "0.8rem" }}>
                <div style={{ fontWeight: 700, color: "var(--color-bark)" }}>{replyModalReview.customerName} đánh giá {replyModalReview.rating} sao:</div>
                <div style={{ fontStyle: "italic", color: "#475569", marginTop: 2 }}>"{replyModalReview.comment}"</div>
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Nội dung phản hồi từ Cửa hàng / Admin</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="GearGo trân trọng cảm ơn quý khách đã phản hồi..."
                  className="form-textarea"
                  style={{ fontSize: "0.85rem" }}
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
          <div className="modal-container" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Ẩn đánh giá vi phạm</h3>
              <button onClick={() => setHideModalReview(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {hideError && (
                <div
                  role="alert"
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    color: "#B91C1C",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: "0.78rem",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon name="alert-circle" size={15} />
                  <span>{hideError}</span>
                </div>
              )}
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: "0.75rem", color: "#991B1B" }}>
                <strong>LƯU Ý NGHIỆP VỤ BẮT BUỘC:</strong> Điểm đánh giá 1-2 sao tự nó KHÔNG phải lý do vi phạm. Chỉ được ẩn khi nhận xét có từ ngữ thô tục, quảng cáo spam hoặc hình ảnh phản cảm.
              </div>
              <p style={{ fontSize: "0.82rem", color: "#4B5563", marginBottom: 8 }}>
                Chọn căn cứ vi phạm chuẩn:
              </p>
              <select
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", marginBottom: 12, background: "white" }}
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
                  className="btn btn-secondary btn-md"
                  style={{ flex: 1 }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleConfirmHide()}
                  className="btn btn-md"
                  style={{ flex: 1, background: "#DC2626", color: "white", border: 0 }}
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
