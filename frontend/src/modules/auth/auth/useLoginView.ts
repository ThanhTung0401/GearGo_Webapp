import React, { useState } from "react";
import { useApp } from "../../../App";
import { ApiError, isRealApiEnabled, setAuthToken } from "../../../services/apiClient";
import { authApi } from "../../../services/api/authApi";

/**
 * Custom hook trung gian cho màn hình Đăng nhập (UC1.2, UC1.2.1):
 * Tách logic kiểm tra cổng đăng nhập (customer/staff), khóa tài khoản và gọi API.
 */
export function useLoginView(portal: "customer" | "staff") {
  const app = useApp();
  const isStaffPortal = portal === "staff";
  const [accountInput, setAccountInput] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [wrongPortalHint, setWrongPortalHint] = useState<"customer" | "staff" | null>(null);
  const [lockedAccount, setLockedAccount] = useState<{ name: string; reason: string } | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const resetFeedback = () => {
    setErr("");
    setWrongPortalHint(null);
    setLockedAccount(null);
  };

  const fillQuickAccount = (loginAccount: string, loginPass: string) => {
    setAccountInput(loginAccount);
    setPass(loginPass);
    resetFeedback();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (failedAttempts >= 5) {
      setErr("Tài khoản tạm thời bị giới hạn do thử sai quá 5 lần. Vui lòng bấm Quên mật khẩu hoặc đợi 15 phút.");
      return;
    }

    const cleanInput = accountInput.trim().toLowerCase();
    if (!cleanInput) return setErr("Vui lòng nhập Email, Số điện thoại hoặc Tên đăng nhập.");
    if (pass.length < 6) return setErr("Mật khẩu tối thiểu 6 ký tự.");

    if (isRealApiEnabled()) {
      try {
        const res = await authApi.dangNhap({ taiKhoan: accountInput.trim(), matKhau: pass });
        const mappedRole =
          res.vaiTro === "QuanTriVien" ? "admin" : res.vaiTro === "NhanVien" ? "staff" : "customer";

        // Chặn đăng nhập chéo vai trò giữa /login và /staff/login
        if (isStaffPortal && mappedRole === "customer") {
          setAuthToken(null);
          setWrongPortalHint("customer");
          setErr("Tài khoản khách hàng vui lòng đăng nhập tại cổng Khách hàng (/login).");
          return;
        }
        if (!isStaffPortal && mappedRole !== "customer") {
          setAuthToken(null);
          setWrongPortalHint("staff");
          setErr("Tài khoản nhân viên / quản trị viên vui lòng đăng nhập tại cổng Nhân viên (/staff/login).");
          return;
        }

        app.login({
          id: String(res.maTaiKhoan),
          name: res.hoTen ?? res.email ?? accountInput.trim(),
          email: res.email ?? "",
          phone: "",
          role: mappedRole,
        });
      } catch (error) {
        if (error instanceof ApiError && (error.code === "TAI_KHOAN_BI_KHOA" || error.code === "TAM_KHOA")) {
          setLockedAccount({ name: accountInput.trim(), reason: error.message });
        } else {
          setErr(error instanceof Error ? error.message : "Đăng nhập thất bại.");
        }
      }
      return;
    }

    const matchedStaff = app.staffAccounts.find(
      (s) =>
        s.email.toLowerCase() === cleanInput ||
        s.username.toLowerCase() === cleanInput ||
        s.phone.replace(/\s/g, "") === cleanInput.replace(/\s/g, "")
    );
    const matchedCustomer = !matchedStaff
      ? app.customers.find(
          (c) =>
            c.email.toLowerCase() === cleanInput ||
            c.phone.replace(/\s/g, "") === cleanInput.replace(/\s/g, "") ||
            c.id.toLowerCase() === cleanInput
        )
      : null;

    if (!matchedStaff && !matchedCustomer) {
      return setErr("Tài khoản không tồn tại trên hệ thống GearGo. Vui lòng kiểm tra lại thông tin.");
    }
    if (isStaffPortal && !matchedStaff) {
      setWrongPortalHint("customer");
      return setErr("Tài khoản khách hàng vui lòng đăng nhập tại cổng Khách hàng (/login).");
    }
    if (!isStaffPortal && matchedStaff) {
      setWrongPortalHint("staff");
      return setErr("Tài khoản nhân viên / quản trị viên vui lòng đăng nhập tại cổng Nhân viên (/staff/login).");
    }

    const target = matchedStaff || matchedCustomer!;
    if (target.status === "locked") {
      setLockedAccount({
        name: target.name,
        reason: target.lockedReason || "Vi phạm điều khoản dịch vụ hoặc quy chế hoàn trả thiết bị.",
      });
      return;
    }

    const expectedPassword = target.password || "GearGo@2026";
    if (pass !== expectedPassword) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      setErr(
        nextFailed >= 5
          ? "Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Tài khoản tạm thời bị tạm dừng để bảo vệ an toàn."
          : `Mật khẩu không chính xác. Bạn còn ${5 - nextFailed} lần thử lại.`
      );
      return;
    }

    if (matchedStaff) {
      app.login({
        id: matchedStaff.id,
        username: matchedStaff.username,
        name: matchedStaff.name,
        email: matchedStaff.email,
        phone: matchedStaff.phone,
        role: matchedStaff.role === "Quản trị viên" ? "admin" : "staff",
        permissions: matchedStaff.permissions || [],
      });
    } else if (matchedCustomer) {
      app.login({
        id: matchedCustomer.id,
        name: matchedCustomer.name,
        email: matchedCustomer.email,
        phone: matchedCustomer.phone,
        role: "customer",
        address: matchedCustomer.address,
      });
    }
  };

  return {
    app,
    isStaffPortal,
    accountInput,
    setAccountInput,
    pass,
    setPass,
    showPass,
    setShowPass,
    err,
    wrongPortalHint,
    lockedAccount,
    resetFeedback,
    fillQuickAccount,
    submit,
  };
}
