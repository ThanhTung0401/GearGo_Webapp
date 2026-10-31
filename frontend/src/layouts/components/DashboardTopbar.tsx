import { useApp } from "../../context/AppContext";
import Icon from "../../components/Icon";

export interface DashboardTopbarProps {
  title: string;
  subtitle: string;
  onToggleSidebar: () => void;
}

export default function DashboardTopbar({
  title,
  subtitle,
  onToggleSidebar
}: DashboardTopbarProps) {
  const { currentUser, role, notifications, setRole } = useApp();

  const unreadCount = notifications.filter(
    (n) => !n.isRead && (n.targetRole === "all" || n.targetRole === role)
  ).length;

  return (
    <header className="internal-topbar bg-white border-b border-[var(--color-bone)] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Breadcrumb */}
      <div>
        <div className="text-[0.7rem] font-semibold text-gray-400 uppercase tracking-wider">
          {subtitle}
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg text-[var(--color-bark)]">
          {title}
        </h2>
      </div>

      {/* Topbar Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* User Info Badge */}
        {currentUser && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-parchment)] border border-[var(--color-bone)]">
            <div className="w-6 h-6 rounded-full bg-[var(--color-forest)] text-white text-[0.7rem] font-bold flex items-center justify-center">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-[var(--color-bark)] leading-none">
                {currentUser.name}
              </div>
              <div className="text-[0.65rem] text-gray-500 mt-0.5">
                {role === "admin" ? "Quản trị viên" : "Nhân viên kho"}
              </div>
            </div>
          </div>
        )}

        {/* Notification Bell */}
        <button
          onClick={() => {
            // Chuyển sang xem thông báo nếu là admin
            if (role === "admin") {
              const notifBtn = document.querySelector('[data-tab="notifications"]');
              if (notifBtn) (notifBtn as HTMLElement).click();
            }
          }}
          className="relative w-9 h-9 rounded-xl border border-[var(--color-bone)] bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
          aria-label="Thông báo hệ thống"
        >
          <Icon name="bell" size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[0.62rem] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Back to Customer Button */}
        <button
          onClick={() => setRole("customer")}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--color-bone)] bg-white hover:bg-gray-50 text-[var(--color-bark)] transition-colors cursor-pointer"
          title="Trở về giao diện người thuê"
        >
          Trang khách →
        </button>

        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-9 h-9 rounded-xl border border-[var(--color-bone)] bg-white flex items-center justify-center text-[var(--color-bark)] cursor-pointer"
          aria-label="Mở menu quản trị"
        >
          <Icon name="menu" size={20} />
        </button>
      </div>
    </header>
  );
}
