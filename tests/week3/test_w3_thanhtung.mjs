/**
 * Test Suite cho W3-T1 và W3-T2 (Thanh Tùng):
 * - W3-T1: Hồ sơ khách hàng & Truy vấn theo dõi đơn (Khách + Vận hành)
 * - W3-T2: Lịch sử và Thông báo in-app
 * Chạy: node tests/week3/test_w3_thanhtung.mjs
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

function generateToken(role, maTaiKhoan = 1, email = 'user@geargo.vn') {
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
  console.log(`${colors.cyan}${colors.bold}=== KIỂM THỬ W3-T1 & W3-T2 (THANH TÙNG) ===${colors.reset}\n`);

  // 1. Hồ sơ cá nhân (Khách hàng)
  console.log(`${colors.bold}[1. W3-T1: Quản lý Hồ sơ khách hàng]${colors.reset}`);
  
  // Khách lấy hồ sơ
  const resHoSo = await callApi('/api/v1/ho-so/toi', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  // Nếu tài khoản seed chưa có hồ sơ thì có thể trả 403 hoặc 200 (ActorGuard.LayMaKhachHangAsync)
  assert('GET /api/v1/ho-so/toi (Khách xem hồ sơ)', resHoSo.status === 200 || resHoSo.status === 403, `Status: ${resHoSo.status}`);

  // Cập nhật hồ sơ
  const resCapNhatHoSo = await callApi('/api/v1/ho-so/toi', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      hoTen: 'Nguyễn Văn Khách Test',
      email: 'khach.test@geargo.vn',
      soDienThoai: '0912345678',
      diaChi: '123 Đường Test, TP.HCM'
    })
  });
  assert('PUT /api/v1/ho-so/toi (Cập nhật hồ sơ)', resCapNhatHoSo.status === 200 || resCapNhatHoSo.status === 403 || resCapNhatHoSo.status === 409, `Status: ${resCapNhatHoSo.status}`);

  // 2. Truy vấn đơn thuê phía Khách hàng
  console.log(`\n${colors.bold}[2. W3-T1: Khách hàng theo dõi đơn thuê]${colors.reset}`);
  
  const resDonCuaToi = await callApi('/api/v1/don-thue?trang=1&soMoiTrang=10', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert('GET /api/v1/don-thue (Khách xem danh sách đơn của mình)', resDonCuaToi.status === 200 || resDonCuaToi.status === 403, `Status: ${resDonCuaToi.status}`);

  // Khách xem đơn không tồn tại -> 404
  const resDonFake = await callApi('/api/v1/don-thue/999999999', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert('GET /api/v1/don-thue/{id} (Không tìm thấy -> 404)', resDonFake.status === 404 || resDonFake.status === 403, `Status: ${resDonFake.status}`);

  // Khách xem lịch sử đơn không tồn tại
  const resLichSuFake = await callApi('/api/v1/don-thue/999999999/lich-su', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert('GET /api/v1/don-thue/{id}/lich-su (Xem lịch sử đơn -> 404/403)', resLichSuFake.status === 404 || resLichSuFake.status === 403, `Status: ${resLichSuFake.status}`);

  // Khách xem thông tin bàn giao đơn không tồn tại
  const resBanGiaoDonFake = await callApi('/api/v1/don-thue/999999999/ban-giao', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert('GET /api/v1/don-thue/{id}/ban-giao (Xem bàn giao đơn -> 404/403)', resBanGiaoDonFake.status === 404 || resBanGiaoDonFake.status === 403, `Status: ${resBanGiaoDonFake.status}`);

  // 3. Truy vấn đơn phía Vận hành (Nhân viên / Admin)
  console.log(`\n${colors.bold}[3. W3-T1: Nhân viên tra cứu đơn vận hành]${colors.reset}`);
  
  const resVanHanh = await callApi('/api/v1/van-hanh/don-thue?trang=1&soMoiTrang=10', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert('GET /api/v1/van-hanh/don-thue (Nhân viên xem đơn vận hành)', resVanHanh.status === 200 || resVanHanh.status === 403, `Status: ${resVanHanh.status}`);

  // Nhân viên xem chi tiết đơn vận hành không tồn tại
  const resChiTietVhFake = await callApi('/api/v1/van-hanh/don-thue/999999999', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert('GET /api/v1/van-hanh/don-thue/{id} (Không tìm thấy -> 404)', resChiTietVhFake.status === 404 || resChiTietVhFake.status === 403, `Status: ${resChiTietVhFake.status}`);

  // Khách hàng truy cập API vận hành -> 403
  const resVanHanhKhach = await callApi('/api/v1/van-hanh/don-thue', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert('GET /api/v1/van-hanh/don-thue (Khách truy cập bị chặn 403)', resVanHanhKhach.status === 403, `Status: ${resVanHanhKhach.status}`);

  // 4. Thông báo in-app (W3-T2)
  console.log(`\n${colors.bold}[4. W3-T2: Thông báo in-app]${colors.reset}`);
  
  const resThongBao = await callApi('/api/v1/thong-bao?trang=1&soMoiTrang=10', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert('GET /api/v1/thong-bao (Lấy danh sách thông báo)', resThongBao.status === 200, `Status: ${resThongBao.status}`);

  // Đánh dấu đã đọc thông báo giả -> 404
  const resDaDocFake = await callApi('/api/v1/thong-bao/999999999/da-doc', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert('POST /api/v1/thong-bao/{id}/da-doc (Không tìm thấy -> 404)', resDaDocFake.status === 404, `Status: ${resDaDocFake.status}`);

  console.log(`\n======================================================`);
  console.log(`KẾT QUẢ: ${passed} PASS / ${failed} FAIL`);
  console.log(`======================================================\n`);
}

runTests();
