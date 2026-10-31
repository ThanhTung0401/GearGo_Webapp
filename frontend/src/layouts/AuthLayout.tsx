import React from "react";
import { useApp } from "../context/AppContext";
import Icon from "../components/Icon";

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { setPage } = useApp();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#163528] via-[#10291F] to-[#0A1A13] text-white p-4 sm:p-6 font-[family-name:var(--font-body)]">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <button
          onClick={() => setPage("landing")}
          className="flex items-center gap-2.5 bg-transparent border-0 cursor-pointer text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--color-amber)] text-white flex items-center justify-center shadow-lg">
            <Icon name="tent" size={20} />
          </div>
          <div>
            <div className="font-[family-name:var(--font-display)] text-white text-xl font-extrabold leading-none">
              GearGo
            </div>
            <div className="text-[0.65rem] text-[#D1DDD5] font-medium mt-0.5">
              Outdoor Equipment
            </div>
          </div>
        </button>

        <button
          onClick={() => setPage("landing")}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
        >
          <span>← Về trang chủ</span>
        </button>
      </div>

      {/* Main Form Center Slot */}
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Bottom Footer */}
      <div className="text-center text-xs text-gray-400 py-3">
        © 2026 GearGo Outdoor Rental. Nền tảng thuê đồ dã ngoại uy tín hàng đầu.
      </div>
    </div>
  );
}
