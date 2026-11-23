import { defineConfig } from "@playwright/test";

/**
 * Cấu hình Playwright dùng chung cho cả 10 phân hệ Backend API và Frontend E2E.
 * - Chạy toàn bộ: npx playwright test
 * - Chỉ chạy Backend: npx playwright test --project=backend
 * - Chỉ chạy Frontend: npx playwright test --project=frontend
 * - Chạy riêng 1 phân hệ: npx playwright test backend/phan_he_01_tai_khoan_nhan_vien
 */
export default defineConfig({
  globalSetup: "./helpers/globalSetup.ts",
  // Tự động khởi động Backend (5000) và Frontend (8443) nếu chưa mở; tái sử dụng nếu đã chạy sẵn
  webServer: [
    {
      command: "dotnet run --configuration Release --urls http://localhost:5000",
      cwd: "../../backend",
      port: 5000,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      cwd: "../../frontend",
      port: 8443,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  // Chạy tuần tự 1 worker để đảm bảo dữ liệu SQL Server nhất quán giữa các bước tạo/sửa/xóa
  fullyParallel: false,
  workers: 1,
  retries: 1,
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
        // Local mở trình duyệt có giao diện + slowMo 500ms để quan sát & quay video mượt; CI chạy headless
        headless: Boolean(process.env.CI),
        launchOptions: {
          slowMo: process.env.CI ? 0 : 500,
        },
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
      },
    },
  ],
});
