import { test, expect, type Page } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";
import { attachTabGuard, assertCleanTabUi, navigateStaffTab, saveEvidence } from "../../helpers/e2e23Guard.js";
import { seedPaidOrderApi } from "../../helpers/orderSeed.js";

/**
 * Tìm và click chọn thẻ đơn hàng theo mã hiển thị trong cột hàng đợi (lọc bằng ô tìm kiếm QR nếu có).
 */
async function selectQueueOrder(page: Page, displayCode: string): Promise<void> {
  const qrInput = page.locator("main input[placeholder*='QR'], main input[placeholder*='Tìm'], main input[placeholder*='mã']").first();
  if (await waitVisible(qrInput, 1500)) {
    await qrInput.fill(displayCode);
    await page.waitForTimeout(300);
  }
  let card = page.locator("main button").filter({ hasText: displayCode }).first();
  if (!(await waitVisible(card, 2000))) {
    // Fallback duyệt trang trong cột hàng đợi nếu ô tìm kiếm không lọc trực tiếp
    for (let p = 2; p <= 6; p++) {
      const pBtn = page.locator("main").getByRole("button", { name: String(p), exact: true }).first();
      if (!(await waitVisible(pBtn, 800))) break;
      await pBtn.click();
      await page.waitForTimeout(300);
      card = page.locator("main button").filter({ hasText: displayCode }).first();
      if (await waitVisible(card, 1200)) break;
    }
  }
  await expect(card, `Không tìm thấy thẻ đơn ${displayCode} trong hàng đợi`).toBeVisible({ timeout: 10_000 });
  await card.click();
}

test.describe.serial("CN 04 - Chuẩn bị & Bàn giao: Soạn hàng, Gán serial, Bàn giao BBBG & Đối chiếu 3 màn hình", () => {
  const getPage = useSubsystemPage("e2e_cn04_chuan_bi_ban_giao");

  test("Chuẩn bị gán serial -> Sẵn sàng nhận -> Bàn giao BBBG -> F5 đối chiếu Đơn thuê, Vòng đời & Tổng quan ca", async ({ request }) => {
    const page = getPage();
    const guard = attachTabGuard(page);

    const seeded = await seedPaidOrderApi(request);

    await loginUi(page, "admin");
    await page.waitForLoadState("networkidle").catch(() => {});

    await navigateStaffTab(page, "handover");
    await expect(page.getByText(/Chuẩn bị kho \(UC4\.1\)/i)).toBeVisible({ timeout: 15_000 });

    // BƯỚC 1: Chọn đơn vừa seed trong tab "1. Chuẩn bị kho (UC4.1)"
    await selectQueueOrder(page, seeded.displayCode);
    await page.waitForTimeout(600);
    await assertCleanTabUi(page, "CN04_prep_selected");

    // Bấm "Nhận soạn hàng →" nếu đơn đang ở "Đã xác nhận"
    const startPrepBtn = page.getByRole("button", { name: /Nhận soạn hàng/i }).first();
    if (await waitVisible(startPrepBtn, 2500)) {
      await startPrepBtn.click();
      await page.waitForTimeout(600);
    }

    // Chọn mã thiết bị sẵn sàng từ dropdown slot đầu tiên và lưu lại mã serial được gán
    const equipSelect = page.locator("main select.so-slot-select").first();
    await expect(equipSelect, "Phải hiển thị dropdown chọn serial thiết bị").toBeVisible({ timeout: 10_000 });
    await page.waitForFunction(
      (sel) => sel.querySelectorAll("option").length > 1,
      await equipSelect.elementHandle(),
      { timeout: 10_000 }
    );
    const secondOptionText = await equipSelect.locator("option").nth(1).innerText();
    // Tách mã hiển thị serial ở phần đầu chuỗi "TB-001 (Mới · ...)"
    const assignedSerial = secondOptionText.split(" ")[0].trim();
    await equipSelect.selectOption({ index: 1 });
    await page.waitForTimeout(700);
    await saveEvidence(page, "cn04_gan_serial_chuan_bi");

    // Bấm "✓ Hoàn tất chuẩn bị & Chuyển Sẵn sàng nhận (UC4.1)"
    const finishPrepBtn = page.getByRole("button", { name: /Hoàn tất chuẩn bị/i }).first();
    await expect(finishPrepBtn).toBeEnabled({ timeout: 10_000 });
    await finishPrepBtn.click();
    await expect(page.getByText(/Sẵn sàng nhận|đã sẵn sàng/i).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(600);

    // BƯỚC 2 (Đối chiếu chéo 1): Sang tab Đơn thuê xác nhận đơn đã chuyển sang "Sẵn sàng nhận"
    await navigateStaffTab(page, "orders");
    // Nếu OrdersTab tự mở modal OrderDetailModal cho đơn vừa xem -> đối chiếu serial luôn rồi đóng để thao tác tiếp
    const autoDetailDlg = page.locator(".so-modal-overlay").last();
    if (await waitVisible(autoDetailDlg, 1500)) {
      await expect(autoDetailDlg).toContainText(seeded.displayCode);
      await expect(autoDetailDlg).toContainText(assignedSerial);
      await autoDetailDlg.getByRole("button", { name: /Đóng|✕|×/i }).first().click();
      await expect(autoDetailDlg).not.toBeVisible({ timeout: 5000 });
    }
    const searchOrder = page.getByPlaceholder(/Tìm mã đơn, tên khách, SĐT/i);
    await searchOrder.fill(seeded.displayCode);
    await page.waitForTimeout(300);
    await expect(page.locator("main table tbody tr").filter({ hasText: seeded.displayCode }).first()).toContainText("Sẵn sàng nhận");

    // BƯỚC 3: Quay lại Chuẩn bị & Bàn giao -> Sub-tab "2. Tiếp khách & Bàn giao (UC4.2)"
    await navigateStaffTab(page, "handover");
    await page.getByRole("button", { name: /2\. Tiếp khách & Bàn giao/i }).first().click();
    await page.waitForTimeout(400);
    await selectQueueOrder(page, seeded.displayCode);
    await page.waitForTimeout(600);

    // Kiểm tra/nhập CCCD người nhận, tick checklist & chụp ảnh bằng chứng
    const inputs = page.locator("main input.so-input-sm");
    if ((await inputs.count()) >= 3) {
      await inputs.nth(2).fill("079200012345");
    }
    const checkboxes = page.locator("main input.so-check-box-md");
    const cbCount = await checkboxes.count();
    for (let i = 0; i < cbCount; i++) {
      if (!(await checkboxes.nth(i).isChecked())) {
        await checkboxes.nth(i).check();
      }
    }
    // [HO-08 c8eaaa2] Nút "📷+" đã đổi thành <label> bao <input type="file"> ẩn.
    // Upload buffer PNG 1x1 trực tiếp qua input để không mở file picker (gây timeout 2.0m).
    const evidenceFileInput = page.locator("main input[type='file'][accept*='image']").first();
    await expect(evidenceFileInput).toBeAttached({ timeout: 5000 });
    const tinyPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      "base64",
    );
    await evidenceFileInput.setInputFiles({
      name: "evidence-e2e.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
    await expect(page.getByRole("status").filter({ hasText: /ảnh bằng chứng/i })).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder(/Ghi nhận phụ kiện dây đai/i).fill("Đủ phụ kiện, kiểm tra ok E2E CN04");
    await saveEvidence(page, "cn04_checklist_ban_giao");

    // Chốt bàn giao & lập Biên bản BBBG
    const completeHandoverBtn = page.getByRole("button", { name: /Bàn giao thiết bị cho khách/i }).first();
    await completeHandoverBtn.click();
    await page.waitForTimeout(1200);
    await saveEvidence(page, "cn04_sau_ban_giao");

    // Đóng modal Biên bản bàn giao vừa tạo (nếu đang mở)
    const bbbgModal = page.locator(".so-modal-overlay, [role='dialog']").last();
    if (await waitVisible(bbbgModal, 2000)) {
      await bbbgModal.getByRole("button", { name: /Đóng & Hoàn tất|Đóng|✕|×/i }).first().click();
      await expect(bbbgModal).not.toBeVisible({ timeout: 5000 });
    }

    // BƯỚC 4 (Đối chiếu chéo 2 sau F5 trên 3 màn hình):
    await page.reload({ waitUntil: "domcontentloaded" });

    // 4a. Đơn thuê -> "Đang thuê"
    await navigateStaffTab(page, "orders");
    await page.getByPlaceholder(/Tìm mã đơn, tên khách, SĐT/i).fill(seeded.displayCode);
    await page.waitForTimeout(300);
    await expect(page.locator("main table tbody tr").filter({ hasText: seeded.displayCode }).first()).toContainText("Đang thuê");

    // 4b. Vòng đời thiết bị -> Serial vừa gán phải chuyển sang "Đang thuê"
    await navigateStaffTab(page, "equipment-lifecycle");
    const serialSearch = page.getByPlaceholder(/Tìm mã thiết bị \(Serial\)/i);
    await expect(serialSearch).toBeVisible({ timeout: 15_000 });
    await serialSearch.fill(assignedSerial);
    await page.waitForTimeout(400);
    const equipRow = page.locator("main table tbody tr").filter({ hasText: assignedSerial }).first();
    await expect(equipRow, `Thiết bị ${assignedSerial} phải hiển thị trong Vòng đời thiết bị`).toBeVisible({ timeout: 10_000 });
    await expect(equipRow).toContainText("Đang thuê");
    await saveEvidence(page, "cn04_doi_chieu_vong_doi_dang_thue");

    // 4c. Tổng quan ca -> Đơn xuất hiện ở trạng thái "Đang thuê"
    await navigateStaffTab(page, "overview");
    await expect(page.locator("main .so-overview-order-row").filter({ hasText: seeded.displayCode }).first()).toContainText("Đang thuê");

    await pauseForViewer(page, 400);
    guard.assertClean("CN04_chuan_bi_ban_giao");
  });
});
