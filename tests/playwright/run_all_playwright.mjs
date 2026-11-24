/**
 * Runner TỔNG ĐÀI cho toàn bộ Playwright GearGo (10 phân hệ Backend API + 10 phân hệ Frontend E2E).
 * Cách chạy:
 *   node tests/playwright/run_all_playwright.mjs
 *   (hoặc cd tests/playwright && npm test)
 *
 * SHARD trong CI (chạy 1/5 .. 5/5 cho Frontend song song):
 *   SHARD_INDEX=1 SHARD_TOTAL=5 node tests/playwright/run_all_playwright.mjs
 *   SHARD_INDEX=2 SHARD_TOTAL=5 node tests/playwright/run_all_playwright.mjs ...
 *
 * Quy ước shard:
 *   - SHARD_INDEX / SHARD_TOTAL chỉ áp cho project=frontend (E2E nặng).
 *   - Backend API (34 case nhẹ) chỉ chạy trên SHARD_INDEX=1 để tiết kiệm SQL container;
 *     các shard khác bỏ qua backend. Khi không set env, chạy đầy đủ như cũ (backward compat local).
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

const SHARD_INDEX = Number.parseInt(process.env.SHARD_INDEX ?? "", 10);
const SHARD_TOTAL = Number.parseInt(process.env.SHARD_TOTAL ?? "", 10);
const SHARD_MODE = Number.isInteger(SHARD_INDEX) && Number.isInteger(SHARD_TOTAL) && SHARD_TOTAL > 0;

function runProject(name, project, extraArgs = []) {
  console.log(`\n=== CHẠY PLAYWRIGHT: ${name} ===`);
  const projectBlobDir = path.join(blobReportDir, project);
  fs.mkdirSync(projectBlobDir, { recursive: true });
  // Xuất blob vào thư mục con riêng để project sau không xóa mất file blob của project trước
  const args = ["playwright", "test", `--project=${project}`, "--reporter=list,blob", ...extraArgs];
  const res = spawnSync("npx", args, {
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

// ── Backend: chạy khi KHÔNG shard, hoặc chỉ ở SHARD_INDEX=1 ──
let backendOk = true;
if (!SHARD_MODE || SHARD_INDEX === 1) {
  backendOk = runProject("10 Phân hệ Backend API", "backend");
} else {
  console.log(`\n[SKIP] Backend API trên shard ${SHARD_INDEX}/${SHARD_TOTAL} (chỉ chạy ở shard 1).`);
}

// ── Frontend: chạy luôn; nếu shard thì truyền --shard=INDEX/TOTAL ──
const frontendArgs = SHARD_MODE ? [`--shard=${SHARD_INDEX}/${SHARD_TOTAL}`] : [];
const frontendLabel = SHARD_MODE
  ? `10 Phân hệ Frontend E2E (shard ${SHARD_INDEX}/${SHARD_TOTAL})`
  : "10 Phân hệ Frontend E2E";
const frontendOk = runProject(frontendLabel, "frontend", frontendArgs);

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

const doneLabel = SHARD_MODE
  ? `\n=== HOÀN TẤT SHARD ${SHARD_INDEX}/${SHARD_TOTAL} PLAYWRIGHT ===`
  : "\n=== HOÀN TẤT TOÀN BỘ 10 PHÂN HỆ PLAYWRIGHT (BACKEND + FRONTEND) ===";
console.log(doneLabel);
