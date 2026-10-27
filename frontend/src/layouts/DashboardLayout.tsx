import React, { useState } from "react";
import DashboardSidebar, { type NavItem } from "./components/DashboardSidebar";
import DashboardTopbar from "./components/DashboardTopbar";
import DemoRoleBanner from "./components/DemoRoleBanner";

export interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  activeKey: string;
  onSelectNav: (key: string) => void;
  brandTitle?: string;
  brandSubtitle?: string;
  children: React.ReactNode;
}

export default function DashboardLayout({
  title,
  subtitle,
  navItems,
  activeKey,
  onSelectNav,
  brandTitle,
  brandSubtitle,
  children
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="internal-shell min-h-screen flex flex-col bg-[var(--color-parchment)] font-[family-name:var(--font-body)]">
      {/* 1. Top Demo Banner */}
      <DemoRoleBanner />

      <div className="flex-1 flex overflow-hidden relative">
        {/* 2. Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 3. Reusable Sidebar */}
        <DashboardSidebar
          isOpen={sidebarOpen}
          navItems={navItems}
          activeKey={activeKey}
          onSelect={(key) => {
            onSelectNav(key);
            setSidebarOpen(false);
          }}
          onClose={() => setSidebarOpen(false)}
          brandTitle={brandTitle}
          brandSubtitle={brandSubtitle}
        />

        {/* 4. Main Viewport & Topbar */}
        <div className="internal-content flex-1 flex flex-col min-w-0 overflow-y-auto">
          <DashboardTopbar
            title={title}
            subtitle={subtitle}
            onToggleSidebar={() => setSidebarOpen(true)}
          />

          <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
