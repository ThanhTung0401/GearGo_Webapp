import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useApp, type Page } from "../context/AppContext";
import DemoRoleBanner from "./components/DemoRoleBanner";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";
import Icon from "../components/Icon";
import ConfirmModal from "../components/ui/ConfirmModal";
import UserProfileModal from "../components/UserProfileModal";

export interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const app = useApp();
  const {
    page,
    setPage,
    role,
    setRole,
    cart,
    currentUser,
    resetDemo
  } = app;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  const customerNavigation = [
    { label: "Thuê đồ", p: "products" as Page },
    { label: "Cách thuê", p: "landing" as Page },
    { label: "Tư vấn AI", p: "ai-advisor" as Page },
    { label: "Đơn thuê", p: "my-orders" as Page },
    { label: "Tài khoản", p: "profile" as Page },
  ];

  const navigateCustomer = (target: Page) => {
    setPage(target);
    setMobileMenuOpen(false);
  };

  const totalCartQty = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-cream)] font-[family-name:var(--font-body)]">
      {/* 1. Top Demo Banner */}
      <DemoRoleBanner />

      {/* 2. Sticky Public Header */}
      <PublicHeader
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onOpenUserProfile={() => setShowUserProfileModal(true)}
        onOpenResetConfirm={() => setShowResetConfirm(true)}
      />

      {/* 3. Mobile Navigation Drawer — render qua Portal ra document.body để thoát mọi stacking context */}
      {mobileMenuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: 9998,
              }}
            />
            <aside
              id="mobile-nav-drawer"
              className="bg-white shadow-2xl p-4 flex flex-col overflow-y-auto"
              style={{
                position: "fixed",
                top: 0,
                bottom: 0,
                right: 0,
                width: "min(85vw, 300px)",
                zIndex: 9999,
              }}
              aria-label="Thanh menu di động"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[var(--color-bone)] mb-3">
                <div className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-[var(--color-bark)]">
                  <Icon name="tent" /> GearGo
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Đóng menu"
                  className="w-8 h-8 rounded-lg bg-[var(--color-parchment)] flex items-center justify-center text-gray-500 cursor-pointer"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-1 flex-1">
                {customerNavigation.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigateCustomer(item.p)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      page === item.p
                        ? "bg-[var(--color-parchment)] text-[var(--color-forest)] font-bold"
                        : "text-[var(--color-bark)] hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                <div className="h-px bg-[var(--color-bone)] my-2" />

                {totalCartQty > 0 && (
                  <button
                    type="button"
                    onClick={() => navigateCustomer("cart")}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-50 text-[var(--color-bark)] text-xs font-bold border border-amber-200 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Icon name="cart" size={16} /> Giỏ thuê
                    </span>
                    <span className="w-5 h-5 rounded-full bg-[var(--color-amber)] text-white text-[0.65rem] flex items-center justify-center">
                      {totalCartQty}
                    </span>
                  </button>
                )}

                {!currentUser ? (
                  <button
                    type="button"
                    onClick={() => navigateCustomer("login")}
                    className="w-full mt-2 py-2.5 rounded-xl bg-[var(--color-forest)] text-white text-xs font-bold cursor-pointer"
                  >
                    Đăng nhập tài khoản
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowUserProfileModal(true);
                    }}
                    className="w-full mt-2 py-2.5 rounded-xl bg-[var(--color-parchment)] text-[var(--color-bark)] text-xs font-bold border border-[var(--color-bone)] cursor-pointer"
                  >
                    Hồ sơ: {currentUser.name}
                  </button>
                )}

                {/* Chỉ hiển thị bộ chuyển vai trò thử nghiệm khi chạy chế độ Demo */}
                {!app.realApi && (
                  <div className="mt-auto bg-[var(--color-parchment)] p-3 rounded-xl border border-[var(--color-bone)]">
                    <span className="text-[0.68rem] text-gray-500 font-medium block mb-2">Chuyển vai trò thử nghiệm:</span>
                    <div className="flex gap-1.5">
                      {(["customer", "staff", "admin"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setRole(r);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[0.7rem] font-bold cursor-pointer ${
                            role === r ? "bg-[var(--color-amber)] text-white" : "bg-white text-gray-700"
                          }`}
                        >
                          {r === "customer" ? "Khách" : r === "staff" ? "NV" : "Admin"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </>,
          document.body
        )}

      {/* 4. Page Main Content — min-w-0 ngăn flex column cho phép nội dung con kéo giãn chiều ngang trên mobile */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>

      {/* 5. Public Footer */}
      <PublicFooter />

      {/* 6. Global Modals for Public Layout */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          resetDemo();
          setShowResetConfirm(false);
        }}
        title="Đặt lại toàn bộ dữ liệu demo?"
        message="Đơn thuê, giao dịch, phiếu nhập và thay đổi thiết bị trong trình duyệt sẽ bị xóa hoàn toàn. Thao tác này không thể hoàn tác."
        confirmText="Đặt lại dữ liệu"
        isDanger={true}
      />

      {showUserProfileModal && currentUser && (
        <UserProfileModal
          currentUser={currentUser}
          role={role}
          onClose={() => setShowUserProfileModal(false)}
          onUpdateProfile={app.updateCurrentUserProfile}
          onChangePassword={app.changeCurrentUserPassword}
        />
      )}
    </div>
  );
}
