import type { Dispatch, SetStateAction } from "react";
import {
  fmt,
  type ActionResult,
  type FinancialAdjustment,
  type PolicyVersion,
  type Promotion,
  type RentalPolicyConfig,
  type Role,
} from "../../store";

interface Params {
  role: Role;
  policies: RentalPolicyConfig;
  setPolicies: Dispatch<SetStateAction<RentalPolicyConfig>>;
  setPolicyVersions: Dispatch<SetStateAction<PolicyVersion[]>>;
  promotions: Promotion[];
  setPromotions: Dispatch<SetStateAction<Promotion[]>>;
  setFinancialAdjustments: Dispatch<SetStateAction<FinancialAdjustment[]>>;
  addAuditLog: (entry: { actor: string; role: string; action: string; targetEntity: string; targetId: string; detail: string }) => void;
}

/**
 * Nghiệp vụ chính sách có phiên bản (UC8.1), tạm dừng/mở lại khuyến mãi (UC8.5) và điều chỉnh tài chính.
 */
export function usePolicyPromoFinanceActions(p: Params) {
  const updatePolicy = (
    patch: Partial<RentalPolicyConfig>,
    changeReason = "Cập nhật quy định thuê mượn và biểu phí bồi thường",
    effectiveDate = new Date().toLocaleDateString("vi-VN")
  ): ActionResult => {
    if (patch.holdMinutes !== undefined && patch.holdMinutes <= 0) {
      return { ok: false, message: "Thời gian giữ chỗ phải lớn hơn 0 phút." };
    }
    if (patch.overdueMultiplier !== undefined && patch.overdueMultiplier <= 0) {
      return { ok: false, message: "Hệ số phạt trễ hạn phải lớn hơn 0." };
    }
    if (
      (patch.cancellationTier1FeePercent !== undefined && (patch.cancellationTier1FeePercent < 0 || patch.cancellationTier1FeePercent > 100)) ||
      (patch.cancellationTier2FeePercent !== undefined && (patch.cancellationTier2FeePercent < 0 || patch.cancellationTier2FeePercent > 100))
    ) {
      return { ok: false, message: "Tỷ lệ phí hủy phải nằm trong khoảng từ 0% đến 100%." };
    }
    const tier1 = patch.cancellationTier1FeePercent ?? p.policies.cancellationTier1FeePercent;
    const tier2 = patch.cancellationTier2FeePercent ?? p.policies.cancellationTier2FeePercent;
    if (tier1 > tier2) {
      return { ok: false, message: "Mâu thuẫn mốc hủy: Phí hủy trước 24-48h không được cao hơn phí hủy sát giờ (<24h)." };
    }

    const currentVerNum = parseFloat(p.policies.version?.replace("v", "") || "1.2");
    const newVersion = `v${(currentVerNum + 0.1).toFixed(1)}`;
    const nowStr = new Date().toLocaleString("vi-VN");
    const updatedBy = p.role === "admin" ? "Nguyễn Văn Trưởng (Admin)" : "Nhân viên hệ thống";

    const oldSnapshot: PolicyVersion = {
      version: p.policies.version || "v1.2",
      effectiveDate: p.policies.effectiveDate || "01/12/2024",
      updatedAt: p.policies.updatedAt,
      updatedBy: p.policies.updatedBy,
      changeReason: p.policies.changeReason || "Phiên bản tiền nhiệm",
      configSnapshot: { ...p.policies },
    };
    p.setPolicyVersions((prev) => [oldSnapshot, ...prev]);

    p.setPolicies({
      ...p.policies,
      ...patch,
      version: newVersion,
      effectiveDate,
      changeReason,
      updatedAt: nowStr,
      updatedBy,
    });
    p.addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: `Ban hành chính sách mới (${newVersion})`,
      targetEntity: "RentalPolicy",
      targetId: newVersion,
      detail: `Áp dụng từ ${effectiveDate}: ${changeReason}`,
    });
    return { ok: true, data: undefined };
  };

  const pausePromotion = (promoId: string, reason: string): ActionResult => {
    if (!reason.trim()) return { ok: false, message: "Vui lòng nhập lý do tạm dừng/ngừng chương trình (bắt buộc theo UC8.5)." };
    const promo = p.promotions.find((item) => item.id === promoId);
    if (!promo) return { ok: false, message: "Khuyến mãi không tồn tại." };
    if (promo.status === "inactive") return { ok: false, message: "Chương trình đã ở trạng thái tạm dừng." };

    p.setPromotions((prev) =>
      prev.map((item) =>
        item.id === promoId
          ? { ...item, status: "inactive", stopReason: reason.trim(), updatedAt: new Date().toLocaleString("vi-VN"), updatedBy: "Quản trị viên" }
          : item
      )
    );
    p.addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Ngừng chương trình khuyến mãi",
      targetEntity: "Promotion",
      targetId: promo.code,
      detail: `Tạm dừng mã ${promo.code}. Lý do: ${reason.trim()}`,
    });
    return { ok: true, data: undefined };
  };

  const resumePromotion = (promoId: string): ActionResult => {
    const promo = p.promotions.find((item) => item.id === promoId);
    if (!promo) return { ok: false, message: "Khuyến mãi không tồn tại." };
    if (promo.status === "active") return { ok: false, message: "Chương trình đang hoạt động." };
    if (new Date(promo.endsAt).getTime() < Date.now()) {
      return { ok: false, message: "Không thể kích hoạt lại chương trình đã hết hạn thời gian (theo quy tắc UC8.5)." };
    }

    p.setPromotions((prev) =>
      prev.map((item) =>
        item.id === promoId
          ? { ...item, status: "active", stopReason: undefined, updatedAt: new Date().toLocaleString("vi-VN"), updatedBy: "Quản trị viên" }
          : item
      )
    );
    p.addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Kích hoạt lại khuyến mãi",
      targetEntity: "Promotion",
      targetId: promo.code,
      detail: `Mở lại chương trình ${promo.code}`,
    });
    return { ok: true, data: undefined };
  };

  const saveFinancialAdjustment = (adj: Omit<FinancialAdjustment, "id" | "createdAt">): ActionResult<FinancialAdjustment> => {
    if (!adj.reason.trim()) return { ok: false, message: "Lý do điều chỉnh không được để trống" };
    if (adj.amount <= 0) return { ok: false, message: "Số tiền điều chỉnh phải lớn hơn 0" };
    const newAdj: FinancialAdjustment = {
      id: `PDC-TC-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toLocaleString("vi-VN"),
      ...adj,
    };
    p.setFinancialAdjustments((prev) => [newAdj, ...prev]);
    p.addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Tạo điều chỉnh tài chính",
      targetEntity: "FinancialAdjustment",
      targetId: newAdj.id,
      detail: `${adj.type}: ${fmt(adj.amount)} - ${adj.reason}`,
    });
    return { ok: true, data: newAdj };
  };

  const reviewFinancialAdjustment = (
    id: string,
    approved: boolean,
    actorName = "Quản trị viên"
  ): ActionResult<FinancialAdjustment> => {
    let updatedItem: FinancialAdjustment | undefined;
    p.setFinancialAdjustments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        updatedItem = {
          ...a,
          status: approved ? "Đã duyệt" : "Từ chối",
          approvedBy: actorName,
        };
        return updatedItem;
      })
    );
    if (!updatedItem) return { ok: false, message: "Không tìm thấy chứng từ điều chỉnh." };
    p.addAuditLog({
      actor: actorName,
      role: "Quản trị viên",
      action: approved ? "Duyệt chứng từ bù trừ tài chính" : "Từ chối chứng từ bù trừ tài chính",
      targetEntity: "DieuChinhTaiChinh",
      targetId: id,
      detail: `${approved ? "Đã duyệt" : "Từ chối"} chứng từ ${id}`,
    });
    return { ok: true, data: updatedItem };
  };

  return { updatePolicy, pausePromotion, resumePromotion, saveFinancialAdjustment, reviewFinancialAdjustment };
}
