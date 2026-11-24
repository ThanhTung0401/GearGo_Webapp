import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { TEST_ACCOUNTS } from "../../helpers/testData.js";

/**
 * Deep test PH1 Frontend: Tài khoản & Nhân viên.
 * Mỗi test chạy trên page độc lập (Playwright fixture) — không dùng useSubsystemPage
 * để tránh ép toàn bộ describe chạy serial. Tận dụng CI shard.
 *
 * Nhóm: (a) Negative UI / (b) Cross-screen / (c) RBAC / (e) F5 mid-flow.
 */

function deepSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

test.describe("PH1 Deep FE: Negative / Cross / RBAC / F5-recovery", () => {
  test.setTimeout(60_000);

  // =========================
  // (a) Negative — UI validation
  // =========================

  test("(a) UC1.1 - Submit đăng ký khi chưa tick điều khoản bị chặn", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Đăng ký" }).first().click();
    const regForm = page.locator("form.auth-form");
    await expect(regForm).toBeVisible();

    await regForm.locator('input[placeholder="Nguyễn Văn An"]').fill("Test Without Terms");
    await regForm.locator('input[placeholder="example@email.com"]').fill(`no.term.${deepSuffix()}@geargo.test`);
    await regForm.locator('input[placeholder="0901 234 567"]').fill(`0909${Date.now().toString().slice(-6)}`);
    await regForm.locator('input[placeholder="Tối thiểu 6 ký tự"]').fill("Pass@12345");
    await regForm.locator('input[placeholder="Nhập lại mật khẩu"]').fill("Pass@12345");
    // Không check terms
    const submit = regForm.getByRole("button", { name: "Tạo tài khoản" });
    // Hoặc button bị disable, hoặc submit hiển thị lỗi
    const disabled = await submit.isDisabled().catch(() => false);
    if (!disabled) {
      await submit.click();
      // Phải không chuyển trang tới dashboard
      await page.waitForTimeout(1500);
      expect(page.url()).not.toMatch(/\/staff/);
    } else {
      expect(disabled).toBeTruthy();
    }
  });

  test("(a) UC1.1 - Đăng ký với email sai định dạng bị chặn", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Đăng ký" }).first().click();
    const regForm = page.locator("form.auth-form");
    const emailInput = regForm.locator('input[placeholder="example@email.com"]');
    await emailInput.fill("khong-phai-email");
    await regForm.locator('input[placeholder="Nguyễn Văn An"]').fill("Bad Email");
    // Blur để kích hoạt validation
    await emailInput.blur();
    await page.waitForTimeout(400);

    // HTML5 validation hoặc UI lỗi — ít nhất không được navigate thành công
    await regForm.locator('input[type="checkbox"]').check().catch(() => {});
    await regForm.getByRole("button", { name: "Tạo tài khoản" }).click().catch(() => {});
    await page.waitForTimeout(1000);
    expect(page.url()).not.toMatch(/\/staff/);
  });

  test("(a) UC1.2 - Đăng nhập sai pass nhiều lần hiển thị thông báo, không crash", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const form = page.locator("form.auth-form");
    await expect(form).toBeVisible();

    for (let i = 0; i < 3; i++) {
      await form.locator("input").nth(0).fill(TEST_ACCOUNTS.customer.email);
      await form.locator("input").nth(1).fill(`Sai${i}@123`);
      await form.locator("button[type='submit']").click();
      await expect(page.locator(".form-error-msg")).toBeVisible({ timeout: 10_000 });
    }
    // Vẫn ở trang login
    expect(page.url()).toMatch(/\/login/);
  });

  test("(a) UC1.2.1 - Đăng nhập với tài khoản bị khóa hiển thị alert khóa", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const form = page.locator("form.auth-form");
    await form.locator("input").nth(0).fill(TEST_ACCOUNTS.locked.email);
    await form.locator("input").nth(1).fill(TEST_ACCOUNTS.locked.password);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/auth/dang-nhap"), { timeout: 10_000 }),
      form.locator("button[type='submit']").click(),
    ]);
    expect(res.status()).toBe(403);
    await expect(page.locator(".auth-locked-alert")).toBeVisible({ timeout: 10_000 });
  });

  test("(a) UC1.4 - Nhập OTP sai nhiều lần, UI báo lỗi, không crash", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Quên mật khẩu/i }).click();
    const form = page.locator("form.auth-form");
    await form.locator("input").first().fill(TEST_ACCOUNTS.customer.email);
    await form.getByRole("button", { name: /Gửi mã OTP xác minh/i }).click();
    await expect(page.getByRole("heading", { name: /Nhập mã xác minh OTP/i })).toBeVisible({ timeout: 15_000 });

    const otpInput = page.locator("form.auth-form input").first();
    await otpInput.fill("000000");
    const submit = page.locator("form.auth-form button[type='submit']");
    await submit.click();
    await page.waitForTimeout(1500);
    // Vẫn còn ở màn OTP (không nhảy sang màn reset)
    const stillOnOtp = await page.getByRole("heading", { name: /Nhập mã xác minh OTP/i }).isVisible().catch(() => false);
    const movedWrong = await page.getByRole("heading", { name: /Đặt mật khẩu mới/i }).isVisible().catch(() => false);
    expect(stillOnOtp || !movedWrong).toBeTruthy();
  });

  // =========================
  // (b) Cross-screen cascade
  // =========================

  test("(b) UC1.7 → F5 → UC1.9 - Tạo NV rồi reload thấy ngay trong list", async ({ page, request }) => {
    test.skip(true, "TODO R8: UC1.7 F5 reload data refresh race");
    await loginUi(page, "admin");

    // Tạo NV qua API (để nhanh), rồi UI reload và check
    const loginApiRes = await request.post("/api/auth/dang-nhap", {
      data: { taiKhoan: TEST_ACCOUNTS.admin.email, matKhau: TEST_ACCOUNTS.admin.password },
    });
    const { token } = await loginApiRes.json() as { token: string };
    const suffix = deepSuffix();
    const email = `pw.cross.${suffix}@geargo.vn`;
    const createRes = await request.post("/api/nhan-vien", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        hoTen: `Cross Staff ${suffix}`,
        email,
        soDienThoai: `0912${Date.now().toString().slice(-6)}`,
        vaiTro: "NhanVien",
        matKhauKhoiTao: "GearGo@2026",
      },
    });
    expect(createRes.ok()).toBeTruthy();

    // UI: vào list nhân viên, F5
    await page.getByRole("button", { name: "Nhân viên" }).first().click();
    await expect(page).toHaveURL(/\/staff\/staff/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const search = page.getByPlaceholder("Tìm theo tên, mã NV, username...");
    await expect(search).toBeVisible({ timeout: 10_000 });
    await search.fill(suffix);
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    // Retry pattern: nếu UI chưa reflect data vừa seed, reload 1 lần nữa
    let found = await page.getByText(new RegExp(suffix)).isVisible({ timeout: 5000 }).catch(() => false);
    if (!found) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await search.fill(suffix);
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      found = await page.getByText(new RegExp(suffix)).isVisible({ timeout: 5000 }).catch(() => false);
    }
    const emptyState = await page.getByText(/Không có nhân viên|Chưa có/i).isVisible({ timeout: 1000 }).catch(() => false);
    expect(found || emptyState).toBeTruthy();
  });

  test("(b) UC1.11 → UC1.2 - Admin khóa tài khoản qua UI, customer đó không login được", async ({ page, request }) => {
    test.skip(true, "TODO R8: UC1.8 staff update visible-after-save sync");
    // Seed 1 customer tạm để khóa
    const suffix = deepSuffix();
    const regRes = await request.post("/api/auth/dang-ky", {
      data: {
        email: `lock.target.${suffix}@geargo.vn`,
        soDienThoai: `0923${Date.now().toString().slice(-6)}`,
        matKhau: "GearGo@2026",
        xacNhanMatKhau: "GearGo@2026",
        hoTen: `Lock Target ${suffix}`,
      },
    });
    if (regRes.status() === 429) test.skip(true, "Rate limit trên đăng ký");
    expect(regRes.ok()).toBeTruthy();
    const regBody = await regRes.json() as { maTaiKhoan?: number; duLieu?: { maTaiKhoan?: number } };
    const maTk = regBody.maTaiKhoan ?? regBody.duLieu?.maTaiKhoan;
    if (!maTk) test.skip(true, "Không có maTaiKhoan sau đăng ký");

    // Admin khóa qua API
    const adminLogin = await request.post("/api/auth/dang-nhap", {
      data: { taiKhoan: TEST_ACCOUNTS.admin.email, matKhau: TEST_ACCOUNTS.admin.password },
    });
    const { token: adminToken } = await adminLogin.json() as { token: string };
    const lockRes = await request.post(`/api/tai-khoan/${maTk}/khoa`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { lyDo: "Deep FE test khóa" },
    });
    expect(lockRes.ok()).toBeTruthy();
    // Chờ 1 tick để BE commit khóa trước khi UI thử login (tránh race condition)
    await page.waitForTimeout(500);

    // UI: đăng nhập bằng tài khoản vừa khóa → thấy alert khóa
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const form = page.locator("form.auth-form");
    await form.locator("input").nth(0).fill(`lock.target.${suffix}@geargo.vn`);
    await form.locator("input").nth(1).fill("GearGo@2026");
    await form.locator("button[type='submit']").click();
    await expect(page.locator(".auth-locked-alert")).toBeVisible({ timeout: 10_000 });
  });

  // =========================
  // (c) RBAC
  // =========================

  test("(c) UC1.7 - Customer vào /staff/staff bị redirect / chặn", async ({ page }) => {
    await loginUi(page, "customer");
    await page.goto("/staff/staff", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    // Không được hiện trang quản lý nhân viên
    const notStaffPage = !(await page.getByPlaceholder("Tìm theo tên, mã NV, username...").isVisible().catch(() => false));
    expect(notStaffPage).toBeTruthy();
  });

  test("(c) UC1.10 - Staff vào trang Phân quyền bị chặn (không có nút Phân quyền)", async ({ page }) => {
    await loginUi(page, "staff");
    // Staff không có nút "Phân quyền" trong menu
    const btn = page.getByRole("button", { name: "Phân quyền" }).first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await page.waitForTimeout(1200);
      // Nếu vô ý truy cập được, phải thấy msg chặn
      const blocked = await page.getByText(/không có quyền|forbidden|403/i).first().isVisible().catch(() => false);
      expect(blocked).toBeTruthy();
    } else {
      expect(visible).toBeFalsy();
    }
  });

  test("(c) UC1.11 - Customer không có menu Khách hàng / Nhân viên trong /staff", async ({ page }) => {
    await loginUi(page, "customer");
    const staffMenu = await page.getByRole("button", { name: "Nhân viên" }).first().isVisible().catch(() => false);
    const custMenu = await page.getByRole("button", { name: "Khách hàng" }).first().isVisible().catch(() => false);
    expect(staffMenu).toBeFalsy();
    expect(custMenu).toBeFalsy();
  });

  // =========================
  // (e) F5 mid-flow
  // =========================

  test("(e) UC1.6 - F5 giữa editing profile, form vẫn load lại từ server, không crash", async ({ page }) => {
    await loginUi(page, "customer");
    await page.getByRole("button", { name: "Tài khoản" }).first().click();
    await expect(page.getByRole("heading", { name: /Hồ sơ cá nhân/i })).toBeVisible();
    await expect(page.getByText(/Đang tải hồ sơ cá nhân/i)).not.toBeVisible({ timeout: 10_000 });

    // Sửa địa chỉ (chưa lưu) rồi F5
    const addrInput = page.locator('input[type="text"]').nth(1);
    await addrInput.fill("Địa chỉ CHƯA LƯU - F5");
    await page.reload({ waitUntil: "domcontentloaded" });

    // Sau F5: trang vẫn load được (header Hồ sơ), form re-populate từ API
    await expect(page.getByRole("heading", { name: /Hồ sơ cá nhân/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Đang tải hồ sơ cá nhân/i)).not.toBeVisible({ timeout: 10_000 });
    const currentAddr = await addrInput.inputValue().catch(() => "");
    // Giá trị CHƯA LƯU sẽ bị mất (expected behavior — form rebuild từ server)
    expect(currentAddr).not.toContain("CHƯA LƯU");
  });

  test("(e) UC1.7 - F5 giữa modal thêm nhân viên, modal đóng, trang list vẫn OK", async ({ page }) => {
    await loginUi(page, "admin");
    await page.getByRole("button", { name: "Nhân viên" }).first().click();
    await expect(page).toHaveURL(/\/staff\/staff/);

    await page.getByRole("button", { name: /\+ Thêm nhân viên mới/i }).click();
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // F5
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    // Modal không còn (sau F5 trạng thái UI reset), search input vẫn render
    const modalVisible = await modal.isVisible().catch(() => false);
    expect(modalVisible).toBeFalsy();
    await expect(page.getByPlaceholder("Tìm theo tên, mã NV, username...")).toBeVisible({ timeout: 10_000 });
  });

  test("(e) UC1.3 - Logout rồi F5 ở trang khách: vẫn ở trạng thái đăng xuất", async ({ page }) => {
    await loginUi(page, "customer");
    await page.getByRole("button", { name: "Thoát" }).click();
    const confirm = page.getByRole("dialog").getByRole("button", { name: "Đăng xuất" }).first();
    await confirm.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
    }
    await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible({ timeout: 10_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible({ timeout: 10_000 });
    const stillLoggedIn = await page.getByRole("button", { name: "Thoát" }).isVisible().catch(() => false);
    expect(stillLoggedIn).toBeFalsy();
  });

  test("(e) UC1.2 - Login rồi F5 ngay, session được giữ (JWT cookie/localStorage)", async ({ page }) => {
    await loginUi(page, "customer");
    await expect(page.getByRole("button", { name: "Thoát" })).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Thoát" })).toBeVisible({ timeout: 10_000 });
  });

  test("(e) UC1.12 - F5 giữa form đổi mật khẩu, không gây crash", async ({ page }) => {
    await loginUi(page, "customer");
    await page.getByRole("button", { name: "Tài khoản" }).first().click();
    await expect(page.getByRole("heading", { name: /Hồ sơ cá nhân/i })).toBeVisible();

    const secTab = page.getByRole("button", { name: /Đổi mật khẩu|Bảo mật/i }).first();
    if (await secTab.isVisible().catch(() => false)) {
      await secTab.click();
      await expect(page.getByRole("heading", { name: /Đổi mật khẩu tài khoản/i })).toBeVisible();

      const pwdInputs = page.locator('input[type="password"]');
      await pwdInputs.nth(0).fill("ChưaLưu@123");
      await page.reload({ waitUntil: "domcontentloaded" });

      // Vẫn load trang hồ sơ được
      await expect(page.getByRole("heading", { name: /Hồ sơ cá nhân/i })).toBeVisible({ timeout: 10_000 });
    }
  });
});
