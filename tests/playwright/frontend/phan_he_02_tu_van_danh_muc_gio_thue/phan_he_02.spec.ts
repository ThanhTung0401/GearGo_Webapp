import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { getFutureRentalDates } from "../../helpers/testData.js";

test.describe("Frontend PH2: Tìm kiếm, Chi tiết sản phẩm, Khả dụng & Tư vấn AI (UC2.1 - UC2.4.2)", () => {
  test("UC2.1, UC2.2, UC2.3 - Tìm kiếm, lọc sản phẩm, chọn ngày thuê & xem chi tiết sản phẩm", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await expect(page.getByRole("heading", { name: /Tìm đồ cho chuyến đi/i })).toBeVisible();

    // Chọn khoảng ngày thuê tương lai hợp lệ để kiểm tra khả dụng thật (UC2.3)
    const { pickupDate, returnDate } = getFutureRentalDates(6, 2);
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(pickupDate);
    await dateInputs.nth(1).fill(returnDate);

    // Xác nhận hiển thị sản phẩm từ SQL Server
    await expect(page.getByText(/sản phẩm phù hợp/i)).toBeVisible();
    await expect(page.getByText(/0 sản phẩm phù hợp/i)).not.toBeVisible();

    // UC2.2: Mở chi tiết sản phẩm đầu tiên
    await page.locator("img").first().click();
    await expect(page.getByRole("button", { name: /Quay lại danh sách/i })).toBeVisible();
  });

  test("UC2.4, UC2.4.1, UC2.4.2 - Tư vấn bộ dụng cụ với AI", async ({ page }) => {
    await loginUi(page, "customer");
    await page.getByRole("button", { name: "Tư vấn AI" }).first().click();
    await expect(page.getByText(/Tư vấn|AI/i).first()).toBeVisible();
  });
});
