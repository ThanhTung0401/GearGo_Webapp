import { ProfileReviewsSection } from "./ProfileReviewsSection";
import { useProfileView } from "./profile/useProfileView";
import { ProfileInfoForm } from "./profile/ProfileInfoForm";
import { ProfileSecurityForm } from "./profile/ProfileSecurityForm";

/**
 * Trang Tài khoản cá nhân khách hàng: Hồ sơ (UC1.6), Đổi mật khẩu (UC1.12) và Đánh giá sản phẩm (UC9.1).
 */
export function ProfileView() {
  const vm = useProfileView();

  return (
    <div className="customer-container max-w-4xl">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="customer-page-title">Tài khoản cá nhân</h1>
          <p className="text-sm text-gray-500">Quản lý hồ sơ, đổi mật khẩu và đánh giá sản phẩm sau chuyến đi</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => vm.setSection("profile")}
            className={`btn btn-sm ${vm.section === "profile" ? "btn-primary" : "btn-secondary"}`}
          >
            Hồ sơ cá nhân (UC1.6)
          </button>
          <button
            onClick={() => vm.setSection("security")}
            className={`btn btn-sm ${vm.section === "security" ? "btn-primary" : "btn-secondary"}`}
          >
            Đổi mật khẩu (UC1.12)
          </button>
          <button
            onClick={() => vm.setSection("reviews")}
            className={`btn btn-sm ${vm.section === "reviews" ? "btn-primary" : "btn-secondary"}`}
          >
            Đánh giá sản phẩm ({vm.app.realApi ? vm.eligibleReviewCount : vm.completedOrders.length})
          </button>
        </div>
      </div>

      {vm.section === "profile" ? (
        <ProfileInfoForm
          realApi={Boolean(vm.app.realApi)}
          profile={vm.profile}
          setProfile={vm.setProfile}
          saved={vm.saved}
          setSaved={vm.setSaved}
          profileLoading={vm.profileLoading}
          profileSaving={vm.profileSaving}
          profileError={vm.profileError}
          contactChanged={vm.contactChanged}
          otpCode={vm.otpCode}
          setOtpCode={vm.setOtpCode}
          otpSending={vm.otpSending}
          otpInfo={vm.otpInfo}
          onSendContactOtp={vm.handleSendContactOtp}
          onSaveProfile={vm.saveProfile}
          onCancelChanges={vm.handleCancelProfileChanges}
        />
      ) : vm.section === "security" ? (
        <ProfileSecurityForm
          oldPassword={vm.oldPassword}
          setOldPassword={vm.setOldPassword}
          newPassword={vm.newPassword}
          setNewPassword={vm.setNewPassword}
          confirmPassword={vm.confirmPassword}
          setConfirmPassword={vm.setConfirmPassword}
          passwordError={vm.passwordError}
          passwordMsg={vm.passwordMsg}
          passwordSaving={vm.passwordSaving}
          onSubmit={vm.handleChangePassword}
        />
      ) : (
        <ProfileReviewsSection
          completedOrders={vm.completedOrders}
          onEligibleCountChange={vm.setEligibleReviewCount}
        />
      )}
    </div>
  );
}
