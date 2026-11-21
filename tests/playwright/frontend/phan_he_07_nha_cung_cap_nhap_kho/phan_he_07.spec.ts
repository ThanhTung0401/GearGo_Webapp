import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible, closeActiveDialog } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH7: Nhà cung cấp & Nhập kho (UC7.1 - UC7.10.1)", () => {
  const getPage = useSubsystemPage("phan_he_07_nha_cung_cap_nhap_kho");
  const suffix = String(Date.now()).slice(-5);
  const nccCode = `NCCPW${suffix}`;
  const nccName = `Công ty Thiết bị Dã ngoại Test ${suffix}`;

  test("UC7.1 - UC7.4 - Tạo Nhà cung cấp mới, Tra cứu, Xem Hồ sơ NCC & Sửa thông tin", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Nhà cung cấp" }).first().click();
    await expect(page.getByRole("button", { name: /\+ Thêm NCC mới/i })).toBeVisible();
    await pauseForViewer(page, 700);

    // UC7.1: Tạo Nhà cung cấp mới thật
    await page.getByRole("button", { name: /\+ Thêm NCC mới/i }).click();
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    await modal.getByPlaceholder("NCC001").fill(nccCode);
    await modal.locator("input").nth(1).fill(nccName);
    await modal.locator("input").nth(2).fill("Trần Văn Minh");
    await modal.locator("input").nth(3).fill(`097${suffix}12`);
    await modal.locator("input").nth(4).fill(`ncc.${suffix}@geargo.test`);
    await pauseForViewer(page, 800);
    await modal.locator('button[type="submit"]').click();
    await expect(modal).not.toBeVisible({ timeout: 10_000 });

    // UC7.3: Tìm kiếm NCC vừa tạo & mở Hồ sơ NCC (SupplierProfileModal)
    const searchInput = page.getByPlaceholder(/Tìm theo mã NCC/i);
    await searchInput.fill(nccCode);
    await pauseForViewer(page, 700);
    await expect(page.getByText(nccName).first()).toBeVisible({ timeout: 10_000 });

    const profileBtn = page.getByRole("button", { name: /Hồ sơ NCC/i }).first();
    if (await waitVisible(profileBtn, 3000)) {
      await profileBtn.click();
      await pauseForViewer(page, 900);
      await closeActiveDialog(page);
    }

    // UC7.2 & UC7.4: Mở form Sửa NCC vừa tìm
    const editNcc = page.getByRole("button", { name: "Sửa", exact: true }).first();
    if (await waitVisible(editNcc, 3000)) {
      await editNcc.click();
      await pauseForViewer(page, 700);
      await closeActiveDialog(page);
    }
    await searchInput.fill("");
  });

  test("UC7.5 - UC7.10.1 - Lập phiếu nhập nháp, sửa nháp, kiểm nhận nhập kho & xem sai lệch", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Phiếu nhập" }).first().click();
    await expect(page.getByText(/Phiếu nhập hàng/i).first()).toBeVisible();
    await pauseForViewer(page, 700);

    // UC7.5: Lập phiếu nhập nháp mới
    await page.getByRole("button", { name: /\+ Tạo phiếu nháp/i }).click();
    const formModal = page.locator('[role="dialog"]').first();
    await expect(formModal).toBeVisible();
    await formModal.locator('input[type="number"]').nth(0).fill("2");
    await formModal.locator('input[type="number"]').nth(1).fill("450000");
    await pauseForViewer(page, 800);
    await formModal.locator('button[type="submit"]').click();
    await expect(formModal).not.toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 800);

    // UC7.6 & UC7.7 & UC7.9: Chọn phiếu Nháp & kiểm tra các nút Sửa / Kiểm nhận / Hủy nháp
    const draftCard = page.locator('button.adm-receipt-card:has-text("Nháp")').first();
    if (await waitVisible(draftCard, 3000)) {
      await draftCard.click();
      await pauseForViewer(page, 800);

      const editDraftBtn = page.getByRole("button", { name: /Sửa nháp/i }).first();
      if (await waitVisible(editDraftBtn, 2000)) {
        await editDraftBtn.click();
        await pauseForViewer(page, 700);
        await closeActiveDialog(page);
      }

      const inspectBtn = page.getByRole("button", { name: /Kiểm nhận & Chốt kho/i }).first();
      if (await waitVisible(inspectBtn, 2000)) {
        await inspectBtn.click();
        await pauseForViewer(page, 900);
        await closeActiveDialog(page);
      }
    }

    // UC7.10: Mở phiếu Đã nhập kho xem chi tiết & modal sai lệch (nếu có)
    const confirmedCard = page.locator('button.adm-receipt-card:has-text("Đã nhập kho")').first();
    if (await waitVisible(confirmedCard, 3000)) {
      await confirmedCard.click();
      await pauseForViewer(page, 800);
      const adjBtn = page.getByRole("button", { name: /Đề nghị điều chỉnh/i }).first();
      if (await waitVisible(adjBtn, 2000)) {
        await adjBtn.click();
        await pauseForViewer(page, 800);
        await closeActiveDialog(page);
      }
    }
    await pauseForViewer(page, 800);
  });
});
