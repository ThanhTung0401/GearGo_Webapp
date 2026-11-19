import { useState } from "react";
import { useApp } from "../../../App";
import Icon from "../../../components/Icon";
import { ApiError, isRealApiEnabled } from "../../../services/apiClient";
import { authApi } from "../../../services/api/authApi";
// ─── Đăng nhập (LoginView - UC1.2, UC1.2.1) ───────────────────────────────────
export function LoginView() {
  const app = useApp();
  const [accountInput, setAccountInput] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [lockedAccount, setLockedAccount] = useState<{ name: string; reason: string } | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Điền nhanh thông tin tài khoản mẫu để kiểm thử các luồng
  const fillQuickAccount = (loginAccount: string, loginPass: string) => {
    setAccountInput(loginAccount);
    setPass(loginPass);
    setErr("");
    setLockedAccount(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLockedAccount(null);

    if (failedAttempts >= 5) {
      setErr("Tài khoản tạm thời bị giới hạn do thử sai quá 5 lần. Vui lòng bấm Quên mật khẩu hoặc đợi 15 phút.");
      return;
    }

    const cleanInput = accountInput.trim().toLowerCase();
    if (!cleanInput) {
      setErr("Vui lòng nhập Email, Số điện thoại hoặc Tên đăng nhập.");
      return;
    }
    if (pass.length < 6) {
      setErr("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    if (isRealApiEnabled()) {
      try {
        const res = await authApi.dangNhap({ taiKhoan: accountInput.trim(), matKhau: pass });
        app.login({
          id: String(res.maTaiKhoan),
          name: res.hoTen ?? res.email ?? accountInput.trim(),
          email: res.email ?? "",
          phone: "",
          role: res.vaiTro === "QuanTriVien" ? "admin" : res.vaiTro === "NhanVien" ? "staff" : "customer",
        });
      } catch (error) {
        if (error instanceof ApiError && (error.code === "TAI_KHOAN_BI_KHOA" || error.code === "TAM_KHOA")) {
          setLockedAccount({ name: accountInput.trim(), reason: error.message });
        } else {
          setErr(error instanceof Error ? error.message : "Đăng nhập thất bại.");
        }
      }
      return;
    }

    // 1. Kiểm tra trong danh sách Nhân viên & Quản trị viên
    const matchedStaff = app.staffAccounts.find(
      (s) =>
        s.email.toLowerCase() === cleanInput ||
        s.username.toLowerCase() === cleanInput ||
        s.phone.replace(/\s/g, "") === cleanInput.replace(/\s/g, "")
    );

    // 2. Kiểm tra trong danh sách Khách hàng
    const matchedCustomer = !matchedStaff
      ? app.customers.find(
          (c) =>
            c.email.toLowerCase() === cleanInput ||
            c.phone.replace(/\s/g, "") === cleanInput.replace(/\s/g, "") ||
            c.id.toLowerCase() === cleanInput
        )
      : null;

    if (!matchedStaff && !matchedCustomer) {
      setErr("Tài khoản không tồn tại trên hệ thống GearGo. Vui lòng kiểm tra lại thông tin.");
      return;
    }

    // 3. Kiểm tra trạng thái Khóa tài khoản (UC1.2 Dòng phụ 2.2 & UC1.11)
    const target = matchedStaff || matchedCustomer!;
    if (target.status === "locked") {
      setLockedAccount({
        name: target.name,
        reason: target.lockedReason || "Vi phạm điều khoản dịch vụ hoặc quy chế hoàn trả thiết bị.",
      });
      return;
    }

    // 4. Kiểm tra Mật khẩu (UC1.2.1)
    const expectedPassword =
      target.password || (matchedStaff?.role === "Quản trị viên" ? "admin123" : matchedStaff ? "staff123" : "123456");

    if (pass !== expectedPassword) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      if (nextFailed >= 5) {
        setErr("Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Tài khoản tạm thời bị tạm dừng để bảo vệ an toàn.");
      } else {
        setErr(`Mật khẩu không chính xác. Bạn còn ${5 - nextFailed} lần thử lại.`);
      }
      return;
    }

    // 5. Xác thực thành công: Đăng nhập và điều hướng theo vai trò (UC1.2 bước 5)
    if (matchedStaff) {
      const assignedRole = matchedStaff.role === "Quản trị viên" ? "admin" : "staff";
      app.login({
        id: matchedStaff.id,
        username: matchedStaff.username,
        name: matchedStaff.name,
        email: matchedStaff.email,
        phone: matchedStaff.phone,
        role: assignedRole,
        permissions: matchedStaff.permissions || [],
      });
    } else if (matchedCustomer) {
      app.login({
        id: matchedCustomer.id,
        name: matchedCustomer.name,
        email: matchedCustomer.email,
        phone: matchedCustomer.phone,
        role: "customer",
        address: matchedCustomer.address,
      });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-icon-badge">
            <Icon name="tent" size={26} />
          </div>
          <h1 className="auth-title">Đăng nhập GearGo</h1>
          <p className="auth-subtitle">Trải nghiệm dịch vụ thuê thiết bị dã ngoại hàng đầu</p>
        </div>

        <div className="auth-card">
          {/* Cảnh báo tài khoản bị khóa theo đặc tả UC1.2 Dòng 2.2 */}
          {lockedAccount && (
            <div className="auth-locked-alert">
              <div className="auth-locked-alert-title">
                <span>🔒</span> Tài khoản của bạn hiện đang bị khóa!
              </div>
              <p className="auth-locked-alert-reason">
                <strong>Lý do:</strong> {lockedAccount.reason}
              </p>
              <div className="auth-locked-alert-support">
                Vui lòng liên hệ Hotline <strong>1900 6868</strong> hoặc gửi email tới <strong>support@geargo.vn</strong> để được nhân viên hỗ trợ đối soát và mở khóa.
              </div>
            </div>
          )}

          <form onSubmit={submit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email, SĐT hoặc Tên đăng nhập *</label>
              <input
                type="text"
                autoFocus
                value={accountInput}
                onChange={(e) => {
                  setAccountInput(e.target.value);
                  setErr("");
                  setLockedAccount(null);
                }}
                placeholder="VD: admin@geargo.vn hoặc 0901 234 567"
                className={`form-input ${err ? "form-input-error" : ""}`}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu *</label>
              <div className="auth-pwd-wrapper">
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={(e) => {
                    setPass(e.target.value);
                    setErr("");
                    setLockedAccount(null);
                  }}
                  placeholder="Tối thiểu 6 ký tự"
                  className={`form-input ${err ? "form-input-error" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="auth-pwd-toggle"
                >
                  {showPass ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            {err && <div className="form-error-msg">{err}</div>}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => app.setPage("forgot-password")}
                className="auth-link text-xs font-semibold"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full mt-2">
              Đăng nhập hệ thống →
            </button>

            <p className="text-center text-sm text-gray-500 mt-2">
              Chưa có tài khoản?{" "}
              <button
                type="button"
                onClick={() => app.setPage("register")}
                className="auth-link"
              >
                Đăng ký ngay
              </button>
            </p>
          </form>

          {/* Phím tắt đăng nhập nhanh demo theo chuẩn Impeccable */}
          <div className="auth-quick-login">
            <div className="auth-quick-login-title">
              💡 Chọn nhanh tài khoản kiểm thử nghiệp vụ:
            </div>
            <div className="auth-quick-login-grid">
              <button
                type="button"
                onClick={() => fillQuickAccount("admin@geargo.vn", "admin123")}
                className="auth-quick-btn auth-quick-btn--amber"
              >
                <div className="auth-quick-btn-role">👑 Quản trị viên</div>
                <div className="auth-quick-btn-cred">admin@geargo.vn / admin123</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("mai.lt@geargo.vn", "staff123")}
                className="auth-quick-btn auth-quick-btn--indigo"
              >
                <div className="auth-quick-btn-role">📦 Nhân viên kho</div>
                <div className="auth-quick-btn-cred">mai.lt@geargo.vn / staff123</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("an.nguyen@gmail.com", "123456")}
                className="auth-quick-btn auth-quick-btn--green"
              >
                <div className="auth-quick-btn-role">🏕️ Khách hàng</div>
                <div className="auth-quick-btn-cred">an.nguyen@gmail.com / 123456</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("nam.hd@yahoo.com", "123456")}
                className="auth-quick-btn auth-quick-btn--red"
              >
                <div className="auth-quick-btn-role">🔒 TK Bị khóa (UC1.2)</div>
                <div className="auth-quick-btn-cred">nam.hd@yahoo.com / 123456</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
