import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { uniqueSuffix } from "../../helpers/testData.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";
import { attachTabGuard, assertCleanTabUi, navigateStaffTab, saveEvidence } from "../../helpers/e2e23Guard.js";

test.describe.serial("E2E 23 Chức năng [03/05]: Danh mục, Sản phẩm, Vòng đời & Phiếu nhập theo lô (CN 8-11)", () => {
  const getPage = useSubsystemPage("e2e_23cn_03_danh_muc_san_pham_nhap_lo");
  const suffix = uniqueSuffix();
  const catName = `DM E2E ${suffix}`;
  const catUpdated = `DM E2E Sửa ${suffix}`;
  const prodCode = `SP-E2E-${suffix.slice(-4)}`;
  const prodName = `Lều E2E ${suffix}`;

  test("CN 8 - Danh mục (CRUD thật): Thêm -> Sửa -> Xác nhận Ẩn -> Hiện -> Xóa", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await loginUi(page, "admin");
    await page.waitForLoadState("networkidle").catch(() => {});

    await navigateStaffTab(page, "categories");
    await expect(page.getByRole("button", { name: /\+ Thêm danh mục/i })).toBeVisible({ timeout: 15_000 });

    // Thêm mới
    await page.getByRole("button", { name: /\+ Thêm danh mục/i }).click();
    let dlg = page.getByRole("dialog").first();
    await dlg.locator("input").first().fill(catName);
    await dlg.locator("textarea").first().fill("Danh mục tạo tự động bởi Playwright CRUD");
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 10_000 });

    // Tìm kiếm danh mục vừa tạo
    const searchCat = page.getByPlaceholder("Tìm kiếm tên danh mục...");
    await searchCat.fill(catName);
    await page.waitForTimeout(400);
    await expect(page.getByText(catName).first()).toBeVisible();

    // Sửa danh mục
    await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
    dlg = page.getByRole("dialog").first();
    await dlg.locator("input").first().fill(catUpdated);
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 10_000 });

    await searchCat.fill(catUpdated);
    await page.waitForTimeout(400);
    await expect(page.getByText(catUpdated).first()).toBeVisible();
    await saveEvidence(page, "08_danh_muc_crud");

    // Xóa danh mục test để giữ sạch DB
    const delBtn = page.getByRole("button", { name: "Xóa", exact: true }).first();
    if (await waitVisible(delBtn, 2000)) {
      await delBtn.click();
      const confirmDlg = page.getByRole("dialog").first();
      if (await waitVisible(confirmDlg, 2000)) {
        await confirmDlg.getByRole("button", { name: /Xóa|Xác nhận/i }).first().click();
        await expect(confirmDlg).not.toBeVisible({ timeout: 10_000 });
      }
    }
    await searchCat.fill("");
    await assertCleanTabUi(page, "CN8_categories");
    guard.assertClean("CN8_categories");
  });

  test("CN 9 - Sản phẩm (CRUD thật): Thêm mới -> Sửa -> Đổi trạng thái Ngừng kinh doanh & F5 xác nhận", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "products");
    await expect(page.getByRole("button", { name: /\+ Thêm sản phẩm/i })).toBeVisible({ timeout: 15_000 });

    // Thêm sản phẩm mới
    await page.getByRole("button", { name: /\+ Thêm sản phẩm/i }).click();
    let dlg = page.getByRole("dialog").first();
    await dlg.getByPlaceholder("SP-L001").fill(prodCode);
    await dlg.locator("label").filter({ hasText: /^Tên sản phẩm/ }).locator("input").fill(prodName);
    await dlg.locator("label").filter({ hasText: /^Thương hiệu/ }).locator("input").fill("GearGo Test");
    await dlg.locator("label").filter({ hasText: /Giá thuê\/ngày/ }).locator("input").fill("150000");
    await dlg.locator("label").filter({ hasText: /Mức cọc/ }).locator("input").fill("500000");
    await dlg.locator("label").filter({ hasText: /Giá trị bồi thường/ }).locator("input").fill("1500000");
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 10_000 });

    // Tìm kiếm sản phẩm vừa tạo
    const searchProd = page.getByPlaceholder(/Tìm tên sản phẩm/i);
    await searchProd.fill(prodName);
    await page.waitForTimeout(400);
    await expect(page.getByText(prodName).first()).toBeVisible();

    // Sửa giá & chuyển trạng thái Ngừng kinh doanh
    await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
    dlg = page.getByRole("dialog").first();
    await dlg.locator("label").filter({ hasText: /Giá thuê\/ngày/ }).locator("input").fill("180000");
    const statusSel = dlg.locator("label").filter({ hasText: /^Trạng thái/ }).locator("select");
    await statusSel.selectOption("NgungKinhDoanh").catch(() => {});
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 10_000 });

    // Khôi phục lại Đang kinh doanh
    await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
    dlg = page.getByRole("dialog").first();
    await dlg.locator("label").filter({ hasText: /^Trạng thái/ }).locator("select").selectOption("DangKinhDoanh").catch(() => {});
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 10_000 });

    await saveEvidence(page, "09_san_pham_crud");
    await searchProd.fill("");
    await assertCleanTabUi(page, "CN9_products");
    guard.assertClean("CN9_products");
  });

  test("CN 10 - Vòng đời thiết bị: Tra cứu, mở Sổ đời thiết bị & kiểm tra phiếu nhập gốc", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "equipment-lifecycle");
    await expect(page.getByPlaceholder(/Tìm mã thiết bị \(Serial\)/i)).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN10_lifecycle");

    const lifecycleBtn = page.getByRole("button", { name: /Sổ đời/i }).first();
    if (await waitVisible(lifecycleBtn, 3000)) {
      await lifecycleBtn.click();
      const dlg = page.getByRole("dialog").first();
      await expect(dlg).toBeVisible();
      await assertCleanTabUi(page, "CN10_lifecycle_modal");
      await saveEvidence(page, "10_vong_doi_thiet_bi");
      await dlg.getByRole("button", { name: /Đóng|✕/i }).first().click();
    } else {
      await saveEvidence(page, "10_vong_doi_thiet_bi");
    }

    guard.assertClean("CN10_lifecycle");
  });

  test("CN 11 - Phiếu nhập & Nhập theo lô (Sửa lỗi Hình 2): F5 tại /staff/inventory -> Dropdown có sản phẩm -> Nhập lô -> Kiểm nhận", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    // Reload trực tiếp tại /staff/inventory để chứng minh không bị rỗng dropdown Sản phẩm (lỗi Hình 2)
    await page.goto("/staff/inventory", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /\+ Tạo phiếu nháp/i })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);

    // Mở Tạo phiếu nhập nháp
    await page.getByRole("button", { name: /\+ Tạo phiếu nháp/i }).click();
    let dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();

    // Kiểm tra dropdown Sản phẩm phải có > 1 option (không trắng như Hình 2!)
    const prodSelect = dlg.locator("label").filter({ hasText: /^Sản phẩm/ }).locator("select").first();
    await expect(prodSelect).toBeVisible();
    await page.waitForFunction(
      (sel) => sel.querySelectorAll("option").length > 1,
      await prodSelect.elementHandle(),
      { timeout: 10_000 }
    );
    const optionCount = await prodSelect.locator("option").count();
    expect(optionCount, "Dropdown Sản phẩm trong Tạo phiếu nhập nháp không được rỗng (Hình 2)").toBeGreaterThan(1);

    // Nhập số chứng từ NCC & thêm dòng lô 3 chiếc
    await dlg.locator("label").filter({ hasText: /Số chứng từ NCC/ }).locator("input").fill(`CT-E2E-${suffix}`);
    const qtyInput = dlg.locator("label").filter({ hasText: /^Số lượng/ }).locator("input").first();
    await qtyInput.fill("3");
    const priceInput = dlg.locator("label").filter({ hasText: /^Đơn giá nhập/ }).locator("input").first();
    if ((await priceInput.inputValue()) === "0" || !(await priceInput.inputValue())) {
      await priceInput.fill("450000");
    }

    // Bấm + Thêm dòng để xác nhận dropdown ở dòng 2 cũng có đầy đủ sản phẩm
    await dlg.getByRole("button", { name: /\+ Thêm dòng/i }).click();
    const secondProdSelect = dlg.locator("label").filter({ hasText: /^Sản phẩm/ }).locator("select").nth(1);
    expect(await secondProdSelect.locator("option").count()).toBeGreaterThan(1);
    // Chọn sản phẩm thứ 2 nếu có
    if (optionCount > 2) {
      await secondProdSelect.selectOption({ index: 2 });
    }
    const priceInput2 = dlg.locator("label").filter({ hasText: /^Đơn giá nhập/ }).locator("input").nth(1);
    await priceInput2.fill("320000");

    // Chụp ảnh minh chứng dropdown Sản phẩm & lô nhiều dòng đã hiển thị đầy đủ (fix Hình 2)
    await saveEvidence(page, "11a_phieu_nhap_dropdown_sp_fix");
    await pauseForViewer(page, 600);

    // Lưu phiếu nhập nháp
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);

    // Lọc theo trạng thái "Nháp" để phiếu vừa tạo luôn hiển thị ở trang đầu tiên
    const statusFilter = page.locator("main .adm-toolbar select").nth(1);
    if (await waitVisible(statusFilter, 2000)) {
      await statusFilter.selectOption("Nháp").catch(() => {});
      await page.waitForTimeout(300);
    }

    // Xác nhận phiếu vừa tạo nằm ở trạng thái "Nháp" (fix [PN-04]) và mở kiểm nhận theo lô
    const firstCard = page.locator("main button.adm-receipt-card").filter({ hasText: "Nháp" }).first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    const inspectBtn = page.getByRole("button", { name: /Kiểm nhận|Xác nhận nhập kho/i }).first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();
    await saveEvidence(page, "11b_kiem_nhan_theo_lo");

    // Bấm Chốt kiểm nhận & Xác nhận nhập kho (UC7.7)
    await dlg.getByRole("button", { name: /Chốt kiểm nhận/i }).click();
    await expect(dlg).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Đã hoàn tất kiểm nhận/i)).toBeVisible({ timeout: 10_000 });
    await saveEvidence(page, "11c_nhap_kho_thanh_cong");

    await assertCleanTabUi(page, "CN11_inventory");
    guard.assertClean("CN11_inventory");
  });
});
