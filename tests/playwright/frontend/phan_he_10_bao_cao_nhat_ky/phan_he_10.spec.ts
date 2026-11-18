import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH10: Báo cáo, Nhật ký & Kiểm tra Responsive Mobile (UC10.1 - UC10.4.2)", () => {
  const getPage = useSubsystemPage("phan_he_10_bao_cao_nhat_ky");

  test("UC10.1 - UC10.4.2 - Admin mở Báo cáo, Audit Log & Staff mở Báo cáo ca & Nhật ký", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Báo cáo" }).first().click();
    await expect(page.getByText(/Báo cáo/i).first()).toBeVisible();
    await pauseForViewer(page);

    await page.getByRole("button", { name: "Audit Log" }).first().click();
    await expect(page.getByText(/Nhật ký|Audit Log/i).first()).toBeVisible();
    await pauseForViewer(page);

    await loginUi(page, "staff");
    await page.getByRole("button", { name: "Báo cáo ca & Nhật ký" }).first().click();
    await expect(page.getByText(/Báo cáo|Nhật ký/i).first()).toBeVisible();
    await pauseForViewer(page);
  });

  test("Responsive Mobile 390x844 - Không tràn ngang trên Public & Admin", async () => {
    const page = getPage();
    // Chuyển về trang công khai qua thao tác SPA (Trang khách -> Thoát) để không chớp trắng
    await page.getByRole("button", { name: /Trang khách/i }).first().click();
    await page.getByRole("button", { name: "Thoát" }).first().click();
    await expect(page.getByRole("button", { name: "Đăng nhập" }).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await pauseForViewer(page);

    const publicOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(publicOverflow).toBeFalsy();

    // Đăng nhập Admin ở desktop rồi thu nhỏ về mobile 390x844 kiểm tra không tràn ngang
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginUi(page, "admin");
    await page.setViewportSize({ width: 390, height: 844 });
    await pauseForViewer(page);

    const adminOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(adminOverflow).toBeFalsy();
  });
});
