import React, { useState } from "react";
import type { ActionResult, Role } from "../../../types";
import { isRealApiEnabled } from "../../../services/apiClient";
import { profileApi } from "../../../services/api/profileApi";

export interface UserProfileModalProps {
  currentUser: {
    id?: string;
    username?: string;
    name: string;
    email: string;
    phone: string;
    role: Role;
    permissions?: string[];
    address?: string;
  };
  role: Role;
  onClose: () => void;
  onUpdateProfile: (info: { name: string; phone: string; email: string; otp?: string }) => Promise<ActionResult> | ActionResult;
  onChangePassword: (oldPass: string, newPass: string) => Promise<ActionResult> | ActionResult;
}

/**
 * Custom hook trung gian cho Modal Hồ sơ cá nhân & Đổi mật khẩu (UC1.5, UC1.6, UC1.12).
 */
export function useUserProfileModal({
  currentUser,
  onUpdateProfile,
  onChangePassword,
}: Pick<UserProfileModalProps, "currentUser" | "onUpdateProfile" | "onChangePassword">) {
  const [tab, setTab] = useState<"info" | "password">("info");
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);
  const [infoMsg, setInfoMsg] = useState("");
  const [infoError, setInfoError] = useState("");
  const [infoSubmitting, setInfoSubmitting] = useState(false);

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passError, setPassError] = useState("");
  const [passSubmitting, setPassSubmitting] = useState(false);

  const contactChanged =
    email.trim().toLowerCase() !== currentUser.email.trim().toLowerCase() ||
    phone.trim() !== currentUser.phone.trim();

  const handleSendContactOtp = async () => {
    setInfoMsg("");
    setInfoError("");
    if (!phone.trim()) return setInfoError("Vui lòng nhập số điện thoại.");
    if (!email.trim() || !email.includes("@")) return setInfoError("Địa chỉ email không hợp lệ.");

    setOtpSending(true);
    try {
      if (isRealApiEnabled()) {
        const res = await profileApi.guiOtpDoiLienHe({ emailMoi: email.trim(), soDienThoaiMoi: phone.trim() });
        setOtpSent(true);
        setInfoMsg(res.thongDiep || "Đã gửi mã OTP xác minh tới email của bạn.");
      } else {
        setOtpSent(true);
        setInfoMsg("Đã gửi mã OTP demo: 123456");
      }
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : "Không thể gửi mã OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMsg("");
    setInfoError("");
    if (!name.trim()) return setInfoError("Vui lòng nhập họ và tên.");
    if (!phone.trim()) return setInfoError("Vui lòng nhập số điện thoại.");
    if (!email.trim() || !email.includes("@")) return setInfoError("Địa chỉ email không hợp lệ.");
    if (contactChanged) {
      if (!otp.trim()) return setInfoError("Thay đổi Email hoặc Số điện thoại cần nhập mã xác minh OTP.");
      if (!isRealApiEnabled() && otp.trim() !== "123456") {
        return setInfoError("Mã OTP không chính xác (Mã demo: 123456).");
      }
    }

    setInfoSubmitting(true);
    try {
      const res = await onUpdateProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        otp: contactChanged ? otp.trim() : undefined,
      });
      if (res.ok) {
        setInfoMsg("✓ Cập nhật thông tin cá nhân thành công!");
        setOtp("");
        setOtpSent(false);
      } else {
        setInfoError(res.message);
      }
    } finally {
      setInfoSubmitting(false);
    }
  };

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg("");
    setPassError("");
    if (!oldPass) return setPassError("Vui lòng nhập mật khẩu hiện tại.");
    if (newPass.length < 8) return setPassError("Mật khẩu mới tối thiểu 8 ký tự.");
    if (newPass !== confirmPass) return setPassError("Xác nhận mật khẩu mới không khớp.");

    setPassSubmitting(true);
    try {
      const res = await onChangePassword(oldPass, newPass);
      if (res.ok) {
        setPassMsg("✓ Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
      } else {
        setPassError(res.message);
      }
    } finally {
      setPassSubmitting(false);
    }
  };

  return {
    tab, setTab,
    name, setName, phone, setPhone, email, setEmail,
    infoMsg, setInfoMsg, infoError, setInfoError, infoSubmitting,
    otp, setOtp, otpSent, otpSending, contactChanged,
    oldPass, setOldPass, newPass, setNewPass, confirmPass, setConfirmPass,
    passMsg, setPassMsg, passError, setPassError, passSubmitting,
    handleSendContactOtp, handleSaveInfo, handleChangePass,
  };
}
