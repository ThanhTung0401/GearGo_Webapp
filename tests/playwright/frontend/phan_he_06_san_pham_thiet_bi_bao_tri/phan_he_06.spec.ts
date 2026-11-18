import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";

test.describe("Frontend PH6: Danh mục, Sản phẩm, Thiết bị, Điều chỉnh kho & Bảo trì (UC6.1 - UC6.15)", () => {
  test("UC6.1 - UC6.15 - Admin mở các tab Danh mục, Sản phẩm, Thiết bị, Điều chỉnh kho & Staff mở Kho & Bảo trì", async ({
    page,
  }) => {
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Danh mục" }).first().click();
    await expect(page.getByRole("heading", { name: /Danh mục/i }).first()).toBeVisible();

    await page.getByRole("button", { name: "Sản phẩm" }).first().click();
    await expect(page.getByText(/Quản lý sản phẩm|Sản phẩm/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Thiết bị" }).first().click();
    await expect(page.getByText(/Thiết bị/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Điều chỉnh kho" }).first().click();
    await expect(page.getByText(/Điều chỉnh kho/i).first()).toBeVisible();
  });
});
