/**
 * Runner TỔNG ĐÀI cho toàn bộ Playwright GearGo (10 phân hệ Backend API + 10 phân hệ Frontend E2E).
 * Cách chạy:
 *   node tests/playwright/run_all_playwright.mjs
 *   (hoặc cd tests/playwright && npm test)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const playwrightRoot = path.resolve(import.meta.dirname);

function runProject(name, project) {
  console.log(`\n=== CHẠY PLAYWRIGHT: ${name} ===`);
  const res = spawnSync("npx", ["playwright", "test", `--project=${project}`], {
    cwd: playwrightRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    console.error(`\n[FAIL] ${name} thất bại (exit code ${res.status ?? 1}).`);
    process.exit(res.status ?? 1);
  }
  console.log(`[PASS] ${name}`);
}

runProject("10 Phân hệ Backend API", "backend");
runProject("10 Phân hệ Frontend E2E", "frontend");

console.log("\n=== HOÀN TẤT TOÀN BỘ 10 PHÂN HỆ PLAYWRIGHT (BACKEND + FRONTEND) ===");
