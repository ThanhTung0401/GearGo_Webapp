import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer } from "../../helpers/subsystemVideo.js";

test.describe.serial("Frontend PH8: Khuyến mãi & Chính sách thuê (UC8.1 - UC8.5)", () => {
  const getPage = useSubsystemPage("phan_he_08_khuyen_mai_chinh_sach");

  test("UC8.1 - UC8.5 - Admin tìm kiếm Khuyến mãi & xem Chính sách thuê", async () => {
    const page = getPage();
    await loginUi(page, "admin");

    await page.getByRole("button", { name: "Khuyến mãi" }).first().click();
    await expect(page.getByPlaceholder(/Tìm kiếm theo mã code/i)).toBeVisible();
    await page.getByPlaceholder(/Tìm kiếm theo mã code/i).fill("GEAR");
    await pauseForViewer(page);
    await page.getByPlaceholder(/Tìm kiếm theo mã code/i).fill("");
    await pauseForViewer(page);

    await page.getByRole("button", { name: "Chính sách thuê" }).first().click();
    await expect(page.getByText(/Chính sách/i).first()).toBeVisible();
    await pauseForViewer(page);
  });
});
