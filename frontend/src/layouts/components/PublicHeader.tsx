import React, { useState } from "react";
import { useApp, type Page } from "../../context/AppContext";
import Icon from "../../components/Icon";
import type { AppNotification } from "../../types";

export interface PublicHeaderProps {
  onOpenMobileMenu: () => void;
  onOpenUserProfile: () => void;
  onOpenResetConfirm: () => void;
}

export default function PublicHeader({
  onOpenMobileMenu,
  onOpenUserProfile,
  onOpenResetConfirm
}: PublicHeaderProps) {
  const app = useApp();
  const {
    page,
    setPage,
    role,
    setRole,
    cart,
    currentUser,
    notifications,
    markNotificationRead,
    setNotifications,
    logout
  } = app;

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "order" | "system">("all");

  const customerNavigation = [
    { label: "Thuê đồ", p: "products" as Page },
    { label: "Cách thuê", p: "landing" as Page },
    { label: "Tư vấn AI", p: "ai-advisor" as Page },
    { label: "Đơn thuê", p: "my-orders" as Page },
    { label: "Tài khoản", p: "profile" as Page },
  ];

  const totalCartQty = cart.reduce((sum, item) => sum + item.qty, 0);

  const userNotifs = notifications.filter(
    (n) => n.targetRole === "all" || n.targetRole === role
  );
  const unreadNotifsCount = userNotifs.filter((n) => !n.isRead).length;

  const filteredNotifs = userNotifs.filter((n) => {
    if (notifFilter === "unread") return !n.isRead;
    if (notifFilter === "order") return n.category === "order" || n.category === "rental" || n.category === "finance";
    if (notifFilter === "system") return n.category === "system" || n.category === "promo" || !n.category;
    return true;
  });

  const handleNotifAction = (n: AppNotification) => {
    markNotificationRead(n.id);
    setNotifDropdownOpen(false);
    if (!n.actionLink) return;
    if (n.actionLink.type === "order") {
      setPage("my-orders");
    } else if (n.actionLink.type === "reviews") {
      sessionStorage.setItem("geargo_profile_section", "reviews");
      setPage("profile");
    } else if (n.actionLink.type === "page") {
      setPage((n.actionLink.targetId as any) || "products");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[rgba(22,53,40,0.94)] backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              setRole("customer");
              setPage("landing");
            }}
            className="flex items-center gap-2.5 bg-transparent border-0 cursor-pointer p-0 text-left select-none"
            aria-label="Về trang chủ GearGo"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-amber)] to-[#D46931] text-white flex items-center justify-center shadow-md">
              <Icon name="tent" size={22} />
            </div>
            <div>
              <div className="font-[family-name:var(--font-display)] text-white text-xl font-extrabold leading-none tracking-tight">
                GearGo
              </div>
              <div className="text-[0.65rem] text-[#D1DDD5] font-medium mt-0.5">
                Outdoor Rental & Gear
              </div>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {customerNavigation.map((item) => {
              const isActive = page === item.p;
              return (
                <button
                  key={item.label}
                  onClick={() => setPage(item.p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-[#C7D5CC] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions & User Menu */}
        <div className="flex items-center gap-2.5">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative w-9 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
              aria-label="Thông báo"
            >
              <Icon name="bell" size={17} />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[0.62rem] font-bold flex items-center justify-center">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[var(--color-bone)] z-50 overflow-hidden animate-in fade-in duration-200">
                <div className="p-3 bg-[var(--color-parchment)] border-b border-[var(--color-bone)] flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-bark)]">
                    Thông báo ({userNotifs.length})
                  </span>
                  <button
                    onClick={() => setNotifications(notifications.map((n) => ({ ...n, isRead: true })))}
                    className="text-[0.7rem] font-bold text-[var(--color-forest)] hover:underline cursor-pointer"
                  >
                    Đã đọc tất cả
                  </button>
                </div>

                {/* Filter Pills */}
                <div className="p-2 border-b border-[var(--color-bone)] flex gap-1 bg-gray-50/50">
                  {(["all", "unread", "order", "system"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setNotifFilter(f)}
                      className={`px-2 py-0.5 rounded text-[0.68rem] font-bold cursor-pointer ${
                        notifFilter === f ? "bg-[var(--color-forest)] text-white" : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {f === "all" ? "Tất cả" : f === "unread" ? "Chưa đọc" : f === "order" ? "Đơn thuê" : "Hệ thống"}
                    </button>
                  ))}
                </div>

                {/* Notif Items */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 p-1">
                  {filteredNotifs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400">Không có thông báo nào</div>
                  ) : (
                    filteredNotifs.map((n) => (
                      <div key={n.id} className="p-2.5 hover:bg-gray-50 rounded-lg text-left transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-800">{n.title}</span>
                          {!n.isRead && (
                            <button
                              onClick={() => markNotificationRead(n.id)}
                              className="text-[0.65rem] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              Đã đọc
                            </button>
                          )}
                        </div>
                        <p className="text-[0.75rem] text-gray-600 line-clamp-2">{n.message}</p>
                        {n.actionLink && (
                          <button
                            onClick={() => handleNotifAction(n)}
                            className="mt-1.5 text-[0.7rem] font-bold text-[var(--color-forest)] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{n.actionLink.label || "Xem chi tiết"}</span> →
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cart Button */}
          {totalCartQty > 0 && (
            <button
              onClick={() => setPage("cart")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[var(--color-amber)] to-[#D46931] text-white font-bold text-xs shadow-md cursor-pointer hover:brightness-105 active:scale-95 transition-all"
            >
              <Icon name="cart" size={16} />
              <span>{totalCartQty}</span>
            </button>
          )}

          {/* User Profile or Auth Login */}
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenUserProfile}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white cursor-pointer transition-colors"
                title="Hồ sơ cá nhân & Đổi mật khẩu"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--color-amber)] text-white font-bold text-[0.7rem] flex items-center justify-center">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="text-xs font-bold hidden md:inline max-w-[100px] truncate">
                  {currentUser.name}
                </span>
              </button>
              <button
                onClick={() => logout()}
                className="text-[0.72rem] font-semibold text-rose-300 hover:text-rose-200 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                Thoát
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage("login")}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 transition-colors cursor-pointer"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => setPage("register")}
                className="hidden sm:inline-block text-xs font-bold text-white px-3 py-1.5 rounded-xl bg-gradient-to-r from-[var(--color-amber)] to-[#D46931] shadow-xs cursor-pointer hover:brightness-105"
              >
                Đăng ký
              </button>
            </div>
          )}

          {/* Reset Demo Quick Button */}
          <button
            onClick={onOpenResetConfirm}
            className="hidden xl:flex items-center gap-1 text-[0.72rem] font-semibold text-rose-300 hover:text-rose-100 bg-rose-900/30 border border-rose-500/30 px-2 py-1 rounded-lg cursor-pointer"
            title="Đặt lại dữ liệu demo"
          >
            <Icon name="refresh" size={13} />
            <span>Reset</span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden w-9 h-9 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-white cursor-pointer"
            aria-label="Mở menu"
          >
            <Icon name="menu" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
