/**
 * Bộ điều phối kiểm thử trung tâm GearGo (tests/run_all_tests.mjs)
 * - Mặc định: chạy Backend (dotnet test backend/test/GearGo.Tests) + Frontend (npm --prefix frontend test)
 * - Cờ tùy chọn:
 *   --backend-only : chỉ chạy test Backend
 *   --frontend-only: chỉ chạy test Frontend
 *   --api          : chạy thêm bộ E2E API scripts (backend/test/all_api/test_all_apis.mjs) khi server đang bật
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));

const runBackend = !args.has("--frontend-only");
const runFrontend = !args.has("--backend-only");
const runApiScripts = args.has("--api");

function runStep(title, command, commandArgs, cwd = rootDir) {
  console.log(`\n=== ${title} ===`);
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`\n[FAIL] ${title} thất bại (exit code ${result.status ?? 1}).`);
    process.exit(result.status ?? 1);
  }
  console.log(`[PASS] ${title}`);
}

if (runBackend) {
  runStep("Backend Unit & Integration Tests (backend/test/GearGo.Tests)", "dotnet", [
    "test",
    "backend/test/GearGo.Tests",
  ]);
}

if (runFrontend) {
  runStep("Frontend Unit & Component Tests (frontend/test)", "npm", [
    "--prefix",
    "frontend",
    "test",
  ]);
}

if (runApiScripts) {
  runStep("Backend API E2E Scripts (backend/test/all_api)", "node", [
    "backend/test/all_api/test_all_apis.mjs",
  ]);
}

console.log("\n=== HOÀN TẤT TOÀN BỘ BỘ KIỂM THỬ GEARGO ===");
