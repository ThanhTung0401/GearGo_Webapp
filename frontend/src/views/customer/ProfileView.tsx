import { useState, useEffect } from "react";
import { useApp } from "../../App";
import { profileApi, authApi } from "../../services/api";
import { ProfileReviewsSection } from "./ProfileReviewsSection";

export function ProfileView() {
  const app = useApp();
  const [section, setSection] = useState<"profile" | "security" | "reviews">(() => {
    const pref = sessionStorage.getItem("geargo_profile_section");
    if (pref === "reviews" || pref === "security" || pref === "profile") {
      sessionStorage.removeItem("geargo_profile_section");
      return pref as "profile" | "security" | "reviews";
    }
    return "profile";
  });

  const emptyProfile = {
    name: app.currentUser?.name || "",
    phone: app.currentUser?.phone || "",
    email: app.currentUser?.email || "",
    address: app.currentUser?.address || "",
    birthDate: "",
    avatarUrl: "",
  };

  const defaultProfile = app.realApi
    ? emptyProfile
    : {
        name: "Nguyễn Văn An",
        phone: "0901 234 567",
        email: "an.nguyen@example.com",
        address: "142 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
        birthDate: "1995-08-15",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      };

  const [savedProfile, setSavedProfile] = useState(() => {
    if (app.realApi) return defaultProfile;
    try {
      const saved = localStorage.getItem("geargo-demo-customer-profile");
      return saved ? (JSON.parse(saved) as typeof defaultProfile) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const [profile, setProfile] = useState(savedProfile);
  const [saved, setSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  // OTP xác minh khi thay đổi Email hoặc Số điện thoại (UC1.6)
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpInfo, setOtpInfo] = useState("");

  // Đổi mật khẩu state (UC1.12)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Đếm sản phẩm đủ điều kiện đánh giá (UC9.1)
  const [eligibleReviewCount, setEligibleReviewCount] = useState(0);
  const completedOrders = app.orders.filter((order) => order.status === "Hoàn tất");

  // Nạp hồ sơ thật từ backend
  useEffect(() => {
    if (!app.realApi || !app.currentUser) return;
    setProfileLoading(true);
    void profileApi
      .layHoSoToi()
      .then((dto) => {
        const next = {
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
        const next = {
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
    app.addAuditLog({ actor: profile.name, role: "Khách hàng", action: "Cập nhật hồ sơ (UC1.6)", targetEntity: "CustomerProfile", targetId: profile.phone, detail: "Cập nhật thông tin liên hệ và hồ sơ cá nhân" });
  };

  const handleCancelProfileChanges = () => {
    setProfile(savedProfile);
    setSaved(false);
    setProfileError("");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
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
        // UC1.12: Bắt buộc đăng xuất sau khi đổi mật khẩu thành công
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
    app.addAuditLog({ actor: profile.name, role: "Khách hàng", action: "Đổi mật khẩu (UC1.12)", targetEntity: "CustomerAccount", targetId: profile.email, detail: "Người dùng đổi mật khẩu bảo mật cá nhân" });
  };

  return (
    <div className="customer-container max-w-4xl">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="customer-page-title">Tài khoản cá nhân</h1>
          <p className="text-sm text-gray-500">Quản lý hồ sơ, đổi mật khẩu và đánh giá sản phẩm sau chuyến đi</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSection("profile")}
            className={`btn btn-sm ${section === "profile" ? "btn-primary" : "btn-secondary"}`}
          >
            Hồ sơ cá nhân (UC1.6)
          </button>
          <button
            onClick={() => setSection("security")}
            className={`btn btn-sm ${section === "security" ? "btn-primary" : "btn-secondary"}`}
          >
            Đổi mật khẩu (UC1.12)
          </button>
          <button
            onClick={() => setSection("reviews")}
            className={`btn btn-sm ${section === "reviews" ? "btn-primary" : "btn-secondary"}`}
          >
            Đánh giá sản phẩm ({app.realApi ? eligibleReviewCount : completedOrders.length})
          </button>
        </div>
      </div>

      {section === "profile" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveProfile();
          }}
          className="card-panel"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-display font-bold text-lg text-bark">Hồ sơ cá nhân & Thông tin liên hệ (UC1.6)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {profileLoading ? "Đang tải hồ sơ cá nhân..." : "* GearGo nhận và trả thiết bị trực tiếp tại cửa hàng (128 Nguyễn Đình Chiểu, Q.3)."}
              </p>
            </div>
            {profile.avatarUrl && (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--color-forest)" }}
              />
            )}
          </div>
          {profileError && (
            <div role="alert" className="form-error-msg mb-3">
              {profileError}
            </div>
          )}
          <div className="form-grid-2">
            {[
              { key: "name" as const, label: "Họ và tên", type: "text" },
              { key: "phone" as const, label: "Số điện thoại", type: "tel" },
              { key: "email" as const, label: "Email", type: "email" },
              { key: "birthDate" as const, label: "Ngày sinh", type: "date" },
              { key: "address" as const, label: "Địa chỉ thường trú / liên hệ", type: "text" },
              { key: "avatarUrl" as const, label: "Ảnh đại diện (URL)", type: "url" },
            ].map((field) => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                <input
                  type={field.type}
                  value={profile[field.key] ?? ""}
                  onChange={(e) => {
                    setProfile({ ...profile, [field.key]: e.target.value });
                    setSaved(false);
                  }}
                  className="form-input"
                />
              </div>
            ))}
          </div>

          {/* UC1.6: Khối xác minh OTP khi thay đổi Email hoặc Số điện thoại */}
          {app.realApi && contactChanged && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: "#FFFBEB", border: "1px solid #FCD34D" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#92400E", marginBottom: 6 }}>
                🔐 Xác minh OTP khi thay đổi Email / Số điện thoại (UC1.6)
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <button
                  type="button"
                  disabled={otpSending}
                  onClick={() => void handleSendContactOtp()}
                  className="btn btn-secondary btn-sm"
                >
                  {otpSending ? "Đang gửi OTP..." : "Gửi mã OTP xác minh"}
                </button>
                <input
                  type="text"
                  placeholder="Nhập mã OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: 180, fontSize: "0.84rem" }}
                />
              </div>
              {otpInfo && (
                <div style={{ marginTop: 6, fontSize: "0.75rem", color: "#065F46", fontWeight: 600 }}>
                  {otpInfo}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-5">
            <button type="submit" disabled={profileSaving || profileLoading} className="btn btn-primary btn-md">
              {profileSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button
              type="button"
              onClick={handleCancelProfileChanges}
              className="btn btn-secondary btn-md"
            >
              Hủy thay đổi
            </button>
            {saved && (
              <span className="badge badge-success">✓ Đã lưu hồ sơ thành công</span>
            )}
          </div>
        </form>
      ) : section === "security" ? (
        <form onSubmit={(e) => void handleChangePassword(e)} className="card-panel max-w-lg">
          <h2 className="font-display font-bold text-lg text-bark mb-2">Đổi mật khẩu tài khoản</h2>
          <p className="text-xs text-gray-500 mb-4">Mật khẩu mới cần dài tối thiểu 6 ký tự để bảo mật tài khoản thuê thiết bị.</p>

          <div className="form-group mb-3">
            <label className="form-label">Mật khẩu hiện tại *</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group mb-3">
            <label className="form-label">Mật khẩu mới *</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Xác nhận mật khẩu mới *</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
            />
          </div>

          {passwordError && (
            <div className="form-error-msg mb-3">{passwordError}</div>
          )}

          {passwordMsg && (
            <div className="badge badge-success p-2.5 rounded-lg mb-3 block text-center font-bold">
              {passwordMsg}
            </div>
          )}

          <button type="submit" disabled={passwordSaving} className="btn btn-primary btn-md">
            {passwordSaving ? "Đang cập nhật..." : "Cập nhật mật khẩu mới"}
          </button>
        </form>
     
      ) : (
        <ProfileReviewsSection
          completedOrders={completedOrders}
          onEligibleCountChange={setEligibleReviewCount}
        />
      )}
    </div>
  );
}
