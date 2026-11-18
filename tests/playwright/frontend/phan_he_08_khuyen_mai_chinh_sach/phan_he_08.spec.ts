import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";

test.describe("Frontend PH8: Khuyến mãi & Chính sách thuê (UC8.1 - UC8.5)", () => {
  test("UC8.1 - UC8.5 - Admin mở tab Khuyến mãi và Chính sách thuê", async ({ page }) => {
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Khuyến mãi" }).first().click();
    await expect(page.getByText(/Khuyến mãi/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Chính sách thuê" }).first().click();
    await expect(page.getByText(/Chính sách/i).first()).toBeVisible();
  });
});
