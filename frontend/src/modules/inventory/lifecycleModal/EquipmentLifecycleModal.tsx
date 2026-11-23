import type { useApp } from "../../../App";
import type { Equipment } from "../../../store";
import { useEquipmentLifecycle } from "./useEquipmentLifecycle";
import LifecycleHeader from "./LifecycleHeader";
import LifecycleOriginCard from "./LifecycleOriginCard";
import LifecycleTimelineSections from "./LifecycleTimelineSections";

interface Props {
  equipment: Equipment;
  app: ReturnType<typeof useApp>;
  onClose: () => void;
}

/**
 * UC6.9: Tra cứu thiết bị và Lịch sử sử dụng / Sổ đời thiết bị (Equipment Lifecycle).
 * Component vỏ mỏng chỉ lắp ráp dữ liệu từ hook useEquipmentLifecycle và 3 sub-components.
 */
export default function EquipmentLifecycleModal({ equipment, app, onClose }: Props) {
  const {
    hoSoApi,
    currentProduct,
    originalProduct,
    supplier,
    orderHistory,
    maintenanceHistory,
    statusStyle,
  } = useEquipmentLifecycle(equipment, app);
  // [VD-01] Truyền importReceipt thực xuống LifecycleOriginCard để hiển thị đúng phiếu nhập gốc + NCC.
  const importReceipt = app.importReceipts.find((r) => {
    if (equipment.importReceiptId && r.id === equipment.importReceiptId) return true;
    if (equipment.importReceiptLineId && r.lines.some((l) => l.id === equipment.importReceiptLineId)) return true;
    return false;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] grid place-items-center p-4 bg-slate-900/65 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-[780px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <LifecycleHeader equipment={equipment} statusStyle={statusStyle} onClose={onClose} />

        <div className="p-5 overflow-y-auto grid gap-5">
          <LifecycleOriginCard
            equipment={equipment}
            currentProduct={currentProduct}
            originalProduct={originalProduct}
            supplier={supplier}
            importReceipt={importReceipt}
          />
          <LifecycleTimelineSections
            orderHistory={orderHistory}
            maintenanceHistory={maintenanceHistory}
            hoSoApi={hoSoApi}
          />
        </div>

        <div className="px-6 py-3.5 border-t border-[var(--color-bone,#E5E7EB)] flex justify-end bg-[var(--color-cream,#FAFAF9)]">
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-[var(--color-bone,#E5E7EB)] px-4 py-1.5 rounded-lg text-sm font-semibold cursor-pointer hover:bg-gray-50"
          >
            Đóng sổ đời
          </button>
        </div>
      </div>
    </div>
  );
}
