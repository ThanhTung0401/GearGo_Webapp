import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH6: Danh mục, Sản phẩm, Thiết bị, Điều chỉnh kho & Bảo trì (UC6.1 - UC6.15)", () => {
  const getPage = useSubsystemPage("phan_he_06_san_pham_thiet_bi_bao_tri");

  test("UC6.1 - UC6.6 - Admin xem Danh mục, Sản phẩm, mở modal Thêm & tìm kiếm", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Danh mục" }).first().click();
    await expect(page.getByRole("heading", { name: /Danh mục/i }).first()).toBeVisible();
    await page.getByRole("button", { name: /\+ Thêm danh mục/i }).click();
    await pauseForViewer(page);
    await page.getByRole("button", { name: /Hủy|Đóng/i }).first().click();
    const editCat = page.getByRole("button", { name: "Sửa", exact: true }).first();
    if (await editCat.isVisible().catch(() => false)) {
      await editCat.click();
      await page.getByRole("button", { name: /Hủy|Đóng/i }).first().click().catch(() => {});
    }

    await page.getByRole("button", { name: "Sản phẩm" }).first().click();
    await expect(page.getByPlaceholder(/Tìm tên sản phẩm/i)).toBeVisible();
    await page.getByPlaceholder(/Tìm tên sản phẩm/i).fill("Lều");
    await pauseForViewer(page);
    await page.getByPlaceholder(/Tìm tên sản phẩm/i).fill("");
    await page.getByRole("button", { name: /\+ Thêm sản phẩm/i }).click();
    await pauseForViewer(page);
    await page.getByRole("button", { name: /Hủy|Đóng/i }).first().click();
    const editProd = page.getByRole("button", { name: "Sửa", exact: true }).first();
    if (await editProd.isVisible().catch(() => false)) {
      await editProd.click();
      await page.getByRole("button", { name: /Hủy|Đóng/i }).first().click().catch(() => {});
    }
  });

  test("UC6.7 - UC6.15 - Admin xem Thiết bị, Điều chỉnh kho & Staff mở Kho & Bảo trì", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Vòng đời thiết bị" }).first().click();
    await expect(page.getByText(/Thiết bị/i).first()).toBeVisible();
    await pauseForViewer(page);

    await page.getByRole("button", { name: "Điều chỉnh kho" }).first().click();
    await expect(page.getByText(/Điều chỉnh kho/i).first()).toBeVisible();
    await pauseForViewer(page);

    // Chuyển sang tài khoản Staff kiểm tra tab Kho & Bảo trì (UC6.11 - UC6.15)
    await loginUi(page, "staff");
    await page.getByRole("button", { name: "Kho & Bảo trì" }).first().click();
    await expect(page.getByText(/Kho|Bảo trì/i).first()).toBeVisible();
    const maintTab = page.locator('button:has-text("Phiếu bảo trì")').first();
    if (await maintTab.isVisible().catch(() => false)) {
      await maintTab.click();
      await expect(page.getByText(/Hồ sơ bảo trì/i)).toBeVisible();
    }
    await pauseForViewer(page);
  });
});
