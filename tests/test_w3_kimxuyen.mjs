/**
 * Script kiểm thử tự động toàn diện task W3-T7 của Kim Xuyến:
 * - W3-T7: Chuẩn bị đơn và phân công thiết bị (UC10)
 * Chạy: node tests/test_w3_kimxuyen.mjs
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
  console.log(`${colors.bold}${colors.cyan}=== BẮT ĐẦU KIỂM THỬ WEEK 3 - KIM XUYẾN (W3-T7: CHUẨN BỊ ĐƠN) ===${colors.reset}\n`);

  // 1. Phân quyền
  console.log(`${colors.bold}[PHẦN 1] Kiểm tra phân quyền truy cập${colors.reset}`);
  
  const t1 = await callApi('/api/chuan-bi-don/1', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t1.status === 403, `Khách hàng bị từ chối truy cập (HTTP ${t1.status})`);

  const t2 = await callApi('/api/chuan-bi-don/1', {});
  assert(t2.status === 401, `Yêu cầu không có JWT bị từ chối 401 (HTTP ${t2.status})`);

  // 2. Tra cứu đơn không tồn tại
  console.log(`\n${colors.bold}[PHẦN 2] Tra cứu & Kiểm tra trạng thái đơn${colors.reset}`);
  
  const t3 = await callApi('/api/chuan-bi-don/999999', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t3.status === 404, `Tra cứu đơn không tồn tại trả về 404 (HTTP ${t3.status})`);

  const t4 = await callApi('/api/chuan-bi-don/999999/bat-dau', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t4.status === 404, `Bắt đầu chuẩn bị đơn không tồn tại trả về 404 (HTTP ${t4.status})`);

  // 3. Validation request gán thiết bị
  console.log(`\n${colors.bold}[PHẦN 3] Validation dữ liệu đầu vào${colors.reset}`);

  const t5 = await callApi('/api/chuan-bi-don/1/phan-cong', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ dongDonId: 1, thietBiIds: [] })
  });
  assert(t5.status === 400 || t5.status === 404, `Gán danh sách thiết bị rỗng bị từ chối (HTTP ${t5.status})`);

  const t6 = await callApi('/api/chuan-bi-don/1/phan-cong', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ dongDonId: 1, thietBiIds: [10, 10] })
  });
  assert(t6.status === 400 || t6.status === 404, `Gán danh sách thiết bị trùng mã bị từ chối (HTTP ${t6.status})`);

  // 4. Hủy phân công validation
  const t7 = await callApi('/api/chuan-bi-don/1/phan-cong/1/huy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ lyDo: '' })
  });
  assert(t7.status === 400 || t7.status === 404, `Hủy phân công không có lý do bị từ chối (HTTP ${t7.status})`);

  // 5. Thay thế thiết bị validation
  const t8 = await callApi('/api/chuan-bi-don/1/phan-cong/1/thay-the', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ thietBiMoiId: 2, lyDo: '' })
  });
  assert(t8.status === 400 || t8.status === 404, `Thay thế thiết bị không có lý do bị từ chối (HTTP ${t8.status})`);

  console.log(`\n${colors.bold}=== TỔNG KẾT KIỂM THỬ: ${colors.green}${passedCount} PASS${colors.reset}, ${colors.red}${failedCount} FAIL${colors.reset} ===\n`);
}

runTests();
