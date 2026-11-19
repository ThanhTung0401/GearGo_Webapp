import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH7: Nhà cung cấp & Nhập kho (UC7.1 - UC7.10.1)", () => {
  const getPage = useSubsystemPage("phan_he_07_nha_cung_cap_nhap_kho");

  test("UC7.1 - UC7.10.1 - Admin tìm kiếm Nhà cung cấp, mở form Thêm NCC & xem Phiếu nhập", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Nhà cung cấp" }).first().click();
    await expect(page.getByPlaceholder(/Tìm theo mã NCC/i)).toBeVisible();
    await page.getByPlaceholder(/Tìm theo mã NCC/i).fill("Naturehike");
    await pauseForViewer(page);
    await page.getByPlaceholder(/Tìm theo mã NCC/i).fill("");

    await page.getByRole("button", { name: /\+ Thêm NCC mới/i }).click();
    await pauseForViewer(page);
    await page.getByRole("button", { name: /Hủy|Đóng/i }).first().click();
    const editNcc = page.getByRole("button", { name: "Sửa", exact: true }).first();
    if (await editNcc.isVisible().catch(() => false)) {
      await editNcc.click();
      await page.getByRole("button", { name: /Hủy|Đóng/i }).first().click().catch(() => {});
    }

    await page.getByRole("button", { name: "Phiếu nhập" }).first().click();
    await expect(page.getByText(/Phiếu nhập/i).first()).toBeVisible();
    const firstReceipt = page.locator('button:has-text("PN-"), button:has-text("Nháp"), button:has-text("Đã xác nhận")').first();
    if (await firstReceipt.isVisible().catch(() => false)) {
      await firstReceipt.click();
    }
    await pauseForViewer(page);
  });
});
