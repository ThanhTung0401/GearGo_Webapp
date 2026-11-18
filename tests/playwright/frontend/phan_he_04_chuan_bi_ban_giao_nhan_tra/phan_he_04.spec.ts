import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";

test.describe("Frontend PH4: Cổng Nhân viên - Chuẩn bị, Bàn giao, Nhận trả & Quá hạn (UC4.1 - UC4.5)", () => {
  test("UC4.1 - UC4.5 - Mở Tổng quan, Đơn thuê, Chuẩn bị & Bàn giao, Nhận trả & Phụ phí", async ({ page }) => {
    await loginUi(page, "staff");

    // Tổng quan ca làm việc (UC4.4 cảnh báo quá hạn)
    await expect(page.getByRole("heading", { name: /Tổng quan ca làm việc/i })).toBeVisible();

    // UC4.5: Tab Đơn thuê (đảm bảo không crash trắng trang)
    await page.getByRole("button", { name: "Đơn thuê" }).first().click();
    await expect(page.getByText(/Bộ lọc ca trực/i)).toBeVisible();

    // UC4.1 & UC4.2: Tab Chuẩn bị & Bàn giao
    await page.getByRole("button", { name: "Chuẩn bị & Bàn giao" }).first().click();
    await expect(page.getByText(/Chuẩn bị|Bàn giao/i).first()).toBeVisible();

    // UC4.3 & UC4.3.1: Tab Nhận trả & Phụ phí
    await page.getByRole("button", { name: "Nhận trả & Phụ phí" }).first().click();
    await expect(page.getByText(/Nhận trả|Phụ phí/i).first()).toBeVisible();
  });
});
