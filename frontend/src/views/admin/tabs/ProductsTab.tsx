import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { catalogApi } from "../../../services/api/catalogApi";

import { fmt, type Product } from "../../../store";

import { ProductForm } from "../forms/ProductForm";

export function ProductsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [sel, setSel] = useState<string | null>(null);
  const [action, setAction] = useState<Product | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Tất cả");
  const [statusError, setStatusError] = useState("");

  const categories = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.category)))];
  const filteredProducts = app.products.filter((p) => {
    const matchCat = catFilter === "Tất cả" || p.category === catFilter;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.displayCode ?? p.id).toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const detail = sel ? app.products.find((p) => p.id === sel) : null;
  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Quản lý sản phẩm</h2>
          <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>Tra cứu, quản lý danh mục và thông tin niêm yết thiết bị cắm trại.</p>
        </div>
        <button onClick={() => setAction("new")} style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Thêm sản phẩm</button>
      </div>

      {statusError && (
        <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: "0.82rem" }}>
          {statusError}
        </div>
      )}

      {/* UC6.7: Thanh tìm kiếm từ khóa & Bộ lọc danh mục */}
      <div className="flex gap-3 mb-4 flex-wrap items-center" style={{ background: "white", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--color-bone)" }}>
        <input
          type="text"
          placeholder="🔍 Tìm tên sản phẩm, mã, thương hiệu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.85rem" }}
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          aria-label="Lọc theo danh mục"
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.85rem", background: "white", minWidth: 160 }}
        >
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: "0.8rem", color: "#6B7280" }}>
          Tìm thấy <strong>{filteredProducts.length}</strong> / {app.products.length} sản phẩm
        </span>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: detail ? "1fr 360px" : "1fr" }}>
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                {["Mã", "Sản phẩm", "Danh mục", "Giá/ngày", "Cọc", "Bồi thường", "Khả dụng", ""].map((h) => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, i) => {
                const avail = app.getAvailable(p.id);
                const total = app.equipment.filter((e) => e.productId === p.id).length;
                return (
                  <tr key={p.id} onClick={() => setSel(sel === p.id ? null : p.id)}
                    style={{ borderTop: "1px solid var(--color-bone)", background: sel === p.id ? "#F0FDF4" : i % 2 === 0 ? "white" : "var(--color-cream)", cursor: "pointer" }}
                  >
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-moss)" }}>{p.displayCode ?? p.id}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{p.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>{p.brand}</div>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "0.8rem", color: "#6B7280" }}>{p.category}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 600 }}>{fmt(p.pricePerDay)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{fmt(p.deposit)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{fmt(p.compensation)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                      <span style={{ color: avail > 1 ? "var(--color-forest)" : "#EF4444", fontWeight: 700 }}>{avail}</span>/{total}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <button onClick={(event) => { event.stopPropagation(); setAction(p); }} style={{ background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: "5px", padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer" }}>Sửa</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {detail && (
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", padding: "18px", alignSelf: "start" }}>
            <div className="flex justify-between items-start mb-3">
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--color-bark)" }}>{detail.name}</h3>
              <button onClick={() => setSel(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>×</button>
            </div>
            <img src={detail.image} alt={detail.name} style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: "8px", marginBottom: "10px", background: "var(--color-parchment)" }} />
            {[["Mã hiển thị", detail.displayCode ?? detail.id], ["Thương hiệu", detail.brand], ["Danh mục", detail.category], ["Sức chứa", detail.capacity || "—"], ["Kích thước", detail.dimensions || "—"], ["Giá thuê/ngày", fmt(detail.pricePerDay)], ["Mức cọc/thiết bị", fmt(detail.deposit)], ["Giá trị bồi thường", fmt(detail.compensation)], ["Đánh giá", `${detail.rating}★ (${detail.reviews})`]].map(([k, v]) => (
              <div key={k} className="flex justify-between" style={{ fontSize: "0.82rem", borderBottom: "1px dashed var(--color-bone)", padding: "5px 0" }}>
                <span style={{ color: "#9CA3AF" }}>{k}</span>
                <span style={{ fontWeight: 600, fontFamily: k.includes("Giá") || k.includes("Cọc") || k.includes("Bồi") ? "var(--font-mono)" : "inherit" }}>{v}</span>
              </div>
            ))}
            {/* UC53 / UC6.8: Thay đổi trạng thái kinh doanh của sản phẩm */}
            <div className="flex justify-between items-center mt-3 pt-2" style={{ borderTop: "1px dashed var(--color-bone)" }}>
              <span style={{ fontSize: "0.8rem", color: "#6B7280", fontWeight: 600 }}>Trạng thái KD:</span>
              <select
                value={detail.status === "active" ? "DangKinhDoanh" : "TamNgung"}
                onChange={async (e) => {
                  const val = e.target.value;
                  setStatusError("");
                  if (app.realApi || isRealApiEnabled()) {
                    const prodId = Number(detail.id);
                    if (Number.isNaN(prodId)) {
                      setStatusError("ID sản phẩm không hợp lệ.");
                      return;
                    }
                    try {
                      await catalogApi.adminDoiTrangThaiSanPham(prodId, val);
                      await app.refreshCatalog?.();
                    } catch (err) {
                      setStatusError(err instanceof Error ? err.message : "Lỗi đổi trạng thái kinh doanh.");
                    }
                    return;
                  }
                  app.saveProduct({ ...detail, status: val === "DangKinhDoanh" ? "active" : "inactive" });
                }}
                style={{ border: "1px solid var(--color-bone)", borderRadius: 6, padding: "3px 8px", fontSize: "0.78rem", background: "white" }}
              >
                <option value="DangKinhDoanh">Đang kinh doanh</option>
                <option value="TamNgung">Tạm ngưng</option>
                <option value="NgungKinhDoanh">Ngừng kinh doanh</option>
              </select>
            </div>
            <p style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: "8px" }}>Số lượng thiết bị chỉ thay đổi qua phiếu nhập hàng.</p>
          </div>
        )}
      </div>
      {action && <ProductForm app={app} product={action === "new" ? undefined : action} onClose={() => setAction(null)} />}
    </div>
  );
}

// ─── Equipment Tab (list + transfer) ─────────────────────────────────────────
