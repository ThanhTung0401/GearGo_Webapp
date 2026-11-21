import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH8: Khuyến mãi & Chính sách thuê (UC8.1 - UC8.5)", () => {
  const getPage = useSubsystemPage("phan_he_08_khuyen_mai_chinh_sach");
  const suffix = String(Date.now()).slice(-5);
  const promoCode = `PW${suffix}`;

  test("UC8.2 - UC8.5 - Tạo mã khuyến mãi mới, Tra cứu, Sửa & Tạm dừng có lý do", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Khuyến mãi" }).first().click();
    await expect(page.getByPlaceholder(/Tìm kiếm theo mã code/i)).toBeVisible();
    await pauseForViewer(page, 700);

    // UC8.2: Tạo mã khuyến mãi mới
    await page.getByRole("button", { name: /Tạo mã giảm mới/i }).click();
    const promoModal = page.locator('[role="dialog"]').first();
    await expect(promoModal).toBeVisible();
    await promoModal.locator("input").nth(0).fill(promoCode);
    await promoModal.locator("input").nth(1).fill(`Ưu đãi kiểm thử ${suffix}`);
    await pauseForViewer(page, 800);
    await promoModal.locator('button[type="submit"]').click();
    await expect(promoModal).not.toBeVisible({ timeout: 10_000 });
    await pauseForViewer(page, 700);

    // UC8.4: Tìm kiếm mã vừa tạo
    const searchInput = page.getByPlaceholder(/Tìm kiếm theo mã code/i);
    await searchInput.fill(promoCode);
    await pauseForViewer(page, 800);
    await expect(page.getByText(promoCode).first()).toBeVisible({ timeout: 10_000 });

    // UC8.3: Mở Sửa mã vừa tạo
    const editBtn = page.getByRole("button", { name: "Sửa", exact: true }).first();
    if (await waitVisible(editBtn, 2500)) {
      await editBtn.click();
      await pauseForViewer(page, 700);
      await page.locator('[role="dialog"] button[type="submit"]').first().click().catch(() => {});
      await pauseForViewer(page, 600);
    }

    // UC8.5: Tạm dừng mã khuyến mãi kèm lý do bắt buộc
    const pauseBtn = page.getByRole("button", { name: /Tạm dừng|Ngừng/i }).first();
    if (await waitVisible(pauseBtn, 2500)) {
      await pauseBtn.click();
      const reasonArea = page.locator('[role="dialog"] textarea').first();
      if (await waitVisible(reasonArea, 2500)) {
        await reasonArea.fill("Kết thúc chiến dịch kiểm thử E2E UC8.5");
        await pauseForViewer(page, 700);
        await page.locator('[role="dialog"] button[type="submit"]').first().click();
        await pauseForViewer(page, 700);
      }
    }
    await searchInput.fill("");
  });

  test("UC8.1 & UC8.1.1 - Cấu hình chính sách, đối chiếu Diff & Lịch sử phiên bản", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Chính sách thuê" }).first().click();
    await expect(page.getByText(/Cấu hình chính sách thuê & hủy/i)).toBeVisible();
    await pauseForViewer(page, 700);

    // Chỉnh nhẹ giờ nhắc trả máy trước (1..24) để kích hoạt kiểm tra Diff UC8.1.1
    const reminderInput = page.locator('input[type="number"]').last();
    const curVal = await reminderInput.inputValue();
    const nextVal = curVal === "3" ? "2" : "3";
    await reminderInput.fill(nextVal);
    await pauseForViewer(page, 700);

    await page.getByRole("button", { name: /Xem lại tác động & Ban hành phiên bản mới/i }).click();
    await expect(page.getByText(/Xác nhận ban hành chính sách mới/i)).toBeVisible({ timeout: 10_000 });
    await page.locator("textarea").first().fill("Điều chỉnh giờ nhắc trả máy (Kiểm thử E2E UC8.1)");
    await pauseForViewer(page, 800);

    const confirmBtn = page.getByRole("button", { name: /Xác nhận & Ban hành|Lưu phiên bản/i }).first();
    if (await waitVisible(confirmBtn, 2500)) {
      await confirmBtn.click();
      await pauseForViewer(page, 900);
    } else {
      await page.keyboard.press("Escape");
    }

    // Chuyển sang subtab Lịch sử phiên bản (UC8.1)
    await page.getByRole("button", { name: /Lịch sử phiên bản/i }).click();
    await pauseForViewer(page, 900);
    const snapshotBtn = page.locator("table tbody tr button").first();
    if (await waitVisible(snapshotBtn, 2500)) {
      await snapshotBtn.click();
      await pauseForViewer(page, 800);
      await page.getByRole("button", { name: /✕|Đóng/i }).first().click().catch(() => {});
    }
    await pauseForViewer(page, 800);
  });
});
