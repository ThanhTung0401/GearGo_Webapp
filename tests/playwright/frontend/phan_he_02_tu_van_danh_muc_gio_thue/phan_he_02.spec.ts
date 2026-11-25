import { test, expect } from "@playwright/test";
import { authHeaders, loginUi } from "../../helpers/auth.js";
import { getFutureRentalDates, TEST_ACCOUNTS } from "../../helpers/testData.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH2: Tìm kiếm, Chi tiết sản phẩm, Khả dụng & Tư vấn AI (UC2.1 - UC2.4.2)", () => {
  const getPage = useSubsystemPage("phan_he_02_tu_van_danh_muc_gio_thue");

  test("UC2.1 - Khám phá, tìm kiếm, kiểm tra không có kết quả & lọc danh mục sản phẩm", async () => {
    const page = getPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await expect(page.getByRole("heading", { name: /Tìm đồ cho chuyến đi/i })).toBeVisible();
    await pauseForViewer(page, 700);

    // Chọn khoảng ngày thuê tương lai hợp lệ (UC2.3)
    const { pickupDate, returnDate } = getFutureRentalDates(12, 2);
    const dateInputs = page.locator('input[type="date"]');
    const pickupMin = await dateInputs.nth(0).getAttribute("min");
    expect(pickupMin).toBeTruthy();
    await dateInputs.nth(0).fill(pickupDate);
    await dateInputs.nth(1).fill(returnDate);
    await expect(page.getByText(/sản phẩm phù hợp/i)).toBeVisible();
    await pauseForViewer(page, 700);

    // Lọc danh mục "Combo Gia Đình" -> kiểm tra chip khác giữ nguyên -> về "Tất cả"
    await page.getByRole("button", { name: "Combo Gia Đình" }).click();
    await expect(page.getByRole("button", { name: "Phụ kiện & Năng lượng" })).toBeVisible();
    await pauseForViewer(page, 600);
    await page.getByRole("button", { name: "Tất cả" }).click();

    // Nhánh phụ 4.1 UC2.1: Tìm kiếm từ khóa không có kết quả -> Xóa bộ lọc -> Tìm "Lều"
    const searchInput = page.getByPlaceholder("Tìm tên, thương hiệu...");
    await searchInput.fill("SanPhamKhongTonTaiXYZ");
    await pauseForViewer(page, 700);
    await page.getByRole("button", { name: "Xóa bộ lọc" }).first().click();
    await searchInput.fill("Lều");
    await pauseForViewer(page, 700);
    await page.getByRole("button", { name: "Xóa bộ lọc" }).first().click();
    await pauseForViewer(page, 600);
  });

  test("UC2.2 & UC2.3 - Xem chi tiết sản phẩm, kiểm tra khả dụng theo lịch & thêm vào giỏ", async () => {
    const page = getPage();
    // Chờ availability API resolve để enable nút "+ Thuê ngay"
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    // Thêm sản phẩm vào giỏ: tìm nút Thuê ngay đầu tiên còn enable
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
      test.skip(true, "Không có sản phẩm nào còn hàng trong khoảng ngày chọn");
      return;
    }
    await pauseForViewer(page, 600);
    await page.getByRole("button", { name: /Giỏ thuê/i }).first().click();
    const cartHint = page.getByText(/Khả dụng|Kho sẵn sàng|Số lượng|Giỏ thuê của bạn/i).first();
    await expect(cartHint).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 800);

    // Quay lại danh sách & mở trang chi tiết sản phẩm (UC2.2)
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await page.locator("img").first().click();
    await expect(page.getByRole("button", { name: /Quay lại danh sách/i })).toBeVisible();
    await pauseForViewer(page, 800);

    // Cuộn xem đánh giá & thông số sản phẩm trên trang chi tiết
    await page.evaluate(() => window.scrollBy(0, 420));
    await pauseForViewer(page, 700);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("button", { name: /Quay lại danh sách/i }).click();
    await pauseForViewer(page, 600);
  });

  test("UC2.4, UC2.4.1, UC2.4.2 - Tư vấn bộ dụng cụ bằng AI & đưa bộ gợi ý vào giỏ thuê", async ({ request }) => {
    const page = getPage();
    // Dọn giỏ thuê cũ của tài khoản customer (nếu có từ lượt chạy trước) để tránh cộng dồn vượt tồn kho khi thêm combo AI
    const apiBase = process.env.API_URL || "http://localhost:5000";
    const loginRes = await request.post(`${apiBase}/api/auth/dang-nhap`, {
      data: { taiKhoan: TEST_ACCOUNTS.customer.email, matKhau: TEST_ACCOUNTS.customer.password },
    });
    if (loginRes.ok()) {
      const loginBody = (await loginRes.json()) as { token?: string; duLieu?: { token?: string } };
      const token = loginBody.token ?? loginBody.duLieu?.token ?? "";
      if (token) {
        const cartRes = await request.get(`${apiBase}/api/gio-thue`, { headers: authHeaders(token) });
        if (cartRes.ok()) {
          const cartBody = (await cartRes.json()) as {
            chiTiet?: Array<{ maChiTietGio: number }>;
            duLieu?: { chiTiet?: Array<{ maChiTietGio: number }> };
          };
          const lines = cartBody.duLieu?.chiTiet ?? cartBody.chiTiet ?? [];
          for (const line of lines) {
            await request.delete(`${apiBase}/api/gio-thue/${line.maChiTietGio}`, { headers: authHeaders(token) });
          }
        }
      }
    }

    await loginUi(page, "customer");
    await page.getByRole("button", { name: "Tư vấn AI" }).first().click();
    await expect(page.getByText(/Trợ lý AI tư vấn bộ đồ cắm trại/i)).toBeVisible();
    await pauseForViewer(page, 700);

    const destInput = page.getByPlaceholder(/Đà Lạt, Hồ Trị An/i);
    await destInput.fill("Đà Lạt - Săn mây 3 ngày 2 đêm");
    await pauseForViewer(page, 700);

    await page.getByRole("button", { name: /Phân tích & Tạo gợi ý combo tối ưu/i }).click();
    await expect(page.getByText(/Tổng chi phí ban đầu cần chuẩn bị/i)).toBeVisible({ timeout: 25_000 });
    await pauseForViewer(page, 900);

    // UC2.4.2: Đưa toàn bộ bộ gợi ý AI vào giỏ thuê (xử lý xung đột lịch nếu giỏ cũ khác ngày)
    const addAllBtn = page.locator(".cp-ai-add-all-btn").first();
    await expect(addAllBtn).toBeEnabled({ timeout: 5_000 });
    await addAllBtn.click();

    const replaceBtn = page.getByRole("button", { name: /Thay thế lịch giỏ bằng lịch combo/i }).first();
    const addedNotice = page.locator(".cp-ai-added-notice");
    // Chờ một trong hai xuất hiện ngay lập tức, tránh waitVisible(2500) + pauseForViewer làm banner 3.5s tự ẩn ở local
    await expect(replaceBtn.or(addedNotice)).toBeVisible({ timeout: 10_000 });
    if (await replaceBtn.isVisible()) {
      await pauseForViewer(page, 600);
      await replaceBtn.click();
    }

    await expect(addedNotice).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 800);

    await page.locator(".cp-ai-goto-cart-btn").click();
    await expect(page.getByText(/Tổng thanh toán ban đầu/i)).toBeVisible({ timeout: 25_000 });
    await pauseForViewer(page, 1200);
  });
});
