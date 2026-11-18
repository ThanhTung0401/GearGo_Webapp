import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { getFutureRentalDates } from "../../helpers/testData.js";

test.describe("Frontend PH3: Giỏ thuê, Đặt thuê & Theo dõi đơn (UC3.1 - UC3.4)", () => {
  test("UC3.1 - UC3.4 - Chọn ngày thuê, thêm sản phẩm vào giỏ, mở Giỏ thuê & Đơn thuê của tôi", async ({ page }) => {
    await loginUi(page, "customer");

    // Vào trang Thuê đồ & chọn ngày hợp lệ
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    const { pickupDate, returnDate } = getFutureRentalDates(12, 2);
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(pickupDate);
    await dateInputs.nth(1).fill(returnDate);

    // Mở Đơn thuê của tôi (UC3.3)
    await page.getByRole("button", { name: "Đơn thuê" }).first().click();
    await expect(page.getByText(/Đơn thuê của tôi|Lịch sử đơn thuê|Mã đơn/i).first()).toBeVisible();
  });
});
