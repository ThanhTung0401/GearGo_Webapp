import { useState } from "react";
import { useApp } from "../../context/AppContext";
import Icon from "../../components/Icon";
import { notificationApi } from "../../services/api";

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
  const {
    currentUser,
    role,
    notifications,
    setNotifications,
    markNotificationRead,
    setRole,
    realApi,
    unreadNotificationCount,
    setUnreadNotificationCount,
    refreshNotifications,
  } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);

  const visibleNotifs = realApi
    ? notifications
    : notifications.filter((n) => n.targetRole === "all" || n.targetRole === role);
  const unreadCount = realApi
    ? (unreadNotificationCount ?? visibleNotifs.filter((n) => !n.isRead).length)
    : visibleNotifs.filter((n) => !n.isRead).length;

  return (
    <header className="bg-white border-b border-[var(--color-bone)] px-4 md:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-30">
      {/* Title & Breadcrumb */}
      <div className="min-w-0 flex-1">
        <div className="text-[0.68rem] sm:text-[0.7rem] font-semibold text-gray-400 uppercase tracking-wider truncate">
          {subtitle}
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base sm:text-lg text-[var(--color-bark)] truncate">
          {title}
        </h2>
      </div>

      {/* Topbar Right Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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

        {/* Notification Bell & Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              const next = !notifOpen;
              setNotifOpen(next);
              if (next && realApi && currentUser) {
                void refreshNotifications?.();
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

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[var(--color-bone)] z-50 overflow-hidden">
              <div className="p-3 bg-[var(--color-parchment)] border-b border-[var(--color-bone)] flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-bark)]">
                  Thông báo ({visibleNotifs.length})
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                      setUnreadNotificationCount?.(0);
                      if (realApi && currentUser) {
                        void notificationApi.danhDauTatCaDaDoc().catch(() => {});
                      }
                    }}
                    className="text-[0.7rem] font-bold text-[var(--color-forest)] hover:underline cursor-pointer"
                  >
                    Đã đọc tất cả
                  </button>
                  {role === "admin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        const notifBtn = document.querySelector('[data-tab="notifications"]');
                        if (notifBtn) (notifBtn as HTMLElement).click();
                      }}
                      className="text-[0.7rem] font-semibold text-gray-600 hover:underline cursor-pointer"
                    >
                      Quản lý
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 p-1">
                {visibleNotifs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">Chưa có thông báo nào</div>
                ) : (
                  visibleNotifs.slice(0, 15).map((n) => (
                    <div key={n.id} className="p-2.5 hover:bg-gray-50 rounded-lg text-left">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-bold text-gray-800">{n.title}</span>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(n.id)}
                            className="text-[0.65rem] font-bold text-emerald-700 hover:underline shrink-0 cursor-pointer"
                          >
                            Đã đọc
                          </button>
                        )}
                      </div>
                      <p className="text-[0.74rem] text-gray-600">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Back to Customer Button */}
        <button
          onClick={() => setRole("customer")}
          className="text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl border border-[var(--color-bone)] bg-white hover:bg-gray-50 text-[var(--color-bark)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Trở về giao diện người thuê"
        >
          Trang khách →
        </button>

        {/* Mobile Sidebar Toggle Button */}
        <button
          type="button"
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
