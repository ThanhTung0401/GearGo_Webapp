import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH9: Đánh giá sản phẩm & Thông báo (UC9.1 - UC9.4.1)", () => {
  const getPage = useSubsystemPage("phan_he_09_danh_gia_thong_bao");

  test("UC9.3 - Khách hàng mở chuông Thông báo trên giao diện", async () => {
    const page = getPage();
    await loginUi(page, "customer");
    await page.getByRole("button", { name: "Thông báo" }).first().click();
    await pauseForViewer(page);
  });

  test("UC9.1 - UC9.4.1 - Admin kiểm duyệt Đánh giá & quản lý Thông báo HT", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Đánh giá" }).first().click();
    await expect(page.getByText(/Đánh giá/i).first()).toBeVisible();
    await pauseForViewer(page);

    await page.getByRole("button", { name: "Thông báo HT" }).first().click();
    await expect(page.getByText(/Thông báo/i).first()).toBeVisible();
    await pauseForViewer(page);
  });
});
