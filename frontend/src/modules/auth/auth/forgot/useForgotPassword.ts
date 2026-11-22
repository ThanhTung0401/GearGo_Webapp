import { useState, type FormEvent } from "react";
import { useApp } from "../../../../context/AppContext";
import { isRealApiEnabled } from "../../../../services/apiClient";
import { authApi } from "../../../../services/api/authApi";

export type ForgotStep = "input" | "otp" | "reset" | "success";

/**
 * Hook quản lý quy trình 4 bước khôi phục mật khẩu qua OTP (UC1.4 / UC15).
 */
export function useForgotPassword() {
  const app = useApp();
  const [step, setStep] = useState<ForgotStep>("input");
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");
  const [loading, setLoading] = useState(false);

  // Tìm tài khoản khách hàng hoặc nhân viên trùng khớp trong dữ liệu local mock
  const findLocalAccount = (cleanContact: string) => {
    const normalizedPhone = cleanContact.replace(/\s/g, "");
    const matchedCust = app.customers.find(
      (c) => c.email.toLowerCase() === cleanContact || c.phone.replace(/\s/g, "") === normalizedPhone
    );
    const matchedStaff = app.staffAccounts.find(
      (s) =>
        s.email.toLowerCase() === cleanContact ||
        s.phone.replace(/\s/g, "") === normalizedPhone ||
        s.username.toLowerCase() === cleanContact
    );
    return { matchedCust, matchedStaff };
  };

  // Bước 1: Gửi yêu cầu nhận mã OTP qua email hoặc SĐT
  const handleSubmitContact = async (e: FormEvent) => {
    e.preventDefault();
    const cleanContact = contact.trim().toLowerCase();
    if (!cleanContact) {
      setErr("Vui lòng nhập email hoặc số điện thoại.");
      return;
    }

    setLoading(true);
    setErr("");

    if (isRealApiEnabled()) {
      try {
        await authApi.quenMatKhau(cleanContact);
        setStep("otp");
      } catch (error) {
        setErr(error instanceof Error ? error.message : "Không thể gửi mã OTP. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const { matchedCust, matchedStaff } = findLocalAccount(cleanContact);
    if (!matchedCust && !matchedStaff) {
      setErr("Không tìm thấy tài khoản nào khớp với Email hoặc Số điện thoại này trên hệ thống GearGo.");
      setLoading(false);
      return;
    }

    setStep("otp");
    setLoading(false);
  };

  // Gửi lại mã OTP qua email
  const handleResendOtp = async () => {
    if (!contact.trim()) return;
    setErr("");
    setNotice("");
    try {
      if (isRealApiEnabled()) {
        await authApi.quenMatKhau(contact.trim().toLowerCase());
        setNotice(`Đã gửi lại mã xác minh OTP mới đến ${contact}. Vui lòng kiểm tra hộp thư!`);
      } else {
        setNotice("Đã gửi lại mã OTP demo: 123456");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không thể gửi lại mã OTP.");
    }
  };

  // Bước 2: Xác thực mã OTP 6 chữ số
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setErr("Vui lòng nhập đủ 6 chữ số của mã xác minh OTP.");
      return;
    }

    setLoading(true);
    setErr("");

    if (isRealApiEnabled()) {
      try {
        const res = await authApi.xacThucOtp(contact.trim().toLowerCase(), cleanOtp);
        setVerifiedToken(res.token || cleanOtp);
        setStep("reset");
      } catch (error) {
        setErr(error instanceof Error ? error.message : "Mã OTP không chính xác hoặc đã hết hạn.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (cleanOtp !== "123456") {
      setErr("Mã OTP không chính xác hoặc đã hết hạn (Thử mã demo: 123456).");
      setLoading(false);
      return;
    }

    setVerifiedToken(cleanOtp);
    setStep("reset");
    setLoading(false);
  };

  // Bước 3: Đặt mật khẩu mới hai lần (UC1.4)
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      setErr("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    if (newPass !== confirm) {
      setErr("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    setErr("");

    if (isRealApiEnabled()) {
      try {
        await authApi.datLaiMatKhau({
          token: verifiedToken || otp.trim(),
          matKhauMoi: newPass,
          xacNhanMatKhau: confirm,
        });
        setStep("success");
      } catch (error) {
        setErr(error instanceof Error ? error.message : "Đặt lại mật khẩu thất bại. Mã xác minh có thể đã hết hạn.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const { matchedCust, matchedStaff } = findLocalAccount(contact.trim().toLowerCase());
    if (matchedCust) {
      app.saveCustomer({ ...matchedCust, password: newPass });
    } else if (matchedStaff) {
      app.saveStaffAccount({ ...matchedStaff, password: newPass });
    }

    app.addAuditLog({
      actor: matchedCust?.name || matchedStaff?.name || contact,
      role: matchedStaff ? (matchedStaff.role === "Quản trị viên" ? "Quản trị viên" : "Nhân viên") : "Khách hàng",
      action: "Khôi phục mật khẩu (UC1.4)",
      targetEntity: "UserSecurity",
      targetId: contact,
      detail: "Đặt lại mật khẩu thành công qua mã OTP xác minh",
    });

    setStep("success");
    setLoading(false);
  };

  return {
    step,
    setStep,
    contact,
    setContact,
    otp,
    setOtp,
    newPass,
    setNewPass,
    confirm,
    setConfirm,
    err,
    setErr,
    notice,
    loading,
    handleSubmitContact,
    handleResendOtp,
    handleVerifyOtp,
    handleResetPassword,
    goToLogin: () => app.setPage("login"),
  };
}
