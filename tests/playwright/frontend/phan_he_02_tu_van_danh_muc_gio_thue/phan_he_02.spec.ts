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

    // Chọn khoảng ngày thuê tương lai hợp lệ (UC2.3) & kiểm tra ràng buộc min / tự đẩy ngày trả
    const { pickupDate, returnDate } = getFutureRentalDates(6, 2);
    const dateInputs = page.locator('input[type="date"]');
    const pickupMin = await dateInputs.nth(0).getAttribute("min");
    expect(pickupMin).toBeTruthy();
    await dateInputs.nth(0).fill(pickupDate);
    await dateInputs.nth(1).fill(returnDate);
    const returnMin = await dateInputs.nth(1).getAttribute("min");
    expect(returnMin && returnMin > pickupDate).toBeTruthy();
    await expect(page.getByText(/sản phẩm phù hợp/i)).toBeVisible();
    await pauseForViewer(page);

    // Click lọc danh mục "Combo Gia Đình" -> các chip danh mục khác vẫn phải giữ nguyên không bị mất
    await page.getByRole("button", { name: "Combo Gia Đình" }).click();
    await expect(page.getByRole("button", { name: "Phụ kiện & Năng lượng" })).toBeVisible();
    await page.getByRole("button", { name: "Tất cả" }).click();

    // Kiểm tra đồng bộ tồn kho khi thêm sản phẩm vào giỏ lúc chưa đăng nhập -> vào /cart không bị báo Tồn kho: 0
    await page.getByRole("button", { name: /\+ Thuê ngay/i }).first().click();
    await page.getByRole("button", { name: /Giỏ thuê/i }).first().click();
    await expect(page.getByText(/Khả dụng \(Kho sẵn sàng:/i).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Thuê đồ" }).first().click();

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
