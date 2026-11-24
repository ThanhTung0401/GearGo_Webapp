import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";
import { attachTabGuard, assertCleanTabUi, navigateStaffTab, saveEvidence } from "../../helpers/e2e23Guard.js";

test.describe.serial("E2E 23 Chức năng [02/05]: Kho & Bảo trì, Báo cáo ca (CN 6-7)", () => {
  const getPage = useSubsystemPage("e2e_23cn_02_kho_bao_tri_bao_cao_ca");

  test("CN 6 - Kho & Bảo trì: Tồn kho, Bảo trì (Tạo/Phân công/Tiến độ/Nghiệm thu) & Nhập kho", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await loginUi(page, "admin");
    await page.waitForLoadState("networkidle").catch(() => {});

    await navigateStaffTab(page, "warehouse");
    await expect(page.getByRole("button", { name: /Danh sách kho/i }).first()).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN6_warehouse_inventory");
    await saveEvidence(page, "06a_kho_ton_kho");

    // Mở Lịch bận của thiết bị đầu tiên nếu có
    const schedBtn = page.getByRole("button", { name: /Lịch bận/i }).first();
    if (await waitVisible(schedBtn, 2500)) {
      await schedBtn.click();
      const dlg = page.locator(".so-modal-overlay, [role='dialog']").last();
      await expect(dlg).toBeVisible();
      await assertCleanTabUi(page, "CN6_equip_schedule");
      await dlg.getByRole("button", { name: /Đóng|✕|×/i }).first().click();
      await expect(dlg).not.toBeVisible({ timeout: 5000 });
    }

    // Chuyển sang tab Bảo trì
    await page.getByRole("button", { name: /Phiếu bảo trì/i }).first().click();
    await page.waitForTimeout(500);
    await assertCleanTabUi(page, "CN6_warehouse_maintenance");

    // Thử mở modal Tạo phiếu bảo trì để kiểm tra dropdown thiết bị hợp lệ
    const createMaintBtn = page.getByRole("button", { name: /\+ Tạo phiếu bảo trì/i }).first();
    if (await waitVisible(createMaintBtn, 2500)) {
      await createMaintBtn.click();
      const dlg = page.locator(".so-modal-overlay, [role='dialog']").last();
      await expect(dlg).toBeVisible();
      const equipOptions = await dlg.locator("select").first().locator("option").count();
      expect(equipOptions, "Dropdown thiết bị tạo bảo trì phải có lựa chọn").toBeGreaterThan(0);
      await assertCleanTabUi(page, "CN6_create_maint_modal");
      await dlg.getByRole("button", { name: /Hủy|Đóng/i }).first().click();
    }
    await saveEvidence(page, "06b_kho_bao_tri");

    // Chuyển sang tab Nhập hàng & Kiểm nhận
    await page.getByRole("button", { name: /Nhập hàng/i }).first().click();
    await page.waitForTimeout(500);
    await assertCleanTabUi(page, "CN6_warehouse_import");

    guard.assertClean("CN6_warehouse");
  });

  test("CN 7 - Báo cáo ca & Nhật ký: Chỉ tiêu ca, Hiệu suất sản phẩm & Nhật ký thao tác", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "ops-reports");
    await expect(page.getByText(/Báo cáo|Chỉ tiêu/i).first()).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN7_ops_shift");
    await saveEvidence(page, "07a_bao_cao_ca");

    const auditSubTab = page.getByRole("button", { name: /Nhật ký thao tác/i }).first();
    if (await waitVisible(auditSubTab, 3000)) {
      await auditSubTab.click();
      await page.waitForTimeout(700);
      await assertCleanTabUi(page, "CN7_ops_audit");
      await saveEvidence(page, "07b_nhat_ky_ca");
    }

    await pauseForViewer(page, 400);
    guard.assertClean("CN7_ops_reports");
  });
});
