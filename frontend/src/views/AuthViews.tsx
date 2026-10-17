import { useState } from "react";
import { useApp } from "../App";
import Icon from "../components/Icon";

// ─── Đăng nhập (LoginView) ────────────────────────────────────────────────────
export function LoginView() {
  const app = useApp();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");

  // Kiểm tra tính hợp lệ của thông tin đăng nhập
  const validate = () => {
    if (!email.includes("@") && !/^\d{9,10}$/.test(email.replace(/\s/g, ""))) {
      return "Email hoặc số điện thoại không hợp lệ.";
    }
    if (pass.length < 6) return "Mật khẩu tối thiểu 6 ký tự.";
    return "";
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      setErr(error);
      return;
    }
    app.setPage("landing");
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
          <form onSubmit={submit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email hoặc số điện thoại</label>
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErr("");
                }}
                placeholder="example@email.com hoặc 0901234567"
                className={`form-input ${err ? "form-input-error" : ""}`}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <div className="auth-pwd-wrapper">
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={(e) => {
                    setPass(e.target.value);
                    setErr("");
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
              Đăng nhập
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
        </div>

        <p className="auth-demo-notice">
          <Icon name="info" size={14} /> Bản mô phỏng — có thể dùng tài khoản bất kỳ để thử nghiệm
        </p>
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

    // Tạo khách hàng mới vào hệ thống
    const nextId = `KH00${app.customers.length + 1}`;
    app.saveCustomer({
      id: nextId,
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: "Chưa cập nhật",
      status: "active",
      createdAt: new Date().toLocaleDateString("vi-VN"),
      totalOrders: 0,
      totalSpent: 0,
      currentDeposit: 0,
    });

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-wrapper text-center">
          <div className="auth-success-card">
            <div className="auth-success-icon">✓</div>
            <h2 className="auth-title">Đăng ký thành công!</h2>
            <p className="auth-subtitle mb-6">
              Chào mừng <strong>{form.name}</strong> đến với đại gia đình GearGo. Bắt đầu lên kế hoạch cho chuyến đi dã ngoại ngay hôm nay!
            </p>
            <button
              onClick={() => app.setPage("products")}
              className="btn btn-primary btn-lg btn-full"
            >
              Khám phá trang thiết bị →
            </button>
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
              if (!contact.trim()) {
                setErr("Vui lòng nhập email hoặc số điện thoại.");
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
