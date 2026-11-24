import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { resolveAssetUrl, toRelativeAssetUrl } from "../../../utils/formatters";

import { catalogApi, type HinhAnhSanPhamBackend } from "../../../services/api/catalogApi";

import { fmt, type Product } from "../../../store";

import { FormModal, FormActions } from "../../inventory/forms/FormModal";

export function ProductForm({ app, product, onClose }: { app: ReturnType<typeof useApp>; product?: Product; onClose: () => void }) {
  const [form, setForm] = useState<Product>(product ?? {
    id: "", displayCode: "", categoryId: app.categories.find((item) => item.status === "active")?.id, category: "", name: "", brand: "", description: "", capacity: "", dimensions: "", specifications: {}, pricePerDay: 0, deposit: 0, compensation: 0, image: "", images: [], status: "active", rating: 0, reviews: 0,
  });
  // [SP-01] Giữ nguyên trạng thái kinh doanh gốc (DangKinhDoanh | TamNgung | NgungKinhDoanh).
  // Dropdown 2 option cũ ("active"/"inactive") ép sản phẩm NgungKinhDoanh về TamNgung khi lưu.
  // Nguồn ưu tiên: form.rawStatus (backend trả) → suy ra từ form.status ban đầu.
  const [rawStatus, setRawStatus] = useState<string>(
    (product?.rawStatus as string | undefined) ??
    (product?.status === "inactive" ? "TamNgung" : "DangKinhDoanh")
  );
  const [specText, setSpecText] = useState(Object.entries(form.specifications ?? {}).map(([key, value]) => `${key}: ${value}`).join("\n"));
  const [imageText, setImageText] = useState(
    (form.images?.length ? form.images : [form.image])
      .filter(Boolean)
      .map((u) => toRelativeAssetUrl(u))
      .join("\n")
  );
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
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
      const targetRel = toRelativeAssetUrl(duongDan);
      setImageText((prev) =>
        prev
          .split("\n")
          .filter((u) => toRelativeAssetUrl(u) !== targetRel)
          .join("\n")
      );
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
    const images = imageText.split("\n").map((url) => toRelativeAssetUrl(url)).filter(Boolean);

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
            // [SP-01] Giữ nguyên trạng thái NgungKinhDoanh thay vì ép về TamNgung.
            trangThaiKinhDoanh: rawStatus,
            // [SP-04] Gửi danh sách URL người dùng nhập ở textarea để backend lưu vào bảng HinhAnh.
            hinhAnhs: images,
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
            // [SP-01] Dùng rawStatus (3 trạng thái) thay vì ép form.status về 2 trạng thái.
            trangThaiKinhDoanh: rawStatus,
            // [SP-04] Danh sách URL hình ảnh người dùng dán vào textarea.
            hinhAnhs: images,
          });
          savedSpId = created.maSanPham;
          form.id = String(created.maSanPham);
        }

        // UC49: Upload nhiều hình ảnh qua Multipart Form Data nếu người dùng chọn tệp
        if (uploadFiles.length > 0 && savedSpId) {
          for (const file of uploadFiles) {
            const imgRes = await catalogApi.adminUploadHinhAnh(savedSpId, file);
            if (imgRes && imgRes.duongDan) {
              images.unshift(imgRes.duongDan);
            }
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
      <div className="responsive-two-column adm-grid-2">
        <label className="adm-label">Mã sản phẩm<input value={form.displayCode ?? ""} onChange={(e) => set("displayCode", e.target.value)} placeholder="SP-L001" className="adm-field" /></label>
        <label className="adm-label">Danh mục<select value={form.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value)} className="adm-field"><option value="">Chọn danh mục</option>{app.categories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.status === "inactive" ? " (tạm ẩn)" : ""}</option>)}</select></label>
        <label className="adm-label">Tên sản phẩm<input value={form.name} onChange={(e) => set("name", e.target.value)} className="adm-field" /></label>
        <label className="adm-label">Thương hiệu<input value={form.brand} onChange={(e) => set("brand", e.target.value)} className="adm-field" /></label>
        <label className="adm-label">Sức chứa<input value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="4 người" className="adm-field" /></label>
        <label className="adm-label">Kích thước<input value={form.dimensions ?? ""} onChange={(e) => set("dimensions", e.target.value)} placeholder="210 × 240 × 130 cm" className="adm-field" /></label>
        <label className="adm-label">Giá thuê/ngày (đ)<input type="number" min="0" value={form.pricePerDay} onChange={(e) => set("pricePerDay", Number(e.target.value))} className="adm-field" /></label>
        <label className="adm-label">Mức cọc/thiết bị (đ)<input type="number" min="0" value={form.deposit} onChange={(e) => set("deposit", Number(e.target.value))} className="adm-field" /></label>
        <label className="adm-label">Giá trị bồi thường (đ)<input type="number" min="0" value={form.compensation} onChange={(e) => set("compensation", Number(e.target.value))} className="adm-field" /></label>
        {/* [SP-01] 3 trạng thái kinh doanh khớp backend enum TrangThaiKinhDoanh. */}
        <label className="adm-label">Trạng thái<select
          value={rawStatus}
          onChange={(e) => {
            const v = e.target.value;
            setRawStatus(v);
            set("status", v === "DangKinhDoanh" ? "active" : "inactive");
          }}
          className="adm-field"
        >
          <option value="DangKinhDoanh">Đang kinh doanh</option>
          <option value="TamNgung">Tạm ngưng</option>
          <option value="NgungKinhDoanh">Ngừng kinh doanh</option>
        </select></label>
      </div>
      <label className="adm-label">Mô tả<textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className="adm-field" /></label>
      <label className="adm-label">Thông số kỹ thuật <span className="adm-label-note">Mỗi dòng theo mẫu: Chống nước: IPX4</span><textarea rows={3} value={specText} onChange={(e) => setSpecText(e.target.value)} className="adm-field" /></label>
      
      {/* Upload file hình ảnh Multipart Form Data (UC49) */}
      <label className="adm-label">
        Tải ảnh từ máy tính (hỗ trợ chọn nhiều ảnh - UC49)
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length === 0) return;
            const invalid = files.find((f) => f.size > 5 * 1024 * 1024);
            if (invalid) {
              setError(`Ảnh "${invalid.name}" vượt quá giới hạn 5MB.`);
              return;
            }
            setError("");
            setUploadFiles((prev) => [...prev, ...files]);
            e.target.value = "";
          }}
          className="adm-field"
        />
        {uploadFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {uploadFiles.map((file, idx) => (
              <span key={`${file.name}-${idx}`} className="adm-hint-text font-semibold text-[var(--color-forest)] inline-flex items-center gap-1">
                ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
                <button
                  type="button"
                  onClick={() => setUploadFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-red-600 hover:underline ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </label>

      {serverImages.length > 0 && (
        <div>
          <div className="adm-label mb-1.5">
            Hình ảnh hiện có trên máy chủ (UC6.6):
          </div>
          <div className="flex flex-wrap gap-2">
            {serverImages.map((img) => (
              <div key={img.maHinhAnh} className="adm-prod-server-img-card">
                <img src={resolveAssetUrl(img.duongDan)} alt="Ảnh sản phẩm" className="adm-prod-server-img" />
                {img.laAnhChinh && (
                  <span className="adm-prod-primary-tag">
                    Chính
                  </span>
                )}
                <button
                  type="button"
                  disabled={deletingImgId === img.maHinhAnh}
                  onClick={() => handleDeleteServerImage(img.maHinhAnh, img.duongDan)}
                  className="adm-prod-del-img-btn"
                >
                  {deletingImgId === img.maHinhAnh ? "Đang xóa..." : "Xóa ảnh"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="adm-label">URL hình ảnh <span className="adm-label-note">Mỗi dòng một URL; dòng đầu là ảnh chính.</span><textarea rows={3} value={imageText} onChange={(e) => setImageText(e.target.value)} placeholder="https://..." className="adm-field" /></label>
      {imageText.split("\n")[0]?.trim() && <img src={resolveAssetUrl(imageText.split("\n")[0].trim())} alt="Xem trước sản phẩm" className="adm-prod-preview-img" />}
      <div className="adm-card--parchment text-xs">Giá thuê: <strong>{fmt(form.pricePerDay)}</strong> · Cọc: <strong>{fmt(form.deposit)}</strong> · Bồi thường: <strong>{fmt(form.compensation)}</strong></div>
      {error && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{error}</div>}
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

