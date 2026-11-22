import { lazy, Suspense } from "react";
import type { Page } from "../context";
import type { CurrentUserProfile } from "../hooks/useAppStoreState";
import { PermissionsProvider } from "../features/permissions/PermissionsContext";
import { PublicLayout, AuthLayout } from "../layouts";
import Icon from "../components/Icon";

// Tách bundle theo portal để giảm kích thước tải ban đầu
const LandingView = lazy(() => import("../modules/marketing/LandingView"));
const ProductsView = lazy(() => import("../modules/catalog/ProductsView"));
const CustomerPortal = lazy(() => import("../views/CustomerPortal"));
const WorkspaceView = lazy(() => import("../views/WorkspaceView"));
const LoginView = lazy(() =>
  import("../modules/auth/AuthViews").then((m) => ({ default: m.LoginView }))
);
const RegisterView = lazy(() =>
  import("../modules/auth/AuthViews").then((m) => ({ default: m.RegisterView }))
);
const ForgotPasswordView = lazy(() =>
  import("../modules/auth/AuthViews").then((m) => ({ default: m.ForgotPasswordView }))
);

function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[40vh] flex items-center justify-center text-sm text-[var(--color-sage)]"
    >
      Đang tải giao diện…
    </div>
  );
}

interface AppRouterViewProps {
  page: Page;
  currentUser: CurrentUserProfile | null;
  permissionNotice: string | null;
  dismissPermissionNotice: () => void;
}

const AUTH_PAGES: Page[] = ["login", "staff-login", "register", "forgot-password"];
const STAFF_PAGES: Page[] = ["workspace", "staff", "admin"];
const CUSTOMER_PORTAL_PAGES: Page[] = ["cart", "checkout", "order-confirmed", "my-orders", "profile", "ai-advisor"];

/**
 * Shell điều hướng giao diện theo từng nhóm Layout: Xác thực, Vận hành nội bộ và Công khai/Khách hàng.
 */
export function AppRouterView({
  page,
  currentUser,
  permissionNotice,
  dismissPermissionNotice,
}: AppRouterViewProps) {
  const isAuthPage = AUTH_PAGES.includes(page);
  const isStaffPage = STAFF_PAGES.includes(page);

  return (
    <>
      {permissionNotice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[60] max-w-md rounded-2xl border border-amber-300 bg-[#FFFDF7] p-4 shadow-lg text-[#11231B] flex items-start gap-3"
        >
          <Icon name="alert-circle" className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm leading-relaxed">{permissionNotice}</div>
          <button
            type="button"
            onClick={dismissPermissionNotice}
            className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-stone-100 text-stone-600"
          >
            Đóng
          </button>
        </div>
      )}

      <Suspense fallback={<RouteLoadingFallback />}>
        {isAuthPage && (
          <AuthLayout>
            {page === "login" && <LoginView portal="customer" />}
            {page === "staff-login" && <LoginView portal="staff" />}
            {page === "register" && <RegisterView />}
            {page === "forgot-password" && <ForgotPasswordView />}
          </AuthLayout>
        )}

        {isStaffPage && (
          <PermissionsProvider userId={currentUser?.id != null ? Number(currentUser.id) || 0 : null}>
            <WorkspaceView />
          </PermissionsProvider>
        )}

        {!isAuthPage && !isStaffPage && (
          <PublicLayout>
            {page === "landing" && <LandingView />}
            {(page === "products" || page === "product-detail") && <ProductsView />}
            {CUSTOMER_PORTAL_PAGES.includes(page) && <CustomerPortal />}
          </PublicLayout>
        )}
      </Suspense>
    </>
  );
}
