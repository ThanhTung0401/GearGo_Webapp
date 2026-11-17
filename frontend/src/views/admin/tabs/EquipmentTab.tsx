import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";

import { type Equipment } from "../../../store";

import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";

import { EquipmentForm } from "../forms/EquipmentForm";
import { TransferPanel } from "./TransferPanel";

export function EquipmentTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [view, setView] = useState<"list" | "transfer">("list");
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
    return (filterProduct === "Tất cả" || pname === filterProduct) &&
      (filterStatus === "Tất cả" || e.equipmentStatus === filterStatus);
  });

  if (view === "transfer") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-forest)", fontWeight: 600 }}>← Quay lại</button>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Chuyển loại sản phẩm cho thuê</h2>
        </div>
        <TransferPanel app={app} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Quản lý thiết bị</h2>
        <button onClick={() => setView("transfer")}
          style={{ background: "var(--color-amber)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
        >
          🔄 Chuyển loại thiết bị
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.85rem", background: "white" }}
        >
          {productNames.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.85rem", background: "white" }}
        >
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="flex gap-2">
          {["Sẵn sàng", "Đang thuê", "Đang bảo trì"].map((s) => {
            const cnt = app.equipment.filter((e) => e.equipmentStatus === s).length;
            const st = statusStyle[s];
            return <div key={s} style={{ background: st.bg, color: st.text, padding: "5px 12px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600 }}>{s}: {cnt}</div>;
          })}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Mã", "Sản phẩm hiện tại", "Nguồn nhập gốc", "Ngày nhập", "Điều kiện", "Trạng thái", "Lần thuê", "Thao tác"].map((h) => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => {
              const p = app.products.find((pr) => pr.id === e.productId);
              const origP = app.products.find((pr) => pr.id === e.originalProductId);
              const moved = e.productId !== e.originalProductId;
              const st = statusStyle[e.equipmentStatus] || { bg: "#F3F4F6", text: "#374151" };
              return (
                <tr key={e.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                  <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-forest)" }}>{e.displayCode ?? e.id}</td>
                  <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>
                    <div style={{ fontWeight: 600 }}>{p?.name}</div>
                    {moved && <div style={{ fontSize: "0.68rem", color: "var(--color-amber)" }}>↳ Chuyển từ {origP?.name}</div>}
                  </td>
                  <td style={{ padding: "9px 12px", fontSize: "0.75rem", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>{e.importReceiptId}</td>
                  <td style={{ padding: "9px 12px", fontSize: "0.75rem", color: "#6B7280", fontFamily: "var(--font-mono)" }}>{e.importDate}</td>
                  <td style={{ padding: "9px 12px", fontSize: "0.8rem" }}>{e.condition}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ background: st.bg, color: st.text, padding: "2px 8px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 600 }}>{e.equipmentStatus}</span>
                  </td>
                  <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", textAlign: "center" }}>{e.rentCount}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <div className="flex gap-1">
                      <button onClick={() => setViewingLifecycle(e)} style={{ border: "1px solid var(--color-forest)", color: "var(--color-forest)", borderRadius: 6, padding: "4px 8px", background: "white", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>🔍 Sổ đời</button>
                      <button onClick={() => setEditing(e)} style={{ border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", background: "white", cursor: "pointer", fontSize: "0.72rem" }}>Sửa</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && <EquipmentForm app={app} equipment={editing} onClose={() => setEditing(null)} />}
      {viewingLifecycle && <EquipmentLifecycleModal equipment={viewingLifecycle} app={app} onClose={() => setViewingLifecycle(null)} />}
    </div>
  );
}

