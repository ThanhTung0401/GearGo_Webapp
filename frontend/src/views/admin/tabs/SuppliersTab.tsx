import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";

import { fmt, type Supplier } from "../../../store";
import Icon from "../../../components/Icon";

import SupplierProfileModal from "../../../components/SupplierProfileModal";

import { SupplierForm } from "../forms/SupplierForm";

export function SuppliersTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [action, setAction] = useState<Supplier | "new" | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedSupplierProfile, setSelectedSupplierProfile] = useState<Supplier | null>(null);

  const filteredSuppliers = app.suppliers.filter((s) => {
    const matchStatus = statusFilter === "all" || s.cooperationStatus === statusFilter;
    const query = supplierSearch.toLowerCase().trim();
    const matchSearch =
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.displayCode.toLowerCase().includes(query) ||
      s.contactPerson.toLowerCase().includes(query) ||
      s.phone.includes(query) ||
      (s.taxCode && s.taxCode.includes(query)) ||
      (s.address && s.address.toLowerCase().includes(query));
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="adm-page-title adm-page-title--compact">Nhà cung cấp</h2>
          <p className="adm-page-subtitle adm-page-subtitle--sm">Quản lý đối tác cung ứng thiết bị và theo dõi hồ sơ lịch sử nhập hàng (UC7.1 - UC7.4).</p>
        </div>
        <button onClick={() => setAction("new")} className="adm-btn-primary">+ Thêm NCC mới</button>
      </div>

      {/* Thanh công cụ tìm kiếm và lọc trạng thái (UC7.3 & UC7.4) */}
      <div className="adm-toolbar">
        <input
          type="text"
          placeholder="🔍 Tìm theo mã NCC, tên công ty, người liên hệ, SĐT, MST..."
          value={supplierSearch}
          onChange={(e) => setSupplierSearch(e.target.value)}
          className="adm-search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          aria-label="Lọc theo tình trạng hợp tác"
          className="adm-select adm-select--sm"
        >
          <option value="all">Tất cả trạng thái ({app.suppliers.length})</option>
          <option value="active">Đang hợp tác ({app.suppliers.filter((s) => s.cooperationStatus === "active").length})</option>
          <option value="inactive">Ngừng hợp tác ({app.suppliers.filter((s) => s.cooperationStatus === "inactive").length})</option>
        </select>
        {(supplierSearch || statusFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSupplierSearch("");
              setStatusFilter("all");
            }}
            className="adm-clear-filter-btn"
          >
            ✕ Xóa lọc
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {filteredSuppliers.map((s) => {
          const receipts = app.importReceipts.filter((receipt) => receipt.supplierId === s.id || receipt.supplierId === s.displayCode);
          const confirmedReceipts = receipts.filter((receipt) => receipt.status === "Đã nhập kho");
          const total = confirmedReceipts.reduce((sum, receipt) => sum + receipt.lines.reduce((lineSum, line) => lineSum + line.quantity * line.unitPrice, 0), 0);
          return (
            <div key={s.id} className="adm-supplier-card">
              <div className="adm-supplier-icon">
                <Icon name="truck" size={21} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="adm-cell-mono text-xs text-[var(--color-moss)] font-bold">{s.displayCode}</span>
                  <span className={`adm-pill adm-pill--round adm-pill--xs ${s.cooperationStatus === "active" ? "is-success" : "is-neutral"}`}>
                    {s.cooperationStatus === "active" ? "Đang hợp tác" : "Ngừng hợp tác"}
                  </span>
                  {s.statusReason && (
                    <span className="text-[0.7rem] text-[#9CA3AF] italic">
                      ({s.statusReason})
                    </span>
                  )}
                </div>
                <div className="font-bold text-[0.95rem]">{s.name}</div>
                <div className="adm-cell-muted">
                  {s.contactPerson} · 📞 {s.phone} · {receipts.length} phiếu ({confirmedReceipts.length} đã chốt)
                </div>
              </div>
              <div className="adm-supplier-right">
                <div>
                  <div className="adm-muted-note">Tổng lũy kế đã chốt</div>
                  <div className="adm-cell-mono font-bold text-[var(--color-forest)] text-[0.95rem]">{fmt(total)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSupplierProfile(s)}
                    className="adm-btn-forest-solid"
                  >
                    👁 Hồ sơ NCC (UC7.3)
                  </button>
                  <button
                    onClick={() => setAction(s)}
                    className="adm-btn-outline"
                  >
                    Sửa
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredSuppliers.length === 0 && (
          <div className="adm-empty-box">
            Không tìm thấy nhà cung cấp nào phù hợp.
          </div>
        )}
      </div>

      {action && <SupplierForm app={app} supplier={action === "new" ? undefined : action} onClose={() => setAction(null)} />}
      {selectedSupplierProfile && (
        <SupplierProfileModal
          supplier={selectedSupplierProfile}
          app={app}
          onClose={() => setSelectedSupplierProfile(null)}
          onOpenReceipt={(receiptId) => {
            setSelectedSupplierProfile(null);
            // Có thể mở xem chi tiết phiếu nếu cần
          }}
        />
      )}
    </div>
  );
}

// ─── Promotions (UC8.2 - UC8.5) ───────────────────────────────────────────────
