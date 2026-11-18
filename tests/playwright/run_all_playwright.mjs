/**
 * Runner TỔNG ĐÀI cho toàn bộ Playwright GearGo (10 phân hệ Backend API + 10 phân hệ Frontend E2E).
 * Cách chạy:
 *   node tests/playwright/run_all_playwright.mjs
 *   (hoặc cd tests/playwright && npm test)
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const playwrightRoot = path.resolve(import.meta.dirname);
const videosAllDir = path.join(playwrightRoot, "videos", "all");
const videosFailedDir = path.join(playwrightRoot, "videos", "failed");

for (const dir of [videosAllDir, videosFailedDir]) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function runProject(name, project) {
  console.log(`\n=== CHẠY PLAYWRIGHT: ${name} ===`);
  const res = spawnSync("npx", ["playwright", "test", `--project=${project}`], {
    cwd: playwrightRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    console.error(`\n[FAIL] ${name} thất bại (exit code ${res.status ?? 1}).`);
    return false;
  }
  console.log(`[PASS] ${name}`);
  return true;
}

const backendOk = runProject("10 Phân hệ Backend API", "backend");
const frontendOk = runProject("10 Phân hệ Frontend E2E", "frontend");

const allCount = fs.existsSync(videosAllDir) ? fs.readdirSync(videosAllDir).length : 0;
const failCount = fs.existsSync(videosFailedDir) ? fs.readdirSync(videosFailedDir).filter((f) => f.endsWith(".webm")).length : 0;
console.log(`\n[VIDEO] Tổng hợp ${allCount} video phân hệ tại: ${videosAllDir}`);
console.log(`[VIDEO] Số phân hệ lỗi có video tại ${videosFailedDir}: ${failCount}`);

if (!backendOk || !frontendOk) {
  process.exit(1);
}

console.log("\n=== HOÀN TẤT TOÀN BỘ 10 PHÂN HỆ PLAYWRIGHT (BACKEND + FRONTEND) ===");
