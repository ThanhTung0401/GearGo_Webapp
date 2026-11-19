import { fmt, type Promotion } from "../../../../store";
import { type PromoStatusFilter, type PromoTypeFilter } from "./usePromotionsTab";
import { Can } from "../../../../features/permissions/PermissionsContext";
import { Permissions } from "../../../../constants/permissions";

interface PromotionsListProps {
  totalPromotions: number;
  promoActionError: string;
  promoSearch: string;
  setPromoSearch: (v: string) => void;
  statusFilter: PromoStatusFilter;
  setStatusFilter: (v: PromoStatusFilter) => void;
  typeFilter: PromoTypeFilter;
  setTypeFilter: (v: PromoTypeFilter) => void;
  filteredPromotions: Promotion[];
  now: Date;
  togglingPromoId: string | null;
  onCreateNew: () => void;
  onViewDetail: (p: Promotion) => void;
  onEdit: (p: Promotion) => void;
  onToggleStatus: (p: Promotion) => void;
}

/**
 * Giao diện tiêu đề, thanh lọc đa chiều (UC8.4) và danh sách thẻ chương trình khuyến mãi.
 */
export function PromotionsList({
  totalPromotions,
  promoActionError,
  promoSearch,
  setPromoSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  filteredPromotions,
  now,
  togglingPromoId,
  onCreateNew,
  onViewDetail,
  onEdit,
  onToggleStatus,
}: PromotionsListProps) {
  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h2 className="adm-page-title adm-page-title--compact">Quản lý chính sách khuyến mãi (UC8.2 - UC8.5)</h2>
          <p className="adm-page-subtitle adm-page-subtitle--sm m-0">
            Kiểm soát mã giảm giá, giới hạn ngân sách, theo dõi doanh thu và tra cứu đơn áp dụng thực tế.
          </p>
        </div>
        {/* v2 §P3 — chỉ hiện nút tạo khi có quyền KhuyenMai_Quan (demo pattern <Can>) */}
        <Can perm={Permissions.KhuyenMai_Quan}>
          <button
            onClick={onCreateNew}
            className="adm-btn-primary font-bold flex items-center gap-1.5"
          >
            <span>+</span> Tạo mã giảm mới (UC8.2)
          </button>
        </Can>
      </div>
      {promoActionError && (
        <div role="alert" className="adm-alert is-error-solid adm-alert--block">
          {promoActionError}
        </div>
      )}

      {/* Bộ lọc và thanh tra cứu (UC8.4) */}
      <div className="adm-toolbar">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={promoSearch}
            onChange={(e) => setPromoSearch(e.target.value)}
            placeholder="🔍 Tìm kiếm theo mã code hoặc tên chương trình..."
            className="adm-search-input w-full min-w-0"
          />
        </div>
        <div className="flex gap-2.5 items-center">
          <span className="adm-count-text font-semibold text-[var(--color-bark)]">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PromoStatusFilter)}
            className="adm-select"
          >
            <option value="all">Tất cả ({totalPromotions})</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm dừng</option>
            <option value="expired">Đã hết hạn</option>
          </select>
        </div>
        <div className="flex gap-2.5 items-center">
          <span className="adm-count-text font-semibold text-[var(--color-bark)]">Loại giảm:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as PromoTypeFilter)}
            className="adm-select"
          >
            <option value="all">Tất cả hình thức</option>
            <option value="percentage">Phần trăm (%)</option>
            <option value="fixed">Số tiền cố định (VNĐ)</option>
          </select>
        </div>
      </div>

      {/* Danh sách khuyến mãi */}
      {filteredPromotions.length === 0 ? (
        <div className="adm-empty-box">
          <p className="text-[#6B7280] m-0">Không tìm thấy chương trình khuyến mãi nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredPromotions.map((p) => {
            const isExpired = new Date(p.endsAt) < now;
            const usagePercent = p.totalUsageLimit ? Math.min(100, (p.usedCount / p.totalUsageLimit) * 100) : 0;
            const isFull = p.totalUsageLimit !== null && p.usedCount >= p.totalUsageLimit;

            return (
              /* Đổi viền và làm mờ thẻ khuyến mãi khi đã hết hạn hoặc tạm dừng */
              <div
                key={p.id}
                className={`adm-promo-card ${isExpired ? "is-expired" : p.status === "inactive" ? "is-inactive" : ""}`}
              >
                {/* Badge mã code */}
                <div className="adm-promo-badge">
                  <div className="adm-promo-code">
                    {p.code}
                  </div>
                  <div className="adm-promo-discount">
                    {p.discountType === "percentage" ? `Giảm ${p.discountValue}%` : `Giảm ${fmt(p.discountValue)}`}
                  </div>
                  {p.maxDiscount && (
                    <div className="adm-hint-text text-[0.68rem]">
                      Tối đa {fmt(p.maxDiscount)}
                    </div>
                  )}
                </div>

                {/* Thông tin chương trình */}
                <div className="adm-promo-info">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <strong className="text-[0.95rem] text-[var(--color-bark)]">{p.name}</strong>
                    {isExpired ? (
                      <span className="adm-pill is-danger-dark">Đã hết hạn</span>
                    ) : p.status === "inactive" ? (
                      <span className="adm-pill is-warning">Tạm dừng</span>
                    ) : isFull ? (
                      <span className="adm-pill is-danger">Hết lượt</span>
                    ) : (
                      <span className="adm-pill is-success">Đang hiệu lực</span>
                    )}
                  </div>

                  <div className="text-[0.8rem] text-[#4B5563] mb-1">
                    Đơn tối thiểu: <strong>{fmt(p.minimumRental)}</strong> · Phạm vi:{" "}
                    <strong>{p.scope === "all" ? "Tất cả thiết bị" : p.scope === "products" ? `Theo sản phẩm (${p.productIds.length})` : `Theo danh mục (${p.categoryIds.length})`}</strong>
                  </div>

                  <div className="adm-hint-text text-[0.74rem]">
                    Hiệu lực: {new Date(p.startsAt).toLocaleDateString("vi-VN")} → {new Date(p.endsAt).toLocaleDateString("vi-VN")} · Đã dùng: <strong>{p.usedCount}</strong> / {p.totalUsageLimit ?? "∞"} lượt
                  </div>

                  {/* Thanh tiến độ sử dụng lượt */}
                  {p.totalUsageLimit && (
                    <div className="adm-progress-track adm-progress-track--promo">
                      {/* Chiều rộng thanh tiến độ tính động theo phần trăm lượt đã dùng */}
                      <div className={`adm-progress-fill ${usagePercent >= 90 ? "is-critical" : ""}`} style={{ width: `${usagePercent}%` }} />
                    </div>
                  )}

                  {/* Lý do tạm dừng nếu có — cho phép xuống dòng để không tràn card trên mobile 390px */}
                  {p.status === "inactive" && p.stopReason && (
                    <div className="adm-pill is-warning mt-1.5 font-normal whitespace-normal text-left max-w-full">
                      ⚠️ Lý do tạm dừng: {p.stopReason}
                    </div>
                  )}
                </div>

                {/* Các nút hành động */}
                <div className="adm-promo-actions">
                  {/* Nút xem chi tiết & đơn áp dụng (UC8.4) */}
                  <button
                    onClick={() => onViewDetail(p)}
                    className="adm-btn-forest-outline text-center py-1.5 px-3"
                  >
                    👁 Xem đơn áp dụng (UC8.4)
                  </button>

                  {/* v2 §P3 — nút Sửa / Toggle chỉ hiện khi có quyền KhuyenMai_Quan */}
                  <Can perm={Permissions.KhuyenMai_Quan}>
                    <div className="flex gap-1.5">
                      {/* Nút sửa */}
                      <button
                        onClick={() => onEdit(p)}
                        className="adm-btn-outline adm-btn-flex py-1.5"
                      >
                        ✏️ Sửa (UC8.3)
                      </button>

                      {/* Nút tạm dừng / kích hoạt lại (UC8.5) */}
                      <button
                        disabled={togglingPromoId === p.id}
                        onClick={() => onToggleStatus(p)}
                        className={`adm-btn-flex ${p.status === "active" ? "adm-btn-warning-outline" : "adm-btn-success-outline"}`}
                      >
                        {togglingPromoId === p.id ? "..." : p.status === "active" ? "⏸ Tạm dừng" : "▶ Kích hoạt"}
                      </button>
                    </div>
                  </Can>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
