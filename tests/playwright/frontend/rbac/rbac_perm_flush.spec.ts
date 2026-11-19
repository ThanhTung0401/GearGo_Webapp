import { test, expect } from "@playwright/test";

/**
 * v2 §5.3 — E2E RBAC với flush endpoint.
 *
 * Luồng kiểm thử:
 *   1. Admin đăng nhập → tab "Phân quyền" → bật `KhuyenMai.Quan` cho vai trò NhanVien.
 *   2. POST /api/debug/flush-permissions (chỉ dev/test) để xoá cache role-perm.
 *   3. Đăng nhập dưới tư cách NhanVien → tab "Khuyến mãi" phải hiển thị trên menu.
 *   4. Admin gỡ `KhuyenMai.Quan` → flush → NhanVien refresh → tab "Khuyến mãi" biến mất.
 *
 * TODO (bỏ `skip` khi hạ tầng sẵn sàng):
 *   - Thêm biến môi trường ADMIN_EMAIL/ADMIN_PASSWORD/STAFF_EMAIL/STAFF_PASSWORD/BACKEND_URL
 *     ổn định cho cả dev và CI.
 *   - Bật `/api/debug/flush-permissions` ở môi trường test (Env=Development hoặc feature flag).
 *   - Seed sẵn user Admin + NhanVien có password hợp lệ, không bị lock.
 */
test.describe.skip("v2 §5.3 — RBAC flush endpoint end-to-end", () => {
  const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5000";
  const FLUSH_ENDPOINT = `${BACKEND_URL}/api/debug/flush-permissions`;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@geargo.vn";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "GearGo@2026";
  const STAFF_EMAIL = process.env.STAFF_EMAIL ?? "staff@geargo.vn";
  const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? "GearGo@2026";

  async function loginForm(page: import("@playwright/test").Page, email: string, password: string) {
    await page.getByPlaceholder(/email/i).fill(email);
    await page.getByPlaceholder(/mật khẩu/i).fill(password);
    await page.getByRole("button", { name: /Đăng nhập/i }).click();
  }

  test("Bật KhuyenMai_Quan cho NhanVien → flush → tab Khuyến mãi xuất hiện", async ({ page, request }) => {
    await page.goto("/");
    await loginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByRole("heading", { name: /Tổng quan|Quản trị/i })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Phân quyền/i }).click();
    await page.getByRole("button", { name: /NhanVien/i }).click();
    const khuyenMaiQuan = page.getByLabel(/KhuyenMai\.Quan/i);
    if (!(await khuyenMaiQuan.isChecked())) {
      await khuyenMaiQuan.check();
      await page.getByRole("button", { name: /Lưu|Cập nhật/i }).click();
    }

    const flush = await request.post(FLUSH_ENDPOINT);
    expect(flush.ok()).toBeTruthy();

    await page.getByRole("button", { name: /Đăng xuất/i }).click();
    await loginForm(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page.getByRole("button", { name: /Khuyến mãi/i })).toBeVisible({ timeout: 10_000 });
  });

  test("Gỡ KhuyenMai_Quan → flush → tab Khuyến mãi biến mất", async ({ page, request }) => {
    await page.goto("/");
    await loginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.getByRole("button", { name: /Phân quyền/i }).click();
    await page.getByRole("button", { name: /NhanVien/i }).click();
    const khuyenMaiQuan = page.getByLabel(/KhuyenMai\.Quan/i);
    if (await khuyenMaiQuan.isChecked()) {
      await khuyenMaiQuan.uncheck();
      await page.getByRole("button", { name: /Lưu|Cập nhật/i }).click();
    }
    const flush = await request.post(FLUSH_ENDPOINT);
    expect(flush.ok()).toBeTruthy();

    await page.getByRole("button", { name: /Đăng xuất/i }).click();
    await loginForm(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page.getByRole("button", { name: /Khuyến mãi/i })).toHaveCount(0);
  });
});
