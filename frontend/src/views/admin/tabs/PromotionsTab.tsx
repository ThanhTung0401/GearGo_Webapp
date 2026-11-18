import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { promotionApi } from "../../../services/api/promotionApi";

import { fmt, type Promotion } from "../../../store";

import { FormModal } from "../forms/FormModal";

import PromotionDetailModal from "../../../components/PromotionDetailModal";
import { PromotionForm } from "../forms/PromotionForm";

export function PromotionsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [action, setAction] = useState<Promotion | "new" | null>(null);
  const [promoSearch, setPromoSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "percentage" | "fixed">("all");
  const [selectedPromoDetail, setSelectedPromoDetail] = useState<Promotion | null>(null);
  const [promoActionError, setPromoActionError] = useState("");
  const [togglingPromoId, setTogglingPromoId] = useState<string | null>(null);

  // Modal tạm dừng chương trình (UC8.5)
  const [stoppingPromo, setStoppingPromo] = useState<Promotion | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [stopError, setStopError] = useState("");
  const [stopLoading, setStopLoading] = useState(false);

  const now = new Date();

  // Lọc danh sách khuyến mãi đa chiều (UC8.4)
  const filteredPromotions = app.promotions.filter((p) => {
    const isExpired = new Date(p.endsAt) < now;
    if (statusFilter === "active" && (p.status !== "active" || isExpired)) return false;
    if (statusFilter === "inactive" && (p.status !== "inactive" || isExpired)) return false;
    if (statusFilter === "expired" && !isExpired) return false;
    if (typeFilter !== "all" && p.discountType !== typeFilter) return false;
    if (promoSearch.trim()) {
      const q = promoSearch.toLowerCase();
      const matchCode = p.code.toLowerCase().includes(q);
      const matchName = p.name.toLowerCase().includes(q);
      return matchCode || matchName;
    }
    return true;
  });

  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoppingPromo) return;
    if (!stopReason.trim()) {
      return setStopError("Bắt buộc phải nhập lý do tạm dừng chương trình (UC8.5)!");
    }
    if (isRealApi) {
      const promoId = Number(stoppingPromo.id);
      if (Number.isNaN(promoId)) return setStopError("ID khuyến mãi không hợp lệ.");
      setStopLoading(true);
      try {
        await promotionApi.tamAn(promoId, stopReason.trim());
        await app.refreshPromotions?.();
        setStoppingPromo(null);
        setStopReason("");
        setStopError("");
      } catch (err) {
        setStopError(err instanceof Error ? err.message : "Không thể tạm dừng khuyến mãi trên máy chủ.");
      } finally {
        setStopLoading(false);
      }
      return;
    }

    const res = app.pausePromotion(stoppingPromo.id, stopReason.trim());
    if (!res.ok) {
      return setStopError(res.message);
    }
    setStoppingPromo(null);
    setStopReason("");
    setStopError("");
  };

  const handleToggleStatus = async (p: Promotion) => {
    setPromoActionError("");
    const isExpired = new Date(p.endsAt) < now;
    if (p.status === "active") {
      // Mở modal nhập lý do tạm dừng
      setStoppingPromo(p);
      setStopReason("");
      setStopError("");
    } else {
      // Kích hoạt lại
      if (isExpired) {
        setPromoActionError("Chương trình đã quá hạn thời gian hiệu lực, không thể kích hoạt lại (UC8.5)!");
        return;
      }
      if (isRealApi) {
        const promoId = Number(p.id);
        if (Number.isNaN(promoId)) {
          setPromoActionError("ID khuyến mãi không hợp lệ.");
          return;
        }
        setTogglingPromoId(p.id);
        try {
          await promotionApi.hienThi(promoId, "Kích hoạt lại từ quản trị khuyến mãi");
          await app.refreshPromotions?.();
        } catch (err) {
          setPromoActionError(err instanceof Error ? err.message : "Không thể kích hoạt khuyến mãi.");
        } finally {
          setTogglingPromoId(null);
        }
        return;
      }
      const res = app.resumePromotion(p.id);
      if (!res.ok) setPromoActionError(res.message);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h2 className="adm-page-title adm-page-title--compact">Quản lý chính sách khuyến mãi (UC8.2 - UC8.5)</h2>
          <p className="adm-page-subtitle adm-page-subtitle--sm m-0">
            Kiểm soát mã giảm giá, giới hạn ngân sách, theo dõi doanh thu và tra cứu đơn áp dụng thực tế.
          </p>
        </div>
        <button
          onClick={() => setAction("new")}
          className="adm-btn-primary font-bold flex items-center gap-1.5"
        >
          <span>+</span> Tạo mã giảm mới (UC8.2)
        </button>
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
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="adm-select"
          >
            <option value="all">Tất cả ({app.promotions.length})</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm dừng</option>
            <option value="expired">Đã hết hạn</option>
          </select>
        </div>
        <div className="flex gap-2.5 items-center">
          <span className="adm-count-text font-semibold text-[var(--color-bark)]">Loại giảm:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
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

                  {/* Lý do tạm dừng nếu có */}
                  {p.status === "inactive" && p.stopReason && (
                    <div className="adm-pill is-warning mt-1.5 font-normal">
                      ⚠️ Lý do tạm dừng: {p.stopReason}
                    </div>
                  )}
                </div>

                {/* Các nút hành động */}
                <div className="adm-promo-actions">
                  {/* Nút xem chi tiết & đơn áp dụng (UC8.4) */}
                  <button
                    onClick={() => setSelectedPromoDetail(p)}
                    className="adm-btn-forest-outline text-center py-1.5 px-3"
                  >
                    👁 Xem đơn áp dụng (UC8.4)
                  </button>

                  <div className="flex gap-1.5">
                    {/* Nút sửa */}
                    <button
                      onClick={() => setAction(p)}
                      className="adm-btn-outline adm-btn-flex py-1.5"
                    >
                      ✏️ Sửa (UC8.3)
                    </button>

                    {/* Nút tạm dừng / kích hoạt lại (UC8.5) */}
                    <button
                      disabled={togglingPromoId === p.id}
                      onClick={() => handleToggleStatus(p)}
                      className={`adm-btn-flex ${p.status === "active" ? "adm-btn-warning-outline" : "adm-btn-success-outline"}`}
                    >
                      {togglingPromoId === p.id ? "..." : p.status === "active" ? "⏸ Tạm dừng" : "▶ Kích hoạt"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form tạo/sửa khuyến mãi (UC8.2 & UC8.3) */}
      {action && (
        <PromotionForm
          app={app}
          promotion={action === "new" ? undefined : action}
          onClose={() => setAction(null)}
        />
      )}

      {/* Modal tra cứu chi tiết và thống kê doanh thu / đơn hàng áp dụng (UC8.4) */}
      {selectedPromoDetail && (
        <PromotionDetailModal
          promotion={selectedPromoDetail}
          app={app}
          onClose={() => setSelectedPromoDetail(null)}
          onEdit={() => {
            setAction(selectedPromoDetail);
            setSelectedPromoDetail(null);
          }}
          onToggleStatus={() => {
            handleToggleStatus(selectedPromoDetail);
            // Cập nhật lại modal detail
            const updated = app.promotions.find((item) => item.id === selectedPromoDetail.id);
            if (updated) setSelectedPromoDetail(updated);
          }}
        />
      )}

      {/* Modal xác nhận lý do tạm dừng chương trình (UC8.5) */}
      {stoppingPromo && (
        <FormModal
          title={`Tạm dừng khuyến mãi: ${stoppingPromo.code}`}
          description="Bắt buộc nhập lý do tạm dừng để ghi nhận Audit Log theo đúng quy tắc UC8.5."
          onClose={() => setStoppingPromo(null)}
        >
          <form onSubmit={handlePauseSubmit} className="grid gap-4 mt-4">
            <label className="adm-label">
              Lý do tạm dừng chương trình (Bắt buộc)
              <textarea
                rows={3}
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                placeholder="VD: Hết ngân sách chiến dịch tháng này / Phát hiện gian lận lạm dụng mã / Tạm dừng theo chỉ đạo của ban giám đốc..."
                className="adm-field"
              />
            </label>
            {stopError && (
              <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">
                {stopError}
              </div>
            )}
            <div className="modal-footer mt-2">
              <button
                type="button"
                disabled={stopLoading}
                onClick={() => setStoppingPromo(null)}
                className="btn btn-secondary btn-md"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={stopLoading}
                className="adm-btn-warning-solid"
              >
                {stopLoading ? "Đang xử lý..." : "⏸ Xác nhận tạm dừng (UC8.5)"}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  );
}

// ─── Stock Adjustments (UC6.10 & UC6.11) ──────────────────────────────────────────
