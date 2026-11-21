import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH4: Cổng Nhân viên - Chuẩn bị, Bàn giao, Nhận trả & Quá hạn (UC4.1 - UC4.5)", () => {
  const getPage = useSubsystemPage("phan_he_04_chuan_bi_ban_giao_nhan_tra");

  test("UC4.4, UC4.5 - Xem Tổng quan ca, tìm kiếm & mở chi tiết Đơn thuê", async () => {
    const page = getPage();
    await loginUi(page, "staff");

    // Tổng quan ca làm việc (UC4.4 cảnh báo quá hạn)
    await expect(page.getByRole("heading", { name: /Tổng quan ca làm việc/i })).toBeVisible();
    await pauseForViewer(page);

    // UC4.5: Tab Đơn thuê -> kiểm tra các bộ lọc vận hành, tìm kiếm & mở modal chi tiết đơn
    await page.getByRole("button", { name: "Đơn thuê" }).first().click();
    await expect(page.getByText(/Bộ lọc ca trực/i)).toBeVisible();
    const content = page.locator(".internal-content");
    for (const filterLabel of [/Tất cả/i, /Cần giao hôm nay/i, /Cần thu hôm nay/i, /Quá hạn/i]) {
      await expect(content.getByRole("button", { name: filterLabel }).first()).toBeVisible({ timeout: 10_000 });
    }
    const searchOrder = page.getByPlaceholder(/Tìm mã đơn, tên khách, SĐT/i);
    await searchOrder.fill("DT-");
    await pauseForViewer(page);
    await searchOrder.fill("");
    await pauseForViewer(page);

    const firstOrderBtn = page.locator("table tbody tr button").first();
    if (await waitVisible(firstOrderBtn)) {
      await firstOrderBtn.click();
      await pauseForViewer(page);
      const closeBtn = page.getByRole("button", { name: /✕|Đóng/i }).first();
      if (await waitVisible(closeBtn)) {
        await closeBtn.click();
      }
    }
  });

  test("UC4.1, UC4.2, UC4.3 - Mở tab Chuẩn bị & Bàn giao, chọn đơn & Nhận trả", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Chuẩn bị & Bàn giao" }).first().click();
    await expect(page.getByText(/Chuẩn bị|Bàn giao/i).first()).toBeVisible();
    const prepItem = page.locator('button:has-text("Đã xác nhận"), button:has-text("ORD-")').first();
    if (await waitVisible(prepItem)) {
      await prepItem.click();
    }
    const handoverTab = page.getByRole("button", { name: /2\. Tiếp khách & Bàn giao/i }).first();
    if (await waitVisible(handoverTab)) {
      await handoverTab.click();
    }
    await pauseForViewer(page);

    await page.getByRole("button", { name: "Nhận trả & Phụ phí" }).first().click();
    await expect(page.getByText(/Nhận trả|Phụ phí/i).first()).toBeVisible();
    const content = page.locator(".internal-content");
    await expect(content.getByRole("button", { name: /Đang xử lý/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(content.getByRole("button", { name: /Hoàn tất/i }).first()).toBeVisible();
    const retItem = page.locator('button:has-text("Đang thuê"), button:has-text("Quá hạn")').first();
    if (await waitVisible(retItem)) {
      await retItem.click();
    }
    await pauseForViewer(page);
  });
});
