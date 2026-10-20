/**
 * Test Runner toàn diện cho WEEK 6 (GearGo Webapp):
 * Chạy lần lượt các test suites của các thành viên theo Plan_Week6.md:
 * 1. Kiện Minh: W6-T2 & W6-T3 (Quản trị khuyến mãi & Luồng áp mã giỏ hàng, đặt cọc & hoàn tất)
 * 2. Tuấn Kiệt: W6-T4 & W6-T8 (Báo cáo vận hành & chỉ số thuê thiết bị)
 * 3. Minh Tú, Kim Xuyến, Thanh Tùng: Dự kiến kiểm thử theo các task kế tiếp
 * 4. Unit Tests xUnit: Bộ kiểm thử đơn vị backend (Khuyến mãi W6-05 -> W6-11 & xUnit)
 * 
 * Chạy: node tests/week6/test_week6_apis.mjs
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
    name: 'W6-T2 & W6-T3: Quản trị khuyến mãi & Luồng áp mã (Kiện Minh)',
    cmd: 'node tests/week6/test_w6_kienminh.mjs',
    file: 'tests/week6/test_w6_kienminh.mjs'
  },
  {
    name: 'W6-T4: Báo cáo vận hành & Chỉ số thuê (Tuấn Kiệt)',
    cmd: 'node tests/week6/test_w6_tuankiet.mjs',
    file: 'tests/week6/test_w6_tuankiet.mjs'
  },
  {
    name: 'W6-T5: Báo cáo tài chính & Doanh thu (Kim Xuyến)',
    cmd: 'node tests/week6/test_w6_kimxuyen.mjs',
    file: 'tests/week6/test_w6_kimxuyen.mjs',
    optional: true
  },
  {
    name: 'W6-T6: Báo cáo kho, bảo trì & tồn kho (Minh Tú)',
    cmd: 'node tests/week6/test_w6_minhtu.mjs',
    file: 'tests/week6/test_w6_minhtu.mjs',
    optional: true
  },
  {
    name: 'W6-T1, W6-T7: Chính sách & Nhật ký hệ thống (Thanh Tùng)',
    cmd: 'node tests/week6/test_w6_thanhtung.mjs',
    file: 'tests/week6/test_w6_thanhtung.mjs',
    optional: true
  }
];

console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}            KIỂM THỬ TOÀN DIỆN BACKEND WEEK 6 — GEARGO                          ${colors.reset}`);
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
console.log(`${colors.bold}TỔNG KẾT TUẦN 6:${colors.reset} ${colors.green}${passedCount} Suites đạt chuẩn${colors.reset}, ${failedCount > 0 ? colors.red : colors.reset}${failedCount} Suites thất bại, ${skippedCount} Suites đang chờ triển khai.`);
console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}\n`);

if (failedCount > 0) {
  process.exit(1);
}
