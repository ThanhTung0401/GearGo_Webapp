import { useState } from "react";
import { useApp } from "../../../App";
import Icon from "../../../components/Icon";
import { ApiError, isRealApiEnabled, setAuthToken } from "../../../services/apiClient";
import { authApi } from "../../../services/api/authApi";

export interface LoginViewProps {
  /** Phân tách 2 cổng đăng nhập độc lập: /login (khách hàng) và /staff/login (nhân viên & quản trị) */
  portal?: "customer" | "staff";
}

// ─── Đăng nhập (LoginView - UC1.2, UC1.2.1) ───────────────────────────────────
export function LoginView({ portal = "customer" }: LoginViewProps) {
  const app = useApp();
  const isStaffPortal = portal === "staff";
  const [accountInput, setAccountInput] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [wrongPortalHint, setWrongPortalHint] = useState<"customer" | "staff" | null>(null);
  const [lockedAccount, setLockedAccount] = useState<{ name: string; reason: string } | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Điền nhanh thông tin tài khoản mẫu để kiểm thử các luồng
  const fillQuickAccount = (loginAccount: string, loginPass: string) => {
    setAccountInput(loginAccount);
    setPass(loginPass);
    setErr("");
    setWrongPortalHint(null);
    setLockedAccount(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setWrongPortalHint(null);
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
        const mappedRole =
          res.vaiTro === "QuanTriVien" ? "admin" : res.vaiTro === "NhanVien" ? "staff" : "customer";

        // Tách chặt 2 cổng đăng nhập: chặn đăng nhập chéo vai trò giữa /login và /staff/login
        if (isStaffPortal && mappedRole === "customer") {
          setAuthToken(null);
          setWrongPortalHint("customer");
          setErr("Tài khoản khách hàng vui lòng đăng nhập tại cổng Khách hàng (/login).");
          return;
        }
        if (!isStaffPortal && mappedRole !== "customer") {
          setAuthToken(null);
          setWrongPortalHint("staff");
          setErr("Tài khoản nhân viên / quản trị viên vui lòng đăng nhập tại cổng Nhân viên (/staff/login).");
          return;
        }

        app.login({
          id: String(res.maTaiKhoan),
          name: res.hoTen ?? res.email ?? accountInput.trim(),
          email: res.email ?? "",
          phone: "",
          role: mappedRole,
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

    if (isStaffPortal && !matchedStaff) {
      setWrongPortalHint("customer");
      setErr("Tài khoản khách hàng vui lòng đăng nhập tại cổng Khách hàng (/login).");
      return;
    }
    if (!isStaffPortal && matchedStaff) {
      setWrongPortalHint("staff");
      setErr("Tài khoản nhân viên / quản trị viên vui lòng đăng nhập tại cổng Nhân viên (/staff/login).");
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
    const expectedPassword = target.password || "GearGo@2026";

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
            <Icon name={isStaffPortal ? "shield" : "tent"} size={26} />
          </div>
          <h1 className="auth-title">
            {isStaffPortal ? "Đăng nhập Nhân viên (Staff)" : "Đăng nhập GearGo"}
          </h1>
          <p className="auth-subtitle">
            {isStaffPortal
              ? "Cổng vận hành & quản trị nội bộ cửa hàng GearGo"
              : "Trải nghiệm dịch vụ thuê thiết bị dã ngoại hàng đầu"}
          </p>
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
              <label className="form-label">Email hoặc Số điện thoại *</label>
              <input
                type="text"
                autoFocus
                value={accountInput}
                onChange={(e) => {
                  setAccountInput(e.target.value);
                  setErr("");
                  setWrongPortalHint(null);
                  setLockedAccount(null);
                }}
                placeholder={isStaffPortal ? "VD: staff@geargo.vn hoặc 0901000002" : "VD: customer@geargo.vn hoặc 0901000003"}
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
                    setWrongPortalHint(null);
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

            {err && (
              <div className="form-error-msg">
                <div>{err}</div>
                {wrongPortalHint === "staff" && (
                  <button
                    type="button"
                    onClick={() => app.setPage("staff-login")}
                    className="auth-link text-xs font-bold mt-1 underline"
                  >
                    Chuyển tới cổng Nhân viên (/staff/login) →
                  </button>
                )}
                {wrongPortalHint === "customer" && (
                  <button
                    type="button"
                    onClick={() => app.setPage("login")}
                    className="auth-link text-xs font-bold mt-1 underline"
                  >
                    Chuyển tới cổng Khách hàng (/login) →
                  </button>
                )}
              </div>
            )}

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
              {isStaffPortal ? "Đăng nhập cổng Staff →" : "Đăng nhập hệ thống →"}
            </button>

            {!isStaffPortal ? (
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
            ) : (
              <p className="text-center text-sm text-gray-500 mt-2">
                Bạn là khách thuê đồ?{" "}
                <button
                  type="button"
                  onClick={() => app.setPage("login")}
                  className="auth-link"
                >
                  Về trang đăng nhập khách
                </button>
              </p>
            )}
          </form>

          {/* Phím tắt chọn nhanh tài khoản kiểm thử tách riêng theo từng cổng */}
          <div className="auth-quick-login">
            <div className="auth-quick-login-title">
              {isStaffPortal
                ? "💡 Chọn nhanh tài khoản nội bộ (Staff Portal):"
                : "💡 Chọn nhanh tài khoản khách hàng:"}
            </div>
            {isStaffPortal ? (
              <div className="auth-quick-login-grid">
                <button
                  type="button"
                  onClick={() => fillQuickAccount("admin@geargo.vn", "GearGo@2026")}
                  className="auth-quick-btn auth-quick-btn--amber"
                >
                  <div className="auth-quick-btn-role">👑 Quản trị viên</div>
                  <div className="auth-quick-btn-cred">admin@geargo.vn / GearGo@2026</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickAccount("staff@geargo.vn", "GearGo@2026")}
                  className="auth-quick-btn auth-quick-btn--indigo"
                >
                  <div className="auth-quick-btn-role">🧑‍💼 Nhân viên 1</div>
                  <div className="auth-quick-btn-cred">staff@geargo.vn / GearGo@2026</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickAccount("tuan.staff@geargo.vn", "GearGo@2026")}
                  className="auth-quick-btn auth-quick-btn--green"
                >
                  <div className="auth-quick-btn-role">🧑‍💼 Nhân viên 2</div>
                  <div className="auth-quick-btn-cred">tuan.staff@geargo.vn / GearGo@2026</div>
                </button>
              </div>
            ) : (
              <div className="auth-quick-login-grid">
                <button
                  type="button"
                  onClick={() => fillQuickAccount("customer@geargo.vn", "GearGo@2026")}
                  className="auth-quick-btn auth-quick-btn--green"
                >
                  <div className="auth-quick-btn-role">🏕️ Khách hàng 1</div>
                  <div className="auth-quick-btn-cred">customer@geargo.vn / GearGo@2026</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickAccount("quang.kh@geargo.vn", "GearGo@2026")}
                  className="auth-quick-btn auth-quick-btn--indigo"
                >
                  <div className="auth-quick-btn-role">🏕️ Khách hàng 2</div>
                  <div className="auth-quick-btn-cred">quang.kh@geargo.vn / GearGo@2026</div>
                </button>
              </div>
            )}
          </div>

          {!isStaffPortal && (
            <div className="text-center mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => app.setPage("staff-login")}
                className="text-xs font-semibold text-gray-500 hover:text-[var(--color-forest)] cursor-pointer"
              >
                Cổng nội bộ nhân viên (/staff/login) →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
