/**
 * Test Runner toàn diện cho WEEK 3:
 * Chạy lần lượt các test suites của cả 5 thành viên:
 * 1. Thanh Tùng (W3-T1, W3-T2)
 * 2. Kiện Minh (W3-T3, W3-T4)
 * 3. Minh Tú (W3-T5, W3-T6)
 * 4. Kim Xuyến (W3-T7)
 * 5. Tuấn Kiệt (W3-T8)
 * Chạy: node tests/week3/test_week3_all.mjs
 */

import { execSync } from 'node:child_process';
import path from 'node:path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const suites = [
  { name: 'W3-T1 & W3-T2: Hồ sơ, Theo dõi đơn & Thông báo (Thanh Tùng)', file: 'tests/week3/test_w3_thanhtung.mjs' },
  { name: 'W3-T3 & W3-T4: Nhà cung cấp & Phiếu nhập nháp (Kiện Minh)', file: 'tests/week3/test_w3_kienminh.mjs' },
  { name: 'W3-T5 & W3-T6: Xác nhận nhập kho & Thiết bị (Minh Tú)', file: 'tests/week3/test_w3_t5_t6_minhtu.mjs' },
  { name: 'W3-T7: Chuẩn bị đơn & Phân công thiết bị (Kim Xuyến)', file: 'tests/week3/test_w3_kimxuyen.mjs' },
  { name: 'W3-T8: Phiếu bàn giao & Chốt giao (Tuấn Kiệt)', file: 'tests/week3/test_w3_tuankiet.mjs' }
];

console.log(`${colors.cyan}${colors.bold}================================================================${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}          KIỂM THỬ TOÀN DIỆN BACKEND WEEK 3 — GEARGO            ${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}================================================================${colors.reset}\n`);

let passedCount = 0;
let failedCount = 0;

for (const suite of suites) {
  console.log(`${colors.bold}--- ĐANG CHẠY: ${suite.name} ---${colors.reset}`);
  try {
    const output = execSync(`node ${suite.file}`, { stdio: 'inherit' });
    passedCount++;
  } catch (err) {
    console.error(`${colors.red}✖ Lỗi khi thực thi ${suite.name}${colors.reset}`);
    failedCount++;
  }
  console.log('\n');
}

console.log(`${colors.cyan}${colors.bold}================================================================${colors.reset}`);
console.log(`${colors.bold}TỔNG KẾT TUẦN 3:${colors.reset} ${passedCount}/${suites.length} Suites thành công, ${failedCount} Suites thất bại.`);
console.log(`${colors.cyan}${colors.bold}================================================================${colors.reset}\n`);

if (failedCount > 0) {
  process.exit(1);
}
