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
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Nhà cung cấp</h2>
          <p style={{ color: "#6B7280", fontSize: "0.8rem" }}>Quản lý đối tác cung ứng thiết bị và theo dõi hồ sơ lịch sử nhập hàng (UC7.1 - UC7.4).</p>
        </div>
        <button onClick={() => setAction("new")} style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Thêm NCC mới</button>
      </div>

      {/* Thanh công cụ tìm kiếm và lọc trạng thái (UC7.3 & UC7.4) */}
      <div className="flex gap-3 mb-4 flex-wrap items-center" style={{ background: "white", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--color-bone)" }}>
        <input
          type="text"
          placeholder="🔍 Tìm theo mã NCC, tên công ty, người liên hệ, SĐT, MST..."
          value={supplierSearch}
          onChange={(e) => setSupplierSearch(e.target.value)}
          style={{ flex: 1, minWidth: 240, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.82rem" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          aria-label="Lọc theo tình trạng hợp tác"
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.82rem", background: "white" }}
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
            style={{ background: "none", border: "none", color: "#DC2626", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}
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
            <div key={s.id} style={{ background: "white", borderRadius: "10px", padding: "16px 20px", border: "1px solid var(--color-bone)", display: "flex", gap: "14px", alignItems: "center" }}>
              <div style={{ width: 44, height: 44, color: "var(--color-forest)", background: "var(--color-parchment)", borderRadius: "10px", display: "grid", placeItems: "center" }}>
                <Icon name="truck" size={21} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-moss)", fontWeight: 700 }}>{s.displayCode}</span>
                  <span style={{ background: s.cooperationStatus === "active" ? "#DCFCE7" : "#F3F4F6", color: s.cooperationStatus === "active" ? "#15803D" : "#6B7280", padding: "1px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>
                    {s.cooperationStatus === "active" ? "Đang hợp tác" : "Ngừng hợp tác"}
                  </span>
                  {s.statusReason && (
                    <span style={{ fontSize: "0.7rem", color: "#9CA3AF", fontStyle: "italic" }}>
                      ({s.statusReason})
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{s.name}</div>
                <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                  {s.contactPerson} · 📞 {s.phone} · {receipts.length} phiếu ({confirmedReceipts.length} đã chốt)
                </div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Tổng lũy kế đã chốt</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "0.95rem" }}>{fmt(total)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSupplierProfile(s)}
                    style={{ border: "1px solid var(--color-forest)", borderRadius: 6, background: "var(--color-forest)", color: "white", padding: "5px 10px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                  >
                    👁 Hồ sơ NCC (UC7.3)
                  </button>
                  <button
                    onClick={() => setAction(s)}
                    style={{ border: "1px solid var(--color-bone)", borderRadius: 6, background: "white", padding: "5px 10px", cursor: "pointer", fontSize: "0.75rem" }}
                  >
                    Sửa
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredSuppliers.length === 0 && (
          <div style={{ background: "white", borderRadius: 10, padding: 32, textAlign: "center", color: "#9CA3AF", border: "1px dashed var(--color-bone)" }}>
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
