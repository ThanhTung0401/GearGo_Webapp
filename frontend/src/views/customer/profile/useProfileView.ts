import { useState, useEffect, type FormEvent } from "react";
import { useApp } from "../../../context/AppContext";
import { profileApi, authApi } from "../../../services/api";

export type ProfileSectionTab = "profile" | "security" | "reviews";

export interface CustomerProfileData {
  name: string;
  phone: string;
  email: string;
  address: string;
  birthDate: string;
  avatarUrl: string;
}

/**
 * Hook quản lý hồ sơ cá nhân, xác minh OTP đổi liên hệ (UC1.6) và đổi mật khẩu bảo mật (UC1.12).
 */
export function useProfileView() {
  const app = useApp();
  const [section, setSection] = useState<ProfileSectionTab>(() => {
    const pref = sessionStorage.getItem("geargo_profile_section");
    if (pref === "reviews" || pref === "security" || pref === "profile") {
      sessionStorage.removeItem("geargo_profile_section");
      return pref as ProfileSectionTab;
    }
    return "profile";
  });

  const emptyProfile: CustomerProfileData = {
    name: app.currentUser?.name || "",
    phone: app.currentUser?.phone || "",
    email: app.currentUser?.email || "",
    address: app.currentUser?.address || "",
    birthDate: "",
    avatarUrl: "",
  };

  const defaultProfile: CustomerProfileData = app.realApi
    ? emptyProfile
    : {
        name: "Nguyễn Văn An",
        phone: "0901 234 567",
        email: "an.nguyen@example.com",
        address: "142 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
        birthDate: "1995-08-15",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      };

  const [savedProfile, setSavedProfile] = useState<CustomerProfileData>(() => {
    if (app.realApi) return defaultProfile;
    try {
      const saved = localStorage.getItem("geargo-demo-customer-profile");
      return saved ? (JSON.parse(saved) as CustomerProfileData) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const [profile, setProfile] = useState<CustomerProfileData>(savedProfile);
  const [saved, setSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  // OTP xác minh khi thay đổi Email hoặc Số điện thoại (UC1.6)
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpInfo, setOtpInfo] = useState("");

  // State đổi mật khẩu (UC1.12)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Đếm sản phẩm đủ điều kiện đánh giá (UC9.1)
  const [eligibleReviewCount, setEligibleReviewCount] = useState(0);
  const completedOrders = app.orders.filter((order) => order.status === "Hoàn tất");

  // Nạp hồ sơ thật từ backend khi ở chế độ realApi
  useEffect(() => {
    if (!app.realApi || !app.currentUser) return;
    setProfileLoading(true);
    void profileApi
      .layHoSoToi()
      .then((dto) => {
        const next: CustomerProfileData = {
          name: dto.hoTen || app.currentUser?.name || "",
          phone: dto.soDienThoai || app.currentUser?.phone || "",
          email: dto.email || app.currentUser?.email || "",
          address: dto.diaChi || "",
          birthDate: dto.ngaySinh ? dto.ngaySinh.slice(0, 10) : "",
          avatarUrl: dto.anhDaiDien || "",
        };
        setSavedProfile(next);
        setProfile(next);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [app.realApi, app.currentUser?.id]);

  const contactChanged =
    profile.email.trim() !== (savedProfile.email || "").trim() ||
    profile.phone.trim() !== (savedProfile.phone || "").trim();

  // Gửi mã OTP xác minh khi thay đổi Email hoặc Số điện thoại (UC1.6)
  const handleSendContactOtp = async () => {
    setProfileError("");
    setOtpInfo("");
    setOtpSending(true);
    try {
      const res = await profileApi.guiOtpDoiLienHe({
        emailMoi: profile.email.trim() !== (savedProfile.email || "").trim() ? profile.email.trim() : null,
        soDienThoaiMoi: profile.phone.trim() !== (savedProfile.phone || "").trim() ? profile.phone.trim() : null,
      });
      setOtpInfo(res.thongDiep || "Đã gửi mã OTP xác minh. Vui lòng kiểm tra email/điện thoại.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Không thể gửi mã OTP xác minh.");
    } finally {
      setOtpSending(false);
    }
  };

  // Lưu thay đổi hồ sơ cá nhân qua API thật hoặc localStorage (mock)
  const saveProfile = async () => {
    setProfileError("");
    setSaved(false);
    if (app.realApi) {
      if (contactChanged && !otpCode.trim()) {
        setProfileError("Bạn đã thay đổi Email hoặc Số điện thoại. Vui lòng gửi và nhập mã OTP xác minh.");
        return;
      }
      setProfileSaving(true);
      try {
        const dto = await profileApi.capNhatHoSoToi({
          hoTen: profile.name.trim(),
          email: profile.email.trim(),
          soDienThoai: profile.phone.trim(),
          diaChi: profile.address.trim() || null,
          ngaySinh: profile.birthDate || null,
          anhDaiDien: profile.avatarUrl.trim() || null,
          maOtp: contactChanged ? otpCode.trim() : null,
        });
        const next: CustomerProfileData = {
          name: dto.hoTen || profile.name,
          phone: dto.soDienThoai || profile.phone,
          email: dto.email || profile.email,
          address: dto.diaChi || "",
          birthDate: dto.ngaySinh ? dto.ngaySinh.slice(0, 10) : "",
          avatarUrl: dto.anhDaiDien || "",
        };
        setSavedProfile(next);
        setProfile(next);
        setOtpCode("");
        setOtpInfo("");
        setSaved(true);
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Không thể cập nhật hồ sơ cá nhân.");
      } finally {
        setProfileSaving(false);
      }
      return;
    }

    localStorage.setItem("geargo-demo-customer-profile", JSON.stringify(profile));
    setSavedProfile(profile);
    setSaved(true);
    app.addAuditLog({
      actor: profile.name,
      role: "Khách hàng",
      action: "Cập nhật hồ sơ (UC1.6)",
      targetEntity: "CustomerProfile",
      targetId: profile.phone,
      detail: "Cập nhật thông tin liên hệ và hồ sơ cá nhân",
    });
  };

  const handleCancelProfileChanges = () => {
    setProfile(savedProfile);
    setSaved(false);
    setProfileError("");
  };

  // Xử lý đổi mật khẩu (UC1.12) - bắt buộc đăng xuất ở chế độ API thật sau khi thành công
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    if (!oldPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    const minLen = app.realApi ? 8 : 6;
    if (newPassword.length < minLen) {
      setPasswordError(`Mật khẩu mới phải có tối thiểu ${minLen} ký tự`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }

    if (app.realApi) {
      setPasswordSaving(true);
      try {
        await authApi.doiMatKhau({
          matKhauHienTai: oldPassword,
          matKhauMoi: newPassword,
          xacNhanMatKhauMoi: confirmPassword,
        });
        setPasswordMsg("✓ Đổi mật khẩu thành công! Hệ thống sẽ đăng xuất để bạn đăng nhập lại bằng mật khẩu mới.");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        window.setTimeout(() => {
          void app.logout();
        }, 1200);
      } catch (err) {
        setPasswordError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại.");
      } finally {
        setPasswordSaving(false);
      }
      return;
    }

    setPasswordMsg("✓ Đổi mật khẩu thành công! Vui lòng dùng mật khẩu mới cho các lần đăng nhập sau.");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    app.addAuditLog({
      actor: profile.name,
      role: "Khách hàng",
      action: "Đổi mật khẩu (UC1.12)",
      targetEntity: "CustomerAccount",
      targetId: profile.email,
      detail: "Người dùng đổi mật khẩu bảo mật cá nhân",
    });
  };

  return {
    app,
    section,
    setSection,
    profile,
    setProfile,
    saved,
    setSaved,
    profileLoading,
    profileSaving,
    profileError,
    contactChanged,
    otpCode,
    setOtpCode,
    otpSending,
    otpInfo,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordMsg,
    passwordError,
    passwordSaving,
    eligibleReviewCount,
    setEligibleReviewCount,
    completedOrders,
    handleSendContactOtp,
    saveProfile,
    handleCancelProfileChanges,
    handleChangePassword,
  };
}
