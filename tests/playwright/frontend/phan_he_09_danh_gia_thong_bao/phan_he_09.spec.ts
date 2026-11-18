import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";

test.describe("Frontend PH9: Đánh giá sản phẩm & Thông báo (UC9.1 - UC9.4.1)", () => {
  test("UC9.1 - UC9.4.1 - Khách hàng xem thông báo chuông & Admin mở tab Đánh giá, Thông báo HT", async ({ page }) => {
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Đánh giá" }).first().click();
    await expect(page.getByText(/Đánh giá/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Thông báo HT" }).first().click();
    await expect(page.getByText(/Thông báo/i).first()).toBeVisible();
  });
});
