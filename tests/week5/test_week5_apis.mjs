/**
 * Test Runner toàn diện cho WEEK 5 (GearGo Webapp):
 * Chạy lần lượt các test suites của các thành viên theo Plan_Week5.md:
 * 1. Kiện Minh: W5-T6 (Đánh giá sản phẩm & Kiểm duyệt) & W5-T8 (Hàng chờ thông báo & Thử lại lỗi)
 * 2. Tuấn Kiệt: W5-T2 (Phiếu bảo trì & Nghiệm thu) & W5-T3 (Vòng đời thiết bị & Giáng cấp)
 * 3. Minh Tú, Kim Xuyến, Thanh Tùng: Dự kiến kiểm thử theo các task kế tiếp
 * 
 * Chạy: node tests/week5/test_week5_apis.mjs
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

const suites = [
  {
    name: 'W5-T6 & W5-T8: Đánh giá sản phẩm, Kiểm duyệt & Thông báo (Kiện Minh)',
    cmd: 'node tests/week5/test_w5_kienminh.mjs',
    file: 'tests/week5/test_w5_kienminh.mjs'
  },
  {
    name: 'W5-T2 & W5-T3: Bảo trì thiết bị & Vòng đời thiết bị (Tuấn Kiệt)',
    cmd: 'node tests/week5/test_w5_tuankiet.mjs',
    file: 'tests/week5/test_w5_tuankiet.mjs'
  },
  {
    name: 'W5-T4, W5-T5: Kiểm kê kho & Điều chỉnh kho (Minh Tú)',
    cmd: 'node tests/week5/test_w5_minhtu.mjs',
    file: 'tests/week5/test_w5_minhtu.mjs',
    optional: true
  },
  {
    name: 'W5-T7: Tư vấn & Đề xuất cấu hình (Kim Xuyến)',
    cmd: 'node tests/week5/test_w5_kimxuyen.mjs',
    file: 'tests/week5/test_w5_kimxuyen.mjs',
    optional: true
  },
  {
    name: 'W5-T1: Phân quyền & Giáng cấp vai trò (Thanh Tùng)',
    cmd: 'node tests/week5/test_w5_thanhtung.mjs',
    file: 'tests/week5/test_w5_thanhtung.mjs',
    optional: true
  }
];

console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}            KIỂM THỬ TOÀN DIỆN BACKEND WEEK 5 — GEARGO                          ${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}\n`);

let passedCount = 0;
let failedCount = 0;
let skippedCount = 0;

for (const suite of suites) {
  if (suite.file && !fs.existsSync(suite.file)) {
    if (suite.optional) {
      console.log(`\n${colors.yellow}⏭ BỎ QUA (CHƯA TRIỂN KHAI): ${suite.name}${colors.reset}`);
      skippedCount++;
      continue;
    }
  }

  console.log(`\n${colors.bold}>>> ĐANG CHẠY: ${suite.name} <<<${colors.reset}`);
  console.log(`${colors.cyan}--------------------------------------------------------------------------------${colors.reset}`);
  try {
    execSync(suite.cmd, { stdio: 'inherit' });
    passedCount++;
  } catch (err) {
    console.error(`\n${colors.yellow}⚠️ Suite '${suite.name}' kết thúc với một số ca kiểm thử chưa đạt.${colors.reset}`);
    failedCount++;
  }
}

console.log(`\n${colors.cyan}${colors.bold}================================================================================${colors.reset}`);
console.log(`${colors.bold}TỔNG KẾT TUẦN 5:${colors.reset} ${colors.green}${passedCount} Suites đạt chuẩn${colors.reset}, ${failedCount > 0 ? colors.red : colors.reset}${failedCount} Suites thất bại, ${skippedCount} Suites đang chờ triển khai.`);
console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}\n`);

if (failedCount > 0) {
  process.exit(1);
}
