import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { isRealApiEnabled } from "../../services/apiClient";
import { catalogApi } from "../../services/api/catalogApi";
import { mapSanPhamToProduct } from "../../services/mappers";
import { fmt, type Product } from "../../store";
import { ProductForm } from "./forms/ProductForm";
import { Can, useHasPerm } from "../../features/permissions/PermissionsContext";
import { Permissions } from "../../constants/permissions";
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";

export function ProductsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const hasPerm = useHasPerm();
  const canView = hasPerm(Permissions.SanPham_Xem);
  const canUpdate = hasPerm(Permissions.SanPham_CapNhat);

  const [sel, setSel] = useState<string | null>(null);
  const [action, setAction] = useState<Product | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [statusError, setStatusError] = useState("");
  const [adminProducts, setAdminProducts] = useState<Product[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const isRealApi = app.realApi || isRealApiEnabled();
  const categoriesRef = useRef(app.categories);
  categoriesRef.current = app.categories;

  // Chỉ tải danh sách sản phẩm quản lý từ endpoint có kiểm tra quyền SanPham.Xem (không lấy fallback từ API public)
  const loadAdminProducts = useCallback(async () => {
    if (!isRealApi || !canView) {
      setAdminProducts(null);
      return;
    }
    setLoadingList(true);
    setStatusError("");
    try {
      const res = await catalogApi.adminLayDanhSachSanPham({ soMoiTrang: 200 });
      const mapped = (res.items ?? []).map((sp) => mapSanPhamToProduct(sp, categoriesRef.current));
      setAdminProducts(mapped);
    } catch (err) {
      setAdminProducts([]);
      setStatusError(err instanceof Error ? err.message : "Không thể tải danh sách sản phẩm quản lý.");
    } finally {
      setLoadingList(false);
    }
  }, [isRealApi, canView]);

  useEffect(() => {
    void loadAdminProducts();
  }, [loadAdminProducts]);

  const sourceProducts = isRealApi ? (adminProducts ?? []) : app.products;
  const categories = ["Tất cả", ...Array.from(new Set(sourceProducts.map((p) => p.category)))];
  const filteredProducts = sourceProducts.filter((p) => {
    const matchCat = catFilter === "Tất cả" || p.category === catFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.displayCode ?? p.id).toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchStatus && matchSearch;
  });

  const paging = usePagination(filteredProducts, 8);
  const detail = sel ? sourceProducts.find((p) => p.id === sel) : null;

  if (!canView) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[var(--color-bone)] text-sm text-gray-600">
        Bạn không có quyền <strong>Xem sản phẩm ({Permissions.SanPham_Xem})</strong>. Vui lòng liên hệ Quản trị viên.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="adm-page-title adm-page-title--compact">Quản lý sản phẩm</h2>
          <p className="adm-page-subtitle adm-page-subtitle--sm">Tra cứu, quản lý danh mục và thông tin niêm yết thiết bị cắm trại.</p>
        </div>
        <Can perm={Permissions.SanPham_Tao}>
          <button onClick={() => setAction("new")} className="adm-btn-primary">+ Thêm sản phẩm</button>
        </Can>
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
          placeholder="Tìm tên sản phẩm, mã, thương hiệu..."
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          aria-label="Lọc trạng thái kinh doanh"
          className="adm-select adm-select--min"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang kinh doanh</option>
          <option value="inactive">Tạm ngừng / Ngừng KD</option>
        </select>
        <span className="adm-count-text">
          Tìm thấy <strong>{filteredProducts.length}</strong> / {sourceProducts.length} sản phẩm
        </span>
      </div>

      {loadingList && <div className="adm-loading-text mb-3">Đang tải danh sách sản phẩm...</div>}

      {/* Bố cục 2 cột khi có sản phẩm được chọn xem chi tiết */}
      <div className={`adm-split-detail ${detail ? "has-detail" : ""}`}>
        <div>
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
                  {paging.pagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-sm text-gray-500">
                        Không tìm thấy sản phẩm nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    paging.pagedItems.map((p) => {
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
                            <span className={`adm-avail-count ${avail > 0 ? "is-ok" : ""}`}>{avail}</span>/{total}
                          </td>
                          <td>
                            <Can perm={Permissions.SanPham_CapNhat}>
                              <button onClick={(event) => { event.stopPropagation(); setAction(p); }} className="adm-btn-parchment adm-btn-xs">Sửa</button>
                            </Can>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={paging.page}
            totalPages={paging.totalPages}
            totalItems={paging.totalItems}
            startIndex={paging.startIndex}
            endIndex={paging.endIndex}
            onPageChange={paging.setPage}
            itemLabel="sản phẩm"
          />
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
                disabled={!canUpdate || changingStatus}
                value={detail.rawStatus || (detail.status === "active" ? "DangKinhDoanh" : "TamNgung")}
                onChange={async (e) => {
                  const val = e.target.value;
                  setStatusError("");
                  if (isRealApi) {
                    const prodId = Number(detail.id);
                    if (Number.isNaN(prodId)) {
                      setStatusError("ID sản phẩm không hợp lệ.");
                      return;
                    }
                    setChangingStatus(true);
                    try {
                      await catalogApi.adminDoiTrangThaiSanPham(prodId, val);
                      await Promise.all([loadAdminProducts(), app.refreshCatalog?.()]);
                    } catch (err) {
                      setStatusError(err instanceof Error ? err.message : "Lỗi đổi trạng thái kinh doanh.");
                    } finally {
                      setChangingStatus(false);
                    }
                    return;
                  }
                  app.saveProduct({ ...detail, status: val === "DangKinhDoanh" ? "active" : "inactive", rawStatus: val });
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
      {action && (
        <ProductForm
          app={app}
          product={action === "new" ? undefined : action}
          onClose={() => {
            setAction(null);
            void loadAdminProducts();
          }}
        />
      )}
    </div>
  );
}
