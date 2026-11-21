import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH4: Cổng Nhân viên - Chuẩn bị, Bàn giao, Nhận trả & Quá hạn (UC4.1 - UC4.5)", () => {
  const getPage = useSubsystemPage("phan_he_04_chuan_bi_ban_giao_nhan_tra");

  test("UC4.5 - Xem Tổng quan ca, lọc tìm đơn & mở chi tiết Đơn thuê cho vận hành", async () => {
    const page = getPage();
    await loginUi(page, "staff");

    await page.getByRole("button", { name: "Tổng quan ca" }).first().click();
    await expect(page.getByText(/Tổng quan/i).first()).toBeVisible();
    await pauseForViewer(page, 700);

    await page.getByRole("button", { name: "Đơn thuê" }).first().click();
    const searchOrder = page.getByPlaceholder(/Tìm mã đơn, tên khách, SĐT/i);
    await expect(searchOrder).toBeVisible();
    await searchOrder.fill("ORD-");
    await pauseForViewer(page, 700);
    await searchOrder.fill("");
    await pauseForViewer(page, 600);

    // Mở chi tiết đơn thuê (UC4.5)
    const firstOrderBtn = page.locator("table tbody tr button").first();
    if (await waitVisible(firstOrderBtn, 3000)) {
      await firstOrderBtn.click();
      await pauseForViewer(page, 900);
      const closeBtn = page.getByRole("button", { name: /✕|Đóng/i }).first();
      if (await waitVisible(closeBtn, 2000)) {
        await closeBtn.click();
      }
    }
  });

  test("UC4.1 & UC4.2 - Chuẩn bị thiết bị, kiểm tra phân công & Tiếp khách bàn giao", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Chuẩn bị & Bàn giao" }).first().click();
    await expect(page.getByText(/Chuẩn bị|Bàn giao/i).first()).toBeVisible();
    await pauseForViewer(page, 700);

    // Chọn đơn đang chờ chuẩn bị / đã xác nhận
    const prepItem = page.locator('button:has-text("Đã xác nhận"), button:has-text("Đang chuẩn bị"), button:has-text("ORD-")').first();
    if (await waitVisible(prepItem, 3000)) {
      await prepItem.click();
      await pauseForViewer(page, 800);
    }

    // Chuyển sang tab 2. Tiếp khách & Bàn giao (UC4.2)
    const handoverTab = page.getByRole("button", { name: /2\. Tiếp khách & Bàn giao/i }).first();
    if (await waitVisible(handoverTab, 3000)) {
      await handoverTab.click();
      await pauseForViewer(page, 800);
      const readyItem = page.locator('button:has-text("Sẵn sàng nhận"), button:has-text("ORD-")').first();
      if (await waitVisible(readyItem, 2500)) {
        await readyItem.click();
        await pauseForViewer(page, 800);
      }
    }
  });

  test("UC4.3, UC4.3.1 & UC4.4 - Nhận trả kiểm tra thiết bị, lịch sử đợt & xử lý đơn quá hạn", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Nhận trả & Phụ phí" }).first().click();
    await expect(page.getByText(/Nhận trả|Phụ phí/i).first()).toBeVisible();
    const content = page.locator(".internal-content");
    await expect(content.getByRole("button", { name: /Đang xử lý/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(content.getByRole("button", { name: /Hoàn tất/i }).first()).toBeVisible();
    await pauseForViewer(page, 700);

    // Chọn đơn Đang thuê hoặc Quá hạn để hiển thị form kiểm tra nhận trả (UC4.3)
    const retItem = page.locator('button:has-text("Đang thuê"), button:has-text("Quá hạn")').first();
    if (await waitVisible(retItem, 3000)) {
      await retItem.click();
      await pauseForViewer(page, 900);
    }

    // Chuyển sang tab Hoàn tất xem lịch sử phiếu nhận trả (UC4.3)
    const doneTab = content.getByRole("button", { name: /Hoàn tất/i }).first();
    await doneTab.click();
    await pauseForViewer(page, 700);
    const doneOrderBtn = page.locator('button:has-text("ORD-")').first();
    if (await waitVisible(doneOrderBtn, 2500)) {
      await doneOrderBtn.click();
      await pauseForViewer(page, 800);
    }

    // Kiểm tra chức năng liên hệ quá hạn nếu có nút Liên hệ khách (UC4.4)
    await content.getByRole("button", { name: /Đang xử lý/i }).first().click();
    const contactBtn = page.getByRole("button", { name: /Liên hệ|Ghi nhận liên hệ/i }).first();
    if (await waitVisible(contactBtn, 2000)) {
      await contactBtn.click();
      await pauseForViewer(page, 700);
      await page.keyboard.press("Escape");
    }
    await pauseForViewer(page, 800);
  });
});
