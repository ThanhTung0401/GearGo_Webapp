import { useState } from "react";
import { useApp } from "../../App";
import Icon from "../../components/Icon";
import { isRealApiEnabled } from "../../services/apiClient";
import { authApi } from "../../services/api/authApi";
// ─── Quên mật khẩu & Xác minh OTP (ForgotPasswordView - UC1.4) ─────────────────
export function ForgotPasswordView() {
  const app = useApp();
  const [step, setStep] = useState<"input" | "otp" | "reset" | "success">("input");
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");
  const [loading, setLoading] = useState(false);

  // Gửi lại mã OTP qua email
  const handleResendOtp = async () => {
    if (!contact.trim()) return;
    try {
      if (isRealApiEnabled()) {
        await authApi.quenMatKhau(contact.trim().toLowerCase());
        alert(`Đã gửi lại mã xác minh OTP mới đến ${contact}. Vui lòng kiểm tra hộp thư!`);
      } else {
        alert("Đã gửi lại mã OTP demo: 123456");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Không thể gửi lại mã OTP.");
    }
  };

  // Bước 2: Nhập OTP xác thực (UC1.4 / UC15)
  if (step === "otp") {
    return (
      <div className="auth-page">
        <div className="auth-wrapper text-center">
          <div className="auth-card text-center">
            <div className="auth-icon-badge auth-icon-badge--moss">
              <Icon name="shield" size={26} />
            </div>
            <h2 className="auth-title">Nhập mã xác minh OTP</h2>
            <p className="auth-subtitle mb-4">
              Mã OTP gồm 6 chữ số đã được gửi đến <strong>{contact}</strong>.
            </p>
            <div className="policy-banner text-xs mb-4">
              💡 Mã thử nghiệm demo: <strong>123456</strong> (hoặc mã 6 số trong email gửi đến)
            </div>

            <form
              onSubmit={async (e) => {
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
              }}
              className="auth-form"
            >
              <div className="form-group mb-4">
                <label className="form-label">Mã OTP (6 số)</label>
                <input
                  autoFocus
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setErr("");
                  }}
                  placeholder="123456"
                  className={`form-input auth-otp-input ${err ? "form-input-error" : ""}`}
                />
                {err && <div className="form-error-msg">{err}</div>}
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full mb-3">
                {loading ? "Đang xác minh..." : "Xác minh mã OTP →"}
              </button>

              <div className="flex justify-between items-center text-xs text-gray-500">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="auth-link text-xs"
                >
                  Gửi lại mã OTP
                </button>
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="auth-link text-xs"
                >
                  Đổi email / SĐT
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Bước 3: Đặt mật khẩu mới hai lần (UC1.4)
  if (step === "reset") {
    return (
      <div className="auth-page">
        <div className="auth-wrapper">
          <div className="auth-header">
            <div className="auth-icon-badge">
              <Icon name="shield" size={26} />
            </div>
            <h1 className="auth-title">Đặt mật khẩu mới</h1>
            <p className="auth-subtitle">Xác minh thành công cho {contact}. Nhập mật khẩu mới an toàn.</p>
          </div>

          <div className="auth-card">
            <form
              onSubmit={async (e) => {
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

                // Cập nhật mật khẩu mới vào cơ sở dữ liệu tài khoản tương ứng (UC1.4 Local Mock)
                const cleanContact = contact.trim().toLowerCase();
                const matchedCust = app.customers.find(
                  (c) =>
                    c.email.toLowerCase() === cleanContact ||
                    c.phone.replace(/\s/g, "") === cleanContact.replace(/\s/g, "")
                );
                const matchedStaff = app.staffAccounts.find(
                  (s) =>
                    s.email.toLowerCase() === cleanContact ||
                    s.phone.replace(/\s/g, "") === cleanContact.replace(/\s/g, "") ||
                    s.username.toLowerCase() === cleanContact
                );

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
              }}
              className="auth-form"
            >
              <div className="form-group">
                <label className="form-label">Mật khẩu mới *</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => {
                    setNewPass(e.target.value);
                    setErr("");
                  }}
                  placeholder="Tối thiểu 6 ký tự"
                  className={`form-input ${err ? "form-input-error" : ""}`}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setErr("");
                  }}
                  placeholder="Nhập lại mật khẩu mới"
                  className={`form-input ${err ? "form-input-error" : ""}`}
                />
              </div>

              {err && <div className="form-error-msg">{err}</div>}

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full mt-2">
                {loading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Bước 4: Thành công
  if (step === "success") {
    return (
      <div className="auth-page">
        <div className="auth-wrapper text-center">
          <div className="auth-card text-center">
            <div className="auth-icon-badge">
              <Icon name="check" size={26} />
            </div>
            <h2 className="auth-title">Đổi mật khẩu thành công!</h2>
            <p className="auth-subtitle mb-6">
              Mật khẩu tài khoản <strong>{contact}</strong> đã được cập nhật thành công. Vui lòng đăng nhập lại.
            </p>
            <button
              onClick={() => app.setPage("login")}
              className="btn btn-primary btn-lg btn-full"
            >
              Đăng nhập ngay →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bước 1: Nhập email hoặc SĐT
  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-icon-badge">
            <Icon name="arrow-up" size={26} />
          </div>
          <h1 className="auth-title">Khôi phục mật khẩu</h1>
          <p className="auth-subtitle">Nhập email hoặc số điện thoại để nhận mã xác minh OTP</p>
        </div>

        <div className="auth-card">
          <form
            onSubmit={async (e) => {
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

              // Kiểm tra sự tồn tại của tài khoản trong local mock (UC1.4 bước 3)
              const matchedCust = app.customers.find(
                (c) =>
                  c.email.toLowerCase() === cleanContact ||
                  c.phone.replace(/\s/g, "") === cleanContact.replace(/\s/g, "")
              );
              const matchedStaff = app.staffAccounts.find(
                (s) =>
                  s.email.toLowerCase() === cleanContact ||
                  s.phone.replace(/\s/g, "") === cleanContact.replace(/\s/g, "") ||
                  s.username.toLowerCase() === cleanContact
              );

              if (!matchedCust && !matchedStaff) {
                setErr("Không tìm thấy tài khoản nào khớp với Email hoặc Số điện thoại này trên hệ thống GearGo.");
                setLoading(false);
                return;
              }

              setStep("otp");
              setLoading(false);
            }}
            className="auth-form"
          >
            <div className="form-group">
              <label className="form-label">Email hoặc số điện thoại *</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value);
                  setErr("");
                }}
                placeholder="VD: an.nguyen@gmail.com hoặc 0901234567"
                className={`form-input ${err ? "form-input-error" : ""}`}
              />
              {err && <div className="form-error-msg">{err}</div>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full mt-2">
              {loading ? "Đang gửi mã OTP..." : "Gửi mã OTP xác minh →"}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => app.setPage("login")}
                className="auth-link text-sm"
              >
                ← Quay lại đăng nhập
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
