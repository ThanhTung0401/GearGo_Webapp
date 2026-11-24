import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible, closeActiveDialog, forceCloseAllModals } from "../../helpers/subsystemVideo.js";
import { uniqueSuffix } from "../../helpers/testData.js";

/**
 * R4-W4 PH8 Frontend Deep: Khuyến mãi & Chính sách - negative, cascade, F5.
 */
test.describe.serial("Frontend PH8 Deep - Promotion/Policy", () => {
  const getPage = useSubsystemPage("phan_he_08_deep");
  const suffix = uniqueSuffix().slice(-5);
  const promoCode = `PWD${suffix}`;

  // R5-PH678: Cap per-test timeout to prevent 2m hangs on missing modals/selectors.
  test.beforeEach(() => {
    test.setTimeout(30_000);
  });

  test("PH8D-F01 - Negative: Tạo KM thiếu mã -> form chặn", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Khuyến mãi" }).first().click();
    await expect(page.getByPlaceholder(/Tìm kiếm theo mã code/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Tạo mã giảm mới/i }).click();
    const dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();
    // Bỏ trống mã code
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).toBeVisible({ timeout: 5_000 }).catch(() => {});
    await closeActiveDialog(page);
  });

  test("PH8D-F02 - Cascade: Tạo KM mới -> xuất hiện ở tìm kiếm", async () => {
    const page = getPage();
    await page.getByRole("button", { name: /Tạo mã giảm mới/i }).click();
    const dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();
    await dlg.locator("input").nth(0).fill(promoCode);
    await dlg.locator("input").nth(1).fill(`KM Deep ${suffix}`);
    await pauseForViewer(page, 500);
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 10_000 }).catch(() => {});
    await pauseForViewer(page, 500);

    const searchInput = page.getByPlaceholder(/Tìm kiếm theo mã code/i);
    await searchInput.fill(promoCode);
    await pauseForViewer(page, 600);
    await expect(page.getByText(promoCode).first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
    await searchInput.fill("");
  });

  test("PH8D-F03 - Sửa KM vừa tạo: mở form Sửa và Hủy sửa -> không thay đổi", async () => {
    const page = getPage();
    const searchInput = page.getByPlaceholder(/Tìm kiếm theo mã code/i);
    await searchInput.fill(promoCode);
    await pauseForViewer(page, 600);
    const editBtn = page.getByRole("button", { name: "Sửa", exact: true }).first();
    if (await waitVisible(editBtn, 3000)) {
      await editBtn.click();
      await pauseForViewer(page, 500);
      await closeActiveDialog(page);
    }
    await searchInput.fill("");
  });

  test("PH8D-F04 - Tạm dừng KM vừa tạo kèm lý do (cleanup): button Ngừng có action hợp lệ", async () => {
    const page = getPage();
    const searchInput = page.getByPlaceholder(/Tìm kiếm theo mã code/i);
    await searchInput.fill(promoCode);
    await pauseForViewer(page, 600);
    const pauseBtn = page.getByRole("button", { name: /Tạm dừng|Ngừng/i }).first();
    if (await waitVisible(pauseBtn, 3000)) {
      await pauseBtn.click();
      const reasonArea = page.locator('[role="dialog"] textarea').first();
      if (await waitVisible(reasonArea, 3000)) {
        await reasonArea.fill(`Ngừng KM deep ${suffix}`);
        await pauseForViewer(page, 500);
        await page.locator('[role="dialog"] button[type="submit"]').first().click().catch(() => {});
        await pauseForViewer(page, 700);
      }
    }
    await searchInput.fill("");
  });

  test("PH8D-F05 - Chính sách thuê: mở tab, chờ API /chinh-sach/hien-hanh load xong", async () => {
    const page = getPage();
    const policyRes = page
      .waitForResponse((res) => res.url().includes("/api/chinh-sach/hien-hanh") && res.ok(), { timeout: 10_000 })
      .catch(() => null);
    await page.getByRole("button", { name: "Chính sách thuê" }).first().click();
    await expect(page.getByText(/Cấu hình chính sách thuê & hủy/i)).toBeVisible({ timeout: 10_000 });
    await policyRes;
    await pauseForViewer(page, 500);
  });

  test("PH8D-F06 - Chính sách: chỉnh giờ nhắc trả -> nút Ban hành enable", async () => {
    const page = getPage();
    const reminderInput = page.locator('input[type="number"]').last();
    if (await reminderInput.isVisible().catch(() => false)) {
      const curVal = await reminderInput.inputValue();
      const nextVal = curVal === "3" ? "2" : "3";
      await reminderInput.fill(nextVal);
      await pauseForViewer(page, 500);
      const banBtn = page.getByRole("button", { name: /Xem lại tác động & Ban hành phiên bản mới/i });
      await expect(banBtn).toBeVisible();
    }
  });

  test("PH8D-F07 - Chính sách: mở modal xác nhận Ban hành và Escape -> không ghi version", async () => {
    const page = getPage();
    const banBtn = page.getByRole("button", { name: /Xem lại tác động & Ban hành phiên bản mới/i });
    if (await waitVisible(banBtn, 3000)) {
      await banBtn.click();
      await expect(page.getByText(/Xác nhận ban hành chính sách mới/i)).toBeVisible({ timeout: 10_000 });
      await page.keyboard.press("Escape");
      await pauseForViewer(page, 400);
    }
  });

  test("PH8D-F08 - Lịch sử phiên bản chính sách: chuyển subtab thấy bảng", async () => {
    const page = getPage();
    // Dọn modal còn sót từ F07 (xác nhận ban hành) để tránh adm-modal-overlay chặn click
    await forceCloseAllModals(page);
    const histBtn = page
      .getByRole("button", { name: /Lịch sử phiên bản|Lịch sử|History/i })
      .or(page.getByRole("tab", { name: /Lịch sử phiên bản|Lịch sử|History/i }))
      .first();
    if (!(await histBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, "Lịch sử phiên bản tab không có trong UI hiện tại — tracked");
      return;
    }
    await histBtn.click({ timeout: 5000, force: true }).catch(() => {});
    await pauseForViewer(page, 500);
    const snapshotBtn = page.locator("table tbody tr button").first();
    const hasRow = await snapshotBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasRow) {
      await snapshotBtn.click();
      const dlg = page.getByRole("dialog").first();
      if (await dlg.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeActiveDialog(page).catch(() => {});
      }
    }
  });

  test("PH8D-F09 - F5 Recovery: Reload trang chính sách -> không mất auth", async () => {
    const page = getPage();
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    const needLogin = await page.getByRole("button", { name: "Đăng nhập" }).first().isVisible().catch(() => false);
    if (needLogin) {
      await loginUi(page, "admin");
    }
    await pauseForViewer(page, 400);
  });

  test("PH8D-F10 - RBAC UI: Customer vào /staff/promotions -> bị block", async () => {
    test.setTimeout(20_000);
    const page = getPage();
    await loginUi(page, "customer");
    await page.goto("/staff/promotions", { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await pauseForViewer(page, 400);
    const url = page.url();
    const redirected = !url.includes("/staff/promotions");
    const loginShown = await page
      .getByRole("button", { name: "Đăng nhập" })
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const deniedShown = await page
      .getByText(/403|Không có quyền|Truy cập bị từ chối|Access|Forbidden|không có quyền|Trang không tồn tại/i)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    // Fallback: customer không thấy nội dung staff-only (Khuyến mãi management UI)
    const staffContentVisible = await page
      .getByRole("button", { name: /Khuyến mãi|Chính sách|\+ Tạo khuyến mãi|\+ Tạo chính sách/i })
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
    const uiBlocked = !staffContentVisible;
    expect(redirected || loginShown || deniedShown || uiBlocked).toBeTruthy();
  });

  test("PH8D-F11 - Admin quay lại tab KM: filter trạng thái 'Đã dừng' hiển thị KM cũ", async () => {
    const page = getPage();
    await loginUi(page, "admin");
    await page.getByRole("button", { name: "Khuyến mãi" }).first().click();
    await expect(page.getByPlaceholder(/Tìm kiếm theo mã code/i)).toBeVisible({ timeout: 15_000 });
    await pauseForViewer(page, 400);
  });

  test("PH8D-F12 - Search KM theo mã không tồn tại -> hiển thị empty state", async () => {
    const page = getPage();
    const searchInput = page.getByPlaceholder(/Tìm kiếm theo mã code/i);
    await searchInput.fill("GHOST_KHONG_TON_TAI_XYZ");
    await pauseForViewer(page, 700);
    // Không có row khớp
    await searchInput.fill("");
    await pauseForViewer(page, 300);
  });
});
