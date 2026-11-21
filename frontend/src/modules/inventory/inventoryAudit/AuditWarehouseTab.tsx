import type { Product } from "../../../store";
import type { AuditEquipmentView, AuditItemState } from "./useInventoryAudit";

interface Props {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  totalCount: number;
  discrepancyCount: number;
  filteredWarehouse: AuditEquipmentView[];
  products: Product[];
  auditStates: Record<string, AuditItemState>;
  onUpdateItem: (id: string, update: Partial<AuditItemState>) => void;
}

export default function AuditWarehouseTab({
  searchTerm,
  onSearchChange,
  totalCount,
  discrepancyCount,
  filteredWarehouse,
  products,
  auditStates,
  onUpdateItem,
}: Props) {
  return (
    <div className="grid gap-3">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="🔍 Quét barcode / mã thiết bị hoặc tên sản phẩm..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border border-[var(--color-bone,#E5E7EB)] rounded-lg px-3 py-1.5 text-xs w-80"
        />
        <div className="flex gap-2 text-xs">
          <span className="bg-gray-100 px-2 py-1 rounded-md">
            Tổng kho: <strong>{totalCount}</strong>
          </span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md">
            Khớp: <strong>{totalCount - discrepancyCount}</strong>
          </span>
          {discrepancyCount > 0 && (
            <span className="bg-red-100 text-red-600 px-2 py-1 rounded-md">
              Sai lệch: <strong>{discrepancyCount}</strong> thiết bị
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-[var(--color-bone,#E5E7EB)] rounded-xl">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--color-parchment,#F5F1E9)] font-semibold">
              <th className="px-2.5 py-2 text-left">Mã thiết bị</th>
              <th className="px-2.5 py-2 text-left">Sản phẩm</th>
              <th className="px-2.5 py-2 text-center">Trạng thái sổ sách</th>
              <th className="px-2.5 py-2 text-left">Kết quả kiểm đếm thực tế</th>
              <th className="px-2.5 py-2 text-left">Ghi chú sai lệch (nếu có)</th>
            </tr>
          </thead>
          <tbody>
            {filteredWarehouse.map((e) => {
              const prod = products.find((p) => p.id === e.productId);
              const st = auditStates[e.id] || { checkResult: "Khớp", note: "" };
              const hasDiscrepancy = st.checkResult !== "Khớp";
              return (
                <tr
                  key={e.id}
                  className={`border-t border-[var(--color-bone,#E5E7EB)] ${hasDiscrepancy ? "bg-amber-50" : "bg-white"}`}
                >
                  <td className="px-2.5 py-2 font-mono font-bold text-[var(--color-forest,#15803D)]">
                    {e.displayCode || e.id}
                  </td>
                  <td className="px-2.5 py-2">{e.productName || prod?.name || "—"}</td>
                  <td className="px-2.5 py-2 text-center">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg text-[0.72rem] font-semibold">
                      {e.equipmentStatus}
                    </span>
                  </td>
                  <td className="px-2.5 py-2">
                    <select
                      value={st.checkResult}
                      onChange={(ev) =>
                        onUpdateItem(e.id, { checkResult: ev.target.value as AuditItemState["checkResult"] })
                      }
                      className={`rounded-md px-2 py-1 text-xs ${
                        hasDiscrepancy
                          ? "border border-amber-500 font-bold bg-amber-100 text-amber-800"
                          : "border border-[var(--color-bone,#E5E7EB)] font-medium bg-white"
                      }`}
                    >
                      <option value="Khớp">🟢 Khớp (Có mặt, bình thường)</option>
                      <option value="Đang bảo trì">🟡 Hỏng (Cần đưa bảo trì)</option>
                      <option value="Thất lạc">🔴 Thiếu (Thất lạc kiểm kê)</option>
                      <option value="Ngừng sử dụng">⚫ Hỏng nặng (Ngừng dùng)</option>
                    </select>
                  </td>
                  <td className="px-2.5 py-2">
                    <input
                      type="text"
                      placeholder={hasDiscrepancy ? "Nhập nguyên nhân sai lệch..." : "Không có ghi chú"}
                      value={st.note}
                      disabled={!hasDiscrepancy}
                      onChange={(ev) => onUpdateItem(e.id, { note: ev.target.value })}
                      className={`w-full border border-[var(--color-bone,#E5E7EB)] rounded-md px-2 py-1 text-xs ${
                        hasDiscrepancy ? "bg-white" : "bg-gray-50"
                      }`}
                    />
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
