import { test, expect } from "@playwright/test";
import { loginUi } from "../../helpers/auth.js";
import { useSubsystemPage, pauseForViewer, waitVisible } from "../../helpers/subsystemVideo.js";
import { attachTabGuard, assertCleanTabUi, navigateStaffTab, saveEvidence } from "../../helpers/e2e23Guard.js";
import { seedPaidOrderApi } from "../../helpers/orderSeed.js";

test.describe.serial("CN 01 - Tổng quan ca: KPI, Cảnh báo quá hạn & Điều hướng chéo màn hình", () => {
  const getPage = useSubsystemPage("e2e_cn01_tong_quan_ca");

  test("Thao tác thật trên Tổng quan ca & Đối chiếu chéo sang Chuẩn bị, Đơn thuê, Kho", async ({ request }) => {
    const page = getPage();
    const guard = attachTabGuard(page);

    // Seed 1 đơn thật ở trạng thái "Đã xác nhận" để xuất hiện trong "Cần chuẩn bị" & "Đơn cần chuẩn bị hôm nay"
    const seeded = await seedPaidOrderApi(request);

    await loginUi(page, "admin");
    await page.waitForLoadState("networkidle").catch(() => {});

    await navigateStaffTab(page, "overview");
    await expect(page.getByText(/Tổng quan ca làm việc/i)).toBeVisible({ timeout: 15_000 });
    await assertCleanTabUi(page, "CN01_overview");

    // 1. Kiểm tra đủ 7 thẻ KPI trên lưới tổng quan ca
    const kpiLabels = [
      "Cần chuẩn bị",
      "Sẵn sàng giao",
      "Đang thuê",
      "Trả một phần",
      "Quá hạn hẹn trả",
      "Chờ đối soát",
      "Cần bảo trì",
    ];
    for (const label of kpiLabels) {
      await expect(page.locator(".staff-kpi-card").filter({ hasText: label }).first()).toBeVisible();
    }
    // Chờ auto-retry tới khi API đơn hàng tải xong và KPI Cần chuẩn bị >= 1
    const prepKpiCard = page.locator(".staff-kpi-card").filter({ hasText: "Cần chuẩn bị" }).first();
    await expect(prepKpiCard, "KPI Cần chuẩn bị phải hiển thị giá trị >= 1").toContainText(/[1-9]\d*/, { timeout: 15_000 });

    // 2. Đối chiếu chéo 1: Đơn vừa tạo phải hiển thị trong mục "Đơn cần chuẩn bị & nhận trả hôm nay" (có phân trang)
    let seededRow = page.locator("main .so-overview-order-row").filter({ hasText: seeded.displayCode }).first();
    if (!(await waitVisible(seededRow, 2000))) {
      for (let p = 2; p <= 8; p++) {
        const pBtn = page.locator("main").getByRole("button", { name: String(p), exact: true }).first();
        if (!(await waitVisible(pBtn, 800))) break;
        await pBtn.click();
        await page.waitForTimeout(250);
        seededRow = page.locator("main .so-overview-order-row").filter({ hasText: seeded.displayCode }).first();
        if (await waitVisible(seededRow, 1000)) break;
      }
    }
    await expect(seededRow, `Đơn ${seeded.displayCode} phải xuất hiện trên Tổng quan ca`).toBeVisible({ timeout: 10_000 });
    await expect(seededRow).toContainText("Đã xác nhận");
    await saveEvidence(page, "cn01_tong_quan_ca_7_kpi");
    await pauseForViewer(page, 600);

    // 3. Thao tác thật + Đối chiếu chéo 2: Bấm trực tiếp dòng đơn -> chuyển sang Chuẩn bị & Bàn giao và chọn sẵn đơn đó
    await seededRow.click();
    await expect(page.getByText(/Chuẩn bị kho|Tiếp khách & Bàn giao/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("main").getByText(seeded.displayCode).first()).toBeVisible({ timeout: 10_000 });
    await assertCleanTabUi(page, "CN01_cross_to_handover");
    await saveEvidence(page, "cn01_cross_sang_chuan_bi");
    await pauseForViewer(page, 500);

    // 4. Quay lại Tổng quan ca: nếu có banner quá hạn -> bấm "Nhận trả / Xử lý trễ →"
    await navigateStaffTab(page, "overview");
    await expect(page.getByText(/Tổng quan ca làm việc/i)).toBeVisible({ timeout: 10_000 });
    const overdueAction = page.getByRole("button", { name: /Nhận trả \/ Xử lý trễ/i }).first();
    if (await waitVisible(overdueAction, 2000)) {
      await overdueAction.click();
      await expect(page.getByText(/Đơn nhận trả & đối soát/i)).toBeVisible({ timeout: 10_000 });
      await assertCleanTabUi(page, "CN01_cross_to_return_overdue");
      await navigateStaffTab(page, "overview");
      await expect(page.getByText(/Tổng quan ca làm việc/i)).toBeVisible({ timeout: 10_000 });
    }

    // 5. Click thẻ KPI "Đang thuê" -> sang Đơn thuê; quay lại click "Cần bảo trì" -> sang Kho & Bảo trì
    await page.locator(".staff-kpi-card").filter({ hasText: "Đang thuê" }).first().click();
    await expect(page.getByPlaceholder(/Tìm mã đơn, tên khách, SĐT/i)).toBeVisible({ timeout: 10_000 });
    await assertCleanTabUi(page, "CN01_kpi_to_orders");

    await navigateStaffTab(page, "overview");
    await page.locator(".staff-kpi-card").filter({ hasText: "Cần bảo trì" }).first().click();
    await expect(page.getByRole("button", { name: /Danh sách kho/i }).first()).toBeVisible({ timeout: 10_000 });
    await assertCleanTabUi(page, "CN01_kpi_to_warehouse");

    guard.assertClean("CN01_tong_quan_ca");
  });
});
