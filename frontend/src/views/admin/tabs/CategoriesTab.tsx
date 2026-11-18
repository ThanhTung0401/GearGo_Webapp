import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { catalogApi } from "../../../services/api/catalogApi";

import { fmt, type Category } from "../../../store";
import Icon from "../../../components/Icon";

import { CategoryForm } from "../forms/CategoryForm";

export function CategoriesTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [action, setAction] = useState<Category | "new" | null>(null);
  const [message, setMessage] = useState("");
  const catData = [...app.categories].sort((a, b) => a.displayOrder - b.displayOrder).map((category) => ({
    category,
    products: app.products.filter((p) => p.categoryId === category.id),
    equipment: app.equipment.filter((e) => app.products.find((p) => p.id === e.productId)?.categoryId === category.id),
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="adm-page-title adm-page-title--compact">Quản lý danh mục</h2>
        <button onClick={() => setAction("new")} className="adm-btn-primary">+ Thêm danh mục</button>
      </div>
      {message && <div role="alert" className="adm-alert is-error-solid adm-alert--block">{message}</div>}
      <div className="adm-cat-grid">
        {catData.map((c) => {
          const avail = c.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").length;
          return (
            /* Làm mờ thẻ danh mục khi đang ở trạng thái tạm ẩn */
            <div key={c.category.id} className={`adm-cat-card ${c.category.status === "inactive" ? "is-inactive" : ""}`}>
              <div className="adm-cat-banner">
                <span className="adm-cat-icon"><Icon name="tag" size={22} /></span>
                <div>
                  <div className="adm-cat-name">{c.category.name}</div>
                  <div className="adm-cat-meta">{c.products.length} sản phẩm · {c.equipment.length} thiết bị</div>
                </div>
              </div>
              <div className="adm-cat-body">
                {c.products.map((p) => (
                  <div key={p.id} className="adm-cat-prod-row">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="adm-cell-sub">{p.brand}</div>
                    </div>
                    <div className="adm-cell-right">
                      <div className="adm-cell-mono font-semibold text-[var(--color-forest)]">{fmt(p.pricePerDay)}/ngày</div>
                      <span className={`adm-pill adm-pill--round adm-pill--xs ${p.status === "active" ? "is-success" : "is-neutral"}`}>{p.status === "active" ? "Đang kinh doanh" : "Tạm dừng"}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between mt-3 text-[0.78rem]">
                  <span className="adm-muted-note">Thiết bị sẵn sàng</span>
                  <span className={`adm-avail-count ${avail > 0 ? "is-ok" : ""}`}>{avail} / {c.equipment.length}</span>
                </div>
              </div>
              <div className="adm-cat-footer">
                <button onClick={() => setAction(c.category)} className="adm-btn-parchment adm-btn-flex">Sửa</button>
                <button
                  onClick={async () => {
                    const nextStatus = c.category.status === "active" ? "inactive" : "active";
                    if (app.realApi || isRealApiEnabled()) {
                      const catId = Number(c.category.id);
                      if (Number.isNaN(catId)) {
                        return setMessage("ID danh mục không hợp lệ.");
                      }
                      try {
                        await catalogApi.adminDoiTrangThaiDanhMuc(catId, nextStatus === "active" ? "HienThi" : "TamAn");
                        await app.refreshCatalog?.();
                        setMessage("");
                      } catch (err) {
                        setMessage(err instanceof Error ? err.message : "Lỗi cập nhật trạng thái danh mục");
                      }
                      return;
                    }
                    const result = app.setCategoryStatus(c.category.id, nextStatus);
                    setMessage(result.ok ? "" : result.message);
                  }}
                  className="adm-btn-parchment adm-btn-flex"
                >
                  {c.category.status === "active" ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {action && <CategoryForm app={app} category={action === "new" ? undefined : action} onClose={() => setAction(null)} />}
    </div>
  );
}

// ─── Products Tab (UC6.7: Tìm kiếm & Lọc danh mục) ──────────────────────────
