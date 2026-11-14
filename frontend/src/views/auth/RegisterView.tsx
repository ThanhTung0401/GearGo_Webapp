import { useState } from "react";
import { useApp } from "../../App";
import Icon from "../../components/Icon";
import { ApiError, isRealApiEnabled } from "../../services/apiClient";
import { authApi } from "../../services/api/authApi";
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

  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);

    // Đấu nối API thật POST /api/auth/dang-ky (UC01 / UC1.1)
    if (isRealApiEnabled()) {
      try {
        const res = await authApi.dangKy({
          email: form.email.trim(),
          soDienThoai: form.phone.trim(),
          matKhau: form.pass,
          xacNhanMatKhau: form.confirm,
          hoTen: form.name.trim(),
        });

        const nextId = `KH${String(res.maTaiKhoan).padStart(3, "0")}`;
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
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === "EMAIL_DA_TON_TAI") {
            setErrors({ email: "Email này đã được đăng ký tài khoản trong hệ thống." });
          } else if (error.code === "SDT_DA_TON_TAI") {
            setErrors({ phone: "Số điện thoại này đã được sử dụng bởi tài khoản khác." });
          } else if (error.code === "RATE_LIMIT_VUOT_MUC") {
            setErrors({ general: "Bạn đã thao tác đăng ký quá nhiều lần. Vui lòng thử lại sau 10 phút." });
          } else {
            setErrors({ general: error.message || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin." });
          }
        } else {
          setErrors({ general: error instanceof Error ? error.message : "Đăng ký thất bại." });
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Luồng dữ liệu giả lập dự phòng khi chưa bật Backend API
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
    setLoading(false);
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

            {errors.general && (
              <div role="alert" className="form-error-msg text-center p-2 rounded" style={{ background: "#FEE2E2", color: "#B91C1C", fontSize: "0.82rem" }}>
                {errors.general}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full mt-2">
              {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
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
