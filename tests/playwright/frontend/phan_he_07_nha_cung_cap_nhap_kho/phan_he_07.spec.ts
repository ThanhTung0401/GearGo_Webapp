import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";

test.describe("Frontend PH7: Nhà cung cấp & Nhập kho (UC7.1 - UC7.10.1)", () => {
  test("UC7.1 - UC7.10.1 - Admin mở tab Nhà cung cấp và Phiếu nhập", async ({ page }) => {
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Nhà cung cấp" }).first().click();
    await expect(page.getByText(/Nhà cung cấp/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Phiếu nhập" }).first().click();
    await expect(page.getByText(/Phiếu nhập/i).first()).toBeVisible();
  });
});
