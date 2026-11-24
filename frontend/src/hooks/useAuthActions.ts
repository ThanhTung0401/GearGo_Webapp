import type { Dispatch, SetStateAction } from "react";
import { getAuthToken, setAuthToken } from "../services/apiClient";
import { authApi } from "../services/api";
import type { CustomerAccount, Role, StaffAccount } from "../store";
import { REAL_MODE } from "./appStateStorage";
import { useResetDemoAction, type ResetDemoParams } from "./auth/useResetDemoAction";
import { useProfilePasswordActions, type AuthSessionUser } from "./auth/useProfilePasswordActions";

interface UseAuthActionsParams extends ResetDemoParams {
  role: Role;
  currentUser: AuthSessionUser | null;
  setCurrentUser: Dispatch<SetStateAction<AuthSessionUser | null>>;
  setPermissionNotice: Dispatch<SetStateAction<string | null>>;
  hydrateSession: (fromPermissionChange?: boolean) => Promise<void>;
  staffAccounts: StaffAccount[];
  customers: CustomerAccount[];
  setUnreadNotificationCount: Dispatch<SetStateAction<number>>;
  addAuditLog: (entry: { actor: string; role: string; action: string; targetEntity: string; targetId: string; detail: string }) => void;
}

/**
 * Facade điều phối xác thực phiên đăng nhập, hồ sơ, đổi mật khẩu, đăng xuất và reset demo.
 */
export function useAuthActions(params: UseAuthActionsParams) {
  const { resetDemo } = useResetDemoAction(params);
  const { clearPrivateState, updateCurrentUserProfile, changeCurrentUserPassword } = useProfilePasswordActions(params);

  const login = (user: AuthSessionUser) => {
    const isProfileRefresh = !!(params.currentUser?.id && params.currentUser.id === user.id);
    params.setCurrentUser(user);
    params.setRole(user.role);
    params.setPermissionNotice(null);
    if (REAL_MODE && getAuthToken()) {
      void params.hydrateSession(false);
    } else if (!isProfileRefresh) {
      params.addAuditLog({
        actor: user.name,
        role: user.role === "admin" ? "Quản trị viên" : user.role === "staff" ? "Nhân viên" : "Khách hàng",
        action: "Đăng nhập (UC1.2)",
        targetEntity: "Session",
        targetId: user.email || user.username || user.id || "SESSION",
        detail: `Đăng nhập thành công với vai trò ${user.role}`,
      });
    }
    if (isProfileRefresh) return;
    if (user.role !== "customer" || (user.permissions && user.permissions.length > 0)) params.setPage("workspace");
    else params.setPage("landing");
  };

  const logout = async () => {
    if (REAL_MODE) {
      try {
        await authApi.dangXuat();
      } catch {
        // Vẫn xóa phiên cục bộ nếu token hết hạn hoặc mất kết nối
      }
      clearPrivateState();
    } else {
      params.addAuditLog({
        actor: params.currentUser?.name || "Người dùng",
        role: params.role === "admin" ? "Quản trị viên" : params.role === "staff" ? "Nhân viên" : "Khách hàng",
        action: "Đăng xuất (UC1.3)",
        targetEntity: "Session",
        targetId: params.currentUser?.email || "SESSION",
        detail: "Đăng xuất tài khoản khỏi phiên làm việc",
      });
    }
    setAuthToken(null);
    params.setCurrentUser(null);
    params.setRole("customer");
    params.setPage("landing");
  };

  return { login, updateCurrentUserProfile, changeCurrentUserPassword, logout, resetDemo };
}
