/**
 * Script kiểm thử tự động toàn diện cho W4-T4 của Kim Xuyến:
 * - Đối soát tiền cọc, hoàn tất và điều chỉnh đối soát (UC15)
 * - Chạy: node tests/week4/test_w4_kimxuyen.mjs
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
const otherCustomerToken = generateToken('KhachHang', 4, 'other@geargo.vn');

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
  console.log(`${colors.bold}${colors.cyan}=== BẮT ĐẦU KIỂM THỬ WEEK 4 - KIM XUYẾN (W4-T4: ĐỐI SOÁT CỌC & HOÀN TẤT) ===${colors.reset}\n`);

  const testDonId = 1;

  // =========================================================================
  // 1. PHÂN QUYỀN TRUY CẬP
  // =========================================================================
  console.log(`${colors.bold}[PHẦN 1] Kiểm tra phân quyền truy cập${colors.reset}`);

  // Test 1: Khách hàng không được quyền xem trước bảng tính đối soát -> 403
  const t1 = await callApi(`/api/doi-soat/theo-don/${testDonId}/xem-truoc`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t1.status === 403, 'Khách hàng gọi xem trước đối soát bị chặn (403)');

  // Test 2: Khách hàng không được quyền lập đối soát -> 403
  const t2 = await callApi(`/api/doi-soat/theo-don/${testDonId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ maDonThue: testDonId })
  });
  assert(t2.status === 403, 'Khách hàng tự ý lập đối soát bị chặn (403)');

  // Test 3: Khách hàng khác xem đối soát của đơn thuê không thuộc sở hữu -> 403
  const t3 = await callApi(`/api/doi-soat/theo-don/${testDonId}`, {
    headers: { Authorization: `Bearer ${otherCustomerToken}` }
  });
  assert(t3.status === 403, 'Khách hàng khác xem đối soát đơn #1 bị chặn (403)');

  // =========================================================================
  // 2. XEM TRƯỚC VÀ XEM CHI TIẾT ĐỐI SOÁT
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 2] Xem trước và truy vấn đối soát${colors.reset}`);

  // Test 4: Nhân viên xem trước bảng tính đối soát của đơn #1
  const t4 = await callApi(`/api/doi-soat/theo-don/${testDonId}/xem-truoc`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t4.status === 200 && t4.data !== null, 'Nhân viên gọi API xem trước thành công (200)');
  if (t4.status === 200) {
    console.log(`    ℹ Trạng thái đủ điều kiện: ${t4.data.duDieuKien}`);
    if (!t4.data.duDieuKien) {
      console.log(`    ℹ Danh sách vướng mắc: ${JSON.stringify(t4.data.vuongMac)}`);
    }
  }

  // Test 5: Nhân viên truy vấn đối soát theo đơn thuê (đã seed)
  const t5 = await callApi(`/api/doi-soat/theo-don/${testDonId}`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t5.status === 200 && t5.data.maDonThue === testDonId, 'Nhân viên lấy thông tin đối soát theo đơn thuê thành công (200)');
  const doiSoatHienTai = t5.data;

  // Test 6: Khách hàng chủ đơn xem đối soát của mình -> 200
  const t6 = await callApi(`/api/doi-soat/theo-don/${testDonId}`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t6.status === 200 && t6.data.maDonThue === testDonId, 'Khách hàng chủ đơn xem đối soát của mình thành công (200)');

  // =========================================================================
  // 3. XÁC NHẬN BẢNG TÍNH & XỬ LÝ TIỀN
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 3] Thao tác Xác nhận bảng tính & Yêu cầu xử lý tiền${colors.reset}`);

  if (doiSoatHienTai && doiSoatHienTai.maDoiSoat) {
    const maDoiSoat = doiSoatHienTai.maDoiSoat;

    // Test 7: Nhân viên gọi phát lệnh xử lý tiền (chấp nhận 200, 409 hoặc 400 nếu cọc đã được lệnh hoàn trước đó)
    const t7 = await callApi(`/api/doi-soat/${maDoiSoat}/xu-ly-tien`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const daXuLyTien = t7.status === 200 || t7.status === 409 || (t7.status === 400 && t7.data?.maLoi === 'VUOT_HAN_MUC_HOAN');
    assert(daXuLyTien, `Phát lệnh xử lý tiền cho đối soát #${maDoiSoat} (HTTP ${t7.status}${t7.status === 400 ? ' - ' + t7.data?.maLoi : ''})`);
    if (t7.status === 200) {
      console.log(`    ℹ Trạng thái đối soát sau lệnh tiền: ${t7.data.trangThai}`);
    } else if (t7.status === 400 && t7.data?.maLoi === 'VUOT_HAN_MUC_HOAN') {
      console.log(`    ℹ Tiền cọc đã được phát lệnh xử lý ở lần chạy trước (hạn mức hoàn tiền được bảo vệ an toàn)`);
    }

    // Test 8: Khách hàng không được gọi chốt đối soát -> 403
    const t8 = await callApi(`/api/doi-soat/${maDoiSoat}/chot`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(t8.status === 403, 'Khách hàng không được quyền chốt đối soát (403)');

    // Test 9: Nhân viên không phải admin không được lập đối soát điều chỉnh -> 403
    const t9 = await callApi(`/api/doi-soat/${maDoiSoat}/dieu-chinh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        danhSachMaPhuPhiDieuChinh: [1],
        lyDo: 'Giảm phí sau khiếu nại'
      })
    });
    assert(t9.status === 403, 'Nhân viên thường không có quyền lập đối soát điều chỉnh (403 - AdminOnly)');
  }

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  console.log(`\n${colors.bold}========================================${colors.reset}`);
  console.log(`${colors.bold}KẾT QUẢ KIỂM THỬ: ${colors.green}${passedCount} PASS${colors.reset} / ${failedCount > 0 ? colors.red : colors.reset}${failedCount} FAIL`);
  console.log(`${colors.bold}========================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
