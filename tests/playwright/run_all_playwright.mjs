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
const blobReportDir = path.join(playwrightRoot, "blob-report");

for (const dir of [videosAllDir, videosFailedDir, blobReportDir]) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function runProject(name, project) {
  console.log(`\n=== CHẠY PLAYWRIGHT: ${name} ===`);
  const projectBlobDir = path.join(blobReportDir, project);
  fs.mkdirSync(projectBlobDir, { recursive: true });
  // Xuất blob vào thư mục con riêng để project sau không xóa mất file blob của project trước
  const res = spawnSync("npx", ["playwright", "test", `--project=${project}`, "--reporter=list,blob"], {
    cwd: playwrightRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      PLAYWRIGHT_BLOB_OUTPUT_DIR: projectBlobDir,
    },
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

// Gom toàn bộ .zip từ các thư mục con về blob-report/all trước khi merge vào playwright-report/index.html
const mergedBlobInput = path.join(blobReportDir, "all");
fs.mkdirSync(mergedBlobInput, { recursive: true });
for (const project of ["backend", "frontend"]) {
  const dir = path.join(blobReportDir, project);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".zip"))) {
    fs.copyFileSync(path.join(dir, file), path.join(mergedBlobInput, `${project}-${file}`));
  }
}

if (fs.readdirSync(mergedBlobInput).length > 0) {
  spawnSync("npx", ["playwright", "merge-reports", "--reporter=html", mergedBlobInput], {
    cwd: playwrightRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      PLAYWRIGHT_HTML_OUTPUT_DIR: path.join(playwrightRoot, "playwright-report"),
      PLAYWRIGHT_HTML_OPEN: "never",
    },
  });
}
if (fs.existsSync(blobReportDir)) {
  fs.rmSync(blobReportDir, { recursive: true, force: true });
}

const allCount = fs.existsSync(videosAllDir) ? fs.readdirSync(videosAllDir).length : 0;
const failCount = fs.existsSync(videosFailedDir) ? fs.readdirSync(videosFailedDir).filter((f) => f.endsWith(".webm")).length : 0;
console.log(`\n[VIDEO] Tổng hợp ${allCount} video phân hệ tại: ${videosAllDir}`);
console.log(`[VIDEO] Số phân hệ lỗi có video tại ${videosFailedDir}: ${failCount}`);

if (!backendOk || !frontendOk) {
  process.exit(1);
}

console.log("\n=== HOÀN TẤT TOÀN BỘ 10 PHÂN HỆ PLAYWRIGHT (BACKEND + FRONTEND) ===");
