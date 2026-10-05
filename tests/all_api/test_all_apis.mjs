/**
 * TEST RUNNER TOÀN BỘ API GEARGO (TỪ WEEK 2 ĐẾN WEEK 6):
 * Chạy lần lượt các test suite theo từng tuần:
 * - Week 2: Nền tảng, Auth, Danh mục, Sản phẩm, Báo giá, Giỏ thuê, Đơn thuê, Thanh toán mock
 * - Week 3: Nhập kho (NCC, Phiếu nhập), Thiết bị, Chuẩn bị đơn, Bàn giao, Hồ sơ & Đơn khách, Thông báo
 * - Week 4: Nhận trả, Phụ phí bồi thường, Hoàn cọc
 * - Week 5: Bảo trì & Giáng cấp, Kiểm kê, Điều chỉnh kho
 * - Week 6: Đánh giá, Báo cáo & Thống kê doanh thu
 * 
 * Chạy: node tests/all_api/test_all_apis.mjs
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

const weeks = [
  { id: 'Week 2', desc: 'Nền tảng, Danh mục, Sản phẩm, Giỏ & Đơn thuê', script: 'tests/week2/test_week2_apis.mjs' },
  { id: 'Week 3', desc: 'Nhập kho, Thiết bị, Chuẩn bị, Bàn giao, Hồ sơ & Thông báo', script: 'tests/week3/test_week3_all.mjs' },
  { id: 'Week 4', desc: 'Nhận trả, Phụ phí & Hoàn tiền cọc (Stub)', script: 'tests/week4/test_week4_apis.mjs' },
  { id: 'Week 5', desc: 'Bảo trì, Kiểm kê & Điều chỉnh kho (Stub)', script: 'tests/week5/test_week5_apis.mjs' },
  { id: 'Week 6', desc: 'Đánh giá & Báo cáo thống kê doanh thu (Stub)', script: 'tests/week6/test_week6_apis.mjs' }
];

console.log(`${colors.magenta}${colors.bold}================================================================================${colors.reset}`);
console.log(`${colors.magenta}${colors.bold}           HỆ THỐNG KIỂM THỬ TOÀN BỘ API GEARGO (TỪ WEEK 2 ĐẾN WEEK 6)          ${colors.reset}`);
console.log(`${colors.magenta}${colors.bold}================================================================================${colors.reset}\n`);

let passedCount = 0;
let failedCount = 0;

for (const w of weeks) {
  console.log(`\n${colors.cyan}${colors.bold}>>> KHỞI CHẠY KIỂM THỬ: [${w.id}] - ${w.desc}${colors.reset}`);
  console.log(`${colors.cyan}--------------------------------------------------------------------------------${colors.reset}`);
  try {
    execSync(`node ${w.script}`, { stdio: 'inherit' });
    passedCount++;
  } catch (err) {
    console.error(`\n${colors.red}✖ Lỗi khi thực thi test cho ${w.id}${colors.reset}`);
    failedCount++;
  }
}

console.log(`\n${colors.magenta}${colors.bold}================================================================================${colors.reset}`);
console.log(`${colors.bold}TỔNG KẾT TOÀN BỘ HỆ THỐNG API:${colors.reset} ${passedCount}/${weeks.length} Tuần đạt chuẩn, ${failedCount} Tuần gặp sự cố.`);
console.log(`${colors.magenta}${colors.bold}================================================================================${colors.reset}\n`);

if (failedCount > 0) {
  process.exit(1);
}
