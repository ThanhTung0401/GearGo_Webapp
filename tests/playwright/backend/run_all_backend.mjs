/**
 * Runner tổng cho toàn bộ 10 phân hệ Backend API Playwright.
 * Gọi: node tests/playwright/backend/run_all_backend.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const playwrightRoot = path.resolve(import.meta.dirname, "..");
const res = spawnSync("npx", ["playwright", "test", "--project=backend"], {
  cwd: playwrightRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(res.status ?? 1);
