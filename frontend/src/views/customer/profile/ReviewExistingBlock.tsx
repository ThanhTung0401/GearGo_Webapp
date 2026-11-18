import type { Review } from "../../../store";

interface ReviewExistingBlockProps {
  existing: Review;
}

/**
 * Hiển thị nội dung đánh giá đã gửi, ảnh thực tế đính kèm và phản hồi từ cửa hàng GearGo.
 */
export function ReviewExistingBlock({ existing }: ReviewExistingBlockProps) {
  return (
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
              className="cp-review-img-thumb"
              onClick={() => window.open(img, "_blank")}
              title="Xem ảnh gốc"
            />
          ))}
        </div>
      )}
      {(existing.storeResponse || existing.response) && (
        <div className="cp-review-reply-box">
          <div className="cp-review-reply-header">
            <span>💬 Phản hồi từ GearGo ({existing.storeResponse?.respondedBy || "Cửa hàng"})</span>
            <span className="cp-review-reply-date">{existing.storeResponse?.respondedAt}</span>
          </div>
          <div className="cp-review-reply-text">
            {existing.storeResponse?.response || existing.response}
          </div>
        </div>
      )}
    </div>
  );
}
