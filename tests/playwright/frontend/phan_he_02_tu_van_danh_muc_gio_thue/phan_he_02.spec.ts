import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { getFutureRentalDates } from "../../helpers/testData.js";
import { useSubsystemPage, pauseForViewer } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH2: Tìm kiếm, Chi tiết sản phẩm, Khả dụng & Tư vấn AI (UC2.1 - UC2.4.2)", () => {
  const getPage = useSubsystemPage("phan_he_02_tu_van_danh_muc_gio_thue");

  test("UC2.1, UC2.2, UC2.3 - Tìm kiếm theo từ khóa, chọn ngày kiểm tra khả dụng & xem chi tiết", async () => {
    const page = getPage();
    await page.goto("/");
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();
    await expect(page.getByRole("heading", { name: /Tìm đồ cho chuyến đi/i })).toBeVisible();
    await pauseForViewer(page);

    // Chọn khoảng ngày thuê tương lai hợp lệ (UC2.3)
    const { pickupDate, returnDate } = getFutureRentalDates(6, 2);
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(pickupDate);
    await dateInputs.nth(1).fill(returnDate);
    await expect(page.getByText(/sản phẩm phù hợp/i)).toBeVisible();
    await pauseForViewer(page);

    // Tìm kiếm sản phẩm theo từ khóa "Lều" rồi Xóa bộ lọc (UC2.1)
    const searchInput = page.getByPlaceholder("Tìm tên, thương hiệu...");
    await searchInput.fill("Lều");
    await pauseForViewer(page);
    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
    await pauseForViewer(page);

    // UC2.2: Mở chi tiết sản phẩm đầu tiên
    await page.locator("img").first().click();
    await expect(page.getByRole("button", { name: /Quay lại danh sách/i })).toBeVisible();
    await pauseForViewer(page);
    await page.getByRole("button", { name: /Quay lại danh sách/i }).click();
  });

  test("UC2.4, UC2.4.1, UC2.4.2 - Nhập thông tin chuyến đi & nhận gợi ý bộ dụng cụ AI", async () => {
    const page = getPage();
    await loginUi(page, "customer");
    await page.getByRole("button", { name: "Tư vấn AI" }).first().click();
    await expect(page.getByText(/Trợ lý AI tư vấn bộ đồ cắm trại/i)).toBeVisible();

    const destInput = page.getByPlaceholder(/Đà Lạt, Hồ Trị An/i);
    await destInput.fill("Đà Lạt");
    await pauseForViewer(page);

    await page.getByRole("button", { name: /Phân tích & Tạo gợi ý combo tối ưu/i }).click();
    await expect(page.getByText(/Đề xuất|Combo|Tổng chi phí|thiết bị/i).first()).toBeVisible({ timeout: 20_000 });
    await pauseForViewer(page, 1400);
  });
});
