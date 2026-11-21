import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible, closeActiveDialog } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH6: Danh mục, Sản phẩm, Thiết bị, Kiểm kê & Bảo trì (UC6.1 - UC6.15)", () => {
  const getPage = useSubsystemPage("phan_he_06_san_pham_thiet_bi_bao_tri");
  const suffix = String(Date.now()).slice(-5);
  const catName = `Danh mục Test ${suffix}`;

  test("UC6.1 - UC6.4 - Quản trị Danh mục: Thêm mới, Sửa, Tra cứu & Đổi trạng thái", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Danh mục" }).first().click();
    await expect(page.getByRole("button", { name: /\+ Thêm danh mục/i })).toBeVisible();
    await pauseForViewer(page, 700);

    // UC6.1: Tạo danh mục mới
    await page.getByRole("button", { name: /\+ Thêm danh mục/i }).click();
    const catModal = page.locator('[role="dialog"]').first();
    await expect(catModal).toBeVisible();
    await catModal.locator("input").first().fill(catName);
    await catModal.locator("textarea").first().fill("Danh mục kiểm thử E2E UC6.1");
    await pauseForViewer(page, 700);
    await catModal.locator('button[type="submit"]').click();
    await expect(catModal).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(catName).first()).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 800);

    // UC6.2: Mở form Sửa danh mục
    const editCat = page.getByRole("button", { name: "Sửa", exact: true }).first();
    if (await waitVisible(editCat, 3000)) {
      await editCat.click();
      await pauseForViewer(page, 700);
      await page.getByRole("button", { name: /Hủy|Đóng/i }).first().click().catch(() => {});
    }
  });

  test("UC6.5 - UC6.8 - Quản trị Sản phẩm: Tìm kiếm, lọc, mở Thêm mới & Sửa sản phẩm", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Sản phẩm" }).first().click();
    await expect(page.getByPlaceholder(/Tìm tên sản phẩm/i)).toBeVisible();
    await pauseForViewer(page, 600);

    await page.getByPlaceholder(/Tìm tên sản phẩm/i).fill("Lều");
    await pauseForViewer(page, 800);
    await page.getByPlaceholder(/Tìm tên sản phẩm/i).fill("");
    await pauseForViewer(page, 600);

    // UC6.5: Mở form Thêm sản phẩm & kiểm tra các trường
    await page.getByRole("button", { name: /\+ Thêm sản phẩm/i }).click();
    await pauseForViewer(page, 800);
    await page.getByRole("button", { name: /Hủy|Đóng/i }).first().click();

    // UC6.6: Mở form Sửa sản phẩm đầu tiên
    const editProd = page.getByRole("button", { name: "Sửa", exact: true }).first();
    if (await waitVisible(editProd, 3000)) {
      await editProd.click();
      await pauseForViewer(page, 800);
      await page.getByRole("button", { name: /Hủy|Đóng/i }).first().click().catch(() => {});
    }
  });

  test("UC6.9 - Tra cứu thiết bị, lọc Serial & mở Sổ đời thiết bị", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Vòng đời thiết bị" }).first().click();
    await expect(page.getByText(/Quản lý thiết bị/i).first()).toBeVisible();
    await pauseForViewer(page, 700);

    const serialInput = page.getByPlaceholder(/Tìm mã thiết bị \(Serial\)/i);
    await serialInput.fill("TB");
    await pauseForViewer(page, 600);
    await serialInput.fill("");

    // Mở Sổ đời thiết bị (EquipmentLifecycleModal)
    const lifecycleBtn = page.getByRole("button", { name: /Sổ đời/i }).first();
    if (await waitVisible(lifecycleBtn, 3000)) {
      await lifecycleBtn.click();
      await pauseForViewer(page, 1000);
      await page.keyboard.press("Escape");
      const closeBtn = page.getByRole("button", { name: /✕|Đóng/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    }
  });

  test("UC6.10 - UC6.15 - Kiểm kê kho, Điều chỉnh kho & Staff mở Kho & Phiếu bảo trì", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Điều chỉnh kho" }).first().click();
    await expect(page.getByText(/Kiểm kê & Điều chỉnh kho/i).first()).toBeVisible();
    await pauseForViewer(page, 700);

    // UC6.10: Mở modal Kiểm kê kho
    const auditBtn = page.getByRole("button", { name: /Kiểm kê kho/i }).first();
    if (await waitVisible(auditBtn, 3000)) {
      await auditBtn.click();
      await pauseForViewer(page, 900);
      await closeActiveDialog(page);
    }

    // UC6.11: Mở modal Lập phiếu thủ công
    const manualAdjBtn = page.getByRole("button", { name: /\+ Lập phiếu thủ công/i }).first();
    if (await waitVisible(manualAdjBtn, 2500)) {
      await manualAdjBtn.click();
      await pauseForViewer(page, 800);
      await closeActiveDialog(page);
    }

    // Chuyển SPA sang Staff kiểm tra Kho & Phiếu bảo trì (UC6.12 - UC6.15)
    await loginUi(page, "staff");
    await page.getByRole("button", { name: "Kho & Bảo trì" }).first().click();
    await expect(page.getByText(/Kho|Bảo trì/i).first()).toBeVisible();
    await pauseForViewer(page, 700);

    const maintTab = page.locator('button:has-text("Phiếu bảo trì")').first();
    if (await waitVisible(maintTab, 3000)) {
      await maintTab.click();
      await expect(page.getByText(/Hồ sơ bảo trì/i)).toBeVisible();
      await pauseForViewer(page, 800);
    }

    const createMaintBtn = page.getByRole("button", { name: /\+ Lập phiếu bảo trì|\+ Tạo phiếu bảo trì/i }).first();
    if (await waitVisible(createMaintBtn, 2000)) {
      await createMaintBtn.click();
      await pauseForViewer(page, 800);
      await page.keyboard.press("Escape");
    }
    await pauseForViewer(page, 800);
  });
});
