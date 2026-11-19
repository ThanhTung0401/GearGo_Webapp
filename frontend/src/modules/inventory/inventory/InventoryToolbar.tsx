interface InventoryToolbarProps {
  message: { type: "success" | "error"; text: string } | null;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  supplierFilter: string;
  setSupplierFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  fromDate: string;
  setFromDate: (v: string) => void;
  toDate: string;
  setToDate: (v: string) => void;
  supplierOptions: string[];
  statusOptions: string[];
  onCreateNew: () => void;
  onClearFilters: () => void;
}

/**
 * Phần đầu trang và thanh lọc đa chiều phiếu nhập hàng theo NCC, trạng thái và khoảng ngày (UC7.8).
 */
export function InventoryToolbar({
  message,
  searchQuery,
  setSearchQuery,
  supplierFilter,
  setSupplierFilter,
  statusFilter,
  setStatusFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  supplierOptions,
  statusOptions,
  onCreateNew,
  onClearFilters,
}: InventoryToolbarProps) {
  const hasFilters = supplierFilter !== "Tất cả" || statusFilter !== "Tất cả" || fromDate || toDate || searchQuery;

  return (
    <>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="adm-page-title adm-page-title--compact">Phiếu nhập hàng</h2>
          <p className="adm-page-subtitle adm-page-subtitle--sm">Phiếu nháp không làm thay đổi tồn kho cho đến khi được kiểm nhận và xác nhận (UC7.7).</p>
        </div>
        <button onClick={onCreateNew} className="adm-btn-primary">+ Tạo phiếu nháp</button>
      </div>
      {message && (
        <div role="status" className={`adm-alert ${message.type === "success" ? "is-success" : "is-error-solid"}`}>{message.text}</div>
      )}

      {/* UC7.8: Bộ lọc Nhà cung cấp, Trạng thái & Khoảng ngày */}
      <div className="adm-toolbar">
        <input
          type="text"
          placeholder="🔍 Tìm mã phiếu, NCC, người lập..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="adm-search-input"
        />
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          aria-label="Lọc theo nhà cung cấp"
          className="adm-select adm-select--sm"
        >
          {supplierOptions.map((s) => <option key={s} value={s}>{s === "Tất cả" ? "Tất cả NCC" : s}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc theo trạng thái phiếu"
          className="adm-select adm-select--sm"
        >
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <span className="adm-count-text text-xs">Từ:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="adm-date-input"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="adm-count-text text-xs">Đến:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="adm-date-input"
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="adm-clear-filter-btn"
          >
            ✕ Xóa lọc
          </button>
        )}
      </div>
    </>
  );
}
