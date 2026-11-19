import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH5: Phụ phí, Đối soát cọc & Bù trừ tài chính (UC5.1 - UC5.7)", () => {
  const getPage = useSubsystemPage("phan_he_05_phu_phi_doi_soat_hoan_tien");

  test("UC5.3 & UC5.7 - Admin xem Trung tâm xử lý tranh chấp, đối soát & Tab Bù trừ tài chính", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    // UC5.3: Trung tâm xử lý tranh chấp & Duyệt phụ phí trên Tổng quan hệ thống
    await page.getByRole("button", { name: "Tổng quan hệ thống" }).first().click();
    await expect(page.getByText(/Trung tâm xử lý tranh chấp & Duyệt phụ phí/i)).toBeVisible();
    await pauseForViewer(page);

    // UC5.7: Tab Bù trừ tài chính
    await page.getByRole("button", { name: "Bù trừ tài chính" }).first().click();
    await expect(page.getByText(/Bù trừ|Điều chỉnh tài chính/i).first()).toBeVisible();
    await pauseForViewer(page);

    // UC5.4 - UC5.6: Kiểm tra nút Đối soát trên Đơn thuê
    await page.getByRole("button", { name: "Đơn thuê" }).first().click();
    const reconcileBtn = page.getByRole("button", { name: "Đối soát", exact: true }).first();
    if (await reconcileBtn.isVisible().catch(() => false)) {
      await reconcileBtn.click();
      await expect(page.getByText(/Đối Soát Cọc/i).first()).toBeVisible();
    }
    await pauseForViewer(page);
  });
});
