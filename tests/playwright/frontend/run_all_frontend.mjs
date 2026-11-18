/**
 * Runner tổng cho toàn bộ 10 phân hệ Frontend E2E Playwright.
 * Gọi: node tests/playwright/frontend/run_all_frontend.mjs
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const playwrightRoot = path.resolve(import.meta.dirname, "..");
const videosAllDir = path.join(playwrightRoot, "videos", "all");
const videosFailedDir = path.join(playwrightRoot, "videos", "failed");

// Xóa sạch video lượt trước để thư mục chỉ phản ánh đúng kết quả lần chạy hiện tại
for (const dir of [videosAllDir, videosFailedDir]) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

const res = spawnSync("npx", ["playwright", "test", "--project=frontend"], {
  cwd: playwrightRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

const allCount = fs.existsSync(videosAllDir) ? fs.readdirSync(videosAllDir).length : 0;
const failCount = fs.existsSync(videosFailedDir) ? fs.readdirSync(videosFailedDir).filter((f) => f.endsWith(".webm")).length : 0;
console.log(`\n[VIDEO] Tổng hợp ${allCount} video phân hệ tại: ${videosAllDir}`);
console.log(`[VIDEO] Số phân hệ lỗi có video tại ${videosFailedDir}: ${failCount}`);

process.exit(res.status ?? 1);
