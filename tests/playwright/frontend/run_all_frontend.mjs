/**
 * Runner tổng cho toàn bộ 10 phân hệ Frontend E2E Playwright.
 * Gọi: node tests/playwright/frontend/run_all_frontend.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const playwrightRoot = path.resolve(import.meta.dirname, "..");
const res = spawnSync("npx", ["playwright", "test", "--project=frontend"], {
  cwd: playwrightRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(res.status ?? 1);
