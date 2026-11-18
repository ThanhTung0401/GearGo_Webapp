import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { catalogApi } from "../../../services/api/catalogApi";

import { type Category } from "../../../store";

import { FormModal, FormActions } from "./FormModal";

export function CategoryForm({ app, category, onClose }: { app: ReturnType<typeof useApp>; category?: Category; onClose: () => void }) {
  const [form, setForm] = useState<Category>(category ?? { id: "", parentId: null, name: "", description: "", displayOrder: app.categories.length + 1, status: "active" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Đấu nối API Quản trị danh mục (UC44, UC45, UC46 / UC6.1, UC6.2)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (isRealApiEnabled()) {
      setLoading(true);
      try {
        const maDanhMucChaNum = form.parentId && !isNaN(Number(form.parentId)) ? Number(form.parentId) : null;
        if (category?.id && !isNaN(Number(category.id))) {
          // UC46 / UC6.2: Cập nhật danh mục
          const updated = await catalogApi.adminCapNhatDanhMuc(Number(category.id), {
            tenDanhMuc: form.name.trim(),
            maDanhMucCha: maDanhMucChaNum,
            moTa: form.description || "",
            thuTuHienThi: Number(form.displayOrder) || 0,
            trangThai: form.status === "active" ? "HienThi" : "TamAn",
          });
          form.id = String(updated.maDanhMuc);
        } else {
          // UC44 / UC6.1: Thêm danh mục mới (Backend kiểm tra chống vòng lặp cha-con UC45)
          const created = await catalogApi.adminTaoDanhMuc({
            tenDanhMuc: form.name.trim(),
            maDanhMucCha: maDanhMucChaNum,
            moTa: form.description || "",
            thuTuHienThi: Number(form.displayOrder) || 0,
            trangThai: form.status === "active" ? "HienThi" : "TamAn",
          });
          form.id = String(created.maDanhMuc);
        }
      } catch (err) {
        setLoading(false);
        return setError(err instanceof Error ? err.message : "Không thể lưu danh mục lên máy chủ.");
      }
      await app.refreshCatalog?.();
      setLoading(false);
      onClose();
      return;
    }

    const result = app.saveCategory(form);
    if (!result.ok) return setError(result.message);
    onClose();
  };
  return <FormModal title={category ? "Sửa danh mục" : "Thêm danh mục"} description="Dữ liệu được lưu thật và dùng chung cho sản phẩm, kho và trang khách." onClose={onClose}>
    <form onSubmit={submit} className="grid gap-4 mt-5">
      <div className="responsive-two-column adm-grid-2">
        <label className="adm-label">Tên danh mục<input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="adm-field" /></label>
        <label className="adm-label">Danh mục cha<select value={form.parentId ?? ""} onChange={(e) => setForm({ ...form, parentId: e.target.value || null })} className="adm-field"><option value="">Không có</option>{app.categories.filter((item) => item.id !== form.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="adm-label">Thứ tự hiển thị<input type="number" min="0" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className="adm-field" /></label>
        <label className="adm-label">Trạng thái<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Category["status"] })} className="adm-field"><option value="active">Hoạt động</option><option value="inactive">Tạm ẩn</option></select></label>
      </div>
      <label className="adm-label">Mô tả<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="adm-field" /></label>
      {error && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{error}</div>}
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

