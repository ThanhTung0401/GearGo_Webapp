import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";
import { catalogApi, type HinhAnhSanPhamBackend } from "../../../services/api/catalogApi";
import { equipmentApi } from "../../../services/api/equipmentApi";
import { inventoryApi } from "../../../services/api/inventoryApi";
import { orderApi, type XemTruocHuyBackend } from "../../../services/api/orderApi";
import { warehouseApi, type PhanTichAnhHuongBackend } from "../../../services/api/warehouseApi";
import { supplierApi } from "../../../services/api/supplierApi";
import { importReceiptApi } from "../../../services/api/importReceiptApi";
import { promotionApi } from "../../../services/api/promotionApi";
import { surchargeApi } from "../../../services/api/surchargeApi";
import { reportApi, type BaoCaoVanHanhBackend } from "../../../services/api/reportApi";
import { mapDieuChinhKhoToReceipt, mapEquipmentStatusToBackend } from "../../../services/mappers/catalogEquipmentMapper";
import {
  fmt, statusColors, type Category, type Product, type Supplier, type Promotion, type ImportReceipt,
  type StaffAccount, type StockAdjustmentReceipt, type StockAdjustmentLine, type EquipmentStatus, type Order,
  type Equipment, type Surcharge
} from "../../../store";
import Icon from "../../../components/Icon";
import ReconciliationSheet from "../../ReconciliationSheet";
import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../components/InventoryAuditModal";
import SupplierProfileModal from "../../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../../components/GoodsReceivingModal";
import ImportAdjustmentModal from "../../../components/ImportAdjustmentModal";
import PromotionDetailModal from "../../../components/PromotionDetailModal";
import { FormModal, FormActions, fieldStyle, labelStyle } from "./FormModal";
import { toDatetimeLocalInput } from "./SupplierForm";

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
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      return setError("Thời gian kết thúc phải diễn ra sau thời gian bắt đầu");
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
              await promotionApi.tamAn(promoId, "Tạm dừng từ cấu hình khuyến mãi");
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
    if (!result.ok) return setError(result.message);
    onClose();
  };

  return <FormModal title={promotion ? "Sửa khuyến mãi" : "Tạo mã giảm"} description="Khuyến mãi chỉ giảm tiền thuê đủ điều kiện, không giảm tiền cọc." onClose={onClose}>
    <form onSubmit={handleSubmit} className="grid gap-4 mt-5">
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>
          <div className="flex items-center justify-between">
            <span>Mã giảm giá (In hoa)</span>
            {isCodeLocked && <span style={{ fontSize: "0.7rem", color: "#B45309", fontWeight: 700 }}>Đang khóa (UC8.3)</span>}
          </div>
          <input
            value={form.code}
            disabled={isCodeLocked || (!!promotion && (app.realApi || isRealApiEnabled()))}
            onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="VD: HELLO2026"
            style={{ ...fieldStyle, fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", background: isCodeLocked || (!!promotion && (app.realApi || isRealApiEnabled())) ? "var(--color-parchment)" : "white" }}
          />
          {isCodeLocked && (
            <div style={{ fontSize: "0.72rem", color: "#92400E" }}>
              Mã đã có {promotion.usedCount} lượt dùng thực tế, không thể sửa mã để bảo toàn chứng từ lịch sử.
            </div>
          )}
        </label>
        <label style={labelStyle}>Tên chương trình<input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="VD: Khuyến mãi Hè Rực Rỡ" style={fieldStyle} /></label>
        <label style={labelStyle}>Loại giảm<select value={form.discountType} onChange={(e) => set("discountType", e.target.value as Promotion["discountType"])} style={fieldStyle}><option value="percentage">Phần trăm (%)</option><option value="fixed">Số tiền cố định (VNĐ)</option></select></label>
        <label style={labelStyle}>Giá trị giảm {form.discountType === "percentage" ? "(%)" : "(VNĐ)"}<input type="number" min="0" max={form.discountType === "percentage" ? 100 : undefined} value={form.discountValue} onChange={(e) => set("discountValue", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Mức giảm tối đa (VNĐ, để trống nếu không giới hạn)<input type="number" min="0" value={form.maxDiscount ?? ""} onChange={(e) => set("maxDiscount", e.target.value ? Number(e.target.value) : null)} placeholder="Không giới hạn" style={fieldStyle} /></label>
        <label style={labelStyle}>Tiền thuê tối thiểu (VNĐ)<input type="number" min="0" value={form.minimumRental} onChange={(e) => set("minimumRental", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Thời gian bắt đầu<input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Thời gian kết thúc<input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Giới hạn tổng lượt dùng (Để trống = Vô hạn)<input type="number" min="1" value={form.totalUsageLimit ?? ""} onChange={(e) => set("totalUsageLimit", e.target.value ? Number(e.target.value) : null)} placeholder="Không giới hạn" style={fieldStyle} /></label>
        <label style={labelStyle}>Giới hạn mỗi khách hàng (lượt)<input type="number" min="1" value={form.perCustomerLimit ?? ""} onChange={(e) => set("perCustomerLimit", e.target.value ? Number(e.target.value) : null)} style={fieldStyle} /></label>
        <label style={labelStyle}>Phạm vi áp dụng<select value={form.scope} onChange={(e) => set("scope", e.target.value as Promotion["scope"])} style={fieldStyle}><option value="all">Toàn bộ sản phẩm</option><option value="categories">Theo danh mục sản phẩm</option><option value="products">Theo sản phẩm chỉ định</option></select></label>
        <label style={labelStyle}>Trạng thái hoạt động<select value={form.status} onChange={(e) => set("status", e.target.value as Promotion["status"])} style={fieldStyle}><option value="active">Hoạt động (Active)</option><option value="inactive">Tạm dừng (Inactive)</option></select></label>
      </div>

      {/* Demo tính giảm giá trực quan */}
      <div style={{ background: "var(--color-cream)", border: "1px dashed var(--color-moss)", borderRadius: 10, padding: "10px 14px", fontSize: "0.8rem", color: "var(--color-forest)" }}>
        <strong>Mô phỏng tính giảm giá (UC8.2):</strong> Với đơn hàng có tiền thuê hợp lệ <strong>{fmt(testSubtotal)}</strong>:
        <span style={{ display: "inline-block", marginLeft: 8, padding: "2px 8px", background: "white", borderRadius: 6, fontWeight: 700, color: "#047857" }}>
          Được giảm: -{fmt(simulatedDiscount)}
        </span>
        <span style={{ display: "inline-block", marginLeft: 8, color: "#6B7280" }}>
          (Còn lại tiền thuê: {fmt(testSubtotal - simulatedDiscount)} · Tiền cọc giữ nguyên không giảm)
        </span>
      </div>

      {form.scope === "categories" && <div><div style={{ ...labelStyle, marginBottom: 8 }}>Danh mục áp dụng</div><div className="flex flex-wrap gap-2">{app.categories.map((item) => <label key={item.id} className="icon-label" style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.78rem" }}><input type="checkbox" checked={form.categoryIds.includes(item.id)} onChange={() => toggle("categoryIds", item.id)} />{item.name}</label>)}</div></div>}
      {form.scope === "products" && <div><div style={{ ...labelStyle, marginBottom: 8 }}>Sản phẩm áp dụng</div><div className="flex flex-wrap gap-2">{app.products.map((item) => <label key={item.id} className="icon-label" style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.78rem" }}><input type="checkbox" checked={form.productIds.includes(item.id)} onChange={() => toggle("productIds", item.id)} />{item.name}</label>)}</div></div>}
      {error && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: 10, borderRadius: 8 }}>{error}</div>}
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

