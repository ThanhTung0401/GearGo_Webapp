import { useState } from "react";
import { useApp } from "../../context/AppContext";

import { formatDateVi, type Equipment } from "../../store";

import EquipmentLifecycleModal from "../../components/EquipmentLifecycleModal";
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";

import { EquipmentForm } from "./forms/EquipmentForm";
import { TransferPanel } from "../reports/TransferPanel";

export function EquipmentTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [view, setView] = useState<"list" | "transfer">("list");
  const [searchSerial, setSearchSerial] = useState("");
  const [filterProduct, setFilterProduct] = useState("Tất cả");
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [editing, setEditing] = useState<ReturnType<typeof useApp>["equipment"][number] | null>(null);
  const [viewingLifecycle, setViewingLifecycle] = useState<Equipment | null>(null);

  const statusStyle: Record<string, { bg: string; text: string }> = {
    "Sẵn sàng": { bg: "#DCFCE7", text: "#15803D" },
    "Đang thuê": { bg: "#DBEAFE", text: "#1D4ED8" },
    "Đang bảo trì": { bg: "#FEF3C7", text: "#B45309" },
    "Thất lạc": { bg: "#FEE2E2", text: "#DC2626" },
    "Ngừng sử dụng": { bg: "#F3F4F6", text: "#6B7280" },
  };

  const productNames = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.name)))];
  const statuses = ["Tất cả", "Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"];

  const filtered = app.equipment.filter((e) => {
    const pname = app.products.find((p) => p.id === e.productId)?.name || "";
    const q = searchSerial.trim().toLowerCase();
    const matchSerial = !q || (e.displayCode ?? "").toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || pname.toLowerCase().includes(q);
    return matchSerial &&
      (filterProduct === "Tất cả" || pname === filterProduct) &&
      (filterStatus === "Tất cả" || e.equipmentStatus === filterStatus);
  });
  const paging = usePagination(filtered, 10);

  if (view === "transfer") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setView("list")} className="adm-btn-link font-semibold text-[var(--color-forest)]">← Quay lại</button>
          <h2 className="adm-page-title adm-page-title--compact">Chuyển loại sản phẩm cho thuê</h2>
        </div>
        <TransferPanel app={app} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="adm-page-title adm-page-title--compact">Quản lý thiết bị</h2>
        <button onClick={() => setView("transfer")} className="adm-btn-amber">
          🔄 Chuyển loại thiết bị
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          type="text"
          value={searchSerial}
          onChange={(e) => setSearchSerial(e.target.value)}
          placeholder="🔍 Tìm mã thiết bị (Serial)..."
          aria-label="Tìm mã thiết bị Serial"
          className="adm-search-input"
          style={{ maxWidth: 230 }}
        />
        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="adm-select adm-select--sm">
          {productNames.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="adm-select adm-select--sm">
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="flex gap-2 flex-wrap">
          {["Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"].map((s) => {
            const cnt = app.equipment.filter((e) => e.equipmentStatus === s).length;
            const st = statusStyle[s];
            /* Màu nền/chữ chip đếm lấy động từ bảng màu trạng thái statusStyle */
            return <div key={s} className="adm-pill" style={{ background: st.bg, color: st.text }}>{s}: {cnt}</div>;
          })}
        </div>
      </div>

      <div className="adm-table-wrap">
        <div className="adm-table-scroll">
          <table className="adm-table adm-table--zebra adm-table--md">
            <thead>
              <tr>
                {["Mã", "Sản phẩm hiện tại", "Nguồn nhập gốc", "Ngày nhập", "Điều kiện", "Trạng thái", "Lần thuê", "Thao tác"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paging.pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-sm text-gray-500">
                    Không tìm thấy thiết bị nào phù hợp.
                  </td>
                </tr>
              ) : (
                paging.pagedItems.map((e) => {
                  const p = app.products.find((pr) => pr.id === e.productId);
                  const origP = app.products.find((pr) => pr.id === e.originalProductId);
                  const moved = e.productId !== e.originalProductId;
                  const st = statusStyle[e.equipmentStatus] || { bg: "#F3F4F6", text: "#374151" };
                  return (
                    <tr key={e.id}>
                      <td className="adm-cell-code">{e.displayCode ?? e.id}</td>
                      <td>
                        <div className="font-semibold">{p?.name}</div>
                        {moved && <div className="text-[0.68rem] text-[var(--color-amber)]">↳ Chuyển từ {origP?.name}</div>}
                      </td>
                      <td className="adm-cell-mono adm-muted-note">{e.importReceiptId || "—"}</td>
                      <td className="adm-cell-mono adm-hint-text">{formatDateVi(e.importDate)}</td>
                      <td>{e.condition}</td>
                      <td>
                        {/* Huy hiệu trạng thái thiết bị tô màu động theo statusStyle */}
                        <span className="adm-pill adm-pill--round" style={{ background: st.bg, color: st.text }}>{e.equipmentStatus}</span>
                      </td>
                      <td className="adm-cell-mono adm-cell-center">{e.rentCount}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => setViewingLifecycle(e)} className="adm-btn-forest-outline adm-btn-xs">🔍 Sổ đời</button>
                          <button onClick={() => setEditing(e)} className="adm-btn-outline adm-btn-xs">Sửa</button>
                        </div>
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
        itemLabel="thiết bị"
      />
      {editing && <EquipmentForm app={app} equipment={editing} onClose={() => setEditing(null)} />}
      {viewingLifecycle && <EquipmentLifecycleModal equipment={viewingLifecycle} app={app} onClose={() => setViewingLifecycle(null)} />}
    </div>
  );
}

