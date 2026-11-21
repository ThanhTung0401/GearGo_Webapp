import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH5: Thanh toán, Phụ phí, Đối soát cọc & Bù trừ tài chính (UC5.1 - UC5.7)", () => {
  const getPage = useSubsystemPage("phan_he_05_phu_phi_doi_soat_hoan_tien");

  test("UC5.3 - Trung tâm xử lý tranh chấp & Duyệt phụ phí trên Tổng quan hệ thống", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Tổng quan hệ thống" }).first().click();
    await expect(page.getByText(/Trung tâm xử lý tranh chấp & Duyệt phụ phí/i)).toBeVisible();
    await pauseForViewer(page, 800);

    // Mở modal xử lý/duyệt phụ phí nếu có khoản đang chờ duyệt hoặc tranh chấp
    const resolveBtn = page.locator(".internal-content").getByRole("button", { name: /Xử lý|Duyệt|Xem chi tiết/i }).first();
    if (await waitVisible(resolveBtn, 2500)) {
      await resolveBtn.click();
      await pauseForViewer(page, 800);
      await page.keyboard.press("Escape");
    }
  });

  test("UC5.4, UC5.5, UC5.6 - Mở Bảng Đối soát cọc chi tiết, Thu bổ sung & Hoàn tiền", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Đơn thuê" }).first().click();
    await pauseForViewer(page, 700);

    const reconcileBtn = page.getByRole("button", { name: "Đối soát", exact: true }).first();
    if (await waitVisible(reconcileBtn, 3000)) {
      await reconcileBtn.click();
      await expect(page.getByText(/Đối Soát Cọc/i).first()).toBeVisible({ timeout: 10_000 });
      await pauseForViewer(page, 900);

      // Cuộn xem chi tiết cọc, phụ phí duyệt & giao dịch thu/hoàn
      const modal = page.locator('[role="dialog"]').first();
      if (await waitVisible(modal, 2000)) {
        const closeBtn = modal.getByRole("button", { name: /✕|Đóng/i }).first();
        if (await waitVisible(closeBtn, 1500)) {
          await closeBtn.click();
        } else {
          await page.keyboard.press("Escape");
        }
      }
    }
    await pauseForViewer(page, 700);
  });

  test("UC5.7 - Tab Bù trừ tài chính: Thanh toán chờ xử lý & Điều chỉnh tài chính sau chốt", async () => {
    const page = getPage();
    await page.getByRole("button", { name: "Bù trừ tài chính" }).first().click();
    await expect(page.getByText(/Bù trừ|Điều chỉnh tài chính/i).first()).toBeVisible();
    await pauseForViewer(page, 900);

    // Mở modal lập điều chỉnh sau chốt (nếu có nút Lập điều chỉnh / Điều chỉnh)
    const adjBtn = page.locator(".internal-content").getByRole("button", { name: /Lập điều chỉnh|Tạo điều chỉnh|\+ Điều chỉnh/i }).first();
    if (await waitVisible(adjBtn, 2500)) {
      await adjBtn.click();
      await pauseForViewer(page, 800);
      await page.keyboard.press("Escape");
    }
    await pauseForViewer(page, 900);
  });
});
