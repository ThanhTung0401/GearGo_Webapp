import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { promotionApi } from "../../../services/api/promotionApi";

import { fmt, type Promotion } from "../../../store";

import { FormModal, FormActions } from "../../inventory/forms/FormModal";
import { toDatetimeLocalInput } from "../../inventory/forms/SupplierForm";

export function PromotionForm({ app, promotion, onClose }: { app: ReturnType<typeof useApp>; promotion?: Promotion; onClose: () => void }) {
  const [form, setForm] = useState<Promotion>(() =>
    promotion
      ? {
          ...promotion,
          startsAt: toDatetimeLocalInput(promotion.startsAt),
          endsAt: toDatetimeLocalInput(promotion.endsAt),
        }
      : {
          id: "",
          code: "",
          name: "",
          discountType: "percentage",
          discountValue: 10,
          maxDiscount: null,
          minimumRental: 0,
          scope: "all",
          productIds: [],
          categoryIds: [],
          startsAt: toDatetimeLocalInput(new Date().toISOString()),
          endsAt: toDatetimeLocalInput(new Date(Date.now() + 30 * 86400000).toISOString()),
          totalUsageLimit: null,
          perCustomerLimit: 1,
          usedCount: 0,
          status: "active",
        }
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isCodeLocked = !!promotion && promotion.usedCount > 0;
  // [PROMO-02]: khi mã đã có lượt dùng/giữ chỗ (isCodeLocked), Backend KiemTraCamKetCapNhat chặn mọi
  // thay đổi điều khoản cam kết (loại giảm, giá trị, phạm vi, SP/DM) — disable UI để tránh 409.
  const isTermsLocked = isCodeLocked;
  // [PROMO-02]: lưu lý do tạm dừng thật của người dùng khi chọn chuyển sang Inactive trong form Sửa.
  const [stopReason, setStopReason] = useState("");

  const set = <K extends keyof Promotion>(key: K, value: Promotion[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: "productIds" | "categoryIds", id: string) => set(key, form[key].includes(id) ? form[key].filter((item) => item !== id) : [...form[key], id]);

  // Tính thử mức giảm cho đơn hàng 1.000.000 đ
  const testSubtotal = 1000000;
  const simulatedDiscount = form.discountType === "percentage"
    ? Math.min((testSubtotal * (Number(form.discountValue) || 0)) / 100, form.maxDiscount ? Number(form.maxDiscount) : Infinity)
    : Math.min(testSubtotal, Number(form.discountValue) || 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.code.trim()) return setError("Mã khuyến mãi không được để trống");
    // [PROMO-04]: validate đầy đủ client-side trước khi gọi API
    if (!form.name.trim()) return setError("Tên chương trình không được để trống");
    if (!(Number(form.discountValue) > 0)) return setError("Giá trị giảm phải > 0.");
    if (form.discountType === "percentage" && Number(form.discountValue) > 100) {
      return setError("Giảm theo phần trăm không được vượt quá 100%.");
    }
    if (form.maxDiscount !== null && Number(form.maxDiscount) <= 0) {
      return setError("Mức giảm tối đa phải lớn hơn 0 hoặc để trống (không giới hạn).");
    }
    if (Number(form.minimumRental) < 0) {
      return setError("Tiền thuê tối thiểu không được âm.");
    }
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      return setError("Thời gian kết thúc phải diễn ra sau thời gian bắt đầu");
    }
    // [PROMO-02]: khi chọn Tạm dừng trong form Sửa, yêu cầu nhập stopReason (UC8.5)
    if (promotion && promotion.status === "active" && form.status === "inactive" && !stopReason.trim()) {
      return setError("Vui lòng nhập lý do tạm dừng khi chuyển trạng thái sang Tạm dừng.");
    }

    if (app.realApi || isRealApiEnabled()) {
      const loaiGiam = form.discountType === "percentage" ? "PhanTram" : "SoTien";
      const phamVi = form.scope === "all" ? "TatCa" : form.scope === "products" ? "TheoSanPham" : "TheoDanhMuc";
      const sanPhamIds = form.productIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
      const danhMucIds = form.categoryIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
      if (phamVi === "TheoSanPham" && sanPhamIds.length === 0) {
        return setError("Vui lòng chọn ít nhất một sản phẩm áp dụng.");
      }
      if (phamVi === "TheoDanhMuc" && danhMucIds.length === 0) {
        return setError("Vui lòng chọn ít nhất một danh mục áp dụng.");
      }

      setLoading(true);
      try {
        const batDau = new Date(form.startsAt).toISOString();
        const ketThuc = new Date(form.endsAt).toISOString();
        if (promotion) {
          const promoId = Number(promotion.id);
          if (Number.isNaN(promoId)) {
            setError("ID khuyến mãi không hợp lệ.");
            return;
          }
          await promotionApi.capNhat(promoId, {
            tenKhuyenMai: form.name.trim() || undefined,
            loaiGiam,
            giaTriGiam: Number(form.discountValue),
            mucGiamToiDa: form.maxDiscount ?? null,
            tienThueToiThieu: Number(form.minimumRental) || 0,
            phamVi,
            batDau,
            ketThuc,
            gioiHanTongLuot: form.totalUsageLimit ?? null,
            gioiHanMoiKhach: form.perCustomerLimit ?? null,
            sanPhamIds: phamVi === "TheoSanPham" ? sanPhamIds : undefined,
            danhMucIds: phamVi === "TheoDanhMuc" ? danhMucIds : undefined,
          });
          if (form.status !== promotion.status) {
            if (form.status === "inactive") {
              // [PROMO-02]: truyền đúng lý do do người dùng nhập thay vì chuỗi cứng
              await promotionApi.tamAn(promoId, stopReason.trim() || "Tạm dừng từ cấu hình khuyến mãi");
            } else {
              await promotionApi.hienThi(promoId, "Kích hoạt từ cấu hình khuyến mãi");
            }
          }
        } else {
          const created = await promotionApi.tao({
            maGiamGia: form.code.trim().toUpperCase(),
            tenKhuyenMai: form.name.trim() || undefined,
            loaiGiam,
            giaTriGiam: Number(form.discountValue),
            mucGiamToiDa: form.maxDiscount ?? null,
            tienThueToiThieu: Number(form.minimumRental) || 0,
            phamVi,
            batDau,
            ketThuc,
            gioiHanTongLuot: form.totalUsageLimit ?? null,
            gioiHanMoiKhach: form.perCustomerLimit ?? null,
            sanPhamIds: phamVi === "TheoSanPham" ? sanPhamIds : undefined,
            danhMucIds: phamVi === "TheoDanhMuc" ? danhMucIds : undefined,
          });
          if (form.status === "inactive") {
            await promotionApi.tamAn(created.maKhuyenMai, "Tạo ở trạng thái tạm dừng");
          }
        }
        await app.refreshPromotions?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể lưu chương trình khuyến mãi lên máy chủ.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const result = app.savePromotion(form);
    if (!result.ok) {
      // [PROMO-04]: hiển thị chi tiết fieldErrors nếu có thay vì chỉ chuỗi chung chung
      const fieldErrs = (result as { fieldErrors?: Record<string, string> }).fieldErrors;
      const detail = fieldErrs ? Object.values(fieldErrs).join(" ") : "";
      return setError(detail ? `${result.message} ${detail}` : result.message);
    }
    onClose();
  };

  return <FormModal title={promotion ? "Sửa khuyến mãi" : "Tạo mã giảm"} description="Khuyến mãi chỉ giảm tiền thuê đủ điều kiện, không giảm tiền cọc." onClose={onClose}>
    <form onSubmit={handleSubmit} className="grid gap-4 mt-5">
      <div className="responsive-two-column adm-grid-2">
        <label className="adm-label">
          <div className="flex items-center justify-between">
            <span>Mã giảm giá (In hoa)</span>
            {isCodeLocked && <span className="adm-pill is-warning adm-pill--xs">Đang khóa (UC8.3)</span>}
          </div>
          {/* Khóa mã khuyến mãi nếu đã có lượt sử dụng hoặc đang sửa trên API thật */}
          <input
            value={form.code}
            disabled={isCodeLocked || (!!promotion && (app.realApi || isRealApiEnabled()))}
            onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="VD: HELLO2026"
            className={`adm-field adm-field--code-upper ${isCodeLocked || (!!promotion && (app.realApi || isRealApiEnabled())) ? "adm-field--readonly" : ""}`}
          />
          {isCodeLocked && (
            <div className="adm-dispute-reply">
              Mã đã có {promotion.usedCount} lượt dùng thực tế, không thể sửa mã để bảo toàn chứng từ lịch sử.
            </div>
          )}
        </label>
        <label className="adm-label">Tên chương trình<input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="VD: Khuyến mãi Hè Rực Rỡ" className="adm-field" /></label>
        <label className="adm-label">Loại giảm<select disabled={isTermsLocked} value={form.discountType} onChange={(e) => {
          const nextType = e.target.value as Promotion["discountType"];
          // [PROMO-01]: khi chuyển sang "Số tiền cố định", reset maxDiscount về null để không bị cắt trần
          setForm((current) => ({ ...current, discountType: nextType, maxDiscount: nextType === "fixed" ? null : current.maxDiscount }));
        }} className="adm-field"><option value="percentage">Phần trăm (%)</option><option value="fixed">Số tiền cố định (VNĐ)</option></select></label>
        <label className="adm-label">Giá trị giảm {form.discountType === "percentage" ? "(%)" : "(VNĐ)"}<input disabled={isTermsLocked} type="number" min="0" max={form.discountType === "percentage" ? 100 : undefined} value={form.discountValue} onChange={(e) => set("discountValue", Number(e.target.value))} className="adm-field" /></label>
        <label className="adm-label">Mức giảm tối đa (VNĐ, để trống nếu không giới hạn)<input disabled={isTermsLocked || form.discountType === "fixed"} type="number" min="0" value={form.maxDiscount ?? ""} onChange={(e) => set("maxDiscount", e.target.value ? Number(e.target.value) : null)} placeholder="Không giới hạn" className="adm-field" /></label>
        <label className="adm-label">Tiền thuê tối thiểu (VNĐ)<input disabled={isTermsLocked} type="number" min="0" value={form.minimumRental} onChange={(e) => set("minimumRental", Number(e.target.value))} className="adm-field" /></label>
        <label className="adm-label">Thời gian bắt đầu<input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className="adm-field" /></label>
        <label className="adm-label">Thời gian kết thúc<input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} className="adm-field" /></label>
        <label className="adm-label">Giới hạn tổng lượt dùng (Để trống = Vô hạn)<input type="number" min="1" value={form.totalUsageLimit ?? ""} onChange={(e) => set("totalUsageLimit", e.target.value ? Number(e.target.value) : null)} placeholder="Không giới hạn" className="adm-field" /></label>
        <label className="adm-label">Giới hạn mỗi khách hàng (lượt)<input type="number" min="1" value={form.perCustomerLimit ?? ""} onChange={(e) => set("perCustomerLimit", e.target.value ? Number(e.target.value) : null)} className="adm-field" /></label>
        <label className="adm-label">Phạm vi áp dụng<select disabled={isTermsLocked} value={form.scope} onChange={(e) => set("scope", e.target.value as Promotion["scope"])} className="adm-field"><option value="all">Toàn bộ sản phẩm</option><option value="categories">Theo danh mục sản phẩm</option><option value="products">Theo sản phẩm chỉ định</option></select></label>
        <label className="adm-label">Trạng thái hoạt động<select value={form.status} onChange={(e) => set("status", e.target.value as Promotion["status"])} className="adm-field"><option value="active">Hoạt động (Active)</option><option value="inactive">Tạm dừng (Inactive)</option></select></label>
      </div>

      {isTermsLocked && (
        <div className="adm-alert is-warning adm-alert--block mb-0">
          Mã đã có lượt dùng/giữ chỗ — chỉ được chỉnh Tên chương trình, Thời gian hiệu lực và Hạn mức lượt; các điều khoản cam kết còn lại đã khóa.
        </div>
      )}
      {promotion && promotion.status === "active" && form.status === "inactive" && (
        <label className="adm-label">Lý do tạm dừng (bắt buộc)
          <input value={stopReason} onChange={(e) => setStopReason(e.target.value)} placeholder="VD: Hết ngân sách chiến dịch" className="adm-field" />
        </label>
      )}

      {/* Demo tính giảm giá trực quan */}
      <div className="adm-promo-sim-box">
        <strong>Mô phỏng tính giảm giá (UC8.2):</strong> Với đơn hàng có tiền thuê hợp lệ <strong>{fmt(testSubtotal)}</strong>:
        <span className="adm-promo-sim-highlight">
          Được giảm: -{fmt(simulatedDiscount)}
        </span>
        <span className="adm-hint-text ml-2">
          (Còn lại tiền thuê: {fmt(testSubtotal - simulatedDiscount)} · Tiền cọc giữ nguyên không giảm)
        </span>
      </div>

      {form.scope === "categories" && <div><div className="adm-label mb-2">Danh mục áp dụng</div><div className="flex flex-wrap gap-2">{app.categories.map((item) => <label key={item.id} className="icon-label adm-checkbox-chip"><input type="checkbox" checked={form.categoryIds.includes(item.id)} onChange={() => toggle("categoryIds", item.id)} />{item.name}</label>)}</div></div>}
      {form.scope === "products" && <div><div className="adm-label mb-2">Sản phẩm áp dụng</div><div className="flex flex-wrap gap-2">{app.products.map((item) => <label key={item.id} className="icon-label adm-checkbox-chip"><input type="checkbox" checked={form.productIds.includes(item.id)} onChange={() => toggle("productIds", item.id)} />{item.name}</label>)}</div></div>}
      {error && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{error}</div>}
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

