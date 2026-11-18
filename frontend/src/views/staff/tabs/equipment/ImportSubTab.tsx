import { useApp } from "../../../../context/AppContext";
import { ImportReceipt, Supplier } from "../../../../store";

interface ImportSubTabProps {
  app: ReturnType<typeof useApp>;
  importSearch: string;
  setImportSearch: (v: string) => void;
  importStatusFilter: string;
  setImportStatusFilter: (v: string) => void;
  setInspectingImportReceipt: (r: ImportReceipt | null) => void;
  setViewingSupplierProfile: (s: Supplier | null) => void;
}

// Sub-tab Quản lý nhập hàng & Kiểm nhận thực tế tại kho cho nhân viên (UC7.3 - UC7.8)
export function ImportSubTab({
  app,
  importSearch,
  setImportSearch,
  importStatusFilter,
  setImportStatusFilter,
  setInspectingImportReceipt,
  setViewingSupplierProfile,
}: ImportSubTabProps) {
  // Đảo ngược thứ tự mới nhất lên đầu và lọc theo trạng thái + từ khóa tìm kiếm
  const visibleReceipts = app.importReceipts
    .slice()
    .reverse()
    .filter((r) => {
      const matchStatus = importStatusFilter === "Tất cả" || r.status === importStatusFilter;
      const q = importSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        (r.displayCode ?? r.id).toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        r.createdBy.toLowerCase().includes(q);
      return matchStatus && matchQ;
    });

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="so-section-title">
            Quản lý nhập hàng & Kiểm nhận thực tế tại kho (UC7.3 - UC7.8)
          </h3>
          <p className="so-section-sub">
            Khi xe hàng tới kho, nhân viên kho mở biên bản kiểm nhận thực tế để đếm số lượng, phân loại đạt/lỗi/từ chối và chốt mã serial.
          </p>
        </div>
      </div>

      {/* Bộ lọc tìm kiếm cho nhân viên kho */}
      <div className="flex gap-3 mb-4 flex-wrap items-center so-filter-bar">
        <input
          type="text"
          placeholder="🔍 Tìm mã phiếu, NCC, người lập..."
          value={importSearch}
          onChange={(e) => setImportSearch(e.target.value)}
          className="so-filter-input"
        />
        <select
          value={importStatusFilter}
          onChange={(e) => setImportStatusFilter(e.target.value)}
          aria-label="Lọc theo trạng thái phiếu"
          className="so-select-sm"
        >
          {["Tất cả", "Nháp", "Đã nhập kho", "Đã hủy"].map((s) => (
            <option key={s} value={s}>
              {s === "Tất cả" ? "Tất cả trạng thái" : s}
            </option>
          ))}
        </select>
        {(importSearch || importStatusFilter !== "Tất cả") && (
          <button
            type="button"
            onClick={() => {
              setImportSearch("");
              setImportStatusFilter("Tất cả");
            }}
            className="so-btn-clear"
          >
            ✕ Xóa lọc
          </button>
        )}
      </div>

      <div className="responsive-table so-table-card">
        <table className="so-table so-zebra-table so-table-audit">
          <thead>
            <tr>
              {["Mã phiếu", "Nhà cung cấp", "Ngày lập / Người lập", "Số lượng mặt hàng", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleReceipts.map((r) => {
              const totalQty = r.lines.reduce((s, l) => s + l.quantity, 0);
              const supplier = app.suppliers.find((s) => s.id === r.supplierId || s.displayCode === r.supplierId);
              /* Ánh xạ trạng thái phiếu nhập sang modifier CSS hữu hạn */
              const importStatusMod =
                r.status === "Đã nhập kho"
                  ? "is-done"
                  : r.status === "Đã hủy"
                  ? "is-cancelled"
                  : "is-progress";
              return (
                <tr key={r.id}>
                  <td className="so-td-mono-lg">{r.displayCode ?? r.id}</td>
                  <td>
                    <div className="so-supplier-name">{r.supplierName}</div>
                    {supplier && (
                      <button
                        type="button"
                        onClick={() => setViewingSupplierProfile(supplier)}
                        className="so-link-btn-sm"
                      >
                        👁 Xem hồ sơ NCC (UC7.3)
                      </button>
                    )}
                  </td>
                  <td className="so-td-muted-sm">
                    <div>{r.createdAt}</div>
                    <div className="so-import-by">Bởi {r.createdBy}</div>
                  </td>
                  <td>
                    <strong>{r.lines.length}</strong> dòng · <strong>{totalQty}</strong> thiết bị
                  </td>
                  <td>
                    <span className={`so-status-badge is-wide ${importStatusMod}`}>{r.status}</span>
                  </td>
                  <td>
                    {r.status === "Nháp" ? (
                      <button
                        type="button"
                        onClick={() => setInspectingImportReceipt(r)}
                        className="so-btn-receive"
                      >
                        📦 Kiểm nhận thực tế (UC7.7) →
                      </button>
                    ) : (
                      <span className="so-import-done">
                        {r.status === "Đã nhập kho" ? `✓ Đã nhập kho lúc ${r.confirmedAt}` : "Phiếu đã hủy"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
