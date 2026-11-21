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

    // Mở Giỏ thuê từ header và kiểm tra ô Nhập mã khuyến mãi (SCR-3.1)
    await page.getByRole("button", { name: /Giỏ thuê/i }).first().click();
    await expect(page.getByText(/Tổng thanh toán ban đầu/i)).toBeVisible({ timeout: 10_000 });
    const promoInput = page.locator('input[placeholder*="CAMPGO"], input[placeholder*="khuyến mãi" i]').first();
    await expect(promoInput).toBeVisible();
    await pauseForViewer(page);

    // UC3.2 & UC5.1: Tiến hành đặt thuê -> Kiểm tra đồng hồ 15p không bị hết hạn tức thì -> Thanh toán thành công
    const proceedBtn = page.getByRole("button", { name: /Tiến hành xác nhận thuê/i }).first();
    await expect(proceedBtn).toBeEnabled();
    await proceedBtn.click();
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /Xác nhận đặt thuê/i }).first().click();

    await expect(page.getByText(/Đơn thuê đang chờ thanh toán \(Giữ chỗ 15 phút\)/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Thời hạn giữ chỗ còn lại:/i)).toBeVisible();
    await page.getByRole("button", { name: /Xác nhận đã thanh toán VietQR/i }).click();
    await expect(page.getByText(/Đơn thuê đã được thanh toán & xác nhận!/i)).toBeVisible({ timeout: 15_000 });
    await pauseForViewer(page);
  });

  test("UC3.3, UC3.4 - Xem danh sách Đơn thuê, kiểm tra các tab lọc trạng thái & mở modal Hủy đơn", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Đơn thuê" }).first().click();
    await expect(page.getByText(/Đơn thuê của tôi|Lịch sử đơn thuê|Mã đơn/i).first()).toBeVisible();

    for (const tabLabel of [/Tất cả/i, /Chờ thanh toán/i, /Đã xác nhận/i, /Đang thuê/i, /Hoàn tất/i, /Hết hạn/i, /Đã hủy/i]) {
      await expect(page.getByRole("button", { name: tabLabel }).first()).toBeVisible({ timeout: 10_000 });
    }

    // SCR-3.4: Mở hộp thoại xác nhận hủy đơn thuê từ tab Đã xác nhận
    await page.getByRole("button", { name: /Đã xác nhận/i }).first().click();
    const orderItem = page.getByText("ORD-202611-110").first();
    if (await orderItem.isVisible().catch(() => false)) {
      await orderItem.click();
      const reqCancel = page.getByRole("button", { name: /Yêu cầu hủy đơn thuê/i }).first();
      if (await reqCancel.isVisible().catch(() => false)) {
        await reqCancel.click();
        await expect(page.locator("textarea").first()).toBeVisible();
        await page.keyboard.press("Escape");
      }
    }
    await pauseForViewer(page, 1200);
  });
});
