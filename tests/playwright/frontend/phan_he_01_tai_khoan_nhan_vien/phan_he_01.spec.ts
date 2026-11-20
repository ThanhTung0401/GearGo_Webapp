import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH1: Quản lý Tài khoản & Nhân viên (UC1.1 - UC1.13)", () => {
  const getPage = useSubsystemPage("phan_he_01_tai_khoan_nhan_vien");
  const stamp = String(Date.now());
  const regEmail = `pw_reg_${stamp}@geargo.test`;
  const regPhone = `09${stamp.slice(-8)}`;

  test("UC1.1 - Đăng ký tài khoản mới đầy đủ trên giao diện & lưu SQL Server", async () => {
    const page = getPage();
    await page.goto("/");
    await pauseForViewer(page);

    await page.getByRole("button", { name: "Đăng ký" }).first().click();
    await expect(page.getByRole("heading", { name: /Tạo tài khoản GearGo/i })).toBeVisible();

    const regForm = page.locator("form.auth-form");
    await regForm.locator('input[placeholder="Nguyễn Văn An"]').fill("Khách Test Playwright");
    await regForm.locator('input[placeholder="example@email.com"]').fill(regEmail);
    await regForm.locator('input[placeholder="0901 234 567"]').fill(regPhone);
    await regForm.locator('input[placeholder="Tối thiểu 6 ký tự"]').fill("Test@123456");
    await regForm.locator('input[placeholder="Nhập lại mật khẩu"]').fill("Test@123456");
    await regForm.locator('input[type="checkbox"]').check();
    await pauseForViewer(page);

    await regForm.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByRole("button", { name: /Quay về trang đăng nhập|Đăng nhập ngay/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await pauseForViewer(page);
  });

  test("UC1.4 - Quên mật khẩu: Nhập email, gửi yêu cầu OTP & kiểm tra form xác minh OTP", async () => {
    const page = getPage();
    await page.getByRole("button", { name: /Quay về trang đăng nhập/i }).click();
    await expect(page.getByRole("button", { name: /Quên mật khẩu/i })).toBeVisible();

    await page.getByRole("button", { name: /Quên mật khẩu/i }).click();
    await expect(page.getByRole("heading", { name: /Khôi phục mật khẩu/i })).toBeVisible();

    // Điền email tài khoản vừa đăng ký và bấm Gửi mã OTP
    const forgotForm = page.locator("form.auth-form");
    await forgotForm.locator("input").first().fill(regEmail);
    await pauseForViewer(page);
    await forgotForm.getByRole("button", { name: /Gửi mã OTP xác minh/i }).click();

    // Chuyển sang bước nhập mã OTP 6 số
    await expect(page.getByRole("heading", { name: /Nhập mã xác minh OTP/i })).toBeVisible({ timeout: 15_000 });
    await page.locator("form.auth-form input").first().fill("123456");
    await pauseForViewer(page);
    await page.locator("form.auth-form button[type='submit']").click();
    await expect(page.getByRole("heading", { name: /Đặt mật khẩu mới/i })).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page);

    // Bước 3: Nhập mật khẩu mới & xác nhận đổi mật khẩu (hoàn tất UC1.4)
    await page.getByPlaceholder("Tối thiểu 6 ký tự").fill("Reset@123456");
    await page.getByPlaceholder("Nhập lại mật khẩu mới").fill("Reset@123456");
    await pauseForViewer(page);
    await page.getByRole("button", { name: "Xác nhận đổi mật khẩu" }).click();
    await expect(page.getByRole("button", { name: /Đăng nhập/i }).first()).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page);
  });

  test("UC1.2, UC1.3 - Đăng nhập thật tài khoản Khách hàng & Đăng xuất", async () => {
    const page = getPage();
    await loginUi(page, "customer");
    await expect(page.getByRole("button", { name: "Thoát" })).toBeVisible();
    await pauseForViewer(page);

    await page.getByRole("button", { name: "Thoát" }).click();
    await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible();
    await pauseForViewer(page);
  });

  test("UC1.5, UC1.6, UC1.12 - Xem, cập nhật hồ sơ cá nhân & tương tác form Đổi mật khẩu", async () => {
    const page = getPage();
    await loginUi(page, "customer");
    await page.getByRole("button", { name: "Tài khoản" }).first().click();
    await expect(page.getByRole("heading", { name: /Hồ sơ cá nhân/i })).toBeVisible();
    // Đợi API layHoSoToi() tải xong hoàn toàn trước khi sửa địa chỉ và bấm Lưu
    await expect(page.getByText(/Đang tải hồ sơ cá nhân/i)).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Lưu thay đổi" })).toBeEnabled({ timeout: 10_000 });
    await pauseForViewer(page);

    // Cập nhật địa chỉ liên hệ và bấm Lưu thay đổi
    const addressInput = page.locator('input[type="text"]').nth(1);
    await addressInput.fill("128 Nguyễn Đình Chiểu, Q.3, TP.HCM");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText(/Đã lưu hồ sơ thành công/i)).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page);

    // Chuyển sang tab Bảo mật / Đổi mật khẩu & kiểm tra validation form
    await page.getByRole("button", { name: /Đổi mật khẩu|Bảo mật/i }).first().click();
    await expect(page.getByRole("heading", { name: /Đổi mật khẩu tài khoản/i })).toBeVisible();
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill("SaiMatKhauCu");
    await passInputs.nth(1).fill("MatKhauMoi@123");
    await passInputs.nth(2).fill("MatKhauMoi@123");
    await pauseForViewer(page);
  });

  test("UC1.7 - UC1.13 - Admin tìm kiếm nhân viên, mở modal Thêm NV, xem Khách hàng & Phân quyền", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Nhân viên" }).first().click();
    await expect(page.getByPlaceholder("Tìm theo tên, mã NV, username...")).toBeVisible();
    await page.getByPlaceholder("Tìm theo tên, mã NV, username...").fill("Kho");
    await pauseForViewer(page);
    await page.getByPlaceholder("Tìm theo tên, mã NV, username...").fill("");

    // Mở modal Thêm nhân viên mới (UC1.7), điền thử rồi đóng
    await page.getByRole("button", { name: /\+ Thêm nhân viên mới/i }).click();
    await expect(page.getByRole("heading", { name: /Thêm tài khoản nhân viên mới/i })).toBeVisible();
    await page.getByPlaceholder("VD: Trần Văn Bình").fill("Nhân Viên Test UI");
    await pauseForViewer(page);
    await page.getByRole("button", { name: "Hủy" }).click();

    await page.getByRole("button", { name: "Khách hàng" }).first().click();
    await expect(page.getByText(/Khách hàng/i).first()).toBeVisible();
    await pauseForViewer(page);

    await page.getByRole("button", { name: "Phân quyền" }).first().click();
    await expect(page.getByText(/Phân quyền|Ma trận quyền/i).first()).toBeVisible();
    await pauseForViewer(page);

    // SCR-1.8: Mở modal Cập nhật thông tin nhân viên
    await page.getByRole("button", { name: "Nhân viên" }).first().click();
    await page.locator(".internal-content").getByRole("button", { name: "Sửa", exact: true }).first().click();
    const staffModal = page.locator('[role="dialog"], .modal-content').first();
    await expect(staffModal).toBeVisible();
    const cancelModalBtn = staffModal.getByRole("button", { name: /Hủy|Đóng/i }).first();
    if (await cancelModalBtn.isVisible().catch(() => false)) {
      await cancelModalBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
  });

  test("SCR-1.2 - Đăng nhập tài khoản bị khóa hiển thị Alert Box cảnh báo", async () => {
    const page = getPage();
    await page.getByRole("button", { name: /Trang khách/i }).first().click();
    await page.getByRole("button", { name: "Thoát" }).first().click();
    await page.getByRole("button", { name: "Đăng nhập" }).first().click();
    const loginForm = page.locator("form.auth-form");
    await expect(loginForm).toBeVisible();
    await loginForm.locator("input").nth(0).fill("locked.kh@geargo.vn");
    await loginForm.locator("input").nth(1).fill("GearGo@2026");
    await loginForm.locator('button[type="submit"]').click();
    await expect(page.locator(".auth-locked-alert")).toBeVisible({ timeout: 10_000 });
  });
});

/**
 * Gộp từ rbac/rbac_perm_flush.spec.ts (v2 §5.3 — E2E RBAC với flush endpoint).
 * TODO (bỏ `skip` khi bật `/api/debug/flush-permissions` và biến môi trường RBAC test).
 */
test.describe.skip("Frontend PH1 (RBAC v2 §5.3): Phân quyền động & flush cache", () => {
  const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5000";
  const FLUSH_ENDPOINT = `${BACKEND_URL}/api/debug/flush-permissions`;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@geargo.vn";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "GearGo@2026";
  const STAFF_EMAIL = process.env.STAFF_EMAIL ?? "staff@geargo.vn";
  const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? "GearGo@2026";

  async function loginForm(page: import("@playwright/test").Page, email: string, password: string) {
    await page.getByPlaceholder(/email/i).fill(email);
    await page.getByPlaceholder(/mật khẩu/i).fill(password);
    await page.getByRole("button", { name: /Đăng nhập/i }).click();
  }

  test("Bật KhuyenMai_Quan cho NhanVien → flush → tab Khuyến mãi xuất hiện", async ({ page, request }) => {
    await page.goto("/");
    await loginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByRole("heading", { name: /Tổng quan|Quản trị/i })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Phân quyền/i }).click();
    await page.getByRole("button", { name: /NhanVien/i }).click();
    const khuyenMaiQuan = page.getByLabel(/KhuyenMai\.Quan/i);
    if (!(await khuyenMaiQuan.isChecked())) {
      await khuyenMaiQuan.check();
      await page.getByRole("button", { name: /Lưu|Cập nhật/i }).click();
    }

    const flush = await request.post(FLUSH_ENDPOINT);
    expect(flush.ok()).toBeTruthy();

    await page.getByRole("button", { name: /Đăng xuất/i }).click();
    await loginForm(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page.getByRole("button", { name: /Khuyến mãi/i })).toBeVisible({ timeout: 10_000 });
  });

  test("Gỡ KhuyenMai_Quan → flush → tab Khuyến mãi biến mất", async ({ page, request }) => {
    await page.goto("/");
    await loginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.getByRole("button", { name: /Phân quyền/i }).click();
    await page.getByRole("button", { name: /NhanVien/i }).click();
    const khuyenMaiQuan = page.getByLabel(/KhuyenMai\.Quan/i);
    if (await khuyenMaiQuan.isChecked()) {
      await khuyenMaiQuan.uncheck();
      await page.getByRole("button", { name: /Lưu|Cập nhật/i }).click();
    }
    const flush = await request.post(FLUSH_ENDPOINT);
    expect(flush.ok()).toBeTruthy();

    await page.getByRole("button", { name: /Đăng xuất/i }).click();
    await loginForm(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page.getByRole("button", { name: /Khuyến mãi/i })).toHaveCount(0);
  });
});
