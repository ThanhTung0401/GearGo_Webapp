/**
 * Script kiểm thử tự động toàn diện cho WEEK 4 - THANH TÙNG:
 * - W4-T6: Dịch vụ hoàn tiền dùng chung (Quản lý yêu cầu hoàn, phát lệnh, đối chiếu, callback)
 * - W4-T7: Hủy đơn an toàn theo chính sách (Khách hủy, Cửa hàng hủy, Không đến nhận)
 * - W4-T9: Theo dõi tiến độ tài chính đơn thuê & dòng tiền
 * Chạy: node tests/week4/test_w4_thanhtung.mjs
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

let adminToken = generateToken('QuanTriVien', 1, 'admin@geargo.vn');
let staffToken = generateToken('NhanVien', 2, 'staff@geargo.vn');
let customerToken = generateToken('KhachHang', 3, 'customer@geargo.vn');
let otherCustomerToken = generateToken('KhachHang', 4, 'other@geargo.vn');

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

function assert(condition, message, errorDetail = null) {
  if (condition) {
    console.log(`  ${colors.green}✔ PASS:${colors.reset} ${message}`);
    passedCount++;
  } else {
    console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${message}`);
    if (errorDetail) console.log(`     Chi tiết:`, errorDetail);
    failedCount++;
  }
}

async function detectAccountTokens() {
  for (const baseId of [1, 10002]) {
    const candidate = generateToken('QuanTriVien', baseId, 'admin@geargo.vn');
    try {
      const res = await callApi('/api/auth/toi', {
        headers: { Authorization: `Bearer ${candidate}` }
      });
      if (res.status === 200) {
        adminToken = candidate;
        const staffId = baseId === 10002 ? 10003 : 2;
        const customerId = baseId === 10002 ? 10004 : 3;
        const otherId = baseId === 10002 ? 10005 : 4;
        staffToken = generateToken('NhanVien', staffId, 'staff@geargo.vn');
        customerToken = generateToken('KhachHang', customerId, 'customer@geargo.vn');
        otherCustomerToken = generateToken('KhachHang', otherId, 'other@geargo.vn');
        break;
      }
    } catch {}
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}=== BẮT ĐẦU KIỂM THỬ WEEK 4 - THANH TÙNG (W4-T6, W4-T7, W4-T9) ===${colors.reset}\n`);

  await detectAccountTokens();

  const testDonId = 1;

  // =========================================================================
  // PHẦN 1: PHÂN QUYỀN TRUY CẬP (PERMISSIONS & AUTH GUARD)
  // =========================================================================
  console.log(`${colors.bold}[PHẦN 1] Kiểm tra phân quyền truy cập${colors.reset}`);

  // Test 1: Khách hàng bị cấm gọi API vận hành xem trước cửa hàng hủy -> 403
  const t1 = await callApi(`/api/v1/van-hanh/don-thue/${testDonId}/cua-hang-huy/xem-truoc`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t1.status === 403, 'Khách hàng bị cấm xem trước hủy vận hành (HTTP 403 Policy AdminOnly)');

  // Test 2: Nhân viên thường bị cấm gọi Cửa hàng hủy đơn (chỉ Quản trị viên mới được hủy) -> 403
  const t2 = await callApi(`/api/v1/van-hanh/don-thue/${testDonId}/cua-hang-huy`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ lyDo: 'Nhân viên tự ý hủy' })
  });
  assert(t2.status === 403, 'Nhân viên thường bị cấm thao tác Cửa hàng hủy (HTTP 403 AdminOnly)');

  // Test 3: Khách hàng không được quyền phát lệnh xử lý hoàn tiền -> 403
  const t3 = await callApi(`/api/v1/hoan-tien/1/xu-ly`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t3.status === 403, 'Khách hàng bị cấm gọi phát lệnh hoàn tiền (HTTP 403 StaffOrAdmin)');

  // =========================================================================
  // PHẦN 2: W4-T7 — XEM TRƯỚC VÀ CHÍNH SÁCH HỦY ĐƠN PHÍA KHÁCH HÀNG
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 2] Kiểm tra W4-T7: Chính sách hủy đơn của Khách hàng${colors.reset}`);

  // Test 4: Khách xem trước bảng tính chi phí hủy đơn của chính mình -> 200 hoặc 400 nếu đơn không đủ điều kiện
  const t4 = await callApi(`/api/v1/don-thue/${testDonId}/huy/xem-truoc`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t4.status === 200 || (t4.status === 400 && t4.data?.maLoi), 
    `Khách hàng gọi API xem trước bảng tính hủy đơn (HTTP ${t4.status})`);
  if (t4.status === 200) {
    console.log(`     ℹ Chính sách hủy áp dụng: ${t4.data.nhanhChinhSach}, Có thể hủy: ${t4.data.coTheHuy}`);
  }

  // Test 5: Khách hàng khác xem trước hủy đơn không thuộc sở hữu -> 404 (Bảo vệ IDOR)
  const t5 = await callApi(`/api/v1/don-thue/${testDonId}/huy/xem-truoc`, {
    headers: { Authorization: `Bearer ${otherCustomerToken}` }
  });
  assert(t5.status === 404 || t5.status === 403, 'Chặn khách hàng lạ xem trước hủy đơn người khác (Bảo vệ IDOR)');

  // Test 6: Kiểm tra tính toàn vẹn khi hủy đơn: Chặn hủy khi lý do rỗng -> 400
  const t6 = await callApi(`/api/v1/don-thue/${testDonId}/huy`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ lyDo: '' })
  });
  assert(t6.status === 400, 'Chặn hủy đơn khi lý do bị bỏ trống (HTTP 400)');

  // =========================================================================
  // PHẦN 3: W4-T7 — VẬN HÀNH: CỬA HÀNG HỦY & KHÔNG ĐẾN NHẬN
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 3] Kiểm tra W4-T7: Cửa hàng hủy & Ghi nhận không đến nhận${colors.reset}`);

  // Test 7: Admin xem trước chi phí Cửa hàng hủy -> 200 hoặc 400
  const t7 = await callApi(`/api/v1/van-hanh/don-thue/${testDonId}/cua-hang-huy/xem-truoc`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(t7.status === 200 || (t7.status === 400 && t7.data?.maLoi), 
    `Admin xem trước bảng tính Cửa hàng hủy (HTTP ${t7.status})`);

  // Test 8: Nhân viên xem trước bảng tính ghi nhận khách không đến nhận -> 200 hoặc 400
  const t8 = await callApi(`/api/v1/van-hanh/don-thue/${testDonId}/khong-den-nhan/xem-truoc`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t8.status === 200 || (t8.status === 400 && t8.data?.maLoi),
    `Nhân viên xem trước trường hợp khách không đến nhận (HTTP ${t8.status})`);

  // Test 9: Ghi nhận không đến nhận thiếu ghi chú -> 400
  const t9 = await callApi(`/api/v1/van-hanh/don-thue/${testDonId}/khong-den-nhan`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ ghiChu: '' })
  });
  assert(t9.status === 400, 'Chặn ghi nhận không đến nhận khi thiếu ghi chú biên bản (HTTP 400)');

  // =========================================================================
  // PHẦN 4: W4-T6 — DỊCH VỤ HOÀN TIỀN DÙNG CHUNG
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 4] Kiểm tra W4-T6: Dịch vụ hoàn tiền dùng chung${colors.reset}`);

  // Test 10: Tra cứu danh sách yêu cầu hoàn tiền theo đơn
  const t10 = await callApi(`/api/v1/hoan-tien/theo-don/${testDonId}`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t10.status === 200 && Array.isArray(t10.data?.items), 
    `Tra cứu danh sách hoàn tiền theo đơn #${testDonId} thành công (HTTP 200, Tổng yêu cầu: ${t10.data?.items?.length})`);

  // Test 11: Chủ đơn xem danh sách hoàn tiền của đơn mình -> 200
  const t11 = await callApi(`/api/v1/hoan-tien/theo-don/${testDonId}`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t11.status === 200 && Array.isArray(t11.data?.items), 'Khách hàng chủ đơn tra cứu yêu cầu hoàn tiền của mình (HTTP 200)');

  // Test 12: Khách hàng lạ xem danh sách hoàn tiền đơn người khác -> 404
  const t12 = await callApi(`/api/v1/hoan-tien/theo-don/${testDonId}`, {
    headers: { Authorization: `Bearer ${otherCustomerToken}` }
  });
  assert(t12.status === 404 || t12.status === 403, 'Chặn khách hàng lạ xem danh sách hoàn tiền đơn người khác (HTTP 404)');

  // Test 13: Xử lý yêu cầu hoàn tiền không tồn tại -> 404
  const t13 = await callApi(`/api/v1/hoan-tien/999999/xu-ly`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({})
  });
  assert(t13.status === 404, 'Báo lỗi 404 khi xử lý yêu cầu hoàn tiền không tồn tại (HTTP 404)');

  // Test 14: Đối chiếu kết quả hoàn tiền không tồn tại -> 404
  const t14 = await callApi(`/api/v1/hoan-tien/999999/doi-chieu`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t14.status === 404, 'Báo lỗi 404 khi đối chiếu yêu cầu hoàn tiền không tồn tại (HTTP 404)');

  // Test 15: Gateway webhook callback giả mạo chữ ký -> 400 KET_QUA_HOAN_KHONG_KHOP
  const t15 = await callApi(`/api/v1/hoan-tien/ket-qua`, {
    method: 'POST',
    body: JSON.stringify({
      maYeuCau: 'REFUND-FAKE-001',
      maGiaoDichCong: 'GW-123456',
      trangThai: 'ThanhCong',
      chuKy: 'invalid_signature_mock'
    })
  });
  assert(t15.status === 400, 'Gateway callback bị từ chối khi chữ ký HMAC không khớp (HTTP 400 KET_QUA_HOAN_KHONG_KHOP)');

  // =========================================================================
  // PHẦN 5: W4-T9 — THEO DÕI TIẾN ĐỘ TÀI CHÍNH ĐƠN THUÊ & DÒNG TIỀN
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 5] Kiểm tra W4-T9: Toàn cảnh tài chính đơn thuê & Dòng tiền${colors.reset}`);

  // Test 16: Khách hàng truy vấn chi tiết đơn và dòng tiền -> 200
  const t16 = await callApi(`/api/v1/don-thue/${testDonId}`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t16.status === 200 && t16.data != null, 'Khách hàng tra cứu toàn cảnh đơn thuê và dòng tiền (HTTP 200)');

  // Test 17: Vận hành tra cứu toàn cảnh đơn thuê -> 200
  const t17 = await callApi(`/api/v1/van-hanh/don-thue/${testDonId}`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t17.status === 200 && t17.data != null, 'Nhân viên vận hành tra cứu chi tiết tiến độ tài chính đơn (HTTP 200)');

  // Test 18: Lấy lịch sử biến động trạng thái và tài chính của đơn
  const t18 = await callApi(`/api/v1/don-thue/${testDonId}/lich-su`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t18.status === 200 && Array.isArray(t18.data), 'Lấy lịch sử biến động vòng đời và sự kiện tài chính của đơn (HTTP 200)');

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  console.log(`\n${colors.cyan}${colors.bold}=== TỔNG KẾT KIỂM THỬ W4 THANH TÙNG ===${colors.reset}`);
  console.log(`  Tổng số ca kiểm thử: ${passedCount + failedCount}`);
  console.log(`  ${colors.green}Thành công: ${passedCount}${colors.reset}`);
  console.log(`  ${failedCount > 0 ? colors.red : colors.green}Thất bại:   ${failedCount}${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
