import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";
import { attachTabGuard, assertCleanTabUi, navigateStaffTab, saveEvidence } from "../../helpers/e2e23Guard.js";
import { seedPaidOrderApi } from "../../helpers/orderSeed.js";

test.describe.serial("CN 02 - Tổng quan hệ thống: KPI, Xuất báo cáo, Cửa hàng hủy (UC3.4) & Đối soát", () => {
  const getPage = useSubsystemPage("e2e_cn02_tong_quan_he_thong");

  test("Thao tác thật: Xuất báo cáo, Cửa hàng hủy đơn UC3.4 -> F5 đối chiếu bên Đơn thuê", async ({ request }) => {
    const page = getPage();
    const guard = attachTabGuard(page);

    // Seed 1 đơn riêng để test Cửa hàng hủy UC3.4 không ảnh hưởng đơn của test khác
    const seeded = await seedPaidOrderApi(request);

    await loginUi(page, "admin");
    await page.waitForLoadState("networkidle").catch(() => {});

    await navigateStaffTab(page, "dashboard");
    await expect(page.getByRole("main").getByRole("heading", { name: /Tổng quan hệ thống/i })).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN02_dashboard_init");

    // 1. Kiểm tra hiển thị vai trò & nút Xuất báo cáo -> bấm Xuất báo cáo thật
    await expect(page.locator("main").getByText(/Role:/i).first()).toBeVisible();
    const exportBtn = page.getByRole("main").getByRole("button", { name: /Xuất báo cáo/i }).first();
    if (await waitVisible(exportBtn, 3000)) {
      const downloadPromise = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
      await exportBtn.click();
      await downloadPromise;
      await page.waitForTimeout(500);
      await assertCleanTabUi(page, "CN02_after_export");
    }

    // 2. Thao tác thật: Cửa hàng hủy đơn UC3.4 trên Sơ đồ trạng thái
    const confirmedStep = page.locator("button.adm-flow-step").filter({ hasText: "Đã xác nhận" }).first();
    await expect(confirmedStep).toBeVisible();
    await confirmedStep.click();
    await page.waitForTimeout(400);

    const targetRow = page.locator("main .adm-flow-order-row").filter({ hasText: seeded.displayCode }).first();
    await expect(targetRow, `Đơn ${seeded.displayCode} phải có trong danh sách Đã xác nhận`).toBeVisible({ timeout: 10_000 });

    await targetRow.getByRole("button", { name: /Cửa hàng hủy \(UC3\.4\)/i }).click();
    const cancelDlg = page.locator(".adm-modal-overlay, [role='dialog']").last();
    await expect(cancelDlg).toBeVisible({ timeout: 10_000 });
    // Chờ xem trước hoàn tiền tải xong (hiển thị "Tổng hoàn dự kiến")
    await expect(cancelDlg.getByText(/Tổng hoàn dự kiến cho khách/i)).toBeVisible({ timeout: 10_000 });
    await assertCleanTabUi(page, "CN02_store_cancel_modal");
    await saveEvidence(page, "cn02_modal_cua_hang_huy");

    await cancelDlg.locator("textarea").fill("Cửa hàng hủy kiểm thử E2E CN02");
    await cancelDlg.getByRole("button", { name: /Xác nhận cửa hàng hủy/i }).click();
    await expect(cancelDlg).not.toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(600);
    await saveEvidence(page, "cn02_sau_huy_don");
    await pauseForViewer(page, 500);

    // 3. Đối chiếu chéo sau F5 bên tab Đơn thuê: trạng thái phải là "Đã hủy"
    await page.reload({ waitUntil: "domcontentloaded" });
    await navigateStaffTab(page, "orders");
    const searchOrder = page.getByPlaceholder(/Tìm mã đơn, tên khách, SĐT/i);
    await expect(searchOrder).toBeVisible({ timeout: 15_000 });
    await searchOrder.fill(seeded.displayCode);
    await page.waitForTimeout(400);

    const orderTableRow = page.locator("main table tbody tr").filter({ hasText: seeded.displayCode }).first();
    await expect(orderTableRow, `Đơn ${seeded.displayCode} phải xuất hiện bên Đơn thuê`).toBeVisible({ timeout: 10_000 });
    await expect(orderTableRow).toContainText(/Cửa hàng hủy|Đã hủy/);
    await assertCleanTabUi(page, "CN02_cross_verify_cancelled_order");
    await saveEvidence(page, "cn02_doi_chieu_don_da_huy");

    // 4. Quay lại Tổng quan hệ thống kiểm tra bước "Chờ đối soát"
    await navigateStaffTab(page, "dashboard");
    const reconcileStep = page.locator("button.adm-flow-step").filter({ hasText: "Chờ đối soát" }).first();
    if (await waitVisible(reconcileStep, 3000)) {
      await reconcileStep.click();
      await page.waitForTimeout(400);
      const reconBtn = page.locator("main .adm-flow-order-row button").filter({ hasText: /Đối soát|Xem đối soát/i }).first();
      if (await waitVisible(reconBtn, 1500)) {
        await reconBtn.click();
        const reconDlg = page.locator(".adm-modal-overlay, [role='dialog']").last();
        await expect(reconDlg).toBeVisible({ timeout: 10_000 });
        await assertCleanTabUi(page, "CN02_reconcile_modal");
        await reconDlg.getByRole("button", { name: /Đóng|✕|×/i }).first().click();
      }
    }

    guard.assertClean("CN02_tong_quan_he_thong");
  });
});
