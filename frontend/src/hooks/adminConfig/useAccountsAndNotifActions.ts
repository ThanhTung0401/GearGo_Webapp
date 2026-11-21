import type { Dispatch, SetStateAction } from "react";
import { getAuthToken } from "../../services/apiClient";
import { notificationApi } from "../../services/api";
import type { ActionResult, AppNotification, AuditLogEntry, CustomerAccount, StaffAccount } from "../../store";
import { REAL_MODE } from "../appStateStorage";

interface Params {
  staffAccounts: StaffAccount[];
  setStaffAccounts: Dispatch<SetStateAction<StaffAccount[]>>;
  customers: CustomerAccount[];
  setCustomers: Dispatch<SetStateAction<CustomerAccount[]>>;
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setUnreadNotificationCount: Dispatch<SetStateAction<number>>;
  setAuditLogs: Dispatch<SetStateAction<AuditLogEntry[]>>;
}

/**
 * Nghiệp vụ nhật ký hệ thống, quản trị tài khoản nhân viên/khách hàng và thông báo (UC1.9–UC1.11, UC9.3–UC9.4).
 */
export function useAccountsAndNotifActions(p: Params) {
  const addAuditLog = (entry: { actor: string; role: string; action: string; targetEntity: string; targetId: string; detail: string }) => {
    const log: AuditLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toLocaleString("vi-VN"),
      ...entry,
    };
    p.setAuditLogs((prev) => [log, ...prev]);
  };

  const toggleStaffLock = (staffId: string, reason?: string): ActionResult => {
    const staff = p.staffAccounts.find((s) => s.id === staffId);
    if (!staff) return { ok: false, message: "Không tìm thấy tài khoản nhân viên." };
    if (staff.role === "Quản trị viên") return { ok: false, message: "Không thể khóa tài khoản Quản trị viên hệ thống." };
    const nextStatus: StaffAccount["status"] = staff.status === "active" ? "locked" : "active";
    p.setStaffAccounts((prev) =>
      prev.map((s) =>
        s.id === staffId ? { ...s, status: nextStatus, lockedReason: nextStatus === "locked" ? reason || "Khóa bởi Quản trị viên" : undefined } : s
      )
    );
    return { ok: true, data: undefined };
  };

  const saveStaffAccount = (staff: StaffAccount): ActionResult<StaffAccount> => {
    if (!staff.name.trim()) return { ok: false, message: "Tên nhân viên không được để trống" };
    if (!staff.username.trim()) return { ok: false, message: "Tên đăng nhập không được để trống" };
    p.setStaffAccounts((prev) => {
      const exists = prev.some((s) => s.id === staff.id);
      return exists ? prev.map((s) => (s.id === staff.id ? staff : s)) : [...prev, staff];
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
    p.setCustomers((prev) => {
      const exists = prev.some((c) => c.id === customer.id);
      return exists ? prev.map((c) => (c.id === customer.id ? customer : c)) : [...prev, customer];
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
    const cust = p.customers.find((c) => c.id === customerId);
    if (!cust) return { ok: false, message: "Không tìm thấy khách hàng" };
    const nextStatus: CustomerAccount["status"] = cust.status === "active" ? "locked" : "active";
    p.setCustomers((prev) =>
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
    p.setNotifications((prev) => [newNotif, ...prev]);
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
    p.setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.isRead) {
          p.setUnreadNotificationCount((c) => Math.max(0, c - 1));
          return { ...n, isRead: true };
        }
        return n;
      })
    );
    if (REAL_MODE && getAuthToken() && /^\d+$/.test(id)) {
      void notificationApi.danhDauDaDoc(Number(id)).catch(() => {});
    }
  };

  return {
    addAuditLog,
    toggleStaffLock,
    saveStaffAccount,
    saveCustomer,
    toggleCustomerLock,
    sendNotification,
    markNotificationRead,
  };
}
