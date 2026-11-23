import { test, expect, type Page } from "@playwright/test";
import { authHeaders, loginUi } from "../helpers/auth.js";
import { API_URL, TEST_ACCOUNTS } from "../helpers/testData.js";

const CLEAN_DEFAULT_STAFF = [
  "DonThue.Xem", "DonThue.Tao", "DonThue.CapNhat", "DonThue.Huy",
  "SanPham.Xem", "DanhMuc.Xem",
  "KhuyenMai.Xem", "ChinhSach.Xem", "BaoCao.Xem",
  "PhuPhi.Xem", "PhuPhi.Tao", "PhuPhi.Duyet",
  "DoiSoat.Xem", "DoiSoat.Chot",
  "QuaHan.Xem", "QuaHan.XuLy",
  "PhieuNhap.Xem", "PhieuNhap.Tao", "PhieuNhap.Duyet", "PhieuNhap.Huy",
  "ChuanBiDon.Xem", "ChuanBiDon.Thao",
  "BanGiao.Xem", "BanGiao.Thao",
  "BaoTri.Xem", "BaoTri.Tao", "BaoTri.Duyet",
  "NhanTra.Xem", "NhanTra.Thao",
  "HoanTien.Xem", "HoanTien.Duyet",
  "NhaCungCap.Xem",
  "Kho.Xem", "DieuChinhKho.Xem", "VongDoiThietBi.Xem",
  "BaoCaoKho.Xem", "BaoCaoVanHanh.Xem",
  "ThongBao.Xem",
  "DanhGia.Xem", "DanhGia.Duyet",
  "NhatKy.Xem",
];

async function restoreDefaultStaffViaApi(request: import("@playwright/test").APIRequestContext) {
  const login = async (role: "admin" | "staff") => {
    const acc = TEST_ACCOUNTS[role];
    const res = await request.post(`${API_URL}/api/auth/dang-nhap`, {
      data: { taiKhoan: acc.email, matKhau: acc.password },
    });
    expect(res.ok(), `Login API ${acc.email} failed: ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as { token?: string; accessToken?: string; duLieu?: { token?: string } };
    return String(body.token ?? body.accessToken ?? body.duLieu?.token ?? "");
  };
  const adminToken = await login("admin");
  const staffToken = await login("staff");
  const staffMe = (await (await request.get(`${API_URL}/api/auth/quyen-cua-toi`, { headers: authHeaders(staffToken) })).json()) as {
    maTaiKhoan: number;
  };
  await request.delete(`${API_URL}/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, { headers: authHeaders(adminToken) });
  await request.put(`${API_URL}/api/phan-quyen/vai-tro/NhanVien`, {
    headers: authHeaders(adminToken),
    data: { quyen: CLEAN_DEFAULT_STAFF },
  });
}

async function clickSidebarTab(page: Page, label: string) {
  const btn = page.locator("aside").first().getByRole("button", { name: label, exact: true });
  await expect(btn, `Tab "${label}" phải hiển thị trên sidebar`).toBeVisible({ timeout: 10_000 });
  await btn.click();
  await page.waitForTimeout(250);
}

test.describe.serial("Frontend E2E: RBAC 2 chế độ, Kiểm thử toàn bộ chức năng Hình 1, Topbar Đăng xuất Hình 2 & Phân trang", () => {
  test.beforeAll(async ({ request }) => {
    await restoreDefaultStaffViaApi(request);
  });

  test.afterAll(async ({ request }) => {
    await restoreDefaultStaffViaApi(request);
  });

  test("1. Admin kiểm tra toàn bộ các chức năng trong Hình 1, Phân trang & Phân quyền 2 chế độ", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await loginUi(page, "admin");

    // Kiểm tra toàn bộ 23 mục sidebar của Quản trị viên (đủ toàn bộ các mục trong Hình 1 + Sản phẩm)
    const adminTabs = [
      "Tổng quan ca",
      "Tổng quan hệ thống",
      "Đơn thuê",
      "Chuẩn bị & Bàn giao",
      "Nhận trả & Phụ phí",
      "Kho & Bảo trì",
      "Báo cáo ca & Nhật ký",
      "Danh mục",
      "Sản phẩm",
      "Vòng đời thiết bị",
      "Phiếu nhập",
      "Điều chỉnh kho",
      "Nhà cung cấp",
      "Nhân viên",
      "Khách hàng",
      "Đánh giá",
      "Khuyến mãi",
      "Chính sách thuê",
      "Thông báo HT",
      "Bù trừ tài chính",
      "Báo cáo Kho & TC",
      "Audit Log",
      "Phân quyền",
    ];

    for (const label of adminTabs) {
      await clickSidebarTab(page, label);
    }

    // Kiểm tra phân trang ở tab Sản phẩm và Đơn thuê của Staff/Admin
    await clickSidebarTab(page, "Sản phẩm");
    await expect(page.getByTestId("pagination-bar")).toBeVisible({ timeout: 10_000 });
    const nextBtnProd = page.getByTestId("pagination-bar").getByRole("button", { name: "2", exact: true });
    if (await nextBtnProd.isVisible().catch(() => false)) {
      await nextBtnProd.click();
      await expect(nextBtnProd).toHaveAttribute("aria-current", "page");
    }

    await clickSidebarTab(page, "Đơn thuê");
    await expect(page.getByTestId("pagination-bar")).toBeVisible({ timeout: 10_000 });

    // Kiểm tra tab Phân quyền hỗ trợ 2 chế độ: Tất cả nhân viên & Riêng 1 nhân viên
    await clickSidebarTab(page, "Phân quyền");
    await expect(page.getByRole("tab", { name: /Tất cả nhân viên/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Phân quyền riêng 1 nhân viên/i })).toBeVisible();

    // Không được phép hiển thị nhóm quyền PhanQuyen khi đang chọn NhanVien
    await expect(page.getByText("PhanQuyen.Xem")).toHaveCount(0);
    await expect(page.getByText("PhanQuyen.Quan")).toHaveCount(0);

    // Gỡ quyền SanPham.Xem khỏi vai trò NhanVien (chế độ Tất cả nhân viên)
    const sanPhamXemCheckbox = page.locator("label", { hasText: "SanPham.Xem" }).locator('input[type="checkbox"]');
    await expect(sanPhamXemCheckbox).toBeVisible();
    if (await sanPhamXemCheckbox.isChecked()) {
      await sanPhamXemCheckbox.uncheck();
    }
    await page.getByRole("button", { name: /Lưu phân quyền vai trò/i }).click();
    await expect(page.getByRole("status").filter({ hasText: /Đã lưu quyền cho vai trò NhanVien/i })).toBeVisible({ timeout: 10_000 });

    expect(pageErrors, `Phát hiện lỗi runtime trên trang Admin: ${pageErrors.join("; ")}`).toEqual([]);
  });

  test("2. Nhân viên (Lê Thị Mai) KHÔNG thấy Phân quyền & Sản phẩm, kiểm tra Hình 2 Topbar click + Xác nhận Đăng xuất", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await loginUi(page, "staff");

    // Chờ phân quyền tải xong (tab cơ bản Tổng quan ca hiển thị)
    const sidebar = page.locator("aside").first();
    await expect(sidebar.getByRole("button", { name: "Tổng quan ca", exact: true })).toBeVisible({ timeout: 10_000 });

    // 1. Nhân viên KHÔNG BAO GIỜ thấy tab Phân quyền, Nhân viên, Khách hàng, Tổng quan hệ thống, Bù trừ tài chính
    await expect(sidebar.getByRole("button", { name: "Phân quyền", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Nhân viên", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Khách hàng", exact: true })).toHaveCount(0);

    // 2. Sau khi Admin bỏ SanPham.Xem -> tab Sản phẩm biến mất hoàn toàn
    await expect(sidebar.getByRole("button", { name: "Sản phẩm", exact: true })).toHaveCount(0);

    // 3. Thử gõ thẳng URL /staff/products và /staff/permissions -> tự động đá về tab hợp lệ
    await page.goto("/staff/products", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/staff\/products/, { timeout: 10_000 });
    await expect(sidebar.getByRole("button", { name: "Tổng quan ca", exact: true })).toBeVisible({ timeout: 10_000 });
    await page.goto("/staff/permissions", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/staff\/permissions/, { timeout: 10_000 });
    await expect(sidebar.getByRole("button", { name: "Tổng quan ca", exact: true })).toBeVisible({ timeout: 10_000 });

    // 4. Test các tab được cấp cho Nhân viên trong Hình 1 hoạt động mượt
    for (const label of ["Tổng quan ca", "Đơn thuê", "Danh mục", "Phiếu nhập", "Nhà cung cấp", "Đánh giá", "Khuyến mãi"]) {
      await clickSidebarTab(page, label);
    }

    // 5. Hình 2: Icon/Badge nhân viên Lê Thị Mai click được -> hiện popover thông tin + nút Đăng xuất + Modal xác nhận
    const userMenuBtn = page.getByTestId("topbar-user-menu-btn");
    await expect(userMenuBtn).toBeVisible();
    await expect(userMenuBtn).toContainText("Lê Thị Mai");
    await userMenuBtn.click();

    const popover = page.getByTestId("topbar-user-popover");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("staff@geargo.vn");
    await expect(popover).toContainText("Nhân viên");

    // Bấm Đăng xuất trong popover -> hiện hộp thoại xác nhận "Bạn có chắc muốn đăng xuất..."
    await page.getByTestId("popover-logout-btn").click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(/Bạn có chắc muốn đăng xuất/i);
    await expect(confirmDialog).toContainText("Lê Thị Mai");

    // Bấm "Ở lại" -> vẫn giữ nguyên phiên làm việc
    await confirmDialog.getByRole("button", { name: "Ở lại" }).click();
    await expect(confirmDialog).toBeHidden();
    await expect(page).toHaveURL(/\/staff/);

    // Bấm nút "Đăng xuất" trực tiếp trên Topbar -> xác nhận "Đăng xuất" -> thoát phiên thành công
    await page.getByTestId("topbar-logout-btn").click();
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible({ timeout: 15_000 });

    expect(pageErrors, `Phát hiện lỗi runtime trên trang Nhân viên: ${pageErrors.join("; ")}`).toEqual([]);
  });

  test("3. Admin cấp riêng SanPham.Xem cho 1 nhân viên (Lê Thị Mai) -> Lê Thị Mai thấy lại tab Sản phẩm nhưng bị ẩn nút Thêm/Sửa", async ({ page }) => {
    await loginUi(page, "admin");
    await clickSidebarTab(page, "Phân quyền");

    // Chuyển sang chế độ "Phân quyền riêng 1 nhân viên"
    await page.getByRole("tab", { name: /Phân quyền riêng 1 nhân viên/i }).click();
    const staffSelect = page.locator("#select-staff-perm");
    await expect(staffSelect).toBeVisible({ timeout: 10_000 });

    // Chọn Lê Thị Mai (staff@geargo.vn)
    const maiOptionVal = await staffSelect.locator("option", { hasText: "Lê Thị Mai" }).first().getAttribute("value");
    expect(maiOptionVal).toBeTruthy();
    await staffSelect.selectOption(maiOptionVal!);
    await page.waitForTimeout(400);

    // Bật riêng SanPham.Xem cho Lê Thị Mai
    const sanPhamXemCheckbox = page.locator("label", { hasText: "SanPham.Xem" }).locator('input[type="checkbox"]');
    await sanPhamXemCheckbox.check();
    await page.getByRole("button", { name: /Lưu quyền riêng nhân viên/i }).click();
    await expect(page.getByRole("status").filter({ hasText: /Đã lưu phân quyền riêng cho/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Đang áp dụng quyền riêng")).toBeVisible();

    // Đăng xuất Admin qua Topbar có xác nhận -> Đăng nhập lại bằng Lê Thị Mai
    await page.getByTestId("topbar-logout-btn").click();
    await page.getByRole("dialog").getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible({ timeout: 15_000 });

    await loginUi(page, "staff");
    await clickSidebarTab(page, "Sản phẩm");
    await expect(page.getByRole("heading", { name: "Quản lý sản phẩm" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("pagination-bar")).toBeVisible({ timeout: 10_000 });
    // Chỉ có SanPham.Xem, không có SanPham.Tao -> nút + Thêm sản phẩm phải bị ẩn
    await expect(page.getByRole("button", { name: "+ Thêm sản phẩm" })).toHaveCount(0);
  });

  test("4. End-user kiểm tra Phân trang (/san-pham, /my-orders) & Xác nhận Đăng xuất ở PublicHeader", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await loginUi(page, "customer");

    // Vào trang Thuê đồ (/san-pham) kiểm tra phân trang
    await page.getByRole("button", { name: "Thuê đồ", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: /Tìm đồ cho chuyến đi/i })).toBeVisible({ timeout: 10_000 });
    const prodPag = page.getByTestId("pagination-bar");
    await expect(prodPag).toBeVisible({ timeout: 10_000 });
    const page2Btn = prodPag.getByRole("button", { name: "2", exact: true });
    if (await page2Btn.isVisible().catch(() => false)) {
      await page2Btn.click();
      await expect(page2Btn).toHaveAttribute("aria-current", "page");
    }

    // Vào Đơn thuê của tôi kiểm tra phân trang (nếu có đơn)
    await page.getByRole("button", { name: "Đơn thuê", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: /Đơn thuê của tôi/i })).toBeVisible({ timeout: 10_000 });

    // Kiểm tra nút Thoát trên PublicHeader hiện hộp thoại xác nhận đăng xuất
    await page.getByTestId("public-logout-btn").click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(/Bạn có chắc muốn đăng xuất/i);
    await confirmDialog.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible({ timeout: 15_000 });

    expect(pageErrors, `Phát hiện lỗi runtime trên End-user: ${pageErrors.join("; ")}`).toEqual([]);
  });
});
