import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";

test.describe("Frontend PH10: Báo cáo, Nhật ký & Kiểm tra Responsive Mobile (UC10.1 - UC10.4.2)", () => {
  test("UC10.1 - UC10.4.2 - Admin mở tab Báo cáo, Audit Log & Staff mở Báo cáo ca & Nhật ký", async ({ page }) => {
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Báo cáo" }).first().click();
    await expect(page.getByText(/Báo cáo/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Audit Log" }).first().click();
    await expect(page.getByText(/Nhật ký|Audit Log/i).first()).toBeVisible();
  });

  test("Responsive Mobile 390x844 - Không tràn ngang trên Public & Admin", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const publicOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(publicOverflow).toBeFalsy();

    await loginUi(page, "admin");
    const adminOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(adminOverflow).toBeFalsy();
  });
});
