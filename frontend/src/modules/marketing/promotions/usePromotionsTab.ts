import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { promotionApi } from "../../../services/api/promotionApi";
import { type Promotion } from "../../../store";

export type PromoStatusFilter = "all" | "active" | "inactive" | "expired";
export type PromoTypeFilter = "all" | "percentage" | "fixed";

/**
 * Hook quản lý chính sách khuyến mãi (UC8.2 - UC8.5):
 * lọc đa chiều, tạm dừng có lý do bắt buộc và kích hoạt lại mã khuyến mãi.
 */
export function usePromotionsTab(app: ReturnType<typeof useApp>) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [action, setAction] = useState<Promotion | "new" | null>(null);
  const [promoSearch, setPromoSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PromoStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<PromoTypeFilter>("all");
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

  // Xác nhận tạm dừng chương trình khuyến mãi kèm lý do kiểm toán (UC8.5)
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

  // Chuyển đổi trạng thái tạm dừng / kích hoạt lại khuyến mãi (UC8.5)
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

  return {
    action,
    setAction,
    promoSearch,
    setPromoSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    selectedPromoDetail,
    setSelectedPromoDetail,
    promoActionError,
    togglingPromoId,
    stoppingPromo,
    setStoppingPromo,
    stopReason,
    setStopReason,
    stopError,
    stopLoading,
    now,
    filteredPromotions,
    handlePauseSubmit,
    handleToggleStatus,
  };
}
