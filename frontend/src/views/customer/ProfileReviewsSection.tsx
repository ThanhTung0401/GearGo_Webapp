import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "../../App";
import { reviewApi, type SanPhamDuDieuKienDanhGiaBackend } from "../../services/api";
import { mapDanhGiaToReview } from "../../services/mappers";
import { getErrorMessage, readFileAsDataUrl, validateImageFile } from "../../utils";
import type { Order, Review } from "../../store";

interface ReviewTarget {
  orderId: string;
  productId: string;
  productName: string;
  maChiTietDonThue?: number;
}

interface ProfileReviewsSectionProps {
  completedOrders: Order[];
  onEligibleCountChange?: (count: number) => void;
}

/**
 * Khối đánh giá sản phẩm sau chuyến đi (UC9.1, UC9.1.1, UC9.1.2)
 * Tách khỏi ProfileView để gom luồng API thật & mô phỏng và tái sử dụng form soạn đánh giá.
 */
export function ProfileReviewsSection({
  completedOrders,
  onEligibleCountChange,
}: ProfileReviewsSectionProps) {
  const app = useApp();
  const [eligibleReviewItems, setEligibleReviewItems] = useState<SanPhamDuDieuKienDanhGiaBackend[]>([]);
  const [myRealReviews, setMyRealReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [reviewingTarget, setReviewingTarget] = useState<ReviewTarget | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewImageInput, setReviewImageInput] = useState("");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewUploading, setReviewUploading] = useState(false);

  useEffect(() => {
    if (!app.realApi || !app.currentUser) return;
    setReviewsLoading(true);
    void Promise.all([
      reviewApi.laySanPhamDuDieuKien().catch(() => [] as SanPhamDuDieuKienDanhGiaBackend[]),
      reviewApi.layDanhGiaCuaToi().catch(() => ({ items: [], tongSo: 0, trang: 1, soMoiTrang: 20 })),
    ])
      .then(([eligible, myRevs]) => {
        setEligibleReviewItems(eligible);
        onEligibleCountChange?.(eligible.length);
        setMyRealReviews((myRevs.items ?? []).map(mapDanhGiaToReview));
      })
      .finally(() => setReviewsLoading(false));
  }, [app.realApi, app.currentUser?.id]);

  // Xử lý tải ảnh đánh giá từ máy lên (UC9.1.2): kiểm tra định dạng, dung lượng <= 5MB và giới hạn tối đa 5 ảnh
  const handleUploadReviewFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = 5 - reviewImages.length;
    if (remainingSlots <= 0) {
      setReviewError("Chỉ được đính kèm tối đa 5 ảnh cho mỗi đánh giá.");
      return;
    }

    const selected = Array.from(files).slice(0, remainingSlots);
    setReviewUploading(true);
    setReviewError("");
    try {
      const uploadedUrls: string[] = [];
      for (const file of selected) {
        validateImageFile(file, 5);
        if (app.realApi) {
          const uploaded = await reviewApi.uploadHinhAnh(file);
          if (uploaded.url) uploadedUrls.push(uploaded.url);
        } else {
          const dataUrl = await readFileAsDataUrl(file);
          if (dataUrl) uploadedUrls.push(dataUrl);
        }
      }
      if (uploadedUrls.length > 0) {
        setReviewImages((prev) => [...prev, ...uploadedUrls].slice(0, 5));
      }
    } catch (err) {
      setReviewError(getErrorMessage(err, "Tải ảnh đánh giá thất bại."));
    } finally {
      setReviewUploading(false);
    }
  };

  const handleSendReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewingTarget) return;

    if (app.realApi) {
      if (!reviewingTarget.maChiTietDonThue) {
        setReviewError("Không xác định được dòng đơn thuê đủ điều kiện đánh giá.");
        return;
      }
      setReviewSubmitting(true);
      setReviewError("");
      try {
        await reviewApi.taoDanhGia({
          maChiTietDonThue: reviewingTarget.maChiTietDonThue,
          soSao: rating,
          noiDung: comment.trim() || undefined,
          danhSachAnh: reviewImages.length > 0 ? reviewImages.slice(0, 5) : undefined,
        });
        const [eligible, myRevs] = await Promise.all([
          reviewApi.laySanPhamDuDieuKien(),
          reviewApi.layDanhGiaCuaToi(),
        ]);
        setEligibleReviewItems(eligible);
        onEligibleCountChange?.(eligible.length);
        setMyRealReviews((myRevs.items ?? []).map(mapDanhGiaToReview));
        void app.refreshReviews?.();
        setReviewingTarget(null);
        setComment("");
        setRating(5);
        setReviewImages([]);
        setReviewImageInput("");
      } catch (err) {
        setReviewError(getErrorMessage(err, "Không thể gửi đánh giá sản phẩm."));
      } finally {
        setReviewSubmitting(false);
      }
      return;
    }

    const res = app.addReview({
      orderId: reviewingTarget.orderId,
      productId: reviewingTarget.productId,
      rating,
      comment,
      images: reviewImages.length > 0 ? reviewImages.slice(0, 5) : undefined,
    });
    if (res.ok) {
      setReviewingTarget(null);
      setComment("");
      setRating(5);
      setReviewImages([]);
      setReviewImageInput("");
      setReviewError("");
    } else {
      setReviewError(res.message);
    }
  };

  const openComposer = (target: ReviewTarget) => {
    setReviewingTarget(target);
    setReviewError("");
    setRating(5);
    setComment("");
    setReviewImages([]);
    setReviewImageInput("");
  };

  const renderExistingReview = (existing: Review) => (
    <div className="mt-2.5 flex flex-col gap-2">
      <div className="bg-white p-2.5 rounded-lg border border-bone text-xs text-gray-700 italic">
        "{existing.comment}"
      </div>
      {existing.images && existing.images.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Ảnh thực tế:</span>
          {existing.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt="Ảnh dã ngoại thực tế"
              style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #CBD5E1", cursor: "pointer" }}
              onClick={() => window.open(img, "_blank")}
              title="Xem ảnh gốc"
            />
          ))}
        </div>
      )}
      {(existing.storeResponse || existing.response) && (
        <div style={{ background: "#F0FDF4", borderLeft: "3px solid #16A34A", borderRadius: "0 6px 6px 0", padding: "8px 12px" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#166534", display: "flex", justifyContent: "space-between" }}>
            <span>💬 Phản hồi từ GearGo ({existing.storeResponse?.respondedBy || "Cửa hàng"})</span>
            <span style={{ fontWeight: 400, color: "#64748B" }}>{existing.storeResponse?.respondedAt}</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#14532D", marginTop: 4, lineHeight: 1.45 }}>
            {existing.storeResponse?.response || existing.response}
          </div>
        </div>
      )}
    </div>
  );

  const renderReviewForm = (displayOrderCode: string) => (
    <form onSubmit={(e) => void handleSendReview(e)} className="mt-3 bg-white p-4 rounded-lg border border-bone shadow-sm">
      <div className="flex justify-between items-center mb-3 border-b border-bone pb-2">
        <h4 className="font-bold text-sm text-bark">Đánh giá trải nghiệm: {reviewingTarget?.productName}</h4>
        <span className="badge badge-neutral text-xs">Mã đơn #{displayOrderCode}</span>
      </div>

      <div className="mb-3">
        <label className="form-label mb-1">Mức độ hài lòng của bạn</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              style={{
                background: rating >= s ? "#FEF3C7" : "#F3F4F6",
                border: `1px solid ${rating >= s ? "#F59E0B" : "#E5E7EB"}`,
                color: rating >= s ? "#D97706" : "#9CA3AF",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              ★ {s} {s === 5 ? "Rất tốt" : s === 4 ? "Tốt" : s === 3 ? "Bình thường" : s === 2 ? "Chưa tốt" : "Tệ"}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group mb-3">
        <label className="form-label">Nhận xét chi tiết chuyến đi</label>
        <textarea
          required
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Chia sẻ trải nghiệm thực tế: độ bền, độ sạch sẽ, khả năng chống mưa nắng của thiết bị..."
          className="form-textarea"
        />
      </div>

      <div className="mb-3">
        <label className="form-label mb-1">Ảnh thực tế từ chuyến dã ngoại (tối đa 5 ảnh - UC9.1.2)</label>
        <div className="flex gap-2 mb-2 flex-wrap">
          <input
            type="url"
            placeholder="Dán URL ảnh dã ngoại (https://...)"
            value={reviewImageInput}
            onChange={(e) => setReviewImageInput(e.target.value)}
            className="form-input flex-1"
            style={{ fontSize: "0.82rem", minWidth: 200 }}
          />
          <button
            type="button"
            disabled={!reviewImageInput.trim() || reviewImages.length >= 5}
            onClick={() => {
              const url = reviewImageInput.trim();
              if (url && reviewImages.length < 5 && !reviewImages.includes(url)) {
                setReviewImages((prev) => [...prev, url]);
                setReviewImageInput("");
              }
            }}
            className="btn btn-secondary btn-sm"
          >
            + Thêm ({reviewImages.length}/5)
          </button>
          <label
            className={`btn btn-secondary btn-sm ${reviewImages.length >= 5 || reviewUploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
          >
            {reviewUploading ? "Đang tải ảnh..." : "📷 Tải ảnh từ máy"}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={reviewImages.length >= 5 || reviewUploading}
              onChange={(e) => {
                void handleUploadReviewFiles(e.target.files);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <div className="text-xs text-gray-500 mb-1.5">Gợi ý chọn nhanh ảnh dã ngoại mẫu:</div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "🏕️ Cắm trại bờ hồ", url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop" },
            { label: "🌄 Lều hoàng hôn", url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=600&auto=format&fit=crop" },
            { label: "☕ Bếp dã ngoại", url: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600&auto=format&fit=crop" },
          ].map((sample, idx) => (
            <button
              key={idx}
              type="button"
              disabled={reviewImages.length >= 5}
              onClick={() =>
                setReviewImages((prev) => (prev.length < 5 && !prev.includes(sample.url) ? [...prev, sample.url] : prev))
              }
              className="btn btn-ghost btn-sm"
              style={{ fontSize: "0.72rem", border: "1px dashed #CBD5E1", padding: "3px 8px" }}
            >
              {sample.label}
            </button>
          ))}
        </div>

        {reviewImages.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {reviewImages.map((img, idx) => (
              <div key={idx} style={{ position: "relative" }}>
                <img
                  src={img}
                  alt={`Xem trước ảnh ${idx + 1}`}
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid #CBD5E1" }}
                />
                <button
                  type="button"
                  onClick={() => setReviewImages((prev) => prev.filter((_, i) => i !== idx))}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#EF4444",
                    color: "white",
                    border: "none",
                    fontSize: "0.65rem",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewError && <div className="form-error-msg mb-2">{reviewError}</div>}
      <div className="flex gap-2">
        <button type="submit" disabled={reviewSubmitting} className="btn btn-primary btn-sm">
          {reviewSubmitting ? "Đang gửi..." : "✓ Gửi đánh giá ngay"}
        </button>
        <button type="button" onClick={() => setReviewingTarget(null)} className="btn btn-secondary btn-sm">
          Hủy bỏ
        </button>
      </div>
    </form>
  );

  return (
    <div className="card-panel">
      <h2 className="font-display font-bold text-lg text-bark mb-1">
        Đánh giá sản phẩm theo đơn đã hoàn tất
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Lưu ý: Mỗi sản phẩm trong một đơn hoàn tất chỉ được đánh giá một lần duy nhất.
      </p>

      {app.realApi ? (
        reviewsLoading ? (
          <div className="card-panel-muted text-center py-8 text-gray-500 text-sm">
            Đang tải danh sách sản phẩm đủ điều kiện đánh giá...
          </div>
        ) : eligibleReviewItems.length === 0 && myRealReviews.length === 0 ? (
          <div className="card-panel-muted text-center py-8 text-gray-500 text-sm">
            Chưa có đơn thuê nào hoàn tất để gửi đánh giá.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {eligibleReviewItems.map((el) => {
              const existing = myRealReviews.find(
                (r) => r.orderId === String(el.maDonThue) && r.productId === String(el.maSanPham)
              );
              const isCurrentReviewing =
                reviewingTarget?.orderId === String(el.maDonThue) &&
                reviewingTarget?.productId === String(el.maSanPham);

              return (
                <div key={el.maChiTietDonThue} className="border border-bone rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed border-bone">
                    <div>
                      <strong className="font-mono text-forest">{el.maDonHienThi || el.maDonThue}</strong>
                      <span className="text-xs text-gray-400 ml-3">
                        Hoàn tất: {el.thoiDiemHoanTat ? new Date(el.thoiDiemHoanTat).toLocaleDateString("vi-VN") : "-"}
                      </span>
                    </div>
                    <span className="badge badge-success">Đã hoàn tất</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="font-bold text-bark text-sm">{el.tenSanPham}</div>
                    {el.daDanhGia || existing ? (
                      <div className="text-right">
                        {existing && (
                          <span className="text-amber font-bold text-sm">
                            {"★".repeat(existing.rating)}{"☆".repeat(5 - existing.rating)}
                          </span>
                        )}
                        <div className="text-xs text-emerald-600 font-semibold">✓ Đã đánh giá</div>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          openComposer({
                            orderId: String(el.maDonThue),
                            productId: String(el.maSanPham),
                            productName: el.tenSanPham,
                            maChiTietDonThue: el.maChiTietDonThue,
                          })
                        }
                        className="btn btn-secondary btn-sm"
                      >
                        Viết đánh giá
                      </button>
                    )}
                  </div>

                  {existing && renderExistingReview(existing)}
                  {isCurrentReviewing && renderReviewForm(el.maDonHienThi || reviewingTarget?.orderId || "")}
                </div>
              );
            })}
          </div>
        )
      ) : completedOrders.length === 0 ? (
        <div className="card-panel-muted text-center py-8 text-gray-500 text-sm">
          Chưa có đơn thuê nào hoàn tất để gửi đánh giá.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {completedOrders.map((order) => (
            <div key={order.id} className="border border-bone rounded-xl p-4">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-dashed border-bone">
                <div>
                  <strong className="font-mono text-forest">{order.id}</strong>
                  <span className="text-xs text-gray-400 ml-3">
                    Hoàn tất: {order.reconciledAt || order.createdAt}
                  </span>
                </div>
                <span className="badge badge-success">Đã hoàn tất</span>
              </div>

              <div className="flex flex-col gap-3">
                {order.items.map((item) => {
                  const existing = app.reviews.find(
                    (r) => r.orderId === order.id && r.productId === item.productId
                  );
                  const isCurrentReviewing =
                    reviewingTarget?.orderId === order.id &&
                    reviewingTarget?.productId === item.productId;

                  return (
                    <div key={item.productId} className="p-3 bg-parchment rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-bark text-sm">{item.productName}</div>
                          <div className="text-xs text-gray-500">Số lượng thuê: {item.qty}</div>
                        </div>
                        {existing ? (
                          <div className="text-right">
                            <span className="text-amber font-bold text-sm">
                              {"★".repeat(existing.rating)}{"☆".repeat(5 - existing.rating)}
                            </span>
                            <div className="text-xs text-emerald-600 font-semibold">✓ Đã đánh giá</div>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              openComposer({
                                orderId: order.id,
                                productId: item.productId,
                                productName: item.productName,
                              })
                            }
                            className="btn btn-secondary btn-sm"
                          >
                            Viết đánh giá
                          </button>
                        )}
                      </div>

                      {existing && renderExistingReview(existing)}
                      {isCurrentReviewing && renderReviewForm(reviewingTarget?.orderId || "")}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
