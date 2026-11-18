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
          <h2 className="adm-page-title adm-page-title--compact">Quản lý sản phẩm</h2>
          <p className="adm-page-subtitle adm-page-subtitle--sm">Tra cứu, quản lý danh mục và thông tin niêm yết thiết bị cắm trại.</p>
        </div>
        <button onClick={() => setAction("new")} className="adm-btn-primary">+ Thêm sản phẩm</button>
      </div>

      {statusError && (
        <div role="alert" className="adm-alert is-error-solid adm-alert--block">
          {statusError}
        </div>
      )}

      {/* UC6.7: Thanh tìm kiếm từ khóa & Bộ lọc danh mục */}
      <div className="adm-toolbar">
        <input
          type="text"
          placeholder="🔍 Tìm tên sản phẩm, mã, thương hiệu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="adm-search-input"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          aria-label="Lọc theo danh mục"
          className="adm-select adm-select--min"
        >
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="adm-count-text">
          Tìm thấy <strong>{filteredProducts.length}</strong> / {app.products.length} sản phẩm
        </span>
      </div>

      {/* Bố cục 2 cột khi có sản phẩm được chọn xem chi tiết */}
      <div className={`adm-split-detail ${detail ? "has-detail" : ""}`}>
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table adm-table--zebra adm-table--md">
              <thead>
                <tr>
                  {["Mã", "Sản phẩm", "Danh mục", "Giá/ngày", "Cọc", "Bồi thường", "Khả dụng", ""].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const avail = app.getAvailable(p.id);
                  const total = app.equipment.filter((e) => e.productId === p.id).length;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSel(sel === p.id ? null : p.id)}
                      className={`is-clickable ${sel === p.id ? "is-selected" : ""}`}
                    >
                      <td className="adm-cell-mono text-xs text-[var(--color-moss)]">{p.displayCode ?? p.id}</td>
                      <td>
                        <div className="font-semibold text-[0.85rem]">{p.name}</div>
                        <div className="adm-cell-sub">{p.brand}</div>
                      </td>
                      <td className="adm-cell-muted">{p.category}</td>
                      <td className="adm-cell-mono font-semibold text-[0.82rem]">{fmt(p.pricePerDay)}</td>
                      <td className="adm-cell-mono text-[0.78rem]">{fmt(p.deposit)}</td>
                      <td className="adm-cell-mono text-[0.78rem]">{fmt(p.compensation)}</td>
                      <td className="adm-cell-mono text-[0.82rem]">
                        <span className={`adm-avail-count ${avail > 1 ? "is-ok" : ""}`}>{avail}</span>/{total}
                      </td>
                      <td>
                        <button onClick={(event) => { event.stopPropagation(); setAction(p); }} className="adm-btn-parchment adm-btn-xs">Sửa</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {detail && (
          <div className="adm-detail-panel">
            <div className="flex justify-between items-start mb-3">
              <h3 className="adm-card-title text-base">{detail.name}</h3>
              <button onClick={() => setSel(null)} className="adm-btn-ghost text-[#9CA3AF]">×</button>
            </div>
            <img src={detail.image} alt={detail.name} className="adm-detail-img" />
            {[["Mã hiển thị", detail.displayCode ?? detail.id], ["Thương hiệu", detail.brand], ["Danh mục", detail.category], ["Sức chứa", detail.capacity || "—"], ["Kích thước", detail.dimensions || "—"], ["Giá thuê/ngày", fmt(detail.pricePerDay)], ["Mức cọc/thiết bị", fmt(detail.deposit)], ["Giá trị bồi thường", fmt(detail.compensation)], ["Đánh giá", `${detail.rating}★ (${detail.reviews})`]].map(([k, v]) => (
              <div key={k} className="adm-detail-row">
                <span className="adm-detail-row-label">{k}</span>
                <span className={`adm-detail-row-val ${k.includes("Giá") || k.includes("Cọc") || k.includes("Bồi") ? "is-mono" : ""}`}>{v}</span>
              </div>
            ))}
            {/* UC53 / UC6.8: Thay đổi trạng thái kinh doanh của sản phẩm */}
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-dashed border-[var(--color-bone)]">
              <span className="adm-count-text font-semibold">Trạng thái KD:</span>
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
                className="adm-select adm-select--xs flex-none"
              >
                <option value="DangKinhDoanh">Đang kinh doanh</option>
                <option value="TamNgung">Tạm ngưng</option>
                <option value="NgungKinhDoanh">Ngừng kinh doanh</option>
              </select>
            </div>
            <p className="adm-muted-note mt-2">Số lượng thiết bị chỉ thay đổi qua phiếu nhập hàng.</p>
          </div>
        )}
      </div>
      {action && <ProductForm app={app} product={action === "new" ? undefined : action} onClose={() => setAction(null)} />}
    </div>
  );
}

// ─── Equipment Tab (list + transfer) ─────────────────────────────────────────
