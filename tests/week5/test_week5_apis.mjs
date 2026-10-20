import { execSync } from 'node:child_process';

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

console.log(`${colors.cyan}${colors.bold}=== KIỂM THỬ TỔNG HỢP API WEEK 5 (PLAN WEEK 5) ===${colors.reset}`);
console.log(`${colors.yellow}ℹ Thành viên: Kiện Minh (W5-T6: Đánh giá & W5-T8: Thông báo), Tuấn Kiệt (Bảo trì), Minh Tú (Kho), Kim Xuyến (Tư vấn), Thanh Tùng (Quản trị)${colors.reset}\n`);

try {
  console.log(`${colors.cyan}▶ Đang chạy suite kiểm thử của Kiện Minh (test_w5_kienminh.mjs)...${colors.reset}`);
  execSync('node tests/week5/test_w5_kienminh.mjs', { stdio: 'inherit' });
} catch (err) {
  console.log(`\n${colors.yellow}⚠ Chú ý: Backend chưa chạy hoặc endpoint đang triển khai.${colors.reset}`);
}

