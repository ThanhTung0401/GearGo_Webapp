import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { getFutureRentalDates } from "../../helpers/testData.js";
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
    // Thêm sản phẩm vào giỏ từ danh sách khi đã chọn lịch -> mở Giỏ thuê kiểm tra đồng bộ khả dụng (UC2.3)
    await page.getByRole("button", { name: /\+ Thuê ngay/i }).first().click();
    await pauseForViewer(page, 600);
    await page.getByRole("button", { name: /Giỏ thuê/i }).first().click();
    await expect(page.getByText(/Khả dụng \(Kho sẵn sàng:/i).first()).toBeVisible({ timeout: 10_000 });
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

  test("UC2.4, UC2.4.1, UC2.4.2 - Tư vấn bộ dụng cụ bằng AI & đưa bộ gợi ý vào giỏ thuê", async () => {
    const page = getPage();
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
    await pauseForViewer(page, 800);

    const replaceBtn = page.getByRole("button", { name: /Thay thế lịch giỏ bằng lịch combo/i }).first();
    if (await waitVisible(replaceBtn, 2500)) {
      await replaceBtn.click();
    }

    await expect(page.locator(".cp-ai-added-notice")).toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 800);

    await page.locator(".cp-ai-goto-cart-btn").click();
    await expect(page.getByText(/Tổng thanh toán ban đầu/i)).toBeVisible({ timeout: 25_000 });
    await pauseForViewer(page, 1200);
  });
});
