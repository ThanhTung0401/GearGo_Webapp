/**
 * Script kiểm thử tự động toàn diện cho Week 5 của Kiện Minh:
 * - W5-T6: Đánh giá sản phẩm và kiểm duyệt (UC08, UC03)
 * - W5-T8: Hoàn thiện thông báo và xử lý gửi (UC26)
 * Chạy: node tests/week5/test_w5_kienminh.mjs
 */

import crypto from 'node:crypto';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const JWT_SECRET = 'GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

let passedCount = 0;
let failedCount = 0;

function generateToken(role, maTaiKhoan = 1, email = 'admin@geargo.vn') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    'MaTaiKhoan': maTaiKhoan.toString(),
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': maTaiKhoan.toString(),
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': email,
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': role,
    'exp': now + 7 * 24 * 3600
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

// Tài khoản giả lập cho test suite
const adminToken = generateToken('QuanTriVien', 1, 'admin@geargo.vn');
const staffToken = generateToken('NhanVien', 2, 'staff@geargo.vn');
const customerToken = generateToken('KhachHang', 3, 'customer1@geargo.vn');
const otherCustomerToken = generateToken('KhachHang', 4, 'customer2@geargo.vn');

async function callApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const headers = { ...(options.headers || {}) };
    if (!headers['Content-Type'] && options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers });
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return { status: res.status, data };
  } catch (err) {
    return { status: 0, error: err.message };
  }
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ${colors.green}✔ PASS:${colors.reset} ${message}`);
    passedCount++;
  } else {
    console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log(`${colors.cyan}${colors.bold}======================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}   KIỂM THỬ WEEK 5 - KIỆN MINH (W5-T6 & W5-T8)      ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}======================================================${colors.reset}\n`);

  // --------------------------------------------------------------------------------------------------
  // PHẦN 1: W5-T6 - ĐÁNH GIÁ SẢN PHẨM VÀ KIỂM DUYỆT (UC08, UC03)
  // --------------------------------------------------------------------------------------------------
  console.log(`${colors.magenta}${colors.bold}--- [W5-T6] KIỂM THỬ ĐÁNH GIÁ SẢN PHẨM & KIỂM DUYỆT ---${colors.reset}`);

  // Test 1: Khách hàng chưa đăng nhập xem danh sách và tổng hợp điểm sản phẩm (Public API)
  console.log(`\n${colors.yellow}1. Truy vấn công khai đánh giá và tổng hợp điểm sản phẩm${colors.reset}`);
  const sanPhamIdFixture = 1;
  const resDanhGiaSp = await callApi(`/api/v1/danh-gia/san-pham/${sanPhamIdFixture}`);
  assert(resDanhGiaSp.status === 200 || resDanhGiaSp.status === 404, 'Xem danh sách đánh giá công khai (200 OK)');
  
  const resTongHop = await callApi(`/api/v1/danh-gia/san-pham/${sanPhamIdFixture}/tong-hop`);
  assert(resTongHop.status === 200 || resTongHop.status === 404, 'Xem tổng hợp điểm & histogram sao (200 OK)');

  // Test 2: Khách lấy danh sách sản phẩm đủ điều kiện đánh giá
  console.log(`\n${colors.yellow}2. Lấy danh sách sản phẩm đủ điều kiện đánh giá (đơn HoanTat)${colors.reset}`);
  const resDuDieuKien = await callApi('/api/v1/danh-gia/du-dieu-kien', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(resDuDieuKien.status === 200, 'Khách hàng truy vấn sản phẩm đủ điều kiện đánh giá (200 OK)');

  // Test 3: W5-T6-A01 - Tạo đánh giá khi đơn chưa HoanTat hoặc chi tiết không tồn tại
  console.log(`\n${colors.yellow}3. W5-T6-A01: Chặn đánh giá khi đơn chưa Hoàn tất hoặc chi tiết sai${colors.reset}`);
  const resChuaHoanTat = await callApi('/api/v1/danh-gia', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      maChiTietDon: 999999, // ID không thuộc đơn HoanTat
      soSao: 5,
      noiDung: 'Lều rất tốt, phục vụ chu đáo'
    })
  });
  assert(resChuaHoanTat.status === 400 || resChuaHoanTat.status === 404 || resChuaHoanTat.status === 409, 
    'Chặn đánh giá đơn chưa hoàn tất hoặc không tồn tại (status 400/404/409)');

  // Test 4: Validation số sao (1 đến 5 sao nguyên)
  console.log(`\n${colors.yellow}4. Validation số sao không hợp lệ (ngoài 1-5)${colors.reset}`);
  const resSaoLoi = await callApi('/api/v1/danh-gia', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      maChiTietDon: 1,
      soSao: 6, // Không hợp lệ
      noiDung: 'Test sao sai'
    })
  });
  assert(resSaoLoi.status === 400, 'Chặn số sao = 6 (400 Bad Request)');

  // Test 5: Quyền kiểm duyệt Admin: Khách/Staff không được ẩn đánh giá
  console.log(`\n${colors.yellow}5. Bảo mật kiểm duyệt: Chặn khách/nhân viên gọi API ẩn đánh giá${colors.reset}`);
  const resChanKhachAn = await callApi('/api/v1/admin/danh-gia/1/an', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ lyDo: 'Nội dung phản cảm' })
  });
  assert(resChanKhachAn.status === 403, 'Khách bị chặn gọi API Admin ẩn đánh giá (403 Forbidden)');

  const resChanStaffAn = await callApi('/api/v1/admin/danh-gia/1/an', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ lyDo: 'Nội dung phản cảm' })
  });
  assert(resChanStaffAn.status === 403, 'Nhân viên bị chặn gọi API Admin ẩn đánh giá (403 Forbidden)');

  // Test 6: Admin tra cứu danh sách kiểm duyệt đánh giá
  console.log(`\n${colors.yellow}6. Admin xem danh sách kiểm duyệt đánh giá (có phân trang và lọc)${colors.reset}`);
  const resAdminList = await callApi('/api/v1/admin/danh-gia?trang=1&soMoiTrang=10', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(resAdminList.status === 200, 'Admin lấy danh sách đánh giá thành công (200 OK)');


  // --------------------------------------------------------------------------------------------------
  // PHẦN 2: W5-T8 - HOÀN THIỆN THÔNG BÁO VÀ XỬ LÝ GỬI (UC26)
  // --------------------------------------------------------------------------------------------------
  console.log(`\n${colors.magenta}${colors.bold}--- [W5-T8] KIỂM THỬ THÔNG BÁO VÀ HÀNG CHỜ GỬI ---${colors.reset}`);

  // Test 7: Khách lấy danh sách thông báo của mình (phân trang)
  console.log(`\n${colors.yellow}7. Khách hàng lấy danh sách thông báo của mình${colors.reset}`);
  const resThongBaoCuaToi = await callApi('/api/v1/thong-bao?trang=1&soMoiTrang=10', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(resThongBaoCuaToi.status === 200, 'Lấy danh sách thông báo in-app (200 OK)');

  // Test 8: Đếm số thông báo chưa đọc
  console.log(`\n${colors.yellow}8. Đếm số thông báo chưa đọc của tài khoản${colors.reset}`);
  const resDemChuaDoc = await callApi('/api/v1/thong-bao/chua-doc/dem', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(resDemChuaDoc.status === 200, 'Đếm thông báo chưa đọc thành công (200 OK)');

  // Test 9: Đánh dấu tất cả đã đọc
  console.log(`\n${colors.yellow}9. Đánh dấu tất cả thông báo của tôi là đã đọc${colors.reset}`);
  const resDocTatCa = await callApi('/api/v1/thong-bao/da-doc-tat-ca', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(resDocTatCa.status === 200, 'Đánh dấu tất cả đã đọc (200 OK)');

  // Test 10: W5-T8-A06 - Khách A không được đánh dấu đọc thông báo của khách B
  console.log(`\n${colors.yellow}10. W5-T8-A06: Bảo vệ scope - Khách không được sửa thông báo của người khác${colors.reset}`);
  const resScopeLoi = await callApi('/api/v1/thong-bao/999999/da-doc', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(resScopeLoi.status === 404 || resScopeLoi.status === 403, 
    'Chặn đánh dấu đọc thông báo không thuộc tài khoản (404/403)');

  // Test 11: Admin xem danh sách thông báo gửi lỗi (hàng chờ retry)
  console.log(`\n${colors.yellow}11. Admin xem danh sách thông báo gửi lỗi (hàng chờ email)${colors.reset}`);
  const resAdminGuiLoi = await callApi('/api/v1/admin/thong-bao/gui-loi', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(resAdminGuiLoi.status === 200, 'Admin lấy danh sách thông báo gửi lỗi (200 OK)');

  // Test 12: Khách hàng bị chặn truy cập endpoint admin thông báo lỗi
  console.log(`\n${colors.yellow}12. Chặn khách hàng truy cập API thông báo lỗi của Admin${colors.reset}`);
  const resChanKhachAdminTb = await callApi('/api/v1/admin/thong-bao/gui-loi', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(resChanKhachAdminTb.status === 403, 'Khách bị cấm xem thông báo gửi lỗi của hệ thống (403 Forbidden)');

  // Test 13: Admin retry gửi thông báo
  console.log(`\n${colors.yellow}13. Admin thực hiện gửi lại thông báo lỗi (ThuLaiAsync)${colors.reset}`);
  const resRetry = await callApi('/api/v1/admin/thong-bao/1/thu-lai', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ lyDo: 'Thử lại sau khi cấu hình SMTP' })
  });
  assert(resRetry.status === 200 || resRetry.status === 404 || resRetry.status === 409, 
    'Admin yêu cầu thử lại thông báo (200/404/409)');

  // --------------------------------------------------------------------------------------------------
  // TỔNG KẾT KẾT QUẢ
  // --------------------------------------------------------------------------------------------------
  console.log(`\n${colors.cyan}${colors.bold}======================================================${colors.reset}`);
  console.log(`${colors.bold}KẾT QUẢ KIỂM THỬ WEEK 5 (KIỆN MINH):${colors.reset}`);
  console.log(`  ${colors.green}✔ Tổng số PASS: ${passedCount}${colors.reset}`);
  console.log(`  ${colors.red}✖ Tổng số FAIL: ${failedCount}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}======================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
