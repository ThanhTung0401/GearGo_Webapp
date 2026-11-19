import type { CustomerProfileData } from "./useProfileView";

interface ProfileInfoFormProps {
  realApi: boolean;
  profile: CustomerProfileData;
  setProfile: (v: CustomerProfileData) => void;
  saved: boolean;
  setSaved: (v: boolean) => void;
  profileLoading: boolean;
  profileSaving: boolean;
  profileError: string;
  contactChanged: boolean;
  otpCode: string;
  setOtpCode: (v: string) => void;
  otpSending: boolean;
  otpInfo: string;
  onSendContactOtp: () => Promise<void>;
  onSaveProfile: () => Promise<void>;
  onCancelChanges: () => void;
}

const PROFILE_FIELDS: { key: keyof CustomerProfileData; label: string; type: string }[] = [
  { key: "name", label: "Họ và tên", type: "text" },
  { key: "phone", label: "Số điện thoại", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "birthDate", label: "Ngày sinh", type: "date" },
  { key: "address", label: "Địa chỉ thường trú / liên hệ", type: "text" },
  { key: "avatarUrl", label: "Ảnh đại diện (URL)", type: "url" },
];

/**
 * Form cập nhật hồ sơ cá nhân, thông tin liên hệ và khối xác minh OTP đổi liên hệ (UC1.6).
 */
export function ProfileInfoForm({
  realApi,
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
  onSendContactOtp,
  onSaveProfile,
  onCancelChanges,
}: ProfileInfoFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSaveProfile();
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
            className="cp-profile-avatar"
          />
        )}
      </div>
      {profileError && (
        <div role="alert" className="form-error-msg mb-3">
          {profileError}
        </div>
      )}
      <div className="form-grid-2">
        {PROFILE_FIELDS.map((field) => (
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
      {realApi && contactChanged && (
        <div className="cp-profile-otp-box">
          <div className="cp-profile-otp-title">
            🔐 Xác minh OTP khi thay đổi Email / Số điện thoại (UC1.6)
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              type="button"
              disabled={otpSending}
              onClick={() => void onSendContactOtp()}
              className="btn btn-secondary btn-sm"
            >
              {otpSending ? "Đang gửi OTP..." : "Gửi mã OTP xác minh"}
            </button>
            <input
              type="text"
              placeholder="Nhập mã OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="form-input cp-profile-otp-input"
            />
          </div>
          {otpInfo && (
            <div className="cp-profile-otp-info">
              {otpInfo}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mt-5 flex-wrap">
        <button type="submit" disabled={profileSaving || profileLoading} className="btn btn-primary btn-md">
          {profileSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
        <button
          type="button"
          onClick={onCancelChanges}
          className="btn btn-secondary btn-md"
        >
          Hủy thay đổi
        </button>
        {saved && (
          <span className="badge badge-success">✓ Đã lưu hồ sơ thành công</span>
        )}
      </div>
    </form>
  );
}
