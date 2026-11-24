import { test, expect, type Page } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";
import { attachTabGuard, assertCleanTabUi, navigateStaffTab, saveEvidence } from "../../helpers/e2e23Guard.js";
import { prepareAndHandoverOrderApi, seedPaidOrderApi } from "../../helpers/orderSeed.js";

/**
 * Tìm và click chọn thẻ đơn hàng trong danh sách Nhận trả & Đối soát.
 */
async function selectReturnOrder(page: Page, displayCode: string): Promise<void> {
  const searchInput = page.locator("main input[placeholder*='Tìm'], main input[placeholder*='mã']").first();
  if (await waitVisible(searchInput, 1200)) {
    await searchInput.fill(displayCode);
    await page.waitForTimeout(300);
  }
  let card = page.locator("main button").filter({ hasText: displayCode }).first();
  if (!(await waitVisible(card, 2000))) {
    for (let p = 2; p <= 6; p++) {
      const pBtn = page.locator("main").getByRole("button", { name: String(p), exact: true }).first();
      if (!(await waitVisible(pBtn, 800))) break;
      await pBtn.click();
      await page.waitForTimeout(300);
      card = page.locator("main button").filter({ hasText: displayCode }).first();
      if (await waitVisible(card, 1200)) break;
    }
  }
  await expect(card, `Không tìm thấy đơn ${displayCode} trong Nhận trả & Phụ phí`).toBeVisible({ timeout: 10_000 });
  await card.click();
}

test.describe.serial("CN 05 - Nhận trả & Phụ phí: Quá hạn, Nhật ký gọi, Lập & Chốt phiếu nhận trả, Đối soát & Hoàn tất", () => {
  const getPage = useSubsystemPage("e2e_cn05_nhan_tra_phu_phi");

  test("Xử lý quá hạn, Ghi nhận trả thiết bị, Duyệt phụ phí, Chốt đối soát & F5 đối chiếu Đơn thuê + Vòng đời", async ({ request }) => {
    const page = getPage();
    const guard = attachTabGuard(page);

    // Seed 1 đơn mới và đưa sang "Đang thuê" bằng API để có dữ liệu sạch kiểm thử nhận trả thật
    const seeded = await seedPaidOrderApi(request);
    const { assignedSerial } = await prepareAndHandoverOrderApi(request, seeded.orderId);

    await loginUi(page, "admin");
    await page.waitForLoadState("networkidle").catch(() => {});

    await navigateStaffTab(page, "return");
    await expect(page.getByText(/Đơn nhận trả & đối soát/i)).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN05_return_initial");

    // 1. Test đơn quá hạn DT-20241201-099 & Ghi nhận thật vào Nhật ký gọi (UC4.4) nếu có
    const overdueCard = page.locator("main button").filter({ hasText: "DT-20241201-099" }).first();
    if (await waitVisible(overdueCard, 2500)) {
      await overdueCard.click();
      await page.waitForTimeout(700);
      await expect(page.getByText(/Tổng thiết bị đã giao:\s*[1-9]\d*/i)).toBeVisible();
      await expect(page.getByText(/Phạt trễ/i)).toBeVisible();
      await saveEvidence(page, "cn05a_don_qua_han");

      const contactBtn = page.getByRole("button", { name: /Nhật ký gọi/i }).first();
      await contactBtn.click();
      const contactDlg = page.locator(".so-modal-overlay, [role='dialog']").last();
      await expect(contactDlg).toBeVisible();
      await contactDlg.locator("textarea").fill("Đã gọi nhắc khách gia hạn/trả thiết bị E2E CN05");
      await contactDlg.getByRole("button", { name: /Lưu vào lịch sử liên hệ/i }).click();
      await page.waitForTimeout(700);
      await assertCleanTabUi(page, "CN05_contact_saved");
      await contactDlg.getByRole("button", { name: /Đóng|✕|×/i }).first().click();
      await expect(contactDlg).not.toBeVisible({ timeout: 5000 });
    }

    // 2. Chọn đơn "Đang thuê" vừa seed -> Lập Phiếu Nhận Trả kèm tình trạng "Cần vệ sinh" + phụ phí 50.000đ
    await selectReturnOrder(page, seeded.displayCode);
    await page.waitForTimeout(800);

    const selectAllBtn = page.getByRole("button", { name: /Chọn tất cả .* món nợ/i }).first();
    await expect(selectAllBtn, "Phải hiển thị nút Chọn tất cả món nợ để nhận trả").toBeVisible({ timeout: 10_000 });
    await selectAllBtn.click();
    await page.waitForTimeout(300);

    // Chọn tình trạng "Cần vệ sinh" và nhập phụ phí 50.000đ để test luôn luồng duyệt phụ phí
    const cleanBtn = page.locator("main button.so-cond-btn").filter({ hasText: "Cần vệ sinh" }).first();
    if (await waitVisible(cleanBtn, 1500)) {
      await cleanBtn.click();
    }
    const feeInput = page.locator("main input.so-fee-input").first();
    if (await waitVisible(feeInput, 1500)) {
      await feeInput.fill("50000");
    }
    const itemNoteInput = page.locator("main input.so-note-input").first();
    if (await waitVisible(itemNoteInput, 1500)) {
      await itemNoteInput.fill("Cần vệ sinh sau chuyến đi E2E CN05");
    }
    await saveEvidence(page, "cn05b_form_nhan_tra");

    // Bấm Xác nhận lập Phiếu Nhận Trả Đợt 1
    await page.getByRole("button", { name: /Xác nhận lập Phiếu Nhận Trả/i }).first().click();
    await page.waitForTimeout(1200);

    // Đóng modal Chi tiết Phiếu Nhận Trả vừa tự động bật sau khi lập phiếu (nếu có)
    let receiptDlg = page.locator(".so-modal-overlay").last();
    if (await waitVisible(receiptDlg, 2500)) {
      await assertCleanTabUi(page, "CN05_return_receipt_modal");
      await receiptDlg.getByRole("button", { name: /Đóng|✕|×/i }).first().click();
      await expect(receiptDlg).not.toBeVisible({ timeout: 5000 });
    }

    // 3. Nếu phiếu vừa lập ở trạng thái Nháp và có nút "Chốt phiếu" -> bấm Chốt phiếu nhận trả thật!
    const closeReceiptBtn = page.locator("main .so-receipt-row").getByRole("button", { name: /Chốt phiếu/i }).first();
    if (await waitVisible(closeReceiptBtn, 2500)) {
      await closeReceiptBtn.click();
      await page.waitForTimeout(1000);
      receiptDlg = page.locator(".so-modal-overlay").last();
      if (await waitVisible(receiptDlg, 1500)) {
        await receiptDlg.getByRole("button", { name: /Đóng|✕|×/i }).first().click();
        await expect(receiptDlg).not.toBeVisible({ timeout: 5000 });
      }
    }

    // 4. Duyệt phụ phí "Chờ duyệt" nếu có phát sinh
    const approveSurchargeBtn = page.locator("main .so-surcharge-card").getByRole("button", { name: "Duyệt", exact: true }).first();
    if (await waitVisible(approveSurchargeBtn, 3000)) {
      await approveSurchargeBtn.click();
      await page.waitForTimeout(800);
      await expect(page.locator("main .so-surcharge-status").filter({ hasText: "Đã duyệt" }).first()).toBeVisible({ timeout: 5000 });
    }
    await saveEvidence(page, "cn05c_sau_chot_nhan_tra_va_phu_phi");

    // 5. Nếu có khối Đối soát cọc (Bước 4) khả dụng -> bấm Xác nhận bảng đối soát (Bước 4)
    const confirmReconBtn = page.getByRole("button", { name: /Xác nhận bảng đối soát/i }).first();
    if (await waitVisible(confirmReconBtn, 3000)) {
      if (await confirmReconBtn.isEnabled()) {
        await confirmReconBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    await assertCleanTabUi(page, "CN05_after_return_and_recon");

    // 6. ĐỐI CHIẾU CHÉO sau F5 trên 2 màn hình khác:
    await page.reload({ waitUntil: "domcontentloaded" });

    // 6a. Đơn thuê -> phải chuyển khỏi "Đang thuê" sang "Chờ đối soát" / "Đã nhận trả" / "Hoàn tất"
    await navigateStaffTab(page, "orders");
    await page.getByPlaceholder(/Tìm mã đơn, tên khách, SĐT/i).fill(seeded.displayCode);
    await page.waitForTimeout(300);
    const orderRow = page.locator("main table tbody tr").filter({ hasText: seeded.displayCode }).first();
    await expect(orderRow).toBeVisible({ timeout: 10_000 });
    await expect(orderRow).toContainText(/Chờ đối soát|Đã nhận trả|Hoàn tất/);
    await saveEvidence(page, "cn05d_doi_chieu_don_thue");

    // 6b. Vòng đời thiết bị -> Serial trả với "Cần vệ sinh" chuyển sang "Đang bảo trì" (CleaningInspectionStrategy)
    await navigateStaffTab(page, "equipment-lifecycle");
    const serialSearch = page.getByPlaceholder(/Tìm mã thiết bị \(Serial\)/i);
    await expect(serialSearch).toBeVisible({ timeout: 15_000 });
    await serialSearch.fill(assignedSerial);
    await page.waitForTimeout(400);
    const equipRow = page.locator("main table tbody tr").filter({ hasText: assignedSerial }).first();
    await expect(equipRow, `Thiết bị ${assignedSerial} phải hiển thị trong Vòng đời thiết bị`).toBeVisible({ timeout: 10_000 });
    await expect(equipRow).toContainText(/Đang bảo trì|Sẵn sàng/);
    await saveEvidence(page, "cn05e_doi_chieu_vong_doi_sau_nhan_tra");

    await pauseForViewer(page, 400);
    guard.assertClean("CN05_nhan_tra_phu_phi");
  });
});
