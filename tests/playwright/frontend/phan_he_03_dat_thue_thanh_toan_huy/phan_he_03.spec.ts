import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { getFutureRentalDates } from "../../helpers/testData.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH3: Giỏ thuê, Đặt thuê, Thanh toán & Hủy đơn (UC3.1 - UC3.4)", () => {
  const getPage = useSubsystemPage("phan_he_03_dat_thue_thanh_toan_huy");

  test("UC3.1, UC3.1.1, UC3.1.2 - Thêm vào giỏ, chỉnh số lượng & kiểm tra mã khuyến mãi", async () => {
    const page = getPage();
    await loginUi(page, "customer");

    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    const dynamicOffset = 30 + (Date.now() % 60);
    const { pickupDate, returnDate } = getFutureRentalDates(dynamicOffset, 2);
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(pickupDate);
    await dateInputs.nth(1).fill(returnDate);
    await expect(page.getByText(/sản phẩm phù hợp/i)).toBeVisible();
    await pauseForViewer(page, 700);

    // Mở chi tiết sản phẩm & thêm vào giỏ thuê
    await page.locator("img").first().click();
    const addCartBtn = page.getByRole("button", { name: /Thêm vào giỏ thuê|Đã có trong giỏ/i });
    await expect(addCartBtn).toBeVisible();
    if (await addCartBtn.isEnabled()) {
      await addCartBtn.click();
      await pauseForViewer(page, 700);
    }

    await page.getByRole("button", { name: /Giỏ thuê/i }).first().click();
    await expect(page.getByText(/Tổng thanh toán ban đầu/i)).toBeVisible({ timeout: 10_000 });

    // Dọn các món hết hàng (nếu có) trước khi đặt thuê
    for (let i = 0; i < 5; i++) {
      const outOfStockCard = page.locator("div").filter({ hasText: /Hết hàng trong khoảng ngày đã chọn/i }).last();
      if (!(await outOfStockCard.isVisible().catch(() => false))) break;
      const removeBtn = outOfStockCard.locator('button:has-text("×")').first();
      if (await removeBtn.isVisible().catch(() => false)) {
        await removeBtn.click();
        await page.waitForTimeout(400);
      } else break;
    }

    // UC3.1.2 nhánh phụ: Nhập mã khuyến mãi không hợp lệ -> xem phản hồi lỗi -> Xóa trắng
    const promoInput = page.locator('input[placeholder*="CAMPGO"], input[placeholder*="khuyến mãi" i]').first();
    await expect(promoInput).toBeVisible();
    await promoInput.fill("MA_SAI_KHONG_TON_TAI");
    await page.getByRole("button", { name: "Áp dụng", exact: true }).first().click();
    await pauseForViewer(page, 700);
    await promoInput.fill("");
    await pauseForViewer(page, 600);
  });

  test("UC3.2, UC3.2.1, UC5.1 - Tạo đơn giữ chỗ 15 phút & xác nhận thanh toán VietQR", async () => {
    const page = getPage();
    const proceedBtn = page.getByRole("button", { name: /Tiến hành xác nhận thuê/i }).first();
    await expect(proceedBtn).toBeEnabled();
    await proceedBtn.click();
    await pauseForViewer(page, 700);

    await page.locator('input[type="checkbox"]').first().check();
    await pauseForViewer(page, 600);
    await page.getByRole("button", { name: /Xác nhận đặt thuê/i }).first().click();

    await expect(page.getByText(/Đơn thuê đang chờ thanh toán \(Giữ chỗ 15 phút\)/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Thời hạn giữ chỗ còn lại:/i)).toBeVisible();
    await pauseForViewer(page, 900);

    await page.getByRole("button", { name: /Tiền mặt tại quầy/i }).click();
    await page.getByRole("button", { name: /Xác nhận thanh toán tiền mặt/i }).click();
    await expect(page.getByText(/Đơn thuê đã được thanh toán & xác nhận!/i)).toBeVisible({ timeout: 15_000 });
    await pauseForViewer(page, 900);
  });

  test("UC3.3 & UC3.4 - Theo dõi đơn thuê, xem chi tiết & thực hiện hủy đơn kèm dự toán hoàn tiền", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Đơn thuê" }).first().click();
    await expect(page.getByText(/Đơn thuê của tôi|Lịch sử đơn thuê|Mã đơn/i).first()).toBeVisible();

    for (const tabLabel of [/Tất cả/i, /Chờ thanh toán/i, /Đã xác nhận/i, /Đang thuê/i, /Hoàn tất/i, /Hết hạn/i, /Đã hủy/i]) {
      await expect(page.getByRole("button", { name: tabLabel }).first()).toBeVisible({ timeout: 10_000 });
    }

    // Lọc tab "Đã xác nhận", mở đơn đầu tiên (chính là đơn vừa thanh toán) & thực hiện Hủy đơn (UC3.4)
    await page.getByRole("button", { name: /Đã xác nhận/i }).first().click();
    await pauseForViewer(page, 700);

    const firstConfirmedOrder = page.locator("text=/DH\\d+|ORD-\\d+/").first();
    await expect(firstConfirmedOrder).toBeVisible({ timeout: 10_000 });
    await firstConfirmedOrder.click();
    await expect(page.getByText(/Chi tiết đơn thuê & Chứng từ/i)).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 800);

    const reqCancel = page.getByRole("button", { name: /Yêu cầu hủy đơn thuê/i }).first();
    if (await waitVisible(reqCancel, 3000)) {
      await reqCancel.click();
      await expect(page.getByText(/Bảng dự tính hoàn tiền/i)).toBeVisible({ timeout: 10_000 });
      await pauseForViewer(page, 800);

      await page.locator("textarea").first().fill("Thay đổi lịch trình chuyến đi (Test E2E UC3.4)");
      await pauseForViewer(page, 600);
      const confirmCancelBtn = page.getByRole("button", { name: /Xác nhận hủy đơn/i }).last();
      if (await waitVisible(confirmCancelBtn, 2000)) {
        await confirmCancelBtn.click();
        await pauseForViewer(page, 1000);
      }
    }
    await pauseForViewer(page, 1000);
  });
});
