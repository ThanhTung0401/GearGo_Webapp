import type { Order, Product } from "../../../store";
import type { AuditEquipmentView } from "./useInventoryAudit";

interface Props {
  rentedEquipments: AuditEquipmentView[];
  products: Product[];
  orders: Order[];
}

export default function AuditRentedTab({ rentedEquipments, products, orders }: Props) {
  return (
    <div className="grid gap-3">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 flex gap-2.5 items-start">
        <span className="text-lg leading-none">ℹ️</span>
        <div>
          <strong>Dòng phụ 2.1 (Tách đồ đang thuê):</strong> Các thiết bị dưới đây đang trong tay khách hàng theo hợp đồng thuê còn hiệu lực.
          Hệ thống tự động loại trừ các thiết bị này, <strong>KHÔNG</strong> tính vào danh sách mất mát hay chênh lệch tại kho.
        </div>
      </div>

      {rentedEquipments.length === 0 ? (
        <div className="text-center p-8 text-gray-500 text-sm">
          Hiện tại không có thiết bị nào đang cho khách thuê.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--color-parchment,#F5F1E9)] font-semibold">
                <th className="px-3 py-2 text-left">Mã thiết bị</th>
                <th className="px-3 py-2 text-left">Sản phẩm</th>
                <th className="px-3 py-2 text-left">Đơn hàng đang thuê</th>
                <th className="px-3 py-2 text-left">Khách hàng</th>
                <th className="px-3 py-2 text-left">Ngày hẹn trả</th>
                <th className="px-3 py-2 text-center">Trạng thái đối chiếu</th>
              </tr>
            </thead>
            <tbody>
              {rentedEquipments.map((e) => {
                const prod = products.find((p) => p.id === e.productId);
                const ord = orders.find(
                  (o) =>
                    o.status === "Đang thuê" &&
                    (o.assignedEquipment?.some(
                      (ae) =>
                        ae.equipmentId === e.id ||
                        ae.equipmentDisplayCode === e.displayCode
                    ) ||
                      o.items.some((it) => it.equipmentId === e.id))
                );
                return (
                  <tr key={e.id} className="border-t border-[var(--color-bone,#E5E7EB)]">
                    <td className="px-3 py-2 font-mono font-bold text-blue-700">{e.displayCode || e.id}</td>
                    <td className="px-3 py-2">{e.productName || prod?.name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{ord?.displayCode || ord?.id || "Đang trong đơn"}</td>
                    <td className="px-3 py-2">{ord?.customerName || "Khách hàng GearGo"}</td>
                    <td className="px-3 py-2">{ord?.rentalEndDate || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[0.72rem] font-semibold">
                        ✓ Vắng kho hợp lệ
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
