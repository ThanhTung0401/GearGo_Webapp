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
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Quản lý danh mục</h2>
        <button onClick={() => setAction("new")} style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Thêm danh mục</button>
      </div>
      {message && <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: "0.82rem" }}>{message}</div>}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {catData.map((c) => {
          const avail = c.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").length;
          return (
            <div key={c.category.id} style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden", opacity: c.category.status === "inactive" ? 0.62 : 1 }}>
              <div style={{ background: "var(--color-forest)", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,.14)", color: "white", display: "grid", placeItems: "center" }}><Icon name="tag" size={22} /></span>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "1.1rem", fontWeight: 700 }}>{c.category.name}</div>
                  <div style={{ color: "var(--color-sage)", fontSize: "0.75rem" }}>{c.products.length} sản phẩm · {c.equipment.length} thiết bị</div>
                </div>
              </div>
              <div style={{ padding: "14px 18px" }}>
                {c.products.map((p) => (
                  <div key={p.id} className="flex justify-between items-center py-2" style={{ borderBottom: "1px dashed var(--color-bone)", fontSize: "0.82rem" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ color: "#9CA3AF", fontSize: "0.72rem" }}>{p.brand}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-forest)" }}>{fmt(p.pricePerDay)}/ngày</div>
                      <span style={{ background: p.status === "active" ? "#DCFCE7" : "#F3F4F6", color: p.status === "active" ? "#15803D" : "#6B7280", padding: "1px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>{p.status === "active" ? "Đang kinh doanh" : "Tạm dừng"}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between mt-3" style={{ fontSize: "0.78rem" }}>
                  <span style={{ color: "#9CA3AF" }}>Thiết bị sẵn sàng</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: avail > 0 ? "var(--color-forest)" : "#EF4444" }}>{avail} / {c.equipment.length}</span>
                </div>
              </div>
              <div style={{ padding: "0 18px 14px", display: "flex", gap: "6px" }}>
                <button onClick={() => setAction(c.category)} style={{ flex: 1, background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Sửa</button>
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
                  style={{ flex: 1, background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px", fontSize: "0.75rem", cursor: "pointer" }}
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
