import React, { useState } from "react";
import type { Role, ActionResult } from "../types";
import { isRealApiEnabled } from "../services/apiClient";
import { profileApi } from "../services/api/profileApi";

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

export default function UserProfileModal({
  currentUser,
  role,
  onClose,
  onUpdateProfile,
  onChangePassword,
}: UserProfileModalProps) {
  const [tab, setTab] = useState<"info" | "password">("info");
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);
  const [infoMsg, setInfoMsg] = useState("");
  const [infoError, setInfoError] = useState("");
  const [infoSubmitting, setInfoSubmitting] = useState(false);

  // UC1.6 Dòng phụ 4.2: Xác minh OTP khi thay đổi Email hoặc Số điện thoại
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
    if (!phone.trim()) {
      setInfoError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setInfoError("Địa chỉ email không hợp lệ.");
      return;
    }

    setOtpSending(true);
    try {
      if (isRealApiEnabled()) {
        const res = await profileApi.guiOtpDoiLienHe({
          emailMoi: email.trim(),
          soDienThoaiMoi: phone.trim(),
        });
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
    if (!name.trim()) {
      setInfoError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!phone.trim()) {
      setInfoError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setInfoError("Địa chỉ email không hợp lệ.");
      return;
    }
    if (contactChanged) {
      if (!otp.trim()) {
        setInfoError("Thay đổi Email hoặc Số điện thoại cần nhập mã xác minh OTP.");
        return;
      }
      if (!isRealApiEnabled() && otp.trim() !== "123456") {
        setInfoError("Mã OTP không chính xác (Mã demo: 123456).");
        return;
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
    if (!oldPass) {
      setPassError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (newPass.length < 8) {
      setPassError("Mật khẩu mới tối thiểu 8 ký tự.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

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

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: role === "admin" ? "#D97706" : role === "staff" ? "#2563EB" : "var(--color-amber)",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: "1rem"
            }}>
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: "1.1rem" }}>{currentUser.name}</h3>
              <p style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                {role === "admin" ? "Quản trị viên hệ thống" : role === "staff" ? "Nhân viên tác nghiệp" : "Khách hàng GearGo"} {currentUser.id ? `• ${currentUser.id}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm text-lg" aria-label="Đóng modal">×</button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 px-5 pt-2" style={{ gap: 8, background: "#F9FAFB" }}>
          <button
            type="button"
            onClick={() => setTab("info")}
            style={{
              padding: "8px 14px",
              fontSize: "0.84rem",
              fontWeight: 700,
              borderBottom: tab === "info" ? "2px solid var(--color-forest)" : "2px solid transparent",
              color: tab === "info" ? "var(--color-forest)" : "#6B7280",
              background: "none",
              cursor: "pointer"
            }}
          >
            Hồ sơ cá nhân (UC1.5, UC1.6)
          </button>
          <button
            type="button"
            onClick={() => setTab("password")}
            style={{
              padding: "8px 14px",
              fontSize: "0.84rem",
              fontWeight: 700,
              borderBottom: tab === "password" ? "2px solid var(--color-forest)" : "2px solid transparent",
              color: tab === "password" ? "var(--color-forest)" : "#6B7280",
              background: "none",
              cursor: "pointer"
            }}
          >
            Đổi mật khẩu (UC1.12)
          </button>
        </div>

        <div className="modal-body" style={{ padding: 20 }}>
          {tab === "info" ? (
            <form onSubmit={handleSaveInfo} className="flex flex-col gap-3.5">
              {/* Thông tin định danh cố định */}
              <div style={{ background: "#F3F4F6", borderRadius: 8, padding: "10px 14px" }}>
                <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr", fontSize: "0.8rem" }}>
                  <div>
                    <span style={{ color: "#6B7280" }}>Mã tài khoản: </span>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>{currentUser.id || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6B7280" }}>Tên đăng nhập: </span>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>@{currentUser.username || currentUser.email.split("@")[0]}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6B7280" }}>Vai trò: </span>
                    <span className="badge" style={{ background: role === "admin" ? "#FEF3C7" : role === "staff" ? "#E0E7FF" : "#DCFCE7", color: role === "admin" ? "#B45309" : role === "staff" ? "#3730A3" : "#15803D", fontWeight: 700 }}>
                      {role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Khách hàng"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#6B7280" }}>Trạng thái: </span>
                    <span className="badge badge-success">Hoạt động</span>
                  </div>
                </div>

                {/* Nhóm quyền nghiệp vụ nếu là nhân viên */}
                {currentUser.permissions && currentUser.permissions.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #D1D5DB" }}>
                    <div style={{ fontSize: "0.75rem", color: "#4B5563", fontWeight: 600, marginBottom: 4 }}>
                      Nhóm quyền nghiệp vụ được gán (UC1.10):
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {currentUser.permissions.map((p) => (
                        <span key={p} style={{ background: "#EEF2FF", color: "#4338CA", fontSize: "0.7rem", fontWeight: 600, padding: "2px 7px", borderRadius: 6 }}>
                          ✓ {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Thông tin có thể cập nhật (UC1.6) */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Họ và tên</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); setInfoMsg(""); setInfoError(""); }}
                  className="form-input"
                />
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Số điện thoại</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setInfoMsg(""); setInfoError(""); }}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setInfoMsg(""); setInfoError(""); }}
                    className="form-input"
                  />
                </div>
              </div>

              {contactChanged && (
                <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#92400E", marginBottom: 6 }}>
                    Xác minh OTP khi đổi Email / Số điện thoại (UC1.6)
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Nhập mã OTP 6 số"
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setInfoError(""); }}
                      className="form-input"
                      style={{ flex: 1, fontFamily: "var(--font-mono)", letterSpacing: "3px" }}
                    />
                    <button
                      type="button"
                      onClick={() => { void handleSendContactOtp(); }}
                      disabled={otpSending}
                      className="btn btn-secondary btn-sm"
                    >
                      {otpSending ? "Đang gửi..." : otpSent ? "Gửi lại OTP" : "Gửi mã OTP"}
                    </button>
                  </div>
                </div>
              )}

              {infoMsg && <div className="badge badge-success" style={{ padding: 8, textAlign: "center" }}>{infoMsg}</div>}
              {infoError && <div className="form-error-msg">{infoError}</div>}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Đóng</button>
                <button type="submit" disabled={infoSubmitting} className="btn btn-primary btn-md" style={{ flex: 1 }}>
                  {infoSubmitting ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePass} className="flex flex-col gap-3.5">
              <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: 0 }}>
                Nhập mật khẩu hiện tại và tạo mật khẩu mới an toàn tối thiểu 8 ký tự.
              </p>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu đang dùng"
                  value={oldPass}
                  onChange={(e) => { setOldPass(e.target.value); setPassMsg(""); setPassError(""); }}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 8 ký tự"
                  value={newPass}
                  onChange={(e) => { setNewPass(e.target.value); setPassMsg(""); setPassError(""); }}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPass}
                  onChange={(e) => { setConfirmPass(e.target.value); setPassMsg(""); setPassError(""); }}
                  className="form-input"
                />
              </div>

              {passMsg && <div className="badge badge-success" style={{ padding: 8, textAlign: "center" }}>{passMsg}</div>}
              {passError && <div className="form-error-msg">{passError}</div>}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button type="submit" disabled={passSubmitting} className="btn btn-primary btn-md" style={{ flex: 1 }}>
                  {passSubmitting ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
