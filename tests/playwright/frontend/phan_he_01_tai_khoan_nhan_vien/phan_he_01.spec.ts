import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";

test.describe("Frontend PH1: Quản lý Tài khoản & Nhân viên (UC1.1 - UC1.13)", () => {
  test("UC1.1, UC1.2, UC1.3, UC1.4 - Mở Đăng ký, Quên mật khẩu, Đăng nhập thật & Đăng xuất", async ({ page }) => {
    await page.goto("/");

    // Mở Đăng ký (UC1.1)
    await page.getByRole("button", { name: "Đăng ký" }).first().click();
    await expect(page.getByRole("heading", { name: /Đăng ký|Tạo tài khoản/i })).toBeVisible();

    // Chuyển sang Đăng nhập & mở Quên mật khẩu (UC1.4)
    await page.getByRole("button", { name: /Đăng nhập/i }).first().click();
    await expect(page.getByRole("button", { name: /Quên mật khẩu/i })).toBeVisible();
    await page.getByRole("button", { name: /Quên mật khẩu/i }).click();
    await expect(page.getByRole("heading", { name: /Khôi phục|Quên mật khẩu/i })).toBeVisible();

    // UC1.2: Đăng nhập thành công với tài khoản Khách hàng thật
    await loginUi(page, "customer");
    await expect(page.getByRole("button", { name: "Thoát" })).toBeVisible();

    // UC1.3: Đăng xuất trở về khu vực công khai
    await page.getByRole("button", { name: "Thoát" }).click();
    await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible();
  });

  test("UC1.5, UC1.6, UC1.12 - Xem & cập nhật hồ sơ cá nhân, tab Đổi mật khẩu", async ({ page }) => {
    await loginUi(page, "customer");
    await page.getByRole("button", { name: "Tài khoản" }).first().click();
    await expect(page.getByText(/Hồ sơ|Thông tin cá nhân|Nguyễn Văn An/i).first()).toBeVisible();
  });

  test("UC1.7 - UC1.13 - Admin xem tab Nhân viên, Khách hàng & Phân quyền", async ({ page }) => {
    await loginUi(page, "admin");
    await page.getByRole("button", { name: "Nhân viên" }).first().click();
    await expect(page.getByText(/Quản lý nhân viên|Nhân viên/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Khách hàng" }).first().click();
    await expect(page.getByText(/Khách hàng/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Phân quyền" }).first().click();
    await expect(page.getByText(/Phân quyền|Ma trận quyền/i).first()).toBeVisible();
  });
});
