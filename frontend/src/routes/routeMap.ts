import type { Page } from "../context/AppContext";

/**
 * Bản đồ ánh xạ 2 chiều giữa Page (SPA state) và đường dẫn URL (react-router-dom).
 * Giúp mỗi trang có URL độc lập, hỗ trợ F5 / Back / Forward và truy cập trực tiếp.
 */
export const PAGE_TO_PATH: Record<Page, string> = {
  landing: "/",
  products: "/products",
  "product-detail": "/products",
  "ai-advisor": "/ai-advisor",
  cart: "/cart",
  checkout: "/checkout",
  "order-confirmed": "/order-confirmed",
  "my-orders": "/orders",
  profile: "/profile",
  login: "/login",
  "staff-login": "/staff/login",
  register: "/register",
  "forgot-password": "/forgot-password",
  auth: "/login",
  workspace: "/staff",
  staff: "/staff",
  admin: "/staff",
};

/**
 * Chuyển đổi pathname hiện tại sang Page và tham số đi kèm (productId hoặc staffTab).
 */
export function resolveRouteFromPath(pathname: string): {
  page: Page;
  productId: string | null;
  staffTab: string | null;
} {
  const clean = pathname.replace(/\/+$/, "") || "/";

  if (clean === "/") return { page: "landing", productId: null, staffTab: null };
  if (clean === "/products") return { page: "products", productId: null, staffTab: null };
  if (clean.startsWith("/products/")) {
    const id = decodeURIComponent(clean.slice("/products/".length));
    return { page: "product-detail", productId: id || null, staffTab: null };
  }
  if (clean === "/ai-advisor") return { page: "ai-advisor", productId: null, staffTab: null };
  if (clean === "/cart") return { page: "cart", productId: null, staffTab: null };
  if (clean === "/checkout") return { page: "checkout", productId: null, staffTab: null };
  if (clean === "/order-confirmed") return { page: "order-confirmed", productId: null, staffTab: null };
  if (clean === "/orders" || clean === "/my-orders") return { page: "my-orders", productId: null, staffTab: null };
  if (clean === "/profile") return { page: "profile", productId: null, staffTab: null };
  if (clean === "/login") return { page: "login", productId: null, staffTab: null };
  if (clean === "/register") return { page: "register", productId: null, staffTab: null };
  if (clean === "/forgot-password") return { page: "forgot-password", productId: null, staffTab: null };
  if (clean === "/staff/login" || clean === "/admin/login") {
    return { page: "staff-login", productId: null, staffTab: null };
  }
  if (clean === "/staff" || clean === "/admin" || clean === "/workspace") {
    return { page: "workspace", productId: null, staffTab: null };
  }
  if (clean.startsWith("/staff/")) {
    const tab = clean.slice("/staff/".length);
    return { page: "workspace", productId: null, staffTab: tab || null };
  }
  if (clean.startsWith("/admin/")) {
    const tab = clean.slice("/admin/".length);
    return { page: "workspace", productId: null, staffTab: tab || null };
  }

  return { page: "landing", productId: null, staffTab: null };
}
