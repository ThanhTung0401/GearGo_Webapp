import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { catalogApi, type HinhAnhSanPhamBackend } from "../../../services/api/catalogApi";

import { fmt, type Product } from "../../../store";

import { FormModal, FormActions, fieldStyle, labelStyle } from "./FormModal";

export function ProductForm({ app, product, onClose }: { app: ReturnType<typeof useApp>; product?: Product; onClose: () => void }) {
  const [form, setForm] = useState<Product>(product ?? {
    id: "", displayCode: "", categoryId: app.categories.find((item) => item.status === "active")?.id, category: "", name: "", brand: "", description: "", capacity: "", dimensions: "", specifications: {}, pricePerDay: 0, deposit: 0, compensation: 0, image: "", images: [], status: "active", rating: 0, reviews: 0,
  });
  const [specText, setSpecText] = useState(Object.entries(form.specifications ?? {}).map(([key, value]) => `${key}: ${value}`).join("\n"));
  const [imageText, setImageText] = useState((form.images?.length ? form.images : [form.image]).filter(Boolean).join("\n"));
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [serverImages, setServerImages] = useState<HinhAnhSanPhamBackend[]>([]);
  const [deletingImgId, setDeletingImgId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = <K extends keyof Product>(key: K, value: Product[K]) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!isRealApiEnabled() || !product?.id || Number.isNaN(Number(product.id))) return;
    let active = true;
    catalogApi.adminLayHinhAnh(Number(product.id)).then((imgs) => {
      if (active && Array.isArray(imgs)) {
        setServerImages(imgs);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [product?.id]);

  const handleDeleteServerImage = async (maHinhAnh: number, duongDan: string) => {
    setError("");
    setDeletingImgId(maHinhAnh);
    try {
      await catalogApi.adminXoaHinhAnh(maHinhAnh);
      setServerImages((prev) => prev.filter((img) => img.maHinhAnh !== maHinhAnh));
      setImageText((prev) => prev.split("\n").filter((u) => u.trim() !== duongDan).join("\n"));
      await app.refreshCatalog?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa hình ảnh sản phẩm.");
    } finally {
      setDeletingImgId(null);
    }
  };

  // Đấu nối API Quản trị sản phẩm & Upload ảnh Multipart (UC49, UC50, UC51 / UC6.5, UC6.6)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    // UC50: Kiểm tra hợp lệ giá thuê và tiền cọc
    if (form.pricePerDay <= 0) return setError("Giá thuê mỗi ngày phải lớn hơn 0 đ.");
    if (form.deposit < 0) return setError("Mức tiền cọc không được là số âm.");
    if (form.compensation < form.deposit) return setError("Giá trị bồi thường phải lớn hơn hoặc bằng mức cọc.");
    if (!form.name.trim()) return setError("Tên sản phẩm không được để trống.");

    const specifications = Object.fromEntries(specText.split("\n").map((line) => line.split(":")).filter((parts) => parts.length >= 2).map(([key, ...value]) => [key.trim(), value.join(":").trim()]));
    const images = imageText.split("\n").map((url) => url.trim()).filter(Boolean);

    if (isRealApiEnabled()) {
      const catId = Number(form.categoryId) || (app.categories[0] ? Number(app.categories[0].id) : NaN);
      if (isNaN(catId)) {
        return setError("Vui lòng tạo/chọn một danh mục hợp lệ trước khi lưu sản phẩm.");
      }
      setLoading(true);
      try {
        const displayCode = form.displayCode || `SP-${Date.now().toString().slice(-4)}`;
        let savedSpId = product?.id && !isNaN(Number(product.id)) ? Number(product.id) : null;

        if (savedSpId) {
          // UC51 / UC6.6: Cập nhật thông tin & giá sản phẩm
          await catalogApi.adminCapNhatSanPham(savedSpId, {
            maDanhMuc: catId,
            maSanPhamHienThi: displayCode,
            tenSanPham: form.name.trim(),
            thuongHieu: form.brand,
            moTa: form.description,
            sucChua: parseInt(form.capacity) || 0,
            kichThuoc: form.dimensions,
            thongSo: JSON.stringify(specifications),
            giaThueMoiNgay: form.pricePerDay,
            mucCocMoiThietBi: form.deposit,
            giaTriBoiThuong: form.compensation,
            trangThaiKinhDoanh: form.status === "active" ? "DangKinhDoanh" : "TamNgung",
          });
        } else {
          // UC49 / UC6.5: Thêm mới sản phẩm cho thuê
          const created = await catalogApi.adminTaoSanPham({
            maDanhMuc: catId,
            maSanPhamHienThi: displayCode,
            tenSanPham: form.name.trim(),
            thuongHieu: form.brand,
            moTa: form.description,
            sucChua: parseInt(form.capacity) || 0,
            kichThuoc: form.dimensions,
            thongSo: JSON.stringify(specifications),
            giaThueMoiNgay: form.pricePerDay,
            mucCocMoiThietBi: form.deposit,
            giaTriBoiThuong: form.compensation,
            trangThaiKinhDoanh: form.status === "active" ? "DangKinhDoanh" : "TamNgung",
          });
          savedSpId = created.maSanPham;
          form.id = String(created.maSanPham);
        }

        // UC49: Upload hình ảnh qua Multipart Form Data nếu người dùng chọn tệp
        if (uploadFile && savedSpId) {
          const imgRes = await catalogApi.adminUploadHinhAnh(savedSpId, uploadFile);
          if (imgRes && imgRes.duongDan) {
            images.unshift(imgRes.duongDan);
          }
        }
      } catch (err) {
        setLoading(false);
        return setError(err instanceof Error ? err.message : "Không thể lưu sản phẩm lên máy chủ.");
      }
      await app.refreshCatalog?.();
      setLoading(false);
      onClose();
      return;
    }

    const result = app.saveProduct({ ...form, specifications, images, image: images[0] ?? "" });
    if (!result.ok) return setError(result.message);
    onClose();
  };

  return <FormModal title={product ? "Sửa sản phẩm" : "Thêm sản phẩm"} description="Giá thuê, cọc và bồi thường là ba giá trị riêng theo ERD. Giá nhập chỉ được ghi ở phiếu nhập." onClose={onClose}>
    <form onSubmit={submit} className="grid gap-4 mt-5">
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>Mã sản phẩm<input value={form.displayCode ?? ""} onChange={(e) => set("displayCode", e.target.value)} placeholder="SP-L001" style={fieldStyle} /></label>
        <label style={labelStyle}>Danh mục<select value={form.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value)} style={fieldStyle}><option value="">Chọn danh mục</option>{app.categories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.status === "inactive" ? " (tạm ẩn)" : ""}</option>)}</select></label>
        <label style={labelStyle}>Tên sản phẩm<input value={form.name} onChange={(e) => set("name", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Thương hiệu<input value={form.brand} onChange={(e) => set("brand", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Sức chứa<input value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="4 người" style={fieldStyle} /></label>
        <label style={labelStyle}>Kích thước<input value={form.dimensions ?? ""} onChange={(e) => set("dimensions", e.target.value)} placeholder="210 × 240 × 130 cm" style={fieldStyle} /></label>
        <label style={labelStyle}>Giá thuê/ngày (đ)<input type="number" min="0" value={form.pricePerDay} onChange={(e) => set("pricePerDay", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Mức cọc/thiết bị (đ)<input type="number" min="0" value={form.deposit} onChange={(e) => set("deposit", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Giá trị bồi thường (đ)<input type="number" min="0" value={form.compensation} onChange={(e) => set("compensation", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Trạng thái<select value={form.status} onChange={(e) => set("status", e.target.value as Product["status"])} style={fieldStyle}><option value="active">Đang kinh doanh</option><option value="inactive">Tạm dừng</option></select></label>
      </div>
      <label style={labelStyle}>Mô tả<textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} style={fieldStyle} /></label>
      <label style={labelStyle}>Thông số kỹ thuật <span style={{ color: "#6B7280", fontWeight: 400 }}>Mỗi dòng theo mẫu: Chống nước: IPX4</span><textarea rows={3} value={specText} onChange={(e) => setSpecText(e.target.value)} style={fieldStyle} /></label>
      
      {/* Upload file hình ảnh Multipart Form Data (UC49) */}
      <label style={labelStyle}>
        Tải ảnh từ máy tính (Multipart Form Data - UC49)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.size > 5 * 1024 * 1024) {
                setError("Dung lượng file ảnh vượt quá 5MB.");
                return;
              }
              setUploadFile(file);
            }
          }}
          style={fieldStyle}
        />
        {uploadFile && <span style={{ fontSize: "0.75rem", color: "var(--color-forest)", fontWeight: 600 }}>✓ Đã chọn file: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</span>}
      </label>

      {serverImages.length > 0 && (
        <div>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)", marginBottom: 6 }}>
            Hình ảnh hiện có trên máy chủ (UC6.6):
          </div>
          <div className="flex flex-wrap gap-2">
            {serverImages.map((img) => (
              <div key={img.maHinhAnh} style={{ position: "relative", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 4, background: "white" }}>
                <img src={img.duongDan} alt="Ảnh sản phẩm" style={{ width: 92, height: 68, objectFit: "cover", borderRadius: 6 }} />
                {img.laAnhChinh && (
                  <span style={{ position: "absolute", top: 6, left: 6, background: "var(--color-forest)", color: "white", fontSize: "0.65rem", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                    Chính
                  </span>
                )}
                <button
                  type="button"
                  disabled={deletingImgId === img.maHinhAnh}
                  onClick={() => handleDeleteServerImage(img.maHinhAnh, img.duongDan)}
                  style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700, padding: "2px 6px", cursor: "pointer" }}
                >
                  {deletingImgId === img.maHinhAnh ? "Đang xóa..." : "Xóa ảnh"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <label style={labelStyle}>URL hình ảnh <span style={{ color: "#6B7280", fontWeight: 400 }}>Mỗi dòng một URL; dòng đầu là ảnh chính.</span><textarea rows={3} value={imageText} onChange={(e) => setImageText(e.target.value)} placeholder="https://..." style={fieldStyle} /></label>
      {imageText.split("\n")[0]?.trim() && <img src={imageText.split("\n")[0].trim()} alt="Xem trước sản phẩm" style={{ width: 180, height: 120, objectFit: "cover", borderRadius: 10, border: "1px solid var(--color-bone)" }} />}
      <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.8rem" }}>Giá thuê: <strong>{fmt(form.pricePerDay)}</strong> · Cọc: <strong>{fmt(form.deposit)}</strong> · Bồi thường: <strong>{fmt(form.compensation)}</strong></div>
      {error && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: "10px 12px", borderRadius: 8, fontSize: "0.8rem" }}>{error}</div>}
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

