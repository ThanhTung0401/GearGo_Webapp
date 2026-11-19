import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "../../../context/AppContext";
import { reviewApi, type SanPhamDuDieuKienDanhGiaBackend } from "../../../services/api";
import { mapDanhGiaToReview } from "../../../services/mappers";
import { getErrorMessage, readFileAsDataUrl, validateImageFile } from "../../../utils";
import type { Review } from "../../../store";

export interface ReviewTarget {
  orderId: string;
  productId: string;
  productName: string;
  maChiTietDonThue?: number;
}

/**
 * Hook quản lý danh sách sản phẩm đủ điều kiện đánh giá, tải ảnh (UC9.1.2) và gửi đánh giá (UC9.1).
 */
export function useProfileReviews(onEligibleCountChange?: (count: number) => void) {
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

  // Gửi đánh giá sản phẩm lên API thật hoặc thêm vào mock store
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

  const addImageFromInput = () => {
    const url = reviewImageInput.trim();
    if (url && reviewImages.length < 5 && !reviewImages.includes(url)) {
      setReviewImages((prev) => [...prev, url]);
      setReviewImageInput("");
    }
  };

  const addSampleImage = (url: string) => {
    setReviewImages((prev) => (prev.length < 5 && !prev.includes(url) ? [...prev, url] : prev));
  };

  const removeImageAt = (idx: number) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== idx));
  };

  return {
    app,
    eligibleReviewItems,
    myRealReviews,
    reviewsLoading,
    reviewingTarget,
    setReviewingTarget,
    rating,
    setRating,
    comment,
    setComment,
    reviewImageInput,
    setReviewImageInput,
    reviewImages,
    reviewError,
    reviewSubmitting,
    reviewUploading,
    handleUploadReviewFiles,
    handleSendReview,
    openComposer,
    addImageFromInput,
    addSampleImage,
    removeImageAt,
  };
}
