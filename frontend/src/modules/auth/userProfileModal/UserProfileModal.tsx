import { useUserProfileModal, type UserProfileModalProps } from "./useUserProfileModal";

export type { UserProfileModalProps };

export default function UserProfileModal(props: UserProfileModalProps) {
  const { currentUser, role, onClose } = props;
  const vm = useUserProfileModal(props);

  const roleLabel =
    role === "admin" ? "Quản trị viên hệ thống" : role === "staff" ? "Nhân viên tác nghiệp" : "Khách hàng GearGo";
  const roleShort = role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Khách hàng";

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div
              className="w-[38px] h-[38px] rounded-full text-white grid place-items-center font-bold text-base"
              style={{ background: role === "admin" ? "#D97706" : role === "staff" ? "#2563EB" : "var(--color-amber)" }}
            >
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h3 className="modal-title text-lg">{currentUser.name}</h3>
              <p className="text-xs text-gray-500">
                {roleLabel} {currentUser.id ? `• ${currentUser.id}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm text-lg" aria-label="Đóng modal">
            ×
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 px-5 pt-2 gap-2 bg-gray-50">
          {(["info", "password"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => vm.setTab(t)}
              className={`px-3.5 py-2 text-sm font-bold bg-transparent border-0 border-b-2 cursor-pointer ${
                vm.tab === t
                  ? "border-[var(--color-forest)] text-[var(--color-forest)]"
                  : "border-transparent text-gray-500"
              }`}
            >
              {t === "info" ? "Hồ sơ cá nhân (UC1.5, UC1.6)" : "Đổi mật khẩu (UC1.12)"}
            </button>
          ))}
        </div>

        <div className="modal-body p-5">
          {vm.tab === "info" ? (
            <form onSubmit={vm.handleSaveInfo} className="flex flex-col gap-3.5">
              <div className="bg-gray-100 rounded-lg px-3.5 py-2.5">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Mã tài khoản: </span>
                    <strong className="font-mono">{currentUser.id || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Tên đăng nhập: </span>
                    <strong className="font-mono">@{currentUser.username || currentUser.email.split("@")[0]}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Vai trò: </span>
                    <span className="badge font-bold">{roleShort}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Trạng thái: </span>
                    <span className="badge badge-success">Hoạt động</span>
                  </div>
                </div>
                {currentUser.permissions && currentUser.permissions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                    <div className="text-xs text-gray-600 font-semibold mb-1">
                      Nhóm quyền nghiệp vụ được gán (UC1.10):
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {currentUser.permissions.map((p) => (
                        <span key={p} className="bg-indigo-50 text-indigo-700 text-[0.7rem] font-semibold px-2 py-0.5 rounded-md">
                          ✓ {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={vm.name}
                  onChange={(e) => { vm.setName(e.target.value); vm.setInfoMsg(""); vm.setInfoError(""); }}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    required
                    value={vm.phone}
                    onChange={(e) => { vm.setPhone(e.target.value); vm.setInfoMsg(""); vm.setInfoError(""); }}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={vm.email}
                    onChange={(e) => { vm.setEmail(e.target.value); vm.setInfoMsg(""); vm.setInfoError(""); }}
                    className="form-input"
                  />
                </div>
              </div>

              {vm.contactChanged && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5">
                  <div className="text-xs font-bold text-amber-800 mb-1.5">
                    Xác minh OTP khi đổi Email / Số điện thoại (UC1.6)
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Nhập mã OTP 6 số"
                      value={vm.otp}
                      onChange={(e) => { vm.setOtp(e.target.value.replace(/\D/g, "")); vm.setInfoError(""); }}
                      className="form-input flex-1 font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => void vm.handleSendContactOtp()}
                      disabled={vm.otpSending}
                      className="btn btn-secondary btn-sm"
                    >
                      {vm.otpSending ? "Đang gửi..." : vm.otpSent ? "Gửi lại OTP" : "Gửi mã OTP"}
                    </button>
                  </div>
                </div>
              )}

              {vm.infoMsg && <div className="badge badge-success p-2 text-center">{vm.infoMsg}</div>}
              {vm.infoError && <div className="form-error-msg">{vm.infoError}</div>}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md flex-1">Đóng</button>
                <button type="submit" disabled={vm.infoSubmitting} className="btn btn-primary btn-md flex-1">
                  {vm.infoSubmitting ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={vm.handleChangePass} className="flex flex-col gap-3.5">
              <p className="text-xs text-gray-500 m-0">
                Nhập mật khẩu hiện tại và tạo mật khẩu mới an toàn tối thiểu 8 ký tự.
              </p>
              <div>
                <label className="block text-xs font-bold mb-1">Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu đang dùng"
                  value={vm.oldPass}
                  onChange={(e) => { vm.setOldPass(e.target.value); vm.setPassMsg(""); vm.setPassError(""); }}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 8 ký tự"
                  value={vm.newPass}
                  onChange={(e) => { vm.setNewPass(e.target.value); vm.setPassMsg(""); vm.setPassError(""); }}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={vm.confirmPass}
                  onChange={(e) => { vm.setConfirmPass(e.target.value); vm.setPassMsg(""); vm.setPassError(""); }}
                  className="form-input"
                />
              </div>

              {vm.passMsg && <div className="badge badge-success p-2 text-center">{vm.passMsg}</div>}
              {vm.passError && <div className="form-error-msg">{vm.passError}</div>}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md flex-1">Hủy</button>
                <button type="submit" disabled={vm.passSubmitting} className="btn btn-primary btn-md flex-1">
                  {vm.passSubmitting ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
