import React, { useState } from "react";
import type { Role, ActionResult } from "../types";

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
  onUpdateProfile: (info: { name: string; phone: string; email: string }) => ActionResult;
  onChangePassword: (oldPass: string, newPass: string) => ActionResult;
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

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passError, setPassError] = useState("");

  const handleSaveInfo = (e: React.FormEvent) => {
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
    const res = onUpdateProfile({ name: name.trim(), phone: phone.trim(), email: email.trim() });
    if (res.ok) {
      setInfoMsg("✓ Cập nhật thông tin cá nhân thành công!");
    } else {
      setInfoError(res.message);
    }
  };

  const handleChangePass = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg("");
    setPassError("");
    if (!oldPass) {
      setPassError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (newPass.length < 6) {
      setPassError("Mật khẩu mới tối thiểu 6 ký tự.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassError("Xác nhận mật khẩu mới không khớp.");
      return;
    }
    const res = onChangePassword(oldPass, newPass);
    if (res.ok) {
      setPassMsg("✓ Đổi mật khẩu thành công!");
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
    } else {
      setPassError(res.message);
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

              {infoMsg && <div className="badge badge-success" style={{ padding: 8, textAlign: "center" }}>{infoMsg}</div>}
              {infoError && <div className="form-error-msg">{infoError}</div>}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Đóng</button>
                <button type="submit" className="btn btn-primary btn-md" style={{ flex: 1 }}>Lưu thông tin</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePass} className="flex flex-col gap-3.5">
              <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: 0 }}>
                Nhập mật khẩu hiện tại và tạo mật khẩu mới an toàn tối thiểu 6 ký tự.
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
                  placeholder="Tối thiểu 6 ký tự"
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
                <button type="submit" className="btn btn-primary btn-md" style={{ flex: 1 }}>Xác nhận đổi mật khẩu</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
