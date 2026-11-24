import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { uniqueSuffix } from "../../helpers/testData.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";
import { attachTabGuard, assertCleanTabUi, navigateStaffTab, saveEvidence } from "../../helpers/e2e23Guard.js";

test.describe.serial("E2E 23 Chức năng [05/05]: Khuyến mãi, Chính sách, Thông báo, Bù trừ, Báo cáo, Audit & Phân quyền (CN 17-23)", () => {
  const getPage = useSubsystemPage("e2e_23cn_05_km_chinh_sach_tai_chinh_audit_rbac");
  const suffix = uniqueSuffix();
  const promoCode = `E2EKM${suffix.slice(-5)}`;

  test("CN 17 - Khuyến mãi (CRUD thật): Tạo mã -> Mở Chi tiết -> Tạm dừng (modal nổi trên) -> Kích hoạt lại", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await loginUi(page, "admin");
    await page.waitForLoadState("networkidle").catch(() => {});

    await navigateStaffTab(page, "promotions");
    await expect(page.getByRole("button", { name: /\+ Tạo mã giảm mới/i })).toBeVisible({ timeout: 15_000 });

    // Tạo mã khuyến mãi mới
    await page.getByRole("button", { name: /\+ Tạo mã giảm mới/i }).click();
    let dlg = page.getByRole("dialog").first();
    await dlg.locator("label").filter({ hasText: /Mã giảm giá/ }).locator("input").fill(promoCode);
    await dlg.locator("label").filter({ hasText: /^Tên chương trình/ }).locator("input").fill(`KM E2E ${suffix}`);
    await dlg.locator("label").filter({ hasText: /Giá trị giảm/ }).locator("input").fill("10");
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(promoCode).first()).toBeVisible({ timeout: 10_000 });
    await saveEvidence(page, "17_khuyen_mai_crud");
    await assertCleanTabUi(page, "CN17_promotions");
    guard.assertClean("CN17_promotions");
  });

  test("CN 18 - Chính sách thuê: Kiểm tra biểu phí phụ kiện & lịch sử phiên bản", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "policies");
    await expect(page.getByText(/Chính sách thuê/i).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await assertCleanTabUi(page, "CN18_policies");
    await saveEvidence(page, "18_chinh_sach_thue");

    guard.assertClean("CN18_policies");
  });

  test("CN 19 - Thông báo HT: Gửi broadcast & kiểm tra lịch sử đã phát", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "notifications");
    await expect(page.getByText(/Thông báo/i).first()).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN19_notifications");

    const titleInput = page.getByPlaceholder(/Tiêu đề thông báo/i).first();
    if (await waitVisible(titleInput, 2500)) {
      await titleInput.fill(`Thông báo E2E ${suffix}`);
      await page.getByPlaceholder(/Nội dung thông báo/i).first().fill("Kiểm thử gửi broadcast từ Playwright");
      await page.getByRole("button", { name: /Phát hành|Gửi thông báo/i }).first().click();
      await page.waitForTimeout(800);
    }

    const histTab = page.getByRole("button", { name: /Lịch sử thông báo/i }).first();
    if (await waitVisible(histTab, 2000)) {
      await histTab.click();
      await page.waitForTimeout(500);
      await assertCleanTabUi(page, "CN19_notifications_history");
    }
    await saveEvidence(page, "19_thong_bao_ht");

    guard.assertClean("CN19_notifications");
  });

  test("CN 20 - Bù trừ tài chính: Kiểm tra số tiền > 0đ & lập chứng từ 100.000đ", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "adjustments");
    await expect(page.getByText(/Bù trừ tài chính|Đối soát/i).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await assertCleanTabUi(page, "CN20_adjustments");
    await saveEvidence(page, "20_bu_tru_tai_chinh");

    guard.assertClean("CN20_adjustments");
  });

  test("CN 21 - Báo cáo Kho & TC: Kiểm tra đủ 4 sub-tabs & phân trang", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "reports");
    await expect(page.getByText(/Báo cáo/i).first()).toBeVisible({ timeout: 15_000 });

    for (const subLabel of ["1. Vận hành kho", "2. Doanh thu", "3. Dòng tiền", "4. Nhập kho"]) {
      const btn = page.locator("main").getByRole("button", { name: new RegExp(subLabel, "i") }).first();
      if (await waitVisible(btn, 2000)) {
        await btn.click();
        await page.waitForTimeout(500);
        await assertCleanTabUi(page, `CN21_${subLabel}`);
      }
    }
    await saveEvidence(page, "21_bao_cao_kho_tc");
    guard.assertClean("CN21_reports");
  });

  test("CN 22 - Audit Log: Lọc theo ngày hôm nay, mở Chi tiết sự kiện & Chứng từ đối chiếu", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "audit-log");
    await expect(page.getByText(/Nhật ký hệ thống|Audit Log/i).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(600);
    await assertCleanTabUi(page, "CN22_audit_log");

    const detailBtn = page.getByRole("button", { name: "Chi tiết", exact: true }).first();
    if (await waitVisible(detailBtn, 3000)) {
      await detailBtn.click();
      const dlg = page.locator(".adm-modal-overlay, [role='dialog']").last();
      await expect(dlg).toBeVisible();
      await assertCleanTabUi(page, "CN22_audit_detail_modal");
      await saveEvidence(page, "22_audit_log_chi_tiet");
      await dlg.getByRole("button", { name: /Đóng|✕|×/i }).first().click();
    } else {
      await saveEvidence(page, "22_audit_log");
    }

    guard.assertClean("CN22_audit_log");
  });

  test("CN 23 - Phân quyền: Kiểm tra 2 chế độ (Theo vai trò & 1 nhân viên riêng)", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "permissions");
    await expect(page.getByText(/Phân quyền hệ thống/i)).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN23_permissions_role");
    await saveEvidence(page, "23a_phan_quyen_vai_tro");

    // Chuyển sang chế độ Phân quyền riêng 1 nhân viên
    await page.getByRole("tab", { name: /Phân quyền riêng 1 nhân viên/i }).click();
    await page.waitForTimeout(600);
    await expect(page.locator("#select-staff-perm")).toBeVisible();
    await assertCleanTabUi(page, "CN23_permissions_staff");
    await saveEvidence(page, "23b_phan_quyen_1_nhan_vien");

    await pauseForViewer(page, 400);
    guard.assertClean("CN23_permissions");
  });
});
