import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";

test.describe("Frontend PH5: Phụ phí, Đối soát cọc & Bù trừ tài chính (UC5.1 - UC5.7)", () => {
  test("UC5.3 & UC5.7 - Admin xem Trung tâm xử lý tranh chấp & Tab Bù trừ tài chính", async ({ page }) => {
    await loginUi(page, "admin");

    // UC5.3: Trung tâm xử lý tranh chấp & Duyệt phụ phí trên Tổng quan Admin
    await expect(page.getByText(/Trung tâm xử lý tranh chấp & Duyệt phụ phí/i)).toBeVisible();

    // UC5.7: Tab Bù trừ tài chính
    await page.getByRole("button", { name: "Bù trừ tài chính" }).first().click();
    await expect(page.getByText(/Bù trừ|Điều chỉnh tài chính/i).first()).toBeVisible();
  });
});
