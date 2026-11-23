import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TEST_ACCOUNTS } from "./testData.js";
import { waitVisible } from "./subsystemVideo.js";

export type RoleKey = keyof typeof TEST_ACCOUNTS;

/**
 * Đăng nhập qua API Backend để lấy JWT Bearer token cho các test API.
 */
export async function loginApi(
  request: APIRequestContext,
  role: RoleKey = "customer"
): Promise<{ token: string; user: Record<string, unknown> }> {
  const acc = TEST_ACCOUNTS[role];
  const res = await request.post("/api/auth/dang-nhap", {
    data: {
      taiKhoan: acc.email,
      matKhau: acc.password,
    },
  });
  expect(res.ok(), `Đăng nhập API thất bại cho ${acc.email}: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as Record<string, unknown>;
  const token = String(body.token ?? body.accessToken ?? (body.duLieu as Record<string, unknown> | undefined)?.token ?? "");
  expect(token, "Token JWT trả về không được rỗng").toBeTruthy();
  return { token, user: body };
}

/**
 * Tạo header Authorization Bearer chuẩn cho APIRequestContext.
 */
export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Đăng nhập trên giao diện Frontend qua đúng 2 cổng độc lập (/login và /staff/login),
 * ưu tiên điều hướng bằng nút SPA để video chuyển cảnh mượt, không chớp trắng do reload trang.
 */
export async function loginUi(page: Page, role: RoleKey = "customer"): Promise<void> {
  const acc = TEST_ACCOUNTS[role];
  const isStaffRole = role === "admin" || role === "staff";
  const targetLoginPath = isStaffRole ? "/staff/login" : "/login";

  // Đóng modal còn sót (nếu có) trước khi điều hướng
  await page.keyboard.press("Escape").catch(() => {});

  // Khởi đầu từ trang trắng -> đi thẳng tới cổng đăng nhập đích trong 1 lần gọi (không vòng qua /)
  if (!page.url() || page.url() === "about:blank") {
    await page.goto(targetLoginPath, { waitUntil: "domcontentloaded" });
  } else {
    // 1. Nếu đang ở cổng Admin/Staff -> bấm "Trang khách" về giao diện công khai bằng SPA
    const backPublicBtn = page.getByRole("button", { name: /Trang khách/i }).first();
    if (await backPublicBtn.isVisible().catch(() => false)) {
      await backPublicBtn.click();
    }

    // 2. Nếu đang có phiên đăng nhập -> bấm "Thoát" và xác nhận modal đăng xuất
    const logoutBtn = page.getByRole("button", { name: "Thoát" }).first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      const confirmLogout = page.getByRole("dialog").getByRole("button", { name: "Đăng xuất" }).first();
      if (await waitVisible(confirmLogout, 2000)) {
        await confirmLogout.click();
      }
      await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible({ timeout: 15_000 });
    }

    // 3. Điều hướng SPA tới đúng màn hình đăng nhập (/login hoặc /staff/login)
    let currentPath = new URL(page.url()).pathname;
    if (currentPath !== targetLoginPath) {
      if (currentPath === "/login" && isStaffRole) {
        const toStaffBtn = page.getByRole("button", { name: /Cổng nội bộ nhân viên/i }).first();
        if (await waitVisible(toStaffBtn, 2000)) {
          await toStaffBtn.click();
        }
      } else if (currentPath === "/staff/login" && !isStaffRole) {
        const toCustBtn = page.getByRole("button", { name: /Về trang đăng nhập khách/i }).first();
        if (await waitVisible(toCustBtn, 2000)) {
          await toCustBtn.click();
        }
      } else {
        const loginNavBtn = page.getByRole("button", { name: "Đăng nhập" }).first();
        if (await waitVisible(loginNavBtn, 2000)) {
          await loginNavBtn.click();
          if (isStaffRole) {
            const toStaffBtn = page.getByRole("button", { name: /Cổng nội bộ nhân viên/i }).first();
            await expect(toStaffBtn).toBeVisible({ timeout: 5_000 });
            await toStaffBtn.click();
          }
        }
      }

      currentPath = new URL(page.url()).pathname;
      if (currentPath !== targetLoginPath) {
        await page.goto(targetLoginPath, { waitUntil: "domcontentloaded" });
      }
    }
  }

  // Điền form đăng nhập (input đầu là tài khoản, input thứ 2 là mật khẩu)
  const form = page.locator("form.auth-form");
  await expect(form).toBeVisible({ timeout: 10_000 });
  await form.locator("input").nth(0).fill(acc.email);
  await form.locator("input").nth(1).fill(acc.password);
  await form.locator("button[type='submit']").click();

  // Đợi xác nhận đã đăng nhập thành công và chuyển đúng URL
  if (isStaffRole) {
    await expect(page.getByRole("button", { name: /Trang khách/i })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/staff/);
  } else {
    await expect(page.getByRole("button", { name: "Thoát" })).toBeVisible({ timeout: 15_000 });
  }
}
