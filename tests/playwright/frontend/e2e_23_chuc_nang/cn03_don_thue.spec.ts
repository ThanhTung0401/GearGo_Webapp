import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";
import { attachTabGuard, assertCleanTabUi, navigateStaffTab, saveEvidence } from "../../helpers/e2e23Guard.js";
import { seedPaidOrderApi } from "../../helpers/orderSeed.js";

test.describe.serial("CN 03 - Đơn thuê: Tìm kiếm, Lọc nhanh, Phân trang, Hồ sơ đơn & No-Show", () => {
  const getPage = useSubsystemPage("e2e_cn03_don_thue");

  test("Thao tác tìm kiếm, lọc trạng thái, phân trang & mở Hồ sơ đơn vừa tạo", async ({ request }) => {
    const page = getPage();
    const guard = attachTabGuard(page);

    const seeded = await seedPaidOrderApi(request);

    await loginUi(page, "admin");
    await page.waitForLoadState("networkidle").catch(() => {});

    await navigateStaffTab(page, "orders");
    const searchInput = page.getByPlaceholder(/Tìm mã đơn, tên khách, SĐT/i);
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN03_orders_init");

    // 1. Tìm kiếm chính xác theo mã đơn vừa seed & kiểm tra dòng bảng
    await searchInput.fill(seeded.displayCode);
    await page.waitForTimeout(300);
    const targetRow = page.locator("main table tbody tr").filter({ hasText: seeded.displayCode }).first();
    await expect(targetRow, `Phải tìm thấy đơn ${seeded.displayCode}`).toBeVisible({ timeout: 10_000 });
    await expect(targetRow).toContainText("Đã xác nhận");
    await expect(targetRow).toContainText("Chuẩn bị");
    await saveEvidence(page, "cn03_tim_kiem_don");

    // 2. Mở Hồ sơ đơn & đối chiếu đúng thông tin sản phẩm, tổng thu
    await targetRow.getByRole("button", { name: "Hồ sơ", exact: true }).click();
    const detailDlg = page.locator(".so-modal-overlay, [role='dialog']").last();
    await expect(detailDlg).toBeVisible({ timeout: 10_000 });
    await expect(detailDlg).toContainText(seeded.displayCode);
    await expect(detailDlg).toContainText("Đã xác nhận");
    await expect(detailDlg).toContainText(/Nhật ký chuyển trạng thái/i);
    await assertCleanTabUi(page, "CN03_order_detail_modal");
    await saveEvidence(page, "cn03_ho_so_don");
    await detailDlg.getByRole("button", { name: /Đóng|✕|×/i }).first().click();
    await expect(detailDlg).not.toBeVisible({ timeout: 5000 });

    // 3. Thử thao tác bộ lọc ca trực & select trạng thái
    await searchInput.fill("");
    const statusSelect = page.getByLabel("Lọc trạng thái đơn");
    for (const st of ["Đã xác nhận", "Đang thuê", "Hoàn tất", "Hết hạn thanh toán", "Tất cả"]) {
      await statusSelect.selectOption(st).catch(() => {});
      await page.waitForTimeout(250);
    }
    await assertCleanTabUi(page, "CN03_after_status_filters");

    // 4. Kiểm tra phân trang nếu có > 1 trang
    const page2Btn = page.getByRole("main").getByRole("button", { name: "2", exact: true }).first();
    if (await waitVisible(page2Btn, 1500)) {
      await page2Btn.click();
      await page.waitForTimeout(300);
      await assertCleanTabUi(page, "CN03_page_2");
      const page1Btn = page.getByRole("main").getByRole("button", { name: "1", exact: true }).first();
      if (await waitVisible(page1Btn, 1500)) await page1Btn.click();
    }

    // 5. Bấm nút Đối soát (điều hướng sang Nhận trả & Đối soát) -> kiểm tra sạch -> quay lại Đơn thuê
    const reconBtn = page.getByRole("main").getByRole("button", { name: "Đối soát", exact: true }).first();
    if (await waitVisible(reconBtn, 1500)) {
      await reconBtn.click();
      await expect(page.getByText(/Đơn nhận trả & đối soát/i)).toBeVisible({ timeout: 10_000 });
      await assertCleanTabUi(page, "CN03_cross_reconcile");
      await navigateStaffTab(page, "orders");
      await expect(searchInput).toBeVisible({ timeout: 10_000 });
    }

    const noShowBtn = page.getByRole("main").getByRole("button", { name: /No-show/i }).first();
    if (await waitVisible(noShowBtn, 1500)) {
      await noShowBtn.click();
      const noShowDlg = page.locator(".so-modal-overlay, [role='dialog']").last();
      await expect(noShowDlg).toBeVisible();
      await assertCleanTabUi(page, "CN03_noshow_modal");
      await noShowDlg.getByRole("button", { name: /Hủy|Đóng|✕|×/i }).first().click();
      await expect(noShowDlg).not.toBeVisible({ timeout: 5000 });
    }

    await pauseForViewer(page, 400);
    guard.assertClean("CN03_don_thue");
  });
});
