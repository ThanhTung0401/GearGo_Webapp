import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { getFutureRentalDates } from "../../helpers/testData.js";
import { useSubsystemPage, pauseForViewer } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH3: Giỏ thuê, Đặt thuê & Theo dõi đơn (UC3.1 - UC3.4)", () => {
  const getPage = useSubsystemPage("phan_he_03_dat_thue_thanh_toan_huy");

  test("UC3.1 - Chọn ngày thuê, mở chi tiết sản phẩm & Thêm vào giỏ thuê", async () => {
    const page = getPage();
    await loginUi(page, "customer");

    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    const { pickupDate, returnDate } = getFutureRentalDates(12, 2);
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(pickupDate);
    await dateInputs.nth(1).fill(returnDate);
    await expect(page.getByText(/sản phẩm phù hợp/i)).toBeVisible();
    await pauseForViewer(page);

    // Mở chi tiết sản phẩm đầu tiên & bấm Thêm vào giỏ thuê (nếu chưa đầy giỏ)
    await page.locator("img").first().click();
    const addCartBtn = page.getByRole("button", { name: /Thêm vào giỏ thuê|Đã có trong giỏ/i });
    await expect(addCartBtn).toBeVisible();
    if (await addCartBtn.isEnabled()) {
      await addCartBtn.click();
      await pauseForViewer(page);
    }

    // Mở Giỏ thuê từ header (nút có aria-label hoặc chữ Giỏ thuê)
    await page.getByRole("button", { name: /Giỏ thuê/i }).first().click();
    await expect(page.getByText(/Tổng thanh toán ban đầu/i)).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page);
  });

  test("UC3.3, UC3.4 - Xem danh sách Đơn thuê của tôi", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Đơn thuê" }).first().click();
    await expect(page.getByText(/Đơn thuê của tôi|Lịch sử đơn thuê|Mã đơn/i).first()).toBeVisible();
    await pauseForViewer(page, 1200);
  });
});
