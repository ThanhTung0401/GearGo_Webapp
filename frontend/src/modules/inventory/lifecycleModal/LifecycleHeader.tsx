import type { Equipment } from "../../../store";

interface Props {
  equipment: Equipment;
  statusStyle: { bg: string; text: string; border: string };
  onClose: () => void;
}

export default function LifecycleHeader({ equipment, statusStyle, onClose }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-bone,#E5E7EB)] bg-[var(--color-cream,#FAFAF9)]">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔍</span>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="m-0 text-xl font-bold text-[var(--color-bark,#1F2937)] font-[family-name:var(--font-display)]">
              {/* [VD-05] Ưu tiên mã serial hiển thị thay vì ID số nội bộ. */}
              Sổ đời thiết bị: {equipment.displayCode || equipment.id}
            </h3>
            <span
              style={{
                background: statusStyle.bg,
                color: statusStyle.text,
                border: `1px solid ${statusStyle.border}`,
              }}
              className="px-2.5 py-0.5 rounded-xl text-xs font-bold"
            >
              {equipment.equipmentStatus}
            </span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-xs">
              Tình trạng: {equipment.condition}
            </span>
          </div>
          <p className="mt-1 mb-0 text-xs text-gray-500">
            Hồ sơ lý lịch nguồn gốc nhập kho, vòng đời phục vụ đơn thuê và biến động bảo trì cá thể (UC6.9)
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="bg-transparent border-0 text-2xl leading-none cursor-pointer text-gray-400 hover:text-gray-700"
      >
        ×
      </button>
    </div>
  );
}
