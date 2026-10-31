import { useApp } from "../../context/AppContext";
import Icon from "../../components/Icon";
import type { Role } from "../../types";

export default function DemoRoleBanner() {
  const { role, setRole, newOrderId, resetDemo } = useApp();

  return (
    <div className="bg-[var(--color-parchment)] border-b border-[var(--color-bone)] py-1.5 px-4 text-xs text-[var(--color-bark)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[0.72rem]">
          <span className="inline-flex items-center gap-1.5 font-bold text-[var(--color-forest)]">
            <Icon name="shield" size={14} />
            <span>Chế độ demo · {role === "customer" ? "Khách hàng" : role === "staff" ? "Nhân viên" : "Quản trị viên"}</span>
          </span>
          <span className="text-[var(--color-bone)]">|</span>
          <span className="text-gray-500 hidden sm:inline">Dữ liệu prototype — thanh toán & AI là mô phỏng</span>
          {newOrderId && (
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ✓ Đơn mới: {newOrderId}
            </span>
          )}
        </div>

        {/* Role Quick Switcher & Reset */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1 bg-white/70 p-0.5 rounded-lg border border-[var(--color-bone)]">
            <span className="text-[0.68rem] text-gray-500 px-1.5 font-medium hidden md:inline">Vai trò:</span>
            {(["customer", "staff", "admin"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-2 py-0.5 rounded text-[0.72rem] font-bold transition-all cursor-pointer ${
                  role === r
                    ? "bg-[var(--color-amber)] text-white shadow-2xs"
                    : "text-gray-600 hover:text-[var(--color-bark)]"
                }`}
              >
                {r === "customer" ? "Khách" : r === "staff" ? "NV" : "Admin"}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (window.confirm("Đặt lại toàn bộ dữ liệu demo về mặc định?")) {
                resetDemo();
              }
            }}
            className="flex items-center gap-1 text-[0.72rem] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            title="Đặt lại toàn bộ dữ liệu demo"
          >
            <Icon name="refresh" size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
