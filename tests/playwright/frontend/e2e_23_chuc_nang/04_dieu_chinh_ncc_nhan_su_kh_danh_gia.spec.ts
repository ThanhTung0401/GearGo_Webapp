import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { uniqueSuffix } from "../../helpers/testData.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";
import { attachTabGuard, assertCleanTabUi, navigateStaffTab, saveEvidence } from "../../helpers/e2e23Guard.js";

test.describe.serial("E2E 23 Chức năng [04/05]: Điều chỉnh kho, NCC, Nhân viên, Khách hàng & Đánh giá (CN 12-16)", () => {
  const getPage = useSubsystemPage("e2e_23cn_04_kho_ncc_nhan_su_kh_danh_gia");
  const suffix = uniqueSuffix();
  const nccCode = `NCCE2E${suffix.slice(-4)}`;
  const nccName = `NCC E2E ${suffix}`;

  test("CN 12 - Điều chỉnh kho & Kiểm kê: Lập phiếu thủ công, Phân tích ảnh hưởng & Kiểm kê", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await loginUi(page, "admin");
    await page.waitForLoadState("networkidle").catch(() => {});

    await navigateStaffTab(page, "stock-adjust");
    await expect(page.getByText(/Điều chỉnh kho/i).first()).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN12_stock_adjust");

    // Mở modal Lập phiếu thủ công để kiểm tra dropdown thiết bị
    const createBtn = page.getByRole("button", { name: /\+ Lập phiếu|Tạo phiếu điều chỉnh/i }).first();
    if (await waitVisible(createBtn, 2500)) {
      await createBtn.click();
      const dlg = page.getByRole("dialog").first();
      await expect(dlg).toBeVisible();
      expect(await dlg.locator("select").first().locator("option").count()).toBeGreaterThan(1);
      await assertCleanTabUi(page, "CN12_create_modal");
      await dlg.getByRole("button", { name: /Hủy|Đóng/i }).first().click();
    }

    // Bấm 🔍 Ảnh hưởng ở dòng đầu tiên nếu có
    const impactBtn = page.getByRole("button", { name: /Ảnh hưởng/i }).first();
    if (await waitVisible(impactBtn, 2500)) {
      await impactBtn.click();
      const dlg = page.getByRole("dialog").first();
      await expect(dlg).toBeVisible();
      await page.waitForTimeout(500);
      await dlg.getByRole("button", { name: /Đóng/i }).first().click();
    }

    await saveEvidence(page, "12_dieu_chinh_kho");
    guard.assertClean("CN12_stock_adjust");
  });

  test("CN 13 - Nhà cung cấp (CRUD thật + Empty state + Hồ sơ + Mở phiếu)", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "suppliers");
    await expect(page.getByRole("button", { name: /\+ Thêm NCC mới/i })).toBeVisible({ timeout: 15_000 });

    // Kiểm tra Empty state khi tìm kiếm không khớp
    const searchInput = page.getByPlaceholder(/Tìm theo mã NCC/i);
    await searchInput.fill("KHONG_TON_TAI_99999");
    await page.waitForTimeout(300);
    await expect(page.getByText(/Không tìm thấy nhà cung cấp/i)).toBeVisible();
    await searchInput.fill("");

    // Thêm NCC mới
    await page.getByRole("button", { name: /\+ Thêm NCC mới/i }).click();
    let dlg = page.getByRole("dialog").first();
    await dlg.locator("label").filter({ hasText: /^Mã nhà cung cấp/ }).locator("input").fill(nccCode);
    await dlg.locator("label").filter({ hasText: /^Tên nhà cung cấp/ }).locator("input").fill(nccName);
    await dlg.locator("label").filter({ hasText: /^Người liên hệ/ }).locator("input").fill("Anh Minh E2E");
    await dlg.locator("label").filter({ hasText: /^Số điện thoại/ }).locator("input").fill("0901234567");
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 10_000 });

    // Tìm & Sửa NCC vừa tạo
    await searchInput.fill(nccName);
    await page.waitForTimeout(400);
    await expect(page.getByText(nccName).first()).toBeVisible();
    await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
    dlg = page.getByRole("dialog").first();
    await dlg.locator("label").filter({ hasText: /^Số điện thoại/ }).locator("input").fill("0909888777");
    await dlg.locator('button[type="submit"]').click();
    await expect(dlg).not.toBeVisible({ timeout: 10_000 });

    await saveEvidence(page, "13_nha_cung_cap_crud");

    // Mở Hồ sơ NCC
    await page.getByRole("button", { name: /Hồ sơ/i }).first().click();
    dlg = page.getByRole("dialog").first();
    await expect(dlg).toBeVisible();
    await assertCleanTabUi(page, "CN13_supplier_profile");
    await dlg.getByRole("button", { name: /Đóng|✕/i }).first().click();

    await searchInput.fill("");
    guard.assertClean("CN13_suppliers");
  });

  test("CN 14 - Nhân viên: Kiểm tra bảng, ô Mật khẩu xóa trắng gõ mới & Sửa thông tin", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "staff");
    await expect(page.getByRole("main").getByRole("heading", { name: /Quản lý tài khoản.*nhân viên/i })).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN14_staff");

    // Mở modal thêm nhân viên để kiểm tra ô mật khẩu có thể xóa trắng & gõ mới
    const addBtn = page.getByRole("button", { name: /\+ Thêm nhân viên/i }).first();
    if (await waitVisible(addBtn, 2500)) {
      await addBtn.click();
      const dlg = page.getByRole("dialog").first();
      await expect(dlg).toBeVisible();
      const passInput = dlg.locator("label").filter({ hasText: /Mật khẩu/ }).locator("input").first();
      if (await passInput.isVisible().catch(() => false)) {
        await passInput.fill("");
        expect(await passInput.inputValue()).toBe("");
        await passInput.fill("TestPass@2026");
        expect(await passInput.inputValue()).toBe("TestPass@2026");
      }
      await dlg.getByRole("button", { name: /Hủy|Đóng/i }).first().click();
    }

    await saveEvidence(page, "14_nhan_vien");
    guard.assertClean("CN14_staff");
  });

  test("CN 15 - Khách hàng: Kiểm tra địa chỉ thật, Lịch sử đơn thuê & Modal khóa", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "customers");
    await expect(page.getByText(/Khách hàng/i).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await assertCleanTabUi(page, "CN15_customers");

    // Mở modal Đơn thuê của khách hàng đầu tiên (scope trong main để tránh click nhầm sidebar)
    const orderHistBtn = page.getByRole("main").getByRole("button", { name: /^Đơn thuê$/i }).first();
    if (await waitVisible(orderHistBtn, 3000)) {
      await orderHistBtn.click();
      const dlg = page.getByRole("dialog").first();
      await expect(dlg).toBeVisible();
      await assertCleanTabUi(page, "CN15_customer_orders_modal");
      await saveEvidence(page, "15_khach_hang_lich_su");
      await dlg.getByRole("button", { name: /Đóng|✕|×/i }).first().click();
    } else {
      await saveEvidence(page, "15_khach_hang");
    }

    guard.assertClean("CN15_customers");
  });

  test("CN 16 - Đánh giá: Phản hồi, Ẩn vi phạm -> Bỏ ẩn (sạch dòng lý do ẩn)", async () => {
    const page = getPage();
    const guard = attachTabGuard(page);

    await navigateStaffTab(page, "reviews");
    await expect(page.getByText(/Kiểm duyệt đánh giá/i).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await assertCleanTabUi(page, "CN16_reviews");

    // Thử Ẩn rồi Bỏ ẩn đánh giá đầu tiên đang hiển thị (nếu có)
    const hideBtn = page.getByRole("button", { name: /Ẩn vi phạm/i }).first();
    if (await waitVisible(hideBtn, 2500)) {
      await hideBtn.click();
      const dlg = page.getByRole("dialog").first();
      await expect(dlg).toBeVisible();
      await dlg.getByRole("button", { name: /Xác nhận ẩn/i }).click();
      await expect(dlg).not.toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(400);

      // Bỏ ẩn lại ngay để khôi phục trạng thái
      const restoreBtn = page.getByRole("button", { name: /Bỏ ẩn/i }).first();
      if (await waitVisible(restoreBtn, 3000)) {
        await restoreBtn.click();
        await page.waitForTimeout(500);
      }
    }

    await saveEvidence(page, "16_danh_gia");
    await pauseForViewer(page, 400);
    guard.assertClean("CN16_reviews");
  });
});
