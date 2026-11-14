import type { Dispatch, SetStateAction } from "react";
import { getAuthToken } from "../services/apiClient";
import { notificationApi } from "../services/api";
import {
  fmt,
  type ActionResult,
  type AppNotification,
  type AuditLogEntry,
  type CustomerAccount,
  type FinancialAdjustment,
  type PolicyVersion,
  type Promotion,
  type RentalPolicyConfig,
  type Role,
  type StaffAccount,
} from "../store";
import { REAL_MODE } from "./appStateStorage";

interface UseAdminConfigActionsParams {
  role: Role;
  staffAccounts: StaffAccount[];
  setStaffAccounts: Dispatch<SetStateAction<StaffAccount[]>>;
  customers: CustomerAccount[];
  setCustomers: Dispatch<SetStateAction<CustomerAccount[]>>;
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setUnreadNotificationCount: Dispatch<SetStateAction<number>>;
  policies: RentalPolicyConfig;
  setPolicies: Dispatch<SetStateAction<RentalPolicyConfig>>;
  setPolicyVersions: Dispatch<SetStateAction<PolicyVersion[]>>;
  promotions: Promotion[];
  setPromotions: Dispatch<SetStateAction<Promotion[]>>;
  setAuditLogs: Dispatch<SetStateAction<AuditLogEntry[]>>;
  setFinancialAdjustments: Dispatch<SetStateAction<FinancialAdjustment[]>>;
}

/**
 * Hook quản trị hệ thống: nhân sự, khách hàng, thông báo, chính sách thuê, tạm dừng KM, audit log & điều chỉnh tài chính.
 */
export function useAdminConfigActions(params: UseAdminConfigActionsParams) {
  const {
    role,
    staffAccounts,
    setStaffAccounts,
    customers,
    setCustomers,
    setNotifications,
    setUnreadNotificationCount,
    policies,
    setPolicies,
    setPolicyVersions,
    promotions,
    setPromotions,
    setAuditLogs,
    setFinancialAdjustments,
  } = params;

  const addAuditLog = (entry: { actor: string; role: string; action: string; targetEntity: string; targetId: string; detail: string }) => {
    const log: AuditLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toLocaleString("vi-VN"),
      ...entry,
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  const toggleStaffLock = (staffId: string, reason?: string): ActionResult => {
    const staff = staffAccounts.find((s) => s.id === staffId);
    if (!staff) return { ok: false, message: "Không tìm thấy tài khoản nhân viên." };
    if (staff.role === "Quản trị viên") return { ok: false, message: "Không thể khóa tài khoản Quản trị viên hệ thống." };
    const nextStatus: StaffAccount["status"] = staff.status === "active" ? "locked" : "active";
    setStaffAccounts((prev) =>
      prev.map((s) =>
        s.id === staffId ? { ...s, status: nextStatus, lockedReason: nextStatus === "locked" ? reason || "Khóa bởi Quản trị viên" : undefined } : s
      )
    );
    return { ok: true, data: undefined };
  };

  const saveStaffAccount = (staff: StaffAccount): ActionResult<StaffAccount> => {
    if (!staff.name.trim()) return { ok: false, message: "Tên nhân viên không được để trống" };
    if (!staff.username.trim()) return { ok: false, message: "Tên đăng nhập không được để trống" };
    setStaffAccounts((prev) => {
      const exists = prev.some((s) => s.id === staff.id);
      if (exists) return prev.map((s) => (s.id === staff.id ? staff : s));
      return [...prev, staff];
    });
    addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Cập nhật tài khoản NV",
      targetEntity: "StaffAccount",
      targetId: staff.id,
      detail: `Lưu nhân viên ${staff.name} - Quyền: ${staff.role}`,
    });
    return { ok: true, data: staff };
  };

  const saveCustomer = (customer: CustomerAccount): ActionResult<CustomerAccount> => {
    if (!customer.name.trim()) return { ok: false, message: "Họ tên không được để trống" };
    if (!customer.phone.trim()) return { ok: false, message: "Số điện thoại không được để trống" };
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === customer.id);
      if (exists) return prev.map((c) => (c.id === customer.id ? customer : c));
      return [...prev, customer];
    });
    addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Cập nhật khách hàng",
      targetEntity: "CustomerAccount",
      targetId: customer.id,
      detail: `Lưu thông tin khách hàng: ${customer.name}`,
    });
    return { ok: true, data: customer };
  };

  const toggleCustomerLock = (customerId: string, reason?: string): ActionResult => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return { ok: false, message: "Không tìm thấy khách hàng" };
    const nextStatus: CustomerAccount["status"] = cust.status === "active" ? "locked" : "active";
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? { ...c, status: nextStatus, lockedReason: nextStatus === "locked" ? reason || "Vi phạm quy định thuê thiết bị" : undefined }
          : c
      )
    );
    addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: nextStatus === "locked" ? "Khóa khách hàng" : "Mở khóa khách hàng",
      targetEntity: "CustomerAccount",
      targetId: customerId,
      detail: `Lý do: ${reason || "N/A"}`,
    });
    return { ok: true, data: undefined };
  };

  const sendNotification = (notif: {
    title: string;
    message: string;
    type: AppNotification["type"];
    targetRole: AppNotification["targetRole"];
    category?: AppNotification["category"];
    actionLink?: AppNotification["actionLink"];
  }): ActionResult<AppNotification> => {
    if (!notif.title.trim()) return { ok: false, message: "Tiêu đề không được để trống" };
    if (!notif.message.trim()) return { ok: false, message: "Nội dung không được để trống" };
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}`,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      targetRole: notif.targetRole,
      category: notif.category || "system",
      actionLink: notif.actionLink,
      createdAt: new Date().toLocaleString("vi-VN"),
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Gửi thông báo hệ thống (UC9.4)",
      targetEntity: "AppNotification",
      targetId: newNotif.id,
      detail: `Tiêu đề: ${newNotif.title} - Đối tượng: ${newNotif.targetRole}`,
    });
    return { ok: true, data: newNotif };
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.isRead) {
          setUnreadNotificationCount((c) => Math.max(0, c - 1));
          return { ...n, isRead: true };
        }
        return n;
      })
    );
    if (REAL_MODE && getAuthToken() && /^\d+$/.test(id)) {
      void notificationApi.danhDauDaDoc(Number(id)).catch(() => {});
    }
  };

  // UC8.1 & UC8.1.1: Cấu hình chính sách có phiên bản & lưu snapshot lịch sử
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
    const tier1 = patch.cancellationTier1FeePercent ?? policies.cancellationTier1FeePercent;
    const tier2 = patch.cancellationTier2FeePercent ?? policies.cancellationTier2FeePercent;
    if (tier1 > tier2) {
      return { ok: false, message: "Mâu thuẫn mốc hủy: Phí hủy trước 24-48h không được cao hơn phí hủy sát giờ (<24h)." };
    }

    const currentVerNum = parseFloat(policies.version?.replace("v", "") || "1.2");
    const newVersion = `v${(currentVerNum + 0.1).toFixed(1)}`;
    const nowStr = new Date().toLocaleString("vi-VN");
    const updatedBy = role === "admin" ? "Nguyễn Văn Trưởng (Admin)" : "Nhân viên hệ thống";

    const oldSnapshot: PolicyVersion = {
      version: policies.version || "v1.2",
      effectiveDate: policies.effectiveDate || "01/12/2024",
      updatedAt: policies.updatedAt,
      updatedBy: policies.updatedBy,
      changeReason: policies.changeReason || "Phiên bản tiền nhiệm",
      configSnapshot: { ...policies },
    };
    setPolicyVersions((prev) => [oldSnapshot, ...prev]);

    const updated: RentalPolicyConfig = {
      ...policies,
      ...patch,
      version: newVersion,
      effectiveDate,
      changeReason,
      updatedAt: nowStr,
      updatedBy,
    };
    setPolicies(updated);
    addAuditLog({
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
    const promo = promotions.find((p) => p.id === promoId);
    if (!promo) return { ok: false, message: "Khuyến mãi không tồn tại." };
    if (promo.status === "inactive") return { ok: false, message: "Chương trình đã ở trạng thái tạm dừng." };

    setPromotions((prev) =>
      prev.map((p) =>
        p.id === promoId
          ? { ...p, status: "inactive", stopReason: reason.trim(), updatedAt: new Date().toLocaleString("vi-VN"), updatedBy: "Quản trị viên" }
          : p
      )
    );
    addAuditLog({
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
    const promo = promotions.find((p) => p.id === promoId);
    if (!promo) return { ok: false, message: "Khuyến mãi không tồn tại." };
    if (promo.status === "active") return { ok: false, message: "Chương trình đang hoạt động." };
    if (new Date(promo.endsAt).getTime() < Date.now()) {
      return { ok: false, message: "Không thể kích hoạt lại chương trình đã hết hạn thời gian (theo quy tắc UC8.5)." };
    }

    setPromotions((prev) =>
      prev.map((p) =>
        p.id === promoId
          ? { ...p, status: "active", stopReason: undefined, updatedAt: new Date().toLocaleString("vi-VN"), updatedBy: "Quản trị viên" }
          : p
      )
    );
    addAuditLog({
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
    setFinancialAdjustments((prev) => [newAdj, ...prev]);
    addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Tạo điều chỉnh tài chính",
      targetEntity: "FinancialAdjustment",
      targetId: newAdj.id,
      detail: `${adj.type}: ${fmt(adj.amount)} - ${adj.reason}`,
    });
    return { ok: true, data: newAdj };
  };

  return {
    addAuditLog,
    toggleStaffLock,
    saveStaffAccount,
    saveCustomer,
    toggleCustomerLock,
    sendNotification,
    markNotificationRead,
    updatePolicy,
    pausePromotion,
    resumePromotion,
    saveFinancialAdjustment,
  };
}
