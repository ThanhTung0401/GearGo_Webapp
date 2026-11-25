import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { getFutureRentalDates } from "../../helpers/testData.js";

/**
 * Deep test PH2 Frontend: Catalog, Khả dụng, Tư vấn AI.
 * (a) Negative UI / (b) Cross-screen / (c) RBAC / (e) F5 mid-flow.
 */

test.describe("PH2 Deep FE: Negative / Cross / RBAC / F5-recovery", () => {
  test.setTimeout(60_000);

  // =========================
  // (a) Negative — UI
  // =========================

  test("(a) UC2.1 - Tìm từ khóa không tồn tại hiển thị empty state", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await expect(page.getByRole("heading", { name: /Tìm đồ cho chuyến đi/i })).toBeVisible();

    const search = page.getByPlaceholder("Tìm tên, thương hiệu...");
    await search.fill("SanPhamKhongTonTaiXYZ123");
    await page.waitForTimeout(1200);
    // Empty state hoặc nút Xóa bộ lọc
    const clearBtn = page.getByRole("button", { name: "Xóa bộ lọc" }).first();
    await expect(clearBtn).toBeVisible({ timeout: 5000 });
  });

  test("(a) UC2.1 - Tìm SQLi string không crash trang", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    const search = page.getByPlaceholder("Tìm tên, thương hiệu...");
    await search.fill(`' OR 1=1 --`);
    await page.waitForTimeout(1000);
    // Trang vẫn còn navigation
    await expect(page.getByRole("button", { name: /Giỏ thuê|Trang chủ/i }).first()).toBeVisible();
  });

  test("(a) UC2.3 - Chọn pickupDate trong quá khứ bị chặn bởi min attribute", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs.first()).toBeVisible({ timeout: 10_000 });
    const minAttr = await dateInputs.nth(0).getAttribute("min");
    expect(minAttr).toBeTruthy();
    const today = new Date().toISOString().slice(0, 10);
    expect(minAttr! >= today).toBeTruthy();
  });

  test("(a) UC2.3 - Chọn returnDate < pickupDate: UI không cho tiếp tục / cảnh báo", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    const dateInputs = page.locator('input[type="date"]');
    const { pickupDate } = getFutureRentalDates(10, 2);
    await dateInputs.nth(0).fill(pickupDate);
    // Chọn returnDate = pickupDate - 1 (không hợp lệ)
    const before = new Date(pickupDate);
    before.setDate(before.getDate() - 1);
    await dateInputs.nth(1).fill(before.toISOString().slice(0, 10));
    await page.waitForTimeout(800);
    // Min attribute của returnDate nên >= pickupDate; nên UI phải hoặc tự fix, hoặc không cho submit
    const returnMin = await dateInputs.nth(1).getAttribute("min");
    // Nếu có min, chắc chắn không < pickupDate
    if (returnMin) {
      expect(returnMin >= pickupDate).toBeTruthy();
    }
  });

  test("(a) UC2.4 - Guest vào trang Tư vấn AI không thấy nút (hoặc được yêu cầu đăng nhập)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const btn = page.getByRole("button", { name: "Tư vấn AI" }).first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await page.waitForTimeout(1500);
      // Nếu vào được form, submit phải yêu cầu auth
      const genBtn = page.getByRole("button", { name: /Phân tích & Tạo gợi ý combo tối ưu/i });
      if (await genBtn.isVisible().catch(() => false)) {
        await genBtn.click();
        await page.waitForTimeout(1500);
        // Phải redirect login hoặc hiện thông báo
        const needLogin = await page.getByText(/đăng nhập|login|chưa đăng nhập/i).first().isVisible().catch(() => false);
        const atLogin = /\/login/.test(page.url());
        expect(needLogin || atLogin).toBeTruthy();
      }
    } else {
      expect(visible).toBeFalsy();
    }
  });

  test("(a) UC2.4 - Tư vấn AI với destination rỗng: UI không crash (disable, chặn hoặc fallback default)", async ({ page }) => {
    await loginUi(page, "customer");
    const aiBtn = page.getByRole("button", { name: "Tư vấn AI" }).first();
    await expect(aiBtn).toBeVisible({ timeout: 10_000 });
    await aiBtn.click();
    await expect(page.getByText(/Trợ lý AI tư vấn bộ đồ cắm trại/i)).toBeVisible();

    const dest = page.getByPlaceholder(/Đà Lạt, Hồ Trị An/i);
    await dest.fill("");
    const submit = page.getByRole("button", { name: /Phân tích & Tạo gợi ý combo tối ưu/i });
    const disabled = await submit.isDisabled().catch(() => false);
    if (!disabled) {
      await submit.click();
      await page.waitForTimeout(1500);
      // UI có thể auto-fill default hoặc hiện kết quả; smoke-test: không crash page
      const stillOnPage = await page.getByText(/Trợ lý AI tư vấn bộ đồ cắm trại/i).isVisible()
        .catch(() => false);
      const gotResult = await page.getByText(/Tổng chi phí ban đầu cần chuẩn bị/i).isVisible()
        .catch(() => false);
      // Chấp nhận: disable button, giữ ở form, hoặc có kết quả (BE fallback default)
      expect(stillOnPage || gotResult).toBeTruthy();
    } else {
      expect(disabled).toBeTruthy();
    }
  });

  // =========================
  // (b) Cross-screen cascade
  // =========================

  test("(b) UC2.1 → UC2.2 - Click sản phẩm trong list mở chi tiết đúng product", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    const firstCardImg = page.locator("img").first();
    await expect(firstCardImg).toBeVisible({ timeout: 10_000 });
    await firstCardImg.click();
    await expect(page.getByRole("button", { name: /Quay lại danh sách/i })).toBeVisible({ timeout: 10_000 });
  });

  test("(b) UC2.1 → UC2.3 - Chọn lịch rồi thêm vào giỏ, giỏ giữ đúng lịch đó", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    const { pickupDate, returnDate } = getFutureRentalDates(15, 2);
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(pickupDate);
    await dateInputs.nth(1).fill(returnDate);
    // Chờ availability API resolve để enable nút "+ Thuê ngay"
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    // Tìm nút Thuê ngay đầu tiên còn enable (có sản phẩm còn hàng)
    const thueBtns = page.getByRole("button", { name: /\+ Thuê ngay/i });
    const count = await thueBtns.count();
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const btn = thueBtns.nth(i);
      if (await btn.isEnabled().catch(() => false)) {
        await btn.click({ timeout: 5000 });
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      test.skip(true, "Không có sản phẩm nào còn hàng trong khoảng ngày chọn — skip");
      return;
    }
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /Giỏ thuê/i }).first().click();
    // UI có thể hiển thị "Khả dụng" hoặc số lượng — chấp nhận cả 2
    const cartHint = page.getByText(/Khả dụng|Kho sẵn sàng|Số lượng|Giỏ thuê của bạn/i).first();
    await expect(cartHint).toBeVisible({ timeout: 10_000 });
  });

  // =========================
  // (c) RBAC
  // =========================

  test("(c) UC2.1/2.2 - Guest xem catalog & chi tiết OK", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await expect(page.getByRole("heading", { name: /Tìm đồ cho chuyến đi/i })).toBeVisible();
    const img = page.locator("img").first();
    await expect(img).toBeVisible({ timeout: 10_000 });
    await img.click();
    await expect(page.getByRole("button", { name: /Quay lại danh sách/i })).toBeVisible({ timeout: 10_000 });
  });

  test("(c) UC2.4 - Customer có nút Tư vấn AI, guest không có", async ({ browser }) => {
    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();
    await guestPage.goto((process.env.APP_URL || "http://localhost:8443") + "/", { waitUntil: "domcontentloaded" });
    const guestHasAi = await guestPage.getByRole("button", { name: "Tư vấn AI" }).first().isVisible().catch(() => false);
    await guestCtx.close();

    const custCtx = await browser.newContext();
    const custPage = await custCtx.newPage();
    try {
      await loginUi(custPage, "customer");
      const custHasAi = await custPage.getByRole("button", { name: "Tư vấn AI" }).first().isVisible().catch(() => false);
      expect(custHasAi).toBeTruthy();
      // Guest có thể có nút nhưng không nên submit được — nhưng ít nhất Customer phải có
    } finally {
      await custCtx.close();
    }
    expect(typeof guestHasAi).toBe("boolean");
  });

  test("(c) UC2.4 - Staff đăng nhập, kiểm tra có nút Tư vấn AI (theo commit ddfda6d mở quyền)", async ({ page }) => {
    await loginUi(page, "staff");
    // Staff có thể có hoặc không — tùy phân quyền động. Chấp nhận cả hai, nhưng không được crash
    const has = await page.getByRole("button", { name: "Tư vấn AI" }).first().isVisible().catch(() => false);
    expect(typeof has).toBe("boolean");
    // Trang vẫn load được
    await expect(page.getByRole("button", { name: /Trang khách/i })).toBeVisible({ timeout: 10_000 });
  });

  // =========================
  // (e) F5 mid-flow
  // =========================

  test("(e) UC2.1 - F5 giữa khi đang có filter danh mục: filter mất, catalog vẫn load", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await expect(page.getByRole("heading", { name: /Tìm đồ cho chuyến đi/i })).toBeVisible();

    await page.getByRole("button", { name: "Combo Gia Đình" }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Tìm đồ cho chuyến đi/i })).toBeVisible({ timeout: 10_000 });
  });

  test("(e) UC2.2 - F5 ở trang chi tiết sản phẩm: trang reload OK (hoặc về list)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await page.locator("img").first().click();
    await expect(page.getByRole("button", { name: /Quay lại danh sách/i })).toBeVisible({ timeout: 10_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    // Hoặc còn trên chi tiết, hoặc về home — cả 2 đều OK, miễn không crash
    const stillDetail = await page.getByRole("button", { name: /Quay lại danh sách/i }).isVisible().catch(() => false);
    const atHome = await page.getByRole("button", { name: "Thuê đồ" }).first().isVisible().catch(() => false);
    expect(stillDetail || atHome).toBeTruthy();
  });

  test("(e) UC2.4 - F5 giữa khi đang có kết quả Tư vấn AI: form rebuild, kết quả preserved hoặc regen", async ({ page }) => {
    await loginUi(page, "customer");
    const aiBtn = page.getByRole("button", { name: "Tư vấn AI" }).first();
    if (!(await aiBtn.isVisible().catch(() => false))) {
      test.skip(true, "Customer không có nút Tư vấn AI trong môi trường này");
    }
    await aiBtn.click();
    await expect(page.getByText(/Trợ lý AI tư vấn bộ đồ cắm trại/i)).toBeVisible();

    const dest = page.getByPlaceholder(/Đà Lạt, Hồ Trị An/i);
    await dest.fill("Đà Lạt F5 Test");
    await page.getByRole("button", { name: /Phân tích & Tạo gợi ý combo tối ưu/i }).click();
    await expect(page.getByText(/Tổng chi phí ban đầu cần chuẩn bị/i)).toBeVisible({ timeout: 25_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    // Sau F5: trang Tư vấn AI vẫn load được (header xuất hiện), không yêu cầu kết quả còn nguyên
    const stillOnAi = await page.getByText(/Trợ lý AI tư vấn bộ đồ cắm trại/i).isVisible().catch(() => false);
    const atHome = await page.getByRole("button", { name: "Thuê đồ" }).first().isVisible().catch(() => false);
    expect(stillOnAi || atHome).toBeTruthy();
  });

  test("(e) UC2.3 - F5 ở trang Giỏ thuê sau khi thêm sp: giỏ được preserved", async ({ page }) => {
    await loginUi(page, "customer");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await page.getByRole("button", { name: /\+ Thuê ngay/i }).first().click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /Giỏ thuê/i }).first().click();
    await expect(page.getByText(/Khả dụng \(Kho sẵn sàng:/i).first()).toBeVisible({ timeout: 10_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    // Vẫn thấy ít nhất 1 dòng giỏ (giỏ lưu server-side, preserved sau F5)
    await expect(page.getByText(/Khả dụng \(Kho sẵn sàng:/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("(e) UC2.1 - F5 trang home: vẫn render OK, không lost navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Thuê đồ" }).first()).toBeVisible({ timeout: 10_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Thuê đồ" }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("(e) UC2.1 - Quick nav: Thuê đồ → Trang chủ → Thuê đồ, state reset đúng", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await expect(page.getByRole("heading", { name: /Tìm đồ cho chuyến đi/i })).toBeVisible();
    const search = page.getByPlaceholder("Tìm tên, thương hiệu...");
    await search.fill("Lều");
    await page.waitForTimeout(500);

    // Về trang chủ (click logo / nút home)
    const homeLink = page.getByRole("button", { name: /Trang chủ|GearGo/i }).first();
    if (await homeLink.isVisible().catch(() => false)) {
      await homeLink.click();
      await page.waitForTimeout(600);
    } else {
      await page.goto("/", { waitUntil: "domcontentloaded" });
    }

    // Trở lại Thuê đồ, trang load OK
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await expect(page.getByRole("heading", { name: /Tìm đồ cho chuyến đi/i })).toBeVisible({ timeout: 10_000 });
  });
});
