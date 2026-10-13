/**
 * Test Suite cho W3-T5 và W3-T6 (Minh Tú):
 * - W3-T5: Xác nhận nhập kho (gọi từ PhieuNhapController sang NhapKhoService)
 * - W3-T6: Tra cứu thiết bị, lịch và khả dụng
 * Chạy: node tests/week3/test_w3_t5_t6_minhtu.mjs
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
  bold: '\x1b[1m'
};

let passed = 0;
let failed = 0;

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

const adminToken = generateToken('QuanTriVien', 1, 'admin@geargo.vn');
const staffToken = generateToken('NhanVien', 2, 'staff@geargo.vn');
const customerToken = generateToken('KhachHang', 3, 'customer@geargo.vn');

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

function assert(name, condition, extra = '') {
  if (condition) {
    console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${name}`);
    passed++;
  } else {
    console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${name} ${extra ? `(${colors.yellow}${extra}${colors.reset})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log(`${colors.cyan}${colors.bold}=== KIỂM THỬ W3-T5 & W3-T6 (MINH TÚ) ===${colors.reset}\n`);

  // 1. Phân quyền và tra cứu thiết bị
  console.log(`${colors.bold}[1. W3-T6: Tra cứu thiết bị & phân quyền]${colors.reset}`);
  
  // Khách hàng truy cập -> 403
  const resKhach = await callApi('/api/thiet-bi', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert('GET /api/thiet-bi (Khách hàng bị từ chối 403)', resKhach.status === 403, `Status: ${resKhach.status}`);

  // Nhân viên/Admin tra cứu danh sách thiết bị
  const resThietBi = await callApi('/api/thiet-bi?trang=1&soMoiTrang=10', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert('GET /api/thiet-bi (Nhân viên tra cứu thiết bị)', resThietBi.status === 200, `Status: ${resThietBi.status}`);

  // Xem chi tiết thiết bị không tồn tại -> 404
  const resTbFake = await callApi('/api/thiet-bi/999999999', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert('GET /api/thiet-bi/{id} (Không tồn tại -> 404)', resTbFake.status === 404, `Status: ${resTbFake.status}`);

  // Xem lịch sử/lịch bận thiết bị
  const resLichTb = await callApi('/api/thiet-bi/1/lich', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert('GET /api/thiet-bi/{id}/lich (Xem lịch bận thiết bị)', resLichTb.status === 200 || resLichTb.status === 404, `Status: ${resLichTb.status}`);

  // Tra cứu thiết bị phù hợp gán đơn
  const resTbPhuHop = await callApi('/api/thiet-bi/phu-hop?maSanPham=1&gioNhan=2026-10-06T00:00:00Z&gioTra=2026-10-08T00:00:00Z', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert('GET /api/thiet-bi/phu-hop (Tra cứu thiết bị phù hợp)', resTbPhuHop.status === 200 || resTbPhuHop.status === 400, `Status: ${resTbPhuHop.status}`);

  // 2. Xác nhận nhập kho (W3-T5)
  console.log(`\n${colors.bold}[2. W3-T5: Xác nhận nhập kho & phân quyền]${colors.reset}`);

  // Nhân viên xác nhận nhập kho -> 403 (Chỉ Admin mới có quyền theo spec)
  const resNvXacNhan = await callApi('/api/phieu-nhap/1/xac-nhan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      ngayNhapThucTe: new Date().toISOString(),
      danhSachDong: []
    })
  });
  assert('POST /api/phieu-nhap/{id}/xac-nhan (Nhân viên bị từ chối 403)', resNvXacNhan.status === 403, `Status: ${resNvXacNhan.status}`);

  // Admin xác nhận phiếu không tồn tại -> 400 hoặc 404 hoặc thông báo lỗi nghiệp vụ
  const resAdminXacNhanFake = await callApi('/api/phieu-nhap/999999999/xac-nhan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      ngayNhapThucTe: new Date().toISOString(),
      danhSachDong: []
    })
  });
  assert('POST /api/phieu-nhap/{id}/xac-nhan (Phiếu không tồn tại -> Báo lỗi hợp lệ)', resAdminXacNhanFake.status === 400 || resAdminXacNhanFake.status === 404, `Status: ${resAdminXacNhanFake.status}`);

  console.log(`\n======================================================`);
  console.log(`KẾT QUẢ: ${passed} PASS / ${failed} FAIL`);
  console.log(`======================================================\n`);
}

runTests();
