import type { FormEvent } from "react";

interface ReviewComposerFormProps {
  productName: string;
  displayOrderCode: string;
  rating: number;
  setRating: (v: number) => void;
  comment: string;
  setComment: (v: string) => void;
  reviewImageInput: string;
  setReviewImageInput: (v: string) => void;
  reviewImages: string[];
  reviewError: string;
  reviewSubmitting: boolean;
  reviewUploading: boolean;
  onAddImageUrl: () => void;
  onUploadFiles: (files: FileList | null) => Promise<void>;
  onAddSampleImage: (url: string) => void;
  onRemoveImageAt: (idx: number) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onCancel: () => void;
}

const SAMPLE_REVIEW_IMAGES = [
  { label: "🏕️ Cắm trại bờ hồ", url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop" },
  { label: "🌄 Lều hoàng hôn", url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=600&auto=format&fit=crop" },
  { label: "☕ Bếp dã ngoại", url: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600&auto=format&fit=crop" },
];

/**
 * Form soạn đánh giá sản phẩm sau chuyến đi kèm chọn sao và đính kèm tối đa 5 ảnh thực tế (UC9.1, UC9.1.2).
 */
export function ReviewComposerForm({
  productName,
  displayOrderCode,
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
  onAddImageUrl,
  onUploadFiles,
  onAddSampleImage,
  onRemoveImageAt,
  onSubmit,
  onCancel,
}: ReviewComposerFormProps) {
  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-3 bg-white p-4 rounded-lg border border-bone shadow-sm">
      {/* Cho phép xuống dòng trên mobile 390px và dùng .cp-badge-wrap để mã đơn dài không tràn khung form */}
      <div className="flex justify-between items-center mb-3 border-b border-bone pb-2 flex-wrap gap-2">
        <h4 className="font-bold text-sm text-bark min-w-0">Đánh giá trải nghiệm: {productName}</h4>
        <span className="badge badge-neutral text-xs cp-badge-wrap">Mã đơn #{displayOrderCode}</span>
      </div>

      <div className="mb-3">
        <label className="form-label mb-1">Mức độ hài lòng của bạn</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              className={`cp-star-btn ${rating >= s ? "is-active" : ""}`}
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
            className="form-input flex-1 cp-review-url-input"
          />
          <button
            type="button"
            disabled={!reviewImageInput.trim() || reviewImages.length >= 5}
            onClick={onAddImageUrl}
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
                void onUploadFiles(e.target.files);
                e.target.value = "";
              }}
              className="cp-review-file-input"
            />
          </label>
        </div>

        <div className="text-xs text-gray-500 mb-1.5">Gợi ý chọn nhanh ảnh dã ngoại mẫu:</div>
        <div className="flex gap-2 flex-wrap">
          {SAMPLE_REVIEW_IMAGES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              disabled={reviewImages.length >= 5}
              onClick={() => onAddSampleImage(sample.url)}
              className="btn btn-ghost btn-sm cp-review-sample-btn"
            >
              {sample.label}
            </button>
          ))}
        </div>

        {reviewImages.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {reviewImages.map((img, idx) => (
              <div key={idx} className="cp-review-preview-item">
                <img
                  src={img}
                  alt={`Xem trước ảnh ${idx + 1}`}
                  className="cp-review-preview-img"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImageAt(idx)}
                  className="cp-review-preview-remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewError && <div className="form-error-msg mb-2">{reviewError}</div>}
      <div className="flex gap-2 flex-wrap">
        <button type="submit" disabled={reviewSubmitting} className="btn btn-primary btn-sm">
          {reviewSubmitting ? "Đang gửi..." : "✓ Gửi đánh giá ngay"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary btn-sm">
          Hủy bỏ
        </button>
      </div>
    </form>
  );
}
