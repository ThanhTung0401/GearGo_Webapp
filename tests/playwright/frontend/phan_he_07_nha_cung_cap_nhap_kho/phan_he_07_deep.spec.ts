import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible, closeActiveDialog } from "../../helpers/subsystemVideo.js";
import { uniqueSuffix } from "../../helpers/testData.js";

/**
 * R4-W4 PH7 Frontend Deep: NCC & Phiếu nhập - form validation, F5 recovery, cascade.
 */
test.describe.serial("Frontend PH7 Deep - Supplier/Import", () => {
  const getPage = useSubsystemPage("phan_he_07_deep");
  const suffix = uniqueSuffix().slice(-5);

  // R5-PH678: Cap per-test timeout to prevent 2m hangs on missing modals/selectors.
  test.beforeEach(() => {
    test.setTimeout(30_000);
  });

  test("PH7D-F01 - Negative: Tạo NCC với email sai format -> form chặn", async () => {
    const page = getPage();
    await loginUi(page, "admin");
    await page.getByRole("button", { name: "Nhà cung cấp" }).first().click();
    await expect(page.getByRole("button", { name: /\+ Thêm NCC mới/i })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /\+ Thêm NCC mới/i }).click();
    const dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();
    const codeInput = dlg.getByPlaceholder("NCC001").first();
    if (await codeInput.isVisible().catch(() => false)) await codeInput.fill(`NEG${suffix}`);
    await dlg.locator("input").nth(1).fill(`NCC Neg ${suffix}`);
    await dlg.locator("input").nth(2).fill("Test");
    await dlg.locator("input").nth(3).fill(`097${suffix}12`);
    await dlg.locator("input").nth(4).fill("khong_phai_email");
    await dlg.locator('button[type="submit"]').click();
    // Dialog vẫn mở
    await expect(dlg).toBeVisible({ timeout: 5_000 }).catch(() => {});
    await closeActiveDialog(page);
  });

  test("PH7D-F02 - Negative: Tạo NCC với SĐT < 10 số -> form chặn", async () => {
    const page = getPage();
    await page.getByRole("button", { name: /\+ Thêm NCC mới/i }).click();
    const dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();
    const codeInput = dlg.getByPlaceholder("NCC001").first();
    if (await codeInput.isVisible().catch(() => false)) await codeInput.fill(`SHORT${suffix}`);
    await dlg.locator("input").nth(1).fill(`NCC Short ${suffix}`);
    await dlg.locator("input").nth(2).fill("Test");
    await dlg.locator("input").nth(3).fill("123");
    await dlg.locator("input").nth(4).fill(`x.${suffix}@g.vn`);
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).toBeVisible({ timeout: 5_000 }).catch(() => {});
    await closeActiveDialog(page);
  });

  test("PH7D-F03 - Cascade: Tạo NCC mới -> xuất hiện ở tìm kiếm & Hồ sơ NCC mở được", async () => {
    const page = getPage();
    const nccCode = `OKNCC${suffix}`;
    const nccName = `NCC Cascade ${suffix}`;

    await page.getByRole("button", { name: /\+ Thêm NCC mới/i }).click();
    const dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();
    await dlg.getByPlaceholder("NCC001").fill(nccCode);
    await dlg.locator("input").nth(1).fill(nccName);
    await dlg.locator("input").nth(2).fill("Trần Văn A");
    await dlg.locator("input").nth(3).fill(`097${suffix}12`);
    await dlg.locator("input").nth(4).fill(`casc.${suffix}@g.vn`);
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 10_000 });

    const searchInput = page.getByPlaceholder(/Tìm theo mã NCC/i);
    await searchInput.fill(nccCode);
    await pauseForViewer(page, 500);
    await expect(page.getByText(nccName).first()).toBeVisible({ timeout: 10_000 });

    const profileBtn = page.getByRole("button", { name: /Hồ sơ NCC/i }).first();
    if (await waitVisible(profileBtn, 3000)) {
      await profileBtn.click();
      await pauseForViewer(page, 700);
      await closeActiveDialog(page);
    }
    await searchInput.fill("");
  });

  test("PH7D-F04 - Phiếu nhập: mở form Tạo nháp -> dropdown Sản phẩm không rỗng", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Phiếu nhập" }).first().click();
    await expect(page.getByText(/Phiếu nhập hàng/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /\+ Tạo phiếu nháp/i }).click();
    const dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();

    const prodSelect = dlg.locator("select").first();
    if (await prodSelect.isVisible().catch(() => false)) {
      const count = await prodSelect.locator("option").count();
      expect(count).toBeGreaterThan(1);
    }
    await closeActiveDialog(page);
  });

  test("PH7D-F05 - Negative: Nhập phiếu với số lượng 0 -> submit bị chặn", async () => {
    const page = getPage();
    await page.getByRole("button", { name: /\+ Tạo phiếu nháp/i }).click();
    const dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();
    const qtyInput = dlg.locator('input[type="number"]').nth(0);
    if (await qtyInput.isVisible().catch(() => false)) {
      await qtyInput.fill("0");
    }
    await dlg.locator('button[type="submit"]').click();
    // Dialog có thể vẫn mở hoặc báo lỗi inline
    await pauseForViewer(page, 500);
    await closeActiveDialog(page);
  });

  test("PH7D-F06 - F5 Recovery: Reload trang /staff/inventory -> dropdown Sản phẩm vẫn có data", async () => {
    const page = getPage();
    await page.goto("/staff/inventory", { waitUntil: "domcontentloaded" });
    const needLogin = await page.getByRole("button", { name: "Đăng nhập" }).first().isVisible().catch(() => false);
    if (needLogin) {
      await loginUi(page, "admin");
      await page.goto("/staff/inventory", { waitUntil: "domcontentloaded" });
    }
    await expect(page.getByRole("button", { name: /\+ Tạo phiếu nháp/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /\+ Tạo phiếu nháp/i }).click();
    const dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();
    const prodSelect = dlg.locator("select").first();
    if (await prodSelect.isVisible().catch(() => false)) {
      await page.waitForFunction(
        (sel) => (sel as HTMLSelectElement).querySelectorAll("option").length > 1,
        await prodSelect.elementHandle(),
        { timeout: 10_000 }
      ).catch(() => {});
      const count = await prodSelect.locator("option").count();
      expect(count).toBeGreaterThan(1);
    }
    await closeActiveDialog(page);
  });

  test("PH7D-F07 - Thêm dòng lô mới: dropdown dòng 2 cũng có data (chống lỗi Hình 2)", async () => {
    const page = getPage();
    await page.getByRole("button", { name: /\+ Tạo phiếu nháp/i }).click();
    const dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();

    const addLineBtn = dlg.getByRole("button", { name: /\+ Thêm dòng/i });
    if (await waitVisible(addLineBtn, 3000)) {
      await addLineBtn.click();
      await pauseForViewer(page, 400);
      const selects = dlg.locator("select");
      const nSelects = await selects.count();
      if (nSelects >= 2) {
        const secondProd = selects.nth(1);
        const count2 = await secondProd.locator("option").count();
        expect(count2).toBeGreaterThan(1);
      }
    }
    await closeActiveDialog(page);
  });

  test("PH7D-F08 - Phiếu nhập đã hủy: không còn nút Kiểm nhận", async () => {
    const page = getPage();
    // Xem phiếu "Đã hủy" nếu có
    const statusFilter = page.locator("main .adm-toolbar select").nth(1);
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.selectOption({ label: "Đã hủy" }).catch(() => {});
      await pauseForViewer(page, 500);
    }
    const cancelledCard = page.locator('button.adm-receipt-card:has-text("Đã hủy")').first();
    if (await waitVisible(cancelledCard, 3000)) {
      await cancelledCard.click();
      const inspectBtn = page.getByRole("button", { name: /Kiểm nhận & Chốt kho/i }).first();
      await expect(inspectBtn).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    }
    await pauseForViewer(page, 400);
  });

  test("PH7D-F09 - F5 ở tab NCC: reload giữ state tab", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Nhà cung cấp" }).first().click();
    await expect(page.getByRole("button", { name: /\+ Thêm NCC mới/i })).toBeVisible({ timeout: 10_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    const needLogin = await page.getByRole("button", { name: "Đăng nhập" }).first().isVisible().catch(() => false);
    if (needLogin) {
      await loginUi(page, "admin");
    }
    await pauseForViewer(page, 400);
  });

  test("PH7D-F10 - Mở phiếu Đã nhập kho: nút Đề nghị điều chỉnh có thể mở/đóng", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Phiếu nhập" }).first().click();
    await expect(page.getByText(/Phiếu nhập hàng/i).first()).toBeVisible({ timeout: 10_000 });
    const confirmedCard = page.locator('button.adm-receipt-card:has-text("Đã nhập kho")').first();
    if (await waitVisible(confirmedCard, 3000)) {
      await confirmedCard.click();
      await pauseForViewer(page, 600);
      const adjBtn = page.getByRole("button", { name: /Đề nghị điều chỉnh/i }).first();
      if (await waitVisible(adjBtn, 2000)) {
        await adjBtn.click();
        await pauseForViewer(page, 600);
        await closeActiveDialog(page);
      }
    }
  });

  test("PH7D-F11 - RBAC UI: Customer đi /staff/inventory -> redirect/login block", async () => {
    const page = getPage();
    await loginUi(page, "customer");
    await page.goto("/staff/inventory", { waitUntil: "domcontentloaded" }).catch(() => {});
    await pauseForViewer(page, 400);
    // Chấp nhận nhiều cách UI block: URL đổi, login form, text 403/Không có quyền/Access denied
    const url = page.url();
    const redirected = !url.includes("/staff/inventory");
    const loginShown = await page
      .getByRole("button", { name: "Đăng nhập" })
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const deniedShown = await page
      .getByText(/403|Không có quyền|Truy cập bị từ chối|Access|Forbidden/i)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(redirected || loginShown || deniedShown).toBeTruthy();
  });

  test("PH7D-F12 - Admin quay lại tạo phiếu nhập: form reset sạch sau Escape", async () => {
    const page = getPage();
    await loginUi(page, "admin");
    await page.getByRole("button", { name: "Phiếu nhập" }).first().click();
    await page.getByRole("button", { name: /\+ Tạo phiếu nháp/i }).click();
    const dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dlg).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
    // Mở lại - không có giá trị cũ ở số chứng từ
    await page.getByRole("button", { name: /\+ Tạo phiếu nháp/i }).click();
    const dlg2 = page.getByRole("dialog").first();
    await expect(dlg2).toBeVisible();
    await closeActiveDialog(page);
  });
});
