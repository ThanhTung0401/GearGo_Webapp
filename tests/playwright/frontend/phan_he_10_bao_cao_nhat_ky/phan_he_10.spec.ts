import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH10: Báo cáo, Nhật ký & Kiểm tra Responsive Mobile (UC10.1 - UC10.4.2)", () => {
  const getPage = useSubsystemPage("phan_he_10_bao_cao_nhat_ky");

  test("UC10.1 - UC10.3 - Admin xem Báo cáo Vận hành, Doanh thu, Dòng tiền & Nhập kho", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Báo cáo Kho & TC" }).first().click();
    await expect(page.getByText(/Báo cáo & Phân tích chuyên sâu/i)).toBeVisible();
    const content = page.locator(".internal-content");

    // 1. Vận hành kho (UC10.1) & mở 1 card drilldown
    await expect(content.getByRole("button", { name: /1\. Vận hành kho/i })).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 800);
    const drillBtn = content.locator("button").filter({ hasText: /Xem chi tiết|Đơn|Thiết bị/i }).first();
    if (await waitVisible(drillBtn, 2000)) {
      await drillBtn.click();
      await pauseForViewer(page, 800);
      await page.keyboard.press("Escape");
    }

    // 2. Doanh thu thuần (UC10.2)
    await content.getByRole("button", { name: /Doanh thu thuần/i }).first().click();
    await pauseForViewer(page, 900);

    // 3. Dòng tiền thực tế (UC10.2.1 - tách riêng tiền cọc)
    await content.getByRole("button", { name: /Dòng tiền thực tế/i }).first().click();
    await pauseForViewer(page, 900);

    // 4. Nhập kho & Tài sản (UC10.3)
    await content.getByRole("button", { name: /Nhập kho & Tài sản/i }).first().click();
    await pauseForViewer(page, 900);
  });

  test("UC10.4, UC10.4.1, UC10.4.2 - Audit Log Admin & Báo cáo ca Staff đúng phạm vi quyền", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Audit Log" }).first().click();
    await expect(page.getByText(/Nhật ký|Audit Log/i).first()).toBeVisible();
    await pauseForViewer(page, 800);

    // Mở chi tiết sự kiện nhật ký (UC10.4) & chứng từ liên quan (UC10.4.2)
    const detailBtn = page.locator(".internal-content table tbody tr button").first();
    if (await waitVisible(detailBtn, 2500)) {
      await detailBtn.click();
      await pauseForViewer(page, 800);
      await page.getByRole("button", { name: /✕|Đóng/i }).first().click().catch(() => {});
    }

    // Chuyển SPA sang Staff kiểm tra Báo cáo ca & Nhật ký (UC10.4.1)
    await loginUi(page, "staff");
    await page.getByRole("button", { name: "Báo cáo ca & Nhật ký" }).first().click();
    await expect(page.getByText(/Báo cáo|Nhật ký/i).first()).toBeVisible();
    await pauseForViewer(page, 900);
  });

  test("Responsive Mobile 390x844 - Không tràn ngang trên Public & Admin", async () => {
    const page = getPage();
    await page.getByRole("button", { name: /Trang khách/i }).first().click();
    await page.getByRole("button", { name: "Thoát" }).first().click();
    await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await pauseForViewer(page, 900);

    const publicOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(publicOverflow).toBeFalsy();

    // Đăng nhập Admin ở desktop rồi thu nhỏ về mobile 390x844 kiểm tra không tràn ngang
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginUi(page, "admin");
    await page.setViewportSize({ width: 390, height: 844 });
    await pauseForViewer(page, 900);

    const adminOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(adminOverflow).toBeFalsy();

    await page.setViewportSize({ width: 1440, height: 900 });
    await pauseForViewer(page, 700);
  });
});
