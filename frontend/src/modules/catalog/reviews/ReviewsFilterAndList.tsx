import Icon from "../../../components/Icon";
import { formatDateTimeVi, type Review } from "../../../store";
import { Can } from "../../../features/permissions/PermissionsContext";
import { Permissions } from "../../../constants/permissions";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";

interface ReviewsFilterAndListProps {
  realApi: boolean;
  totalCount: number;
  reviewLoading: boolean;
  actionBusy: boolean;
  reviewError: string;
  reviewSuccess: string;
  search: string;
  setSearch: (v: string) => void;
  ratingFilter: number;
  setRatingFilter: (v: number) => void;
  statusFilter: "all" | "active" | "hidden";
  setStatusFilter: (v: "all" | "active" | "hidden") => void;
  filtered: Review[];
  onRefresh: () => void;
  onOpenOrderBasis: (rev: Review) => void;
  onOpenReply: (rev: Review) => void;
  onOpenHide: (rev: Review) => void;
  onRestore: (rev: Review) => void;
}

/**
 * Giao diện tiêu đề, quy tắc bất biến UC9.2, bộ lọc và danh sách thẻ đánh giá sản phẩm.
 */
export function ReviewsFilterAndList({
  realApi,
  totalCount,
  reviewLoading,
  actionBusy,
  reviewError,
  reviewSuccess,
  search,
  setSearch,
  ratingFilter,
  setRatingFilter,
  statusFilter,
  setStatusFilter,
  filtered,
  onRefresh,
  onOpenOrderBasis,
  onOpenReply,
  onOpenHide,
  onRestore,
}: ReviewsFilterAndListProps) {
  const paging = usePagination(filtered, 6);
  return (
    <>
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
              onClick={onRefresh}
              className="btn btn-secondary btn-sm"
            >
              <span className="icon-label"><Icon name="refresh" size={14} /> Làm mới</span>
            </button>
          )}
          <span className="badge badge-success px-3 py-1.5 text-[0.8rem]">
            Tổng cộng {totalCount} đánh giá
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
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "hidden")}
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
          paging.pagedItems.map((rev) => {
            const safeRating = Math.max(0, Math.min(5, Math.round(rev.rating || 0)));
            return (
            <div key={rev.id} className="adm-review-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <strong className="text-[0.95rem] text-[var(--color-bark)]">{rev.productName || rev.productId}</strong>
                  <span className="text-[#E07A43] font-bold text-[0.85rem]">{"★".repeat(safeRating)}{"☆".repeat(5 - safeRating)}</span>
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
                      <span className="font-normal text-[#64748B]">{formatDateTimeVi(rev.storeResponse?.respondedAt)}</span>
                    </div>
                    <p className="mt-1 mb-0 text-[0.8rem] text-[#14532D]">{rev.storeResponse?.response || rev.response}</p>
                  </div>
                )}

                <div className="adm-hint-text text-[0.75rem]">
                  Người gửi: <strong>{rev.customerName}</strong> ({rev.customerId}) · Ngày gửi: {formatDateTimeVi(rev.createdAt)}
                  {rev.hiddenReason && (
                    <span className="text-[#B91C1C] ml-2">
                      · Lý do ẩn: <strong>{rev.hiddenReason}</strong> ({rev.hiddenBy || "Admin"})
                    </span>
                  )}
                </div>
              </div>

              {/* Nhóm nút hành động */}
              <div className="adm-review-actions">
                <button
                  type="button"
                  onClick={() => onOpenOrderBasis(rev)}
                  className="adm-btn-outline py-1.5 px-2.5 text-center"
                >
                  📋 Căn cứ đơn thuê
                </button>

                <Can perm={Permissions.DanhGia_Duyet}>
                  <button
                    type="button"
                    onClick={() => onOpenReply(rev)}
                    className="adm-btn-success-outline py-1.5 px-2.5 text-center"
                  >
                    💬 {rev.storeResponse || rev.response ? "Sửa phản hồi" : "Phản hồi"}
                  </button>

                  {rev.status === "active" ? (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => onOpenHide(rev)}
                      className="adm-btn-danger-outline py-1.5 px-2.5 text-center"
                    >
                      ✕ Ẩn vi phạm
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => onRestore(rev)}
                      className="adm-btn-parchment py-1.5 px-2.5 text-center text-[var(--color-forest)] font-bold"
                    >
                      ✓ Bỏ ẩn
                    </button>
                  )}
                </Can>
              </div>
            </div>
            );
          })
        )}
      </div>

      <Pagination
        page={paging.page}
        totalPages={paging.totalPages}
        totalItems={paging.totalItems}
        startIndex={paging.startIndex}
        endIndex={paging.endIndex}
        onPageChange={paging.setPage}
        itemLabel="đánh giá"
      />
    </>
  );
}
