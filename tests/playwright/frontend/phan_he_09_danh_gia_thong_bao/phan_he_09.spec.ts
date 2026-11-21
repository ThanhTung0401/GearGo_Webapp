import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible, closeActiveDialog } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH9: Đánh giá sản phẩm & Thông báo (UC9.1 - UC9.4.1)", () => {
  const getPage = useSubsystemPage("phan_he_09_danh_gia_thong_bao");
  const suffix = String(Date.now()).slice(-5);

  test("UC9.3, UC9.3.1 & UC9.1 - Khách hàng xem Thông báo, đánh dấu đã đọc & xem Đánh giá", async () => {
    const page = getPage();
    await loginUi(page, "customer");

    // UC9.3: Mở chuông Thông báo & đọc thông báo
    await page.getByRole("button", { name: "Thông báo" }).first().click();
    await pauseForViewer(page, 900);
    const markAllBtn = page.getByRole("button", { name: /Đánh dấu tất cả đã đọc|Đã đọc/i }).first();
    if (await waitVisible(markAllBtn, 2000)) {
      await markAllBtn.click();
      await pauseForViewer(page, 600);
    }
    await page.keyboard.press("Escape");

    // UC9.1: Vào Tài khoản -> tab Đánh giá sản phẩm
    await page.getByRole("button", { name: "Tài khoản" }).first().click();
    await expect(page.getByRole("heading", { name: /Tài khoản cá nhân/i })).toBeVisible();
    await page.getByRole("button", { name: /Đánh giá sản phẩm/i }).first().click();
    await pauseForViewer(page, 900);
  });

  test("UC9.2 & UC9.2.1 - Admin lọc Đánh giá, xem căn cứ đơn & kiểm duyệt", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Đánh giá" }).first().click();
    await expect(page.getByText(/Kiểm duyệt đánh giá sản phẩm/i)).toBeVisible();
    await pauseForViewer(page, 800);

    // Mở xem căn cứ đơn thuê hợp lệ hoặc mở modal phản hồi
    const basisBtn = page.getByRole("button", { name: /Căn cứ đơn|Xem đơn/i }).first();
    if (await waitVisible(basisBtn, 2500)) {
      await basisBtn.click();
      await pauseForViewer(page, 800);
      await closeActiveDialog(page);
    }

    const replyBtn = page.getByRole("button", { name: /Phản hồi/i }).first();
    if (await waitVisible(replyBtn, 2500)) {
      await replyBtn.click();
      await pauseForViewer(page, 800);
      await closeActiveDialog(page);
    }
  });

  test("UC9.4 & UC9.4.1 - Admin soạn thảo, xem trước Live Preview & phát hành Thông báo HT", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Thông báo HT" }).first().click();
    await expect(page.getByText(/LIVE PREVIEW/i).first()).toBeVisible();
    await pauseForViewer(page, 700);

    await page.getByPlaceholder(/Cập nhật quy định trả lều/i).fill(`Thông báo bảo dưỡng định kỳ #${suffix}`);
    await page.getByPlaceholder(/Nhập nội dung thông báo gửi đến người dùng/i).fill(
      "GearGo xin thông báo lịch kiểm tra bảo dưỡng định kỳ các bộ lều gia đình tuần này."
    );
    await pauseForViewer(page, 900);

    await page.getByRole("button", { name: /Xác nhận & Phát hành thông báo/i }).click();
    await pauseForViewer(page, 1000);
  });
});
