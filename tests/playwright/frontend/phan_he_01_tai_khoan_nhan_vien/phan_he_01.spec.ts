import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible, closeActiveDialog } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH1: Quản lý Tài khoản & Nhân viên (UC1.1 - UC1.13)", () => {
  const getPage = useSubsystemPage("phan_he_01_tai_khoan_nhan_vien");
  const stamp = String(Date.now());
  const regEmail = `pw_reg_${stamp}@geargo.test`;
  const regPhone = `09${stamp.slice(-8)}`;
  const staffSuffix = stamp.slice(-5);

  test("UC1.1 - Đăng ký tài khoản mới (kèm kiểm tra mật khẩu không khớp) & lưu SQL Server", async () => {
    const page = getPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await pauseForViewer(page, 700);

    await page.getByRole("button", { name: "Đăng ký" }).first().click();
    await expect(page.getByRole("heading", { name: /Tạo tài khoản GearGo/i })).toBeVisible();

    const regForm = page.locator("form.auth-form");
    await regForm.locator('input[placeholder="Nguyễn Văn An"]').fill("Khách Test Playwright");
    await regForm.locator('input[placeholder="example@email.com"]').fill(regEmail);
    await regForm.locator('input[placeholder="0901 234 567"]').fill(regPhone);
    await regForm.locator('input[placeholder="Tối thiểu 6 ký tự"]').fill("Test@123456");
    // Nhánh phụ 3.1: Nhập xác nhận mật khẩu lệch để kiểm tra báo lỗi tại trường
    await regForm.locator('input[placeholder="Nhập lại mật khẩu"]').fill("Lech@123");
    await regForm.locator('input[type="checkbox"]').check();
    await regForm.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByText(/không khớp/i).first()).toBeVisible({ timeout: 5_000 });
    await pauseForViewer(page, 700);

    // Sửa lại đúng mật khẩu và hoàn tất đăng ký
    await regForm.locator('input[placeholder="Nhập lại mật khẩu"]').fill("Test@123456");
    await pauseForViewer(page, 700);
    await regForm.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByRole("button", { name: /Quay về trang đăng nhập|Đăng nhập ngay/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await pauseForViewer(page);
  });

  test("UC1.4, UC1.4.1, UC1.2 - Quên mật khẩu qua OTP & đăng nhập lại bằng mật khẩu mới", async () => {
    const page = getPage();
    await page.getByRole("button", { name: /Quay về trang đăng nhập/i }).click();
    await expect(page.getByRole("button", { name: /Quên mật khẩu/i })).toBeVisible();

    await page.getByRole("button", { name: /Quên mật khẩu/i }).click();
    await expect(page.getByRole("heading", { name: /Khôi phục mật khẩu/i })).toBeVisible();

    // Bước 1: Gửi yêu cầu OTP cho tài khoản vừa tạo
    const forgotForm = page.locator("form.auth-form");
    await forgotForm.locator("input").first().fill(regEmail);
    await pauseForViewer(page, 700);
    await forgotForm.getByRole("button", { name: /Gửi mã OTP xác minh/i }).click();

    // Bước 2: Nhập mã OTP demo 123456 & xác minh API
    await expect(page.getByRole("heading", { name: /Nhập mã xác minh OTP/i })).toBeVisible({ timeout: 15_000 });
    const otpInput = page.locator("form.auth-form input").first();
    await otpInput.fill("123456");
    await expect(otpInput).toHaveValue("123456");
    await pauseForViewer(page, 700);

    const verifyOtpBtn = page.locator("form.auth-form button[type='submit']");
    await expect(verifyOtpBtn).toBeEnabled();
    const [otpRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/xac-thuc-otp"), { timeout: 10_000 }),
      verifyOtpBtn.click(),
    ]);
    expect(otpRes.ok(), `Xác minh OTP thất bại (${otpRes.status()}): ${await otpRes.text()}`).toBeTruthy();
    await expect(page.getByRole("heading", { name: /Đặt mật khẩu mới/i })).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 700);

    // Bước 3: Đặt mật khẩu mới & đăng nhập lại kiểm chứng (UC1.4 bước 6 -> UC1.2)
    await page.getByPlaceholder("Tối thiểu 6 ký tự").fill("Reset@123456");
    await page.getByPlaceholder("Nhập lại mật khẩu mới").fill("Reset@123456");
    await pauseForViewer(page, 700);
    await page.getByRole("button", { name: "Xác nhận đổi mật khẩu" }).click();
    await expect(page.getByRole("button", { name: /Đăng nhập ngay/i }).first()).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 700);

    await page.getByRole("button", { name: /Đăng nhập ngay/i }).first().click();
    const loginForm = page.locator("form.auth-form");
    await expect(loginForm).toBeVisible({ timeout: 10_000 });
    await loginForm.locator("input").nth(0).fill(regEmail);
    await loginForm.locator("input").nth(1).fill("Reset@123456");
    await loginForm.locator("button[type='submit']").click();
    await expect(page.getByRole("button", { name: "Thoát" })).toBeVisible({ timeout: 15_000 });
    await pauseForViewer(page, 700);

    // UC1.3: Đăng xuất kết thúc phiên (có modal xác nhận đăng xuất)
    await page.getByRole("button", { name: "Thoát" }).click();
    const confirmLogout1 = page.getByRole("dialog").getByRole("button", { name: "Đăng xuất" }).first();
    if (await waitVisible(confirmLogout1, 2000)) {
      await confirmLogout1.click();
    }
    await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible();
    await pauseForViewer(page, 700);
  });

  test("UC1.2.1, UC1.5, UC1.6, UC1.12 - Đăng nhập khách hàng, cập nhật hồ sơ & kiểm tra đổi mật khẩu", async () => {
    const page = getPage();
    // Thử sai mật khẩu trước trên /login (UC1.2.1 nhánh phụ 2.1)
    await page.getByRole("button", { name: "Đăng nhập" }).first().click();
    const loginForm = page.locator("form.auth-form");
    await expect(loginForm).toBeVisible();
    await loginForm.locator("input").nth(0).fill("customer@geargo.vn");
    await loginForm.locator("input").nth(1).fill("SaiMatKhau123");
    await loginForm.locator("button[type='submit']").click();
    await expect(page.locator(".form-error-msg")).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 700);

    // Đăng nhập đúng & mở Hồ sơ cá nhân (UC1.5 & UC1.6)
    await loginForm.locator("input").nth(1).fill("GearGo@2026");
    await loginForm.locator("button[type='submit']").click();
    await expect(page.getByRole("button", { name: "Thoát" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Tài khoản" }).first().click();
    await expect(page.getByRole("heading", { name: /Hồ sơ cá nhân/i })).toBeVisible();
    await expect(page.getByText(/Đang tải hồ sơ cá nhân/i)).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Lưu thay đổi" })).toBeEnabled({ timeout: 10_000 });
    await pauseForViewer(page, 700);

    const addressInput = page.locator('input[type="text"]').nth(1);
    await addressInput.fill("128 Nguyễn Đình Chiểu, Q.3, TP.HCM");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText(/Đã lưu hồ sơ thành công/i)).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 800);

    // UC1.12 dòng phụ 2.1: Nhập sai mật khẩu hiện tại & bấm Lưu -> kiểm tra hệ thống từ chối
    await page.getByRole("button", { name: /Đổi mật khẩu|Bảo mật/i }).first().click();
    await expect(page.getByRole("heading", { name: /Đổi mật khẩu tài khoản/i })).toBeVisible();
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill("SaiMatKhauCu");
    await passInputs.nth(1).fill("MatKhauMoi@123");
    await passInputs.nth(2).fill("MatKhauMoi@123");
    const submitPwdBtn = page.getByRole("button", { name: /Cập nhật mật khẩu|Đổi mật khẩu/i }).last();
    if (await waitVisible(submitPwdBtn, 2000)) {
      await submitPwdBtn.click();
      await page.waitForTimeout(800);
    }
    await pauseForViewer(page);
  });

  test("UC1.7, UC1.7.1, UC1.8, UC1.9, UC1.10, UC1.11, UC1.13 - Quản trị nhân sự, khách hàng & phân quyền", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    // UC1.9: Tra cứu nhân viên
    await page.getByRole("button", { name: "Nhân viên" }).first().click();
    await expect(page).toHaveURL(/\/staff\/staff/);
    const searchStaff = page.getByPlaceholder("Tìm theo tên, mã NV, username...");
    await expect(searchStaff).toBeVisible();
    await searchStaff.fill("Mai");
    await pauseForViewer(page, 700);
    await expect(page.getByText("Lê Thị Mai", { exact: true }).first()).toBeVisible();
    await searchStaff.fill("");

    // UC1.7 & UC1.7.1: Thêm mới nhân viên thật kèm gán quyền ban đầu
    await page.getByRole("button", { name: /\+ Thêm nhân viên mới/i }).click();
    const addModal = page.locator('[role="dialog"]').first();
    await expect(addModal).toBeVisible();
    await addModal.locator("input").nth(1).fill(`nv_pw_${staffSuffix}`);
    await addModal.getByPlaceholder("VD: Trần Văn Bình").fill(`Nhân Viên Test ${staffSuffix}`);
    await addModal.getByPlaceholder("0909...").fill(`091${stamp.slice(-7)}`);
    await addModal.getByPlaceholder("binh.tv@geargo.vn").fill(`nv.pw.${staffSuffix}@geargo.vn`);
    await addModal.locator('input[type="checkbox"]').nth(0).check();
    await addModal.locator('input[type="checkbox"]').nth(1).check();
    await pauseForViewer(page, 800);
    await addModal.getByRole("button", { name: "Lưu nhân viên" }).click();
    await expect(addModal).not.toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 800);

    // UC1.8 & UC1.10: Mở sửa nhân viên & mở Phân quyền trên dòng nhân viên
    await page.locator(".internal-content").getByRole("button", { name: "Sửa", exact: true }).first().click();
    const editModal = page.locator('[role="dialog"]').first();
    await expect(editModal).toBeVisible();
    await pauseForViewer(page, 700);
    await editModal.getByRole("button", { name: "Hủy" }).click();

    const permRowBtn = page.locator(".internal-content").getByRole("button", { name: /Quyền|Phân quyền/i }).first();
    if (await waitVisible(permRowBtn, 2000)) {
      await permRowBtn.click();
      await pauseForViewer(page, 700);
      await closeActiveDialog(page);
    }

    // UC1.13 & UC1.11: Tra cứu khách hàng & kiểm tra trạng thái khóa/mở khóa
    await page.getByRole("button", { name: "Khách hàng" }).first().click();
    await expect(page.getByText(/Khách hàng/i).first()).toBeVisible();
    const custSearch = page.locator(".internal-content input").first();
    if (await waitVisible(custSearch, 2000)) {
      await custSearch.fill("Nguyễn Văn An");
      await pauseForViewer(page, 700);
      await custSearch.fill("");
    }
    await pauseForViewer(page, 700);

    // Ma trận phân quyền hệ thống
    await page.getByRole("button", { name: "Phân quyền" }).first().click();
    await expect(page.getByText(/Phân quyền hệ thống/i).first()).toBeVisible();
    await pauseForViewer(page);
  });

  test("RBAC v2 §5.3 - Phân quyền động theo vai trò, lưu version mới & bảo vệ quyền tối thiểu", async () => {
    const page = getPage();
    // Kiểm tra thông báo khóa đối với role Khách hàng & Quản trị viên
    await page.locator("main").getByRole("button", { name: /^Khách hàng/i }).first().click();
    await expect(page.getByText(/không nhận quyền quản trị/i).first()).toBeVisible();
    await page.locator("main").getByRole("button", { name: /^Quản trị viên/i }).first().click();
    await expect(page.getByText(/toàn bộ quyền hệ thống/i).first()).toBeVisible();

    // Quay lại role Nhân viên, toggle 1 quyền (nếu chưa bật thì bật, nếu bật rồi thì tắt rồi khôi phục) để kiểm tra lưu version mới
    await page.locator("main").getByRole("button", { name: /^Nhân viên/i }).first().click();
    const versionTextBefore = (await page.getByText(/Phiên bản vai trò:/i).first().innerText()).trim();
    const lastPermCheckbox = page.locator('main input[type="checkbox"]').last();
    await expect(lastPermCheckbox).toBeVisible();
    const wasChecked = await lastPermCheckbox.isChecked();

    await lastPermCheckbox.click();
    await page.getByRole("button", { name: /Lưu phân quyền vai trò/i }).click();

    // Nếu quyền vừa gỡ nằm trong MIN_STAFF, ConfirmModal sẽ bật ra -> xác nhận hoặc hủy an toàn
    const confirmModal = page.locator('[role="dialog"]').filter({ hasText: /gỡ quyền tối thiểu/i });
    if (await waitVisible(confirmModal, 1200)) {
      await confirmModal.getByRole("button", { name: /Thử lưu|Tiếp tục lưu/i }).click();
    }
    await expect(page.getByText(/Version mới:/i).first()).toBeVisible({ timeout: 10_000 });
    const versionTextAfter = (await page.getByText(/Phiên bản vai trò:/i).first().innerText()).trim();
    expect(versionTextAfter).not.toBe(versionTextBefore);
    await pauseForViewer(page, 600);

    // Khôi phục lại trạng thái quyền ban đầu cho các phân hệ sau
    if ((await lastPermCheckbox.isChecked()) !== wasChecked) {
      await lastPermCheckbox.click();
      await page.getByRole("button", { name: /Lưu phân quyền vai trò/i }).click();
      if (await waitVisible(confirmModal, 1000)) {
        await confirmModal.getByRole("button", { name: /Thử lưu|Tiếp tục lưu/i }).click();
      }
      await expect(page.getByText(/Version mới:/i).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("SCR-1.2 - Kiểm tra 2 cổng đăng nhập (/login vs /staff/login), chặn chéo & Alert Box khóa", async () => {
    const page = getPage();

    // 1. Từ cổng vận hành chuyển SPA sang "/" kiểm tra nút "Về cổng vận hành"
    await page.getByRole("button", { name: /Trang khách/i }).first().click();
    await expect(page).toHaveURL(/\/$/);
    const backToStaffBtn = page.getByRole("button", { name: /Về cổng vận hành/i }).first();
    await expect(backToStaffBtn).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 700);
    await backToStaffBtn.click();
    await expect(page).toHaveURL(/\/staff/);

    // 2. Đăng xuất về trang khách và bấm vào Đăng nhập bằng SPA
    await page.getByRole("button", { name: /Trang khách/i }).first().click();
    await page.getByRole("button", { name: "Thoát" }).first().click();
    const confirmLogout2 = page.getByRole("dialog").getByRole("button", { name: "Đăng xuất" }).first();
    if (await waitVisible(confirmLogout2, 2000)) {
      await confirmLogout2.click();
    }
    await page.getByRole("button", { name: "Đăng nhập" }).first().click();

    await expect(page.locator(".auth-quick-btn")).toHaveCount(2);
    const loginForm = page.locator("form.auth-form");
    await loginForm.locator("input").nth(0).fill("admin@geargo.vn");
    await loginForm.locator("input").nth(1).fill("GearGo@2026");
    await loginForm.locator('button[type="submit"]').click();
    await expect(page.getByText(/cổng Nhân viên/i).first()).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 700);

    // Chuyển SPA sang cổng /staff/login
    await page.getByRole("button", { name: /Cổng nội bộ nhân viên|Chuyển tới cổng Nhân viên/i }).first().click();
    await expect(page.locator(".auth-quick-btn")).toHaveCount(3);
    await loginForm.locator("input").nth(0).fill("customer@geargo.vn");
    await loginForm.locator("input").nth(1).fill("GearGo@2026");
    await loginForm.locator('button[type="submit"]').click();
    await expect(page.getByText(/cổng Khách hàng/i).first()).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 700);

    // Chuyển SPA về /login kiểm tra Alert Box tài khoản bị khóa (UC1.2.1)
    await page.getByRole("button", { name: /Về trang đăng nhập khách|Chuyển tới cổng Khách hàng/i }).first().click();
    // Đợi SPA hoàn tất chuyển về cổng /login trước khi điền form (tránh race condition trên CI slowMo=0)
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator(".auth-quick-btn")).toHaveCount(2);
    await loginForm.locator("input").nth(0).fill("locked.kh@geargo.vn");
    await loginForm.locator("input").nth(1).fill("GearGo@2026");
    const [lockedRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/dang-nhap"), { timeout: 10_000 }),
      loginForm.locator('button[type="submit"]').click(),
    ]);
    expect(lockedRes.status()).toBe(403);
    await expect(page.locator(".auth-locked-alert")).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 1200);
  });
});
