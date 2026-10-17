/**
 * Test Runner toàn diện cho WEEK 4 (GearGo Webapp):
 * Chạy lần lượt các test suites của cả 5 thành viên:
 * 1. Tuấn Kiệt: W4-T1 (Nhận trả nhiều đợt & Kết luận mất - UC12)
 * 2. Minh Tú: W4-T2, W4-T5, W4-T8 (Quá hạn, Thu bổ sung phụ phí & Đối chiếu ngoại lệ)
 * 3. Kiện Minh: W4-T3 (Lập, duyệt phụ phí bồi thường & Tranh chấp - UC14)
 * 4. Kim Xuyến: W4-T4 (Đối soát cọc & Điều chỉnh đối soát - UC15)
 * 5. Thanh Tùng: W4-T6, W4-T7, W4-T9 (Hoàn tiền dùng chung, Hủy đơn theo chính sách & Theo dõi tài chính)
 * 
 * Chạy: node tests/week4/test_week4_apis.mjs
 */

import { execSync } from 'node:child_process';

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
    name: 'W4-T1: Nhận trả nhiều đợt & Kết luận mất (Tuấn Kiệt)',
    cmd: 'node tests/week4/test_w4_tuankiet.mjs'
  },
  {
    name: 'W4-T2, W4-T5, W4-T8: Quá hạn, Thu bổ sung & Đối chiếu ngoại lệ (Minh Tú)',
    cmd: 'node tests/week4/test_w4_minhtu.mjs'
  },
  {
    name: 'W4-T3: Lập, duyệt phụ phí & Giải quyết tranh chấp (Kiện Minh)',
    cmd: 'node tests/week4/test_w4_kienminh.mjs'
  },
  {
    name: 'W4-T4: Đối soát tiền cọc & Điều chỉnh đối soát (Kim Xuyến)',
    cmd: 'node tests/week4/test_w4_kimxuyen.mjs'
  },
  {
    name: 'W4-T6, W4-T7, W4-T9: Hoàn tiền dùng chung, Hủy đơn & Tài chính (Thanh Tùng)',
    cmd: 'dotnet test tests/GearGo.Tests --nologo'
  }
];

console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}            KIỂM THỬ TOÀN DIỆN BACKEND WEEK 4 — GEARGO                          ${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}\n`);

let passedCount = 0;
let failedCount = 0;

for (const suite of suites) {
  console.log(`\n${colors.bold}>>> ĐANG CHẠY: ${suite.name} <<<${colors.reset}`);
  console.log(`${colors.cyan}--------------------------------------------------------------------------------${colors.reset}`);
  try {
    // Chạy từng suite test của thành viên, hiển thị output trực tiếp ra console
    execSync(suite.cmd, { stdio: 'inherit' });
    passedCount++;
  } catch (err) {
    console.error(`\n${colors.yellow}⚠️ Suite '${suite.name}' kết thúc với một số ca kiểm thử chưa đạt.${colors.reset}`);
    failedCount++;
  }
}

console.log(`\n${colors.cyan}${colors.bold}================================================================================${colors.reset}`);
console.log(`${colors.bold}TỔNG KẾT TUẦN 4:${colors.reset} ${colors.green}${passedCount} Suites đạt chuẩn${colors.reset}, ${failedCount > 0 ? colors.yellow : colors.reset}${failedCount} Suites cần kiểm tra lại.`);
console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}\n`);

if (failedCount > 0) {
  process.exit(1);
}
