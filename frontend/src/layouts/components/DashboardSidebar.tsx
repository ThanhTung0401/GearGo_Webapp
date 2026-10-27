import Icon, { type IconName } from "../../components/Icon";

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  badge?: number | string;
}

export interface DashboardSidebarProps {
  isOpen: boolean;
  navItems: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  brandTitle?: string;
  brandSubtitle?: string;
}

export default function DashboardSidebar({
  isOpen,
  navItems,
  activeKey,
  onSelect,
  onClose,
  brandTitle = "GearGo",
  brandSubtitle = "Quản trị hệ thống"
}: DashboardSidebarProps) {
  return (
    <aside
      className={`internal-nav fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[var(--color-bone)] flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
      aria-label="Thanh điều hướng quản trị"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-bone)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-amber)] to-[#D46931] text-white flex items-center justify-center shadow-xs">
            <Icon name="tent" size={20} />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-display)] font-extrabold text-base text-[var(--color-bark)] leading-none">
              {brandTitle}
            </h1>
            <span className="text-[0.68rem] font-medium text-gray-500 mt-0.5 block">
              {brandSubtitle}
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          aria-label="Đóng thanh điều hướng"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-[var(--color-forest)] text-white shadow-xs"
                  : "text-[var(--color-bark)] hover:bg-[var(--color-parchment)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge !== 0 && (
                <span
                  className={`text-[0.65rem] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
