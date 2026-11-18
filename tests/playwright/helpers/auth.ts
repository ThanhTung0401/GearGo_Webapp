import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TEST_ACCOUNTS } from "./testData.js";

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
 * Đăng nhập trên giao diện Frontend qua form LoginView thật.
 */
export async function loginUi(page: Page, role: RoleKey = "customer"): Promise<void> {
  const acc = TEST_ACCOUNTS[role];
  await page.goto("/");
  // Mở form đăng nhập từ PublicHeader
  const loginBtn = page.getByRole("button", { name: "Đăng nhập" }).first();
  await loginBtn.click();

  // Điền form đăng nhập (input đầu là tài khoản, input thứ 2 là mật khẩu)
  const form = page.locator("form.auth-form");
  await expect(form).toBeVisible({ timeout: 10_000 });
  await form.locator("input").nth(0).fill(acc.email);
  await form.locator("input").nth(1).fill(acc.password);
  await form.locator("button[type='submit']").click();

  // Đợi xác nhận đã đăng nhập thành công (xuất hiện nút Thoát hoặc Trang khách)
  if (role === "customer") {
    await expect(page.getByRole("button", { name: "Thoát" })).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(page.getByRole("button", { name: /Trang khách/i })).toBeVisible({ timeout: 15_000 });
  }
}
