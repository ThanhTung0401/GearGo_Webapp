import { defineConfig } from "@playwright/test";

/**
 * Cấu hình Playwright dùng chung cho cả 10 phân hệ Backend API và Frontend E2E.
 * - Chạy toàn bộ: npx playwright test
 * - Chỉ chạy Backend: npx playwright test --project=backend
 * - Chỉ chạy Frontend: npx playwright test --project=frontend
 * - Chạy riêng 1 phân hệ: npx playwright test backend/phan_he_01_tai_khoan_nhan_vien
 */
export default defineConfig({
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  // Chạy tuần tự 1 worker để đảm bảo dữ liệu SQL Server nhất quán giữa các bước tạo/sửa/xóa
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  projects: [
    {
      name: "backend",
      testDir: "./backend",
      use: {
        baseURL: process.env.API_URL || "http://localhost:5000",
        extraHTTPHeaders: {
          "Content-Type": "application/json",
        },
      },
    },
    {
      name: "frontend",
      testDir: "./frontend",
      use: {
        baseURL: process.env.APP_URL || "http://localhost:8443",
        viewport: { width: 1440, height: 900 },
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
      },
    },
  ],
});
