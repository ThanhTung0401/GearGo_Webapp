import { useState } from "react";
import { useApp } from "../App";
import Icon from "../components/Icon";

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

  const submit = (e: React.FormEvent) => {
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
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #F87171",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
                color: "#991B1B",
                fontSize: "0.82rem",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span>🔒</span> Tài khoản của bạn hiện đang bị khóa!
              </div>
              <p style={{ margin: "0 0 6px 0", lineHeight: 1.4 }}>
                <strong>Lý do:</strong> {lockedAccount.reason}
              </p>
              <div style={{ fontSize: "0.76rem", color: "#B91C1C", borderTop: "1px dashed #FECACA", paddingTop: 6 }}>
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
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--color-bone)" }}>
            <div style={{ fontSize: "0.72rem", color: "#6B7280", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              💡 Chọn nhanh tài khoản kiểm thử nghiệp vụ:
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <button
                type="button"
                onClick={() => fillQuickAccount("admin@geargo.vn", "admin123")}
                style={{ textAlign: "left", padding: "6px 8px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, fontSize: "0.73rem", cursor: "pointer", color: "#92400E" }}
              >
                <div style={{ fontWeight: 700 }}>👑 Quản trị viên</div>
                <div style={{ fontSize: "0.68rem", opacity: 0.85 }}>admin@geargo.vn / admin123</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("mai.lt@geargo.vn", "staff123")}
                style={{ textAlign: "left", padding: "6px 8px", background: "#E0E7FF", border: "1px solid #C7D2FE", borderRadius: 8, fontSize: "0.73rem", cursor: "pointer", color: "#3730A3" }}
              >
                <div style={{ fontWeight: 700 }}>📦 Nhân viên kho</div>
                <div style={{ fontSize: "0.68rem", opacity: 0.85 }}>mai.lt@geargo.vn / staff123</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("an.nguyen@gmail.com", "123456")}
                style={{ textAlign: "left", padding: "6px 8px", background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 8, fontSize: "0.73rem", cursor: "pointer", color: "#166534" }}
              >
                <div style={{ fontWeight: 700 }}>🏕️ Khách hàng</div>
                <div style={{ fontSize: "0.68rem", opacity: 0.85 }}>an.nguyen@gmail.com / 123456</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("nam.hd@yahoo.com", "123456")}
                style={{ textAlign: "left", padding: "6px 8px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 8, fontSize: "0.73rem", cursor: "pointer", color: "#991B1B" }}
              >
                <div style={{ fontWeight: 700 }}>🔒 TK Bị khóa (UC1.2)</div>
                <div style={{ fontSize: "0.68rem", opacity: 0.85 }}>nam.hd@yahoo.com / 123456</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Đăng ký tài khoản (RegisterView) ──────────────────────────────────────────
export function RegisterView() {
  const app = useApp();
  const [form, setForm] = useState({ name: "", email: "", phone: "", pass: "", confirm: "", agree: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState<{ id: string; name: string; email: string; phone: string } | null>(null);

  const set = (k: string, v: string | boolean) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
  };

  // Kiểm tra ràng buộc hợp lệ form đăng ký (UC1.1)
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vui lòng nhập họ tên.";
    if (!form.email.includes("@")) e.email = "Email không hợp lệ.";
    if (!/^\d{9,10}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Số điện thoại không hợp lệ.";
    if (form.pass.length < 6) e.pass = "Mật khẩu tối thiểu 6 ký tự.";
    if (form.pass !== form.confirm) e.confirm = "Mật khẩu xác nhận không khớp.";
    if (!form.agree) e.agree = "Cần đồng ý điều khoản để đăng ký.";

    // Kiểm tra trùng lặp tài khoản (UC1.1 Sequence Diagram)
    const duplicateEmail = app.customers.some((c) => c.email.toLowerCase() === form.email.toLowerCase());
    const duplicatePhone = app.customers.some((c) => c.phone.replace(/\s/g, "") === form.phone.replace(/\s/g, ""));
    if (duplicateEmail) e.email = "Email này đã được đăng ký tài khoản trong hệ thống.";
    if (duplicatePhone) e.phone = "Số điện thoại này đã được sử dụng bởi tài khoản khác.";

    return e;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Tạo khách hàng mới vào hệ thống (lưu kèm mật khẩu phục vụ UC1.2)
    const nextId = `KH00${app.customers.length + 1}`;
    app.saveCustomer({
      id: nextId,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.pass,
      address: "Chưa cập nhật",
      status: "active",
      createdAt: new Date().toLocaleDateString("vi-VN"),
      totalOrders: 0,
      totalSpent: 0,
      currentDeposit: 0,
    });

    setCreatedCustomer({ id: nextId, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
    setSuccess(true);
  };

  if (success && createdCustomer) {
    return (
      <div className="auth-page">
        <div className="auth-wrapper text-center">
          <div className="auth-success-card">
            <div className="auth-success-icon">✓</div>
            <h2 className="auth-title">Đăng ký thành công! (UC1.1)</h2>
            <p className="auth-subtitle mb-6">
              Chào mừng <strong>{createdCustomer.name}</strong> đến với GearGo! Mã khách hàng của bạn là <strong>{createdCustomer.id}</strong>.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  app.login({
                    id: createdCustomer.id,
                    name: createdCustomer.name,
                    email: createdCustomer.email,
                    phone: createdCustomer.phone,
                    role: "customer",
                  });
                }}
                className="btn btn-primary btn-lg btn-full"
              >
                Đăng nhập ngay với tài khoản mới →
              </button>
              <button
                type="button"
                onClick={() => app.setPage("login")}
                className="btn btn-secondary btn-md btn-full"
              >
                Quay về trang đăng nhập
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-wrapper auth-wrapper-wide">
        <div className="auth-header">
          <div className="auth-icon-badge">
            <Icon name="tent" size={26} />
          </div>
          <h1 className="auth-title">Tạo tài khoản GearGo</h1>
          <p className="auth-subtitle">Nhận ngay ưu đãi cho lần thuê đầu tiên</p>
        </div>

        <div className="auth-card">
          <form onSubmit={submit} className="auth-form">
            {[
              { key: "name", label: "Họ và tên", placeholder: "Nguyễn Văn An", type: "text" },
              { key: "email", label: "Địa chỉ Email", placeholder: "example@email.com", type: "email" },
              { key: "phone", label: "Số điện thoại", placeholder: "0901 234 567", type: "tel" },
            ].map(({ key, label, placeholder, type }) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input
                  type={type}
                  value={(form as Record<string, string | boolean>)[key] as string}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className={`form-input ${errors[key] ? "form-input-error" : ""}`}
                />
                {errors[key] && <div className="form-error-msg">{errors[key]}</div>}
              </div>
            ))}

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <input
                type="password"
                value={form.pass}
                onChange={(e) => set("pass", e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className={`form-input ${errors.pass ? "form-input-error" : ""}`}
              />
              {errors.pass && <div className="form-error-msg">{errors.pass}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => set("confirm", e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className={`form-input ${errors.confirm ? "form-input-error" : ""}`}
              />
              {errors.confirm && <div className="form-error-msg">{errors.confirm}</div>}
            </div>

            <label className="auth-terms-label mt-1">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => set("agree", e.target.checked)}
              />
              <span>
                Tôi đồng ý với <span className="text-forest font-semibold">Điều khoản dịch vụ</span> và{" "}
                <span className="text-forest font-semibold">Chính sách bảo mật</span> của GearGo.
              </span>
            </label>
            {errors.agree && <div className="form-error-msg">{errors.agree}</div>}

            <button type="submit" className="btn btn-primary btn-lg btn-full mt-2">
              Tạo tài khoản
            </button>

            <p className="text-center text-sm text-gray-500 mt-2">
              Đã có tài khoản?{" "}
              <button
                type="button"
                onClick={() => app.setPage("login")}
                className="auth-link"
              >
                Đăng nhập
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Quên mật khẩu & Xác minh OTP (ForgotPasswordView - UC1.4) ─────────────────
export function ForgotPasswordView() {
  const app = useApp();
  const [step, setStep] = useState<"input" | "otp" | "reset" | "success">("input");
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  // Bước 2: Nhập OTP xác thực (UC1.4)
  if (step === "otp") {
    return (
      <div className="auth-page">
        <div className="auth-wrapper text-center">
          <div className="auth-card text-center">
            <div className="auth-icon-badge" style={{ background: "var(--color-moss)" }}>
              <Icon name="shield" size={26} />
            </div>
            <h2 className="auth-title">Nhập mã xác minh OTP</h2>
            <p className="auth-subtitle mb-4">
              Mã OTP gồm 6 chữ số đã được gửi đến <strong>{contact}</strong>.
            </p>
            <div className="policy-banner text-xs mb-4">
              💡 Mã thử nghiệm demo: <strong>123456</strong>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (otp.trim() !== "123456" && otp.trim().length !== 6) {
                  setErr("Mã OTP không chính xác hoặc đã hết hạn (Thử mã: 123456).");
                  return;
                }
                setErr("");
                setStep("reset");
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
                  style={{ textAlign: "center", fontSize: "1.3rem", letterSpacing: "6px", fontFamily: "var(--font-mono)", fontWeight: 700 }}
                  className={`form-input ${err ? "form-input-error" : ""}`}
                />
                {err && <div className="form-error-msg">{err}</div>}
              </div>

              <button type="submit" className="btn btn-primary btn-lg btn-full mb-3">
                Xác minh mã OTP →
              </button>

              <div className="flex justify-between items-center text-xs text-gray-500">
                <button
                  type="button"
                  onClick={() => alert("Đã gửi lại mã OTP mới: 123456")}
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
              onSubmit={(e) => {
                e.preventDefault();
                if (newPass.length < 6) {
                  setErr("Mật khẩu tối thiểu 6 ký tự.");
                  return;
                }
                if (newPass !== confirm) {
                  setErr("Mật khẩu xác nhận không khớp.");
                  return;
                }

                // Cập nhật mật khẩu mới vào cơ sở dữ liệu tài khoản tương ứng (UC1.4)
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

              <button type="submit" className="btn btn-primary btn-lg btn-full mt-2">
                Xác nhận đổi mật khẩu
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
            <div className="auth-icon-badge" style={{ background: "var(--color-forest)" }}>
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
            onSubmit={(e) => {
              e.preventDefault();
              const cleanContact = contact.trim().toLowerCase();
              if (!cleanContact) {
                setErr("Vui lòng nhập email hoặc số điện thoại.");
                return;
              }

              // Kiểm tra sự tồn tại của tài khoản (UC1.4 bước 3)
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
                return;
              }

              setErr("");
              setStep("otp");
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

            <button type="submit" className="btn btn-primary btn-lg btn-full mt-2">
              Gửi mã OTP xác minh →
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
