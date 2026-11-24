import type { Dispatch, SetStateAction } from "react";
import type { Page } from "../../context";
import { getAuthToken, setAuthToken } from "../../services/apiClient";
import { authApi, profileApi } from "../../services/api";
import type {
  ActionResult,
  AppNotification,
  AuditLogEntry,
  CartItem,
  CustomerAccount,
  FinancialAdjustment,
  Order,
  Role,
  StaffAccount,
} from "../../store";
import { REAL_MODE } from "../appStateStorage";

export interface AuthSessionUser {
  id?: string;
  username?: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  permissions?: string[];
  address?: string;
  avatarUrl?: string;
}

interface Params {
  role: Role;
  setRole: Dispatch<SetStateAction<Role>>;
  setPage: Dispatch<SetStateAction<Page>>;
  currentUser: AuthSessionUser | null;
  setCurrentUser: Dispatch<SetStateAction<AuthSessionUser | null>>;
  staffAccounts: StaffAccount[];
  setStaffAccounts: Dispatch<SetStateAction<StaffAccount[]>>;
  customers: CustomerAccount[];
  setCustomers: Dispatch<SetStateAction<CustomerAccount[]>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setUnreadNotificationCount: Dispatch<SetStateAction<number>>;
  setAuditLogs: Dispatch<SetStateAction<AuditLogEntry[]>>;
  setFinancialAdjustments: Dispatch<SetStateAction<FinancialAdjustment[]>>;
  addAuditLog: (entry: { actor: string; role: string; action: string; targetEntity: string; targetId: string; detail: string }) => void;
}

/**
 * Nghiệp vụ cập nhật hồ sơ cá nhân (UC1.6) và đổi mật khẩu (UC1.12).
 */
export function useProfilePasswordActions(p: Params) {
  const clearPrivateState = () => {
    p.setOrders([]);
    p.setCart([]);
    p.setNotifications([]);
    p.setUnreadNotificationCount(0);
    p.setAuditLogs([]);
    p.setStaffAccounts([]);
    p.setCustomers([]);
    p.setFinancialAdjustments([]);
  };

  const updateCurrentUserProfile = async (info: { name: string; phone: string; email: string; otp?: string }): Promise<ActionResult> => {
    if (!p.currentUser) return { ok: false, message: "Chưa đăng nhập hệ thống." };

    if (REAL_MODE && getAuthToken()) {
      try {
        const updated = await profileApi.capNhatHoSoToi({
          hoTen: info.name,
          email: info.email,
          soDienThoai: info.phone,
          diaChi: p.currentUser.address ?? null,
          maOtp: info.otp ?? null,
        });
        p.setCurrentUser((prev) =>
          prev
            ? { ...prev, name: updated.hoTen ?? info.name, email: updated.email ?? info.email, phone: updated.soDienThoai ?? info.phone }
            : null
        );
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại." };
      }
    }

    p.setCurrentUser((prev) => (prev ? { ...prev, name: info.name, phone: info.phone, email: info.email } : null));
    if (p.role === "admin" || p.role === "staff") {
      p.setStaffAccounts((prev) =>
        prev.map((s) => (s.id === p.currentUser?.id || s.email === p.currentUser?.email ? { ...s, name: info.name, phone: info.phone, email: info.email } : s))
      );
    } else {
      p.setCustomers((prev) =>
        prev.map((c) => (c.id === p.currentUser?.id || c.email === p.currentUser?.email ? { ...c, name: info.name, phone: info.phone, email: info.email } : c))
      );
    }

    p.addAuditLog({
      actor: info.name,
      role: p.role === "admin" ? "Quản trị viên" : p.role === "staff" ? "Nhân viên" : "Khách hàng",
      action: "Cập nhật hồ sơ cá nhân (UC1.6)",
      targetEntity: "UserProfile",
      targetId: p.currentUser.id || info.email,
      detail: `Cập nhật thông tin liên hệ: SĐT ${info.phone}, Email ${info.email}`,
    });
    return { ok: true };
  };

  const changeCurrentUserPassword = async (oldPass: string, newPass: string): Promise<ActionResult> => {
    if (!p.currentUser) return { ok: false, message: "Chưa đăng nhập hệ thống." };
    if (newPass.length < 8) return { ok: false, message: "Mật khẩu mới tối thiểu 8 ký tự." };

    if (REAL_MODE) {
      try {
        await authApi.doiMatKhau({
          matKhauHienTai: oldPass,
          matKhauMoi: newPass,
          xacNhanMatKhauMoi: newPass,
          xacNhanMatKhau: newPass,
        } as Parameters<typeof authApi.doiMatKhau>[0]);
        clearPrivateState();
        setAuthToken(null);
        p.setCurrentUser(null);
        p.setRole("customer");
        p.setPage("login");
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Đổi mật khẩu thất bại." };
      }
    }

    let currentStoredPass = "123456";
    if (p.role === "admin" || p.role === "staff") {
      const staff = p.staffAccounts.find(
        (s) => s.id === p.currentUser?.id || s.email === p.currentUser?.email || s.username === p.currentUser?.username
      );
      currentStoredPass = staff?.password || (p.role === "admin" ? "admin123" : "staff123");
    } else {
      const cust = p.customers.find((c) => c.id === p.currentUser?.id || c.email === p.currentUser?.email);
      currentStoredPass = cust?.password || "123456";
    }

    if (oldPass !== currentStoredPass) return { ok: false, message: "Mật khẩu hiện tại không chính xác." };

    if (p.role === "admin" || p.role === "staff") {
      p.setStaffAccounts((prev) =>
        prev.map((s) =>
          s.id === p.currentUser?.id || s.email === p.currentUser?.email || s.username === p.currentUser?.username ? { ...s, password: newPass } : s
        )
      );
    } else {
      p.setCustomers((prev) => prev.map((c) => (c.id === p.currentUser?.id || c.email === p.currentUser?.email ? { ...c, password: newPass } : c)));
    }

    p.addAuditLog({
      actor: p.currentUser.name,
      role: p.role === "admin" ? "Quản trị viên" : p.role === "staff" ? "Nhân viên" : "Khách hàng",
      action: "Đổi mật khẩu tài khoản (UC1.12)",
      targetEntity: "UserSecurity",
      targetId: p.currentUser.id || p.currentUser.email,
      detail: "Người dùng đổi mật khẩu bảo mật cá nhân thành công",
    });

    p.setCurrentUser(null);
    p.setRole("customer");
    p.setPage("login");
    return { ok: true };
  };

  return { clearPrivateState, updateCurrentUserProfile, changeCurrentUserPassword };
}
