import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import Icon from "../../components/Icon";
import ConfirmModal from "../../components/ui/ConfirmModal";
import UserProfileModal from "../../components/UserProfileModal";
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
    setPage,
    logout,
    updateCurrentUserProfile,
    changeCurrentUserPassword,
    realApi,
    unreadNotificationCount,
    setUnreadNotificationCount,
    refreshNotifications,
  } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Đóng popover tài khoản khi bấm ra ngoài hoặc nhấn Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

  const roleLabel = role === "admin" ? "Quản trị viên" : "Nhân viên";
  const visibleNotifs = realApi
    ? notifications
    : notifications.filter((n) => n.targetRole === "all" || n.targetRole === role);
  const unreadCount = realApi
    ? (unreadNotificationCount ?? visibleNotifs.filter((n) => !n.isRead).length)
    : visibleNotifs.filter((n) => !n.isRead).length;

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutConfirmOpen(false);
      setUserMenuOpen(false);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-[var(--color-bone)] px-4 md:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 max-w-full">
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Badge tài khoản có thể bấm để xem thông tin & đăng xuất */}
          {currentUser && (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                data-testid="topbar-user-menu-btn"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                onClick={() => {
                  setUserMenuOpen((prev) => !prev);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[var(--color-parchment)] hover:bg-[#EFE9DC] border border-[var(--color-bone)] transition-colors cursor-pointer"
                title="Thông tin tài khoản & Đăng xuất"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--color-forest)] text-white text-[0.7rem] font-bold flex items-center justify-center shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block max-w-[130px] lg:max-w-[160px] min-w-0">
                  <div className="text-xs font-bold text-[var(--color-bark)] leading-none truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[0.65rem] text-gray-500 mt-0.5 truncate">
                    {roleLabel}
                  </div>
                </div>
                <Icon name="chevron-down" size={14} className="text-gray-500 hidden sm:block shrink-0" />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  data-testid="topbar-user-popover"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-[var(--color-bone)] z-50 overflow-hidden"
                >
                  <div className="p-3.5 bg-[var(--color-parchment)] border-b border-[var(--color-bone)]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-forest)] text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {currentUser.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[var(--color-bark)] truncate">
                          {currentUser.name}
                        </div>
                        <div className="text-[0.72rem] text-gray-600 truncate">
                          {currentUser.email || `@${currentUser.username}`}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[0.72rem] text-gray-600 pt-2 border-t border-dashed border-[var(--color-bone)]">
                      <span>Vai trò: <strong className="text-[var(--color-bark)]">{roleLabel}</strong></span>
                      {currentUser.phone && <span className="font-mono">{currentUser.phone}</span>}
                    </div>
                  </div>

                  <div className="p-1.5 flex flex-col gap-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setProfileOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-bark)] hover:bg-[var(--color-parchment)] transition-colors cursor-pointer text-left"
                    >
                      <Icon name="user" size={15} />
                      <span>Hồ sơ & Đổi mật khẩu</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      data-testid="popover-logout-btn"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setLogoutConfirmOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                    >
                      <Icon name="logout" size={15} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notification Bell & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                const next = !notifOpen;
                setNotifOpen(next);
                setUserMenuOpen(false);
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
            type="button"
            onClick={() => setPage("landing")}
            className="text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl border border-[var(--color-bone)] bg-white hover:bg-gray-50 text-[var(--color-bark)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Xem giao diện người thuê (có thể quay lại cổng vận hành bất cứ lúc nào)"
          >
            Trang khách →
          </button>

          {/* Nút Đăng xuất trực tiếp trên Topbar (luôn mở modal xác nhận) */}
          {currentUser && (
            <button
              type="button"
              data-testid="topbar-logout-btn"
              onClick={() => setLogoutConfirmOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Đăng xuất khỏi phiên làm việc"
            >
              <Icon name="logout" size={14} />
              <span className="hidden md:inline">Đăng xuất</span>
            </button>
          )}

          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden w-9 h-9 rounded-xl border border-[var(--color-bone)] bg-white flex items-center justify-center text-[var(--color-bark)] cursor-pointer shrink-0"
            aria-label="Mở menu quản trị"
          >
            <Icon name="menu" size={20} />
          </button>
        </div>
      </header>

      {/* Modal hồ sơ & đổi mật khẩu khi bấm từ popover tài khoản */}
      {profileOpen && currentUser && (
        <UserProfileModal
          currentUser={currentUser}
          role={role}
          onClose={() => setProfileOpen(false)}
          onUpdateProfile={updateCurrentUserProfile}
          onChangePassword={changeCurrentUserPassword}
        />
      )}

      {/* Modal xác nhận đăng xuất */}
      <ConfirmModal
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => void handleConfirmLogout()}
        title="Xác nhận đăng xuất"
        message={
          currentUser
            ? `Bạn có chắc muốn đăng xuất khỏi tài khoản ${currentUser.name} (${roleLabel}${currentUser.email ? ` — ${currentUser.email}` : ""})?`
            : "Bạn có chắc muốn đăng xuất khỏi phiên làm việc hiện tại?"
        }
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        isDanger
        isLoading={loggingOut}
      />
    </>
  );
}
