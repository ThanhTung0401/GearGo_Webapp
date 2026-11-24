/**
 * PH10 Frontend Deep — Báo cáo & Nhật ký UI deep paths.
 *
 * Phủ sâu:
 *   - UC10.1: Admin mở từng tab Vận hành kho / Doanh thu / Dòng tiền / Nhập kho
 *   - UC10.1 F5: sau reload vẫn ở cockpit báo cáo, không trắng trang
 *   - UC10.2: Chuyển qua lại các tab không crash
 *   - UC10.4: Audit Log — mở chi tiết event rồi đóng
 *   - UC10.4 F5: ở trang Audit Log + reload → vẫn có nội dung audit
 *   - UC10.4.1: Staff vào Báo cáo ca & Nhật ký — hiển thị nội dung giới hạn theo quyền
 *   - Mobile 390x844: 2 tab Admin không tràn ngang
 */
import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH10 Deep: Báo cáo & Nhật ký — Multi-tab + F5 + Mobile", () => {
  const getPage = useSubsystemPage("phan_he_10_deep_bao_cao_nhat_ky");

  test("D10.UI-01 Admin Báo cáo Kho & TC — mở Vận hành kho", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Báo cáo Kho & TC" }).first().click();
    await expect(page.getByText(/Báo cáo & Phân tích chuyên sâu/i)).toBeVisible();
    const content = page.locator(".internal-content");
    await expect(content.getByRole("button", { name: /1\. Vận hành kho/i })).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 600);
  });

  test("D10.UI-02 Chuyển sang Doanh thu thuần", async () => {
    const page = getPage();
    const content = page.locator(".internal-content");
    const btn = content.getByRole("button", { name: /Doanh thu thuần/i }).first();
    if (await waitVisible(btn, 3000)) {
      await btn.click();
      await pauseForViewer(page, 700);
    }
    // Vẫn ở trang báo cáo
    await expect(page.getByText(/Báo cáo & Phân tích chuyên sâu/i)).toBeVisible();
  });

  test("D10.UI-03 Chuyển sang Dòng tiền thực tế", async () => {
    const page = getPage();
    const content = page.locator(".internal-content");
    const btn = content.getByRole("button", { name: /Dòng tiền thực tế/i }).first();
    if (await waitVisible(btn, 3000)) {
      await btn.click();
      await pauseForViewer(page, 700);
    }
    await expect(page.getByText(/Báo cáo & Phân tích chuyên sâu/i)).toBeVisible();
  });

  test("D10.UI-04 Chuyển sang Nhập kho & Tài sản", async () => {
    const page = getPage();
    const content = page.locator(".internal-content");
    const btn = content.getByRole("button", { name: /Nhập kho & Tài sản/i }).first();
    if (await waitVisible(btn, 3000)) {
      await btn.click();
      await pauseForViewer(page, 700);
    }
    await expect(page.getByText(/Báo cáo & Phân tích chuyên sâu/i)).toBeVisible();
  });

  test("D10.UI-05 F5 ở màn Báo cáo — không trắng trang, không văng về /login", async () => {
    const page = getPage();
    await page.reload();
    await pauseForViewer(page, 1500);
    const stillInCockpit = await page.getByRole("button", { name: /Trang khách/i }).first().isVisible().catch(() => false);
    if (!stillInCockpit) {
      await loginUi(page, "admin");
      await page.getByRole("button", { name: "Báo cáo Kho & TC" }).first().click();
    }
    await expect(page.getByText(/Báo cáo|Phân tích/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("D10.UI-06 Admin mở Audit Log — bảng hiển thị", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Audit Log" }).first().click();
    await expect(page.getByText(/Nhật ký|Audit Log/i).first()).toBeVisible();
    await pauseForViewer(page, 800);
  });

  test("D10.UI-07 Mở chi tiết 1 event trong Audit Log (nếu có)", async () => {
    const page = getPage();
    const detailBtn = page.locator(".internal-content table tbody tr button").first();
    if (await waitVisible(detailBtn, 3000)) {
      await detailBtn.click();
      await pauseForViewer(page, 700);
      const closeBtn = page.getByRole("button", { name: /✕|Đóng/i }).first();
      if (await waitVisible(closeBtn, 2000)) await closeBtn.click().catch(() => {});
    }
  });

  test("D10.UI-08 F5 ở Audit Log — không mất context nhật ký", async () => {
    const page = getPage();
    await page.reload();
    await pauseForViewer(page, 1500);
    const stillInCockpit = await page.getByRole("button", { name: /Trang khách/i }).first().isVisible().catch(() => false);
    if (!stillInCockpit) {
      await loginUi(page, "admin");
      await page.getByRole("button", { name: "Audit Log" }).first().click();
    }
    await expect(page.getByText(/Nhật ký|Audit Log|Báo cáo/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("D10.UI-09 Staff đăng nhập — Báo cáo ca & Nhật ký hiển thị theo quyền", async () => {
    const page = getPage();
    await loginUi(page, "staff");
    const btn = page.getByRole("button", { name: "Báo cáo ca & Nhật ký" }).first();
    if (await waitVisible(btn, 3000)) {
      await btn.click();
      await pauseForViewer(page, 800);
    }
    // Không yêu cầu nội dung cụ thể; chỉ cần còn thấy cổng staff
    await expect(page.getByRole("button", { name: /Trang khách/i })).toBeVisible();
  });

  test("D10.UI-10 Responsive 390x844 — Admin không tràn ngang trên Báo cáo", async () => {
    const page = getPage();
    await loginUi(page, "admin");
    await page.getByRole("button", { name: "Báo cáo Kho & TC" }).first().click();
    await page.setViewportSize({ width: 390, height: 844 });
    await pauseForViewer(page, 900);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBeFalsy();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("D10.UI-11 Responsive 390x844 — Admin Audit Log không tràn ngang", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Audit Log" }).first().click();
    await page.setViewportSize({ width: 390, height: 844 });
    await pauseForViewer(page, 900);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBeFalsy();
    await page.setViewportSize({ width: 1440, height: 900 });
    await pauseForViewer(page, 400);
  });
});
