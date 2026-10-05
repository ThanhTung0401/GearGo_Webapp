import { useState } from "react";
import { useApp } from "../App";

// ─── Login ────────────────────────────────────────────────────────────────────
export function LoginView() {
  const app = useApp();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");

  const validate = () => {
    if (!email.includes("@") && !/^\d{9,10}$/.test(email.replace(/\s/g, "")))
      return "Email hoặc số điện thoại không hợp lệ.";
    if (pass.length < 6) return "Mật khẩu tối thiểu 6 ký tự.";
    return "";
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) { setErr(error); return; }
    app.setPage("landing");
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>⛺</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--color-bark)", marginBottom: "4px" }}>Đăng nhập GearGo</h1>
          <p style={{ color: "#9CA3AF", fontSize: "0.88rem" }}>Đây là giao diện mô phỏng — nhập bất kỳ email hợp lệ</p>
        </div>

        <form onSubmit={submit} style={{ background: "white", borderRadius: "16px", padding: "28px", border: "1px solid var(--color-bone)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>Email hoặc số điện thoại</label>
              <input type="text" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                placeholder="example@email.com hoặc 0901234567"
                style={{ width: "100%", border: `1px solid ${err ? "#EF4444" : "var(--color-bone)"}`, borderRadius: "8px", padding: "10px 12px", fontSize: "0.95rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>Mật khẩu</label>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={pass} onChange={(e) => { setPass(e.target.value); setErr(""); }}
                  placeholder="Tối thiểu 6 ký tự"
                  style={{ width: "100%", border: `1px solid ${err ? "#EF4444" : "var(--color-bone)"}`, borderRadius: "8px", padding: "10px 40px 10px 12px", fontSize: "0.95rem" }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "0.85rem" }}
                >{showPass ? "Ẩn" : "Hiện"}</button>
              </div>
            </div>
            {err && <p style={{ color: "#EF4444", fontSize: "0.8rem", margin: 0 }}>{err}</p>}
            <div className="flex justify-end">
              <button type="button" onClick={() => app.setPage("forgot-password")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-forest)", fontSize: "0.82rem", fontWeight: 600 }}
              >
                Quên mật khẩu?
              </button>
            </div>
            <button type="submit"
              style={{ background: "var(--color-forest)", color: "white", padding: "13px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}
            >
              Đăng nhập
            </button>
            <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#6B7280" }}>
              Chưa có tài khoản?{" "}
              <button type="button" onClick={() => app.setPage("register")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-forest)", fontWeight: 700 }}
              >
                Đăng ký ngay
              </button>
            </p>
          </div>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#9CA3AF", marginTop: "16px" }}>
          Bản mô phỏng — không cần tài khoản thật để dùng prototype
        </p>
      </div>
    </div>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────
export function RegisterView() {
  const app = useApp();
  const [form, setForm] = useState({ name: "", email: "", phone: "", pass: "", confirm: "", agree: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: string | boolean) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => { const n = { ...p }; delete n[k]; return n; });
  };

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
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSuccess(true);
  };

  if (success) return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <div style={{ fontSize: "4rem", marginBottom: "12px" }}>✅</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-bark)", marginBottom: "8px" }}>Tạo tài khoản thành công!</h2>
        <p style={{ color: "#6B7280", marginBottom: "20px" }}>Chào mừng <strong>{form.name}</strong> đến với GearGo. Đây là mô phỏng — tài khoản không được lưu thật.</p>
        <button onClick={() => app.setPage("landing")}
          style={{ background: "var(--color-forest)", color: "white", padding: "12px 28px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700 }}
        >
          Khám phá sản phẩm →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>⛺</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--color-bark)", marginBottom: "4px" }}>Tạo tài khoản GearGo</h1>
          <p style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>Giao diện mô phỏng — nhập thông tin bất kỳ</p>
        </div>

        <form onSubmit={submit} style={{ background: "white", borderRadius: "16px", padding: "28px", border: "1px solid var(--color-bone)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-col gap-4">
            {[
              { key: "name", label: "Họ và tên", placeholder: "Nguyễn Văn An", type: "text" },
              { key: "email", label: "Email", placeholder: "example@email.com", type: "email" },
              { key: "phone", label: "Số điện thoại", placeholder: "0901 234 567", type: "tel" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>{label}</label>
                <input type={type} value={(form as Record<string, string | boolean>)[key] as string}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  style={{ width: "100%", border: `1px solid ${errors[key] ? "#EF4444" : "var(--color-bone)"}`, borderRadius: "8px", padding: "10px 12px", fontSize: "0.95rem" }}
                />
                {errors[key] && <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "3px" }}>{errors[key]}</p>}
              </div>
            ))}
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>Mật khẩu</label>
              <input type="password" value={form.pass} onChange={(e) => set("pass", e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                style={{ width: "100%", border: `1px solid ${errors.pass ? "#EF4444" : "var(--color-bone)"}`, borderRadius: "8px", padding: "10px 12px", fontSize: "0.95rem" }}
              />
              {errors.pass && <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "3px" }}>{errors.pass}</p>}
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>Xác nhận mật khẩu</label>
              <input type="password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)}
                placeholder="Nhập lại mật khẩu"
                style={{ width: "100%", border: `1px solid ${errors.confirm ? "#EF4444" : "var(--color-bone)"}`, borderRadius: "8px", padding: "10px 12px", fontSize: "0.95rem" }}
              />
              {errors.confirm && <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "3px" }}>{errors.confirm}</p>}
            </div>
            <label className="flex items-start gap-2" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)}
                style={{ marginTop: "3px", accentColor: "var(--color-forest)" }}
              />
              <span style={{ fontSize: "0.82rem", color: "#6B7280" }}>
                Tôi đồng ý với <span style={{ color: "var(--color-forest)", fontWeight: 600 }}>Điều khoản dịch vụ</span> và <span style={{ color: "var(--color-forest)", fontWeight: 600 }}>Chính sách bảo mật</span> của GearGo.
              </span>
            </label>
            {errors.agree && <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "-8px" }}>{errors.agree}</p>}
            <button type="submit"
              style={{ background: "var(--color-forest)", color: "white", padding: "13px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}
            >
              Tạo tài khoản
            </button>
            <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#6B7280" }}>
              Đã có tài khoản?{" "}
              <button type="button" onClick={() => app.setPage("login")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-forest)", fontWeight: 700 }}
              >
                Đăng nhập
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
export function ForgotPasswordView() {
  const app = useApp();
  const [step, setStep] = useState<"input" | "sent" | "reset">("input");
  const [contact, setContact] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  if (step === "sent") return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ textAlign: "center", maxWidth: 380, background: "white", borderRadius: "16px", padding: "40px 32px", border: "1px solid var(--color-bone)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📧</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: "10px" }}>Đã gửi hướng dẫn!</h2>
        <p style={{ color: "#6B7280", fontSize: "0.88rem", marginBottom: "20px", lineHeight: 1.6 }}>
          Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến <strong>{contact}</strong>.<br />
          Kiểm tra hộp thư và làm theo hướng dẫn.
        </p>
        <button onClick={() => setStep("reset")}
          style={{ background: "var(--color-forest)", color: "white", padding: "11px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, marginBottom: "10px", width: "100%" }}
        >
          Tiếp tục đặt lại mật khẩu →
        </button>
        <button onClick={() => app.setPage("login")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "0.85rem" }}
        >
          Quay lại đăng nhập
        </button>
      </div>
    </div>
  );

  if (step === "reset") return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🔐</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.7rem", color: "var(--color-bark)" }}>Đặt mật khẩu mới</h1>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (newPass.length < 6) { setErr("Mật khẩu tối thiểu 6 ký tự."); return; }
          if (newPass !== confirm) { setErr("Mật khẩu xác nhận không khớp."); return; }
          app.setPage("login");
        }}
          style={{ background: "white", borderRadius: "16px", padding: "28px", border: "1px solid var(--color-bone)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>Mật khẩu mới</label>
              <input type="password" value={newPass} onChange={(e) => { setNewPass(e.target.value); setErr(""); }}
                placeholder="Tối thiểu 6 ký tự"
                style={{ width: "100%", border: `1px solid ${err ? "#EF4444" : "var(--color-bone)"}`, borderRadius: "8px", padding: "10px 12px", fontSize: "0.95rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>Xác nhận mật khẩu mới</label>
              <input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setErr(""); }}
                placeholder="Nhập lại mật khẩu"
                style={{ width: "100%", border: `1px solid ${err ? "#EF4444" : "var(--color-bone)"}`, borderRadius: "8px", padding: "10px 12px", fontSize: "0.95rem" }}
              />
            </div>
            {err && <p style={{ color: "#EF4444", fontSize: "0.8rem" }}>{err}</p>}
            <button type="submit"
              style={{ background: "var(--color-forest)", color: "white", padding: "13px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}
            >
              Đặt mật khẩu mới
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🔑</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.7rem", color: "var(--color-bark)", marginBottom: "4px" }}>Khôi phục mật khẩu</h1>
          <p style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>Nhập email hoặc số điện thoại để nhận hướng dẫn</p>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!contact.trim()) { setErr("Vui lòng nhập email hoặc số điện thoại."); return; }
          setStep("sent");
        }}
          style={{ background: "white", borderRadius: "16px", padding: "28px", border: "1px solid var(--color-bone)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>Email hoặc số điện thoại</label>
              <input type="text" value={contact} onChange={(e) => { setContact(e.target.value); setErr(""); }}
                placeholder="example@email.com hoặc 0901234567"
                style={{ width: "100%", border: `1px solid ${err ? "#EF4444" : "var(--color-bone)"}`, borderRadius: "8px", padding: "10px 12px", fontSize: "0.95rem" }}
              />
              {err && <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "3px" }}>{err}</p>}
            </div>
            <button type="submit"
              style={{ background: "var(--color-forest)", color: "white", padding: "13px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}
            >
              Gửi hướng dẫn khôi phục
            </button>
            <button type="button" onClick={() => app.setPage("login")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-forest)", fontWeight: 600, fontSize: "0.9rem" }}
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
