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

  // Kiểm tra ràng buộc hợp lệ form đăng ký
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vui lòng nhập họ tên.";
    if (!form.email.includes("@")) e.email = "Email không hợp lệ.";
    if (!/^\d{9,10}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Số điện thoại không hợp lệ.";
    if (form.pass.length < 6) e.pass = "Mật khẩu tối thiểu 6 ký tự.";
    if (form.pass !== form.confirm) e.confirm = "Mật khẩu xác nhận không khớp.";
    if (!form.agree) e.agree = "Cần đồng ý điều khoản để đăng ký.";
    return e;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
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

// ─── Quên mật khẩu (ForgotPasswordView) ───────────────────────────────────────
export function ForgotPasswordView() {
  const app = useApp();
  const [step, setStep] = useState<"input" | "sent" | "reset">("input");
  const [contact, setContact] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  if (step === "sent") {
    return (
      <div className="auth-page">
        <div className="auth-wrapper text-center">
          <div className="auth-card text-center">
            <div className="auth-icon-badge" style={{ background: "var(--color-moss)" }}>
              <Icon name="check" size={26} />
            </div>
            <h2 className="auth-title">Đã gửi hướng dẫn!</h2>
            <p className="auth-subtitle mb-6">
              Chúng tôi đã gửi liên kết đặt lại mật khẩu đến <strong>{contact}</strong>. Vui lòng kiểm tra hộp thư đến (hoặc thư rác).
            </p>
            <button
              onClick={() => setStep("reset")}
              className="btn btn-primary btn-lg btn-full mb-3"
            >
              Tiếp tục đặt lại mật khẩu →
            </button>
            <button
              onClick={() => app.setPage("login")}
              className="auth-link text-sm"
            >
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <div className="auth-page">
        <div className="auth-wrapper">
          <div className="auth-header">
            <div className="auth-icon-badge">
              <Icon name="shield" size={26} />
            </div>
            <h1 className="auth-title">Đặt mật khẩu mới</h1>
            <p className="auth-subtitle">Nhập mật khẩu an toàn mới cho tài khoản của bạn</p>
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
                app.setPage("login");
              }}
              className="auth-form"
            >
              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
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
                <label className="form-label">Xác nhận mật khẩu mới</label>
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

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-icon-badge">
            <Icon name="arrow-up" size={26} />
          </div>
          <h1 className="auth-title">Khôi phục mật khẩu</h1>
          <p className="auth-subtitle">Nhập email hoặc số điện thoại để nhận mã xác minh</p>
        </div>

        <div className="auth-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!contact.trim()) {
                setErr("Vui lòng nhập email hoặc số điện thoại.");
                return;
              }
              setStep("sent");
            }}
            className="auth-form"
          >
            <div className="form-group">
              <label className="form-label">Email hoặc số điện thoại</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value);
                  setErr("");
                }}
                placeholder="example@email.com hoặc 0901234567"
                className={`form-input ${err ? "form-input-error" : ""}`}
              />
              {err && <div className="form-error-msg">{err}</div>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full mt-2">
              Gửi hướng dẫn khôi phục
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
