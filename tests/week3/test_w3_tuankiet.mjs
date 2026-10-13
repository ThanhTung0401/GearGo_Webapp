/**
 * Script kiểm thử tự động API của Tuấn Kiệt:
 * - Tạo Đơn thuê (UC02)
 * - Thanh Toán (UC03)
 * - Lập & Chốt Bàn Giao (UC11)
 * Chạy: node tests/test_w3_tuankiet.mjs
 */

import crypto from 'node:crypto';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const JWT_SECRET = 'GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!';

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m'
};

let passedCount = 0;
let failedCount = 0;

function generateToken(role, maTaiKhoan = 1, email = 'nhanvien@geargo.vn') {
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

const adminToken = generateToken('QuanTriVien', 1);

async function request(method, path, body = null, token = adminToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const status = res.status;
  let data;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status, data };
}

function assert(condition, message, errorDetails = '') {
  if (condition) {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
    passedCount++;
  } else {
    console.error(`${colors.red}✗ ${message}${colors.reset}`);
    if (errorDetails) console.error(`  Chi tiết lỗi:`, errorDetails);
    failedCount++;
  }
}

async function runTests() {
  console.log(`${colors.cyan}${colors.bold}=== BẮT ĐẦU TEST LUỒNG W3-T8 (TUẤN KIỆT) ===${colors.reset}\n`);

  // 1. Tạo Đơn Thuê
  console.log(`${colors.yellow}1. Test Tạo Đơn Thuê${colors.reset}`);
  const taoDonRes = await request('POST', '/api/v1/don-thue', {
    maKhachHang: 1,
    gioNhanDuKien: new Date(Date.now() + 86400000).toISOString(),
    gioTraDuKien: new Date(Date.now() + 172800000).toISOString(),
    tenNguoiNhan: "Khách VIP",
    soDienThoaiNguoiNhan: "0987654321",
    emailLienHe: "vip@test.com",
    ghiChu: "Test tự động",
    chiTiet: [{ maSanPham: 1, soLuong: 1 }]
  });
  
  assert(taoDonRes.status === 200 || (taoDonRes.status === 400 && taoDonRes.data.maLoi === "HET_HANG"), "Tạo đơn thuê (Pass nếu Thành công hoặc Báo Hết Hàng do DB trống)", taoDonRes.data);
  if (taoDonRes.status === 200) {
    const maDonThue = taoDonRes.data.maDonThue;
    console.log(`\n${colors.yellow}2. Test Thanh Toán Đơn Thuê${colors.reset}`);
    const thanhToanRes = await request('POST', '/api/v1/thanh-toan/xac-nhan', {
      maDonThue: maDonThue,
      phuongThucThanhToan: "ChuyenKhoan",
      tongSoTien: 5000000,
      maGiaoDichCong: "TEST_BANK_001",
      ghiChu: "Test thanh toan"
    });
    assert(thanhToanRes.status === 200, "Thanh toán thành công (Chuyển trạng thái sang DaXacNhan)", thanhToanRes.data);

    console.log(`\n${colors.yellow}3. Test Bàn Giao (Nháp theo đơn thật)${colors.reset}`);
    const nhapRes = await request('POST', `/api/v1/ban-giao/nhap/${maDonThue}`);
    assert(
      nhapRes.status === 400 && nhapRes.data.maLoi === "INVALID_STATE", 
      "Từ chối tạo phiếu bàn giao nếu đơn chưa sẵn sàng", 
      nhapRes.data
    );
  } else {
    console.log(`  ${colors.yellow}ℹ DB hiện trống, tiếp tục kiểm thử bảo mật & validation trực tiếp các API Bàn Giao...${colors.reset}`);
  }

  // 4. Kiểm thử trực tiếp toàn bộ các endpoint bàn giao (Phân quyền & Validation)
  console.log(`\n${colors.yellow}4. Kiểm thử phân quyền & hợp đồng các API Bàn Giao (W3-T8)${colors.reset}`);

  // Khách hàng bị chặn 403 khi lập bàn giao
  const customerToken = generateToken('KhachHang', 3, 'khach@geargo.vn');
  const khachBanGiao = await request('POST', '/api/v1/ban-giao/nhap/1', {}, customerToken);
  assert(khachBanGiao.status === 403, "Khách hàng bị từ chối truy cập API bàn giao (HTTP 403)");

  // Tra cứu bàn giao theo đơn không tồn tại -> 400 hoặc 404
  const bgTheoDon = await request('GET', '/api/v1/ban-giao/don-thue/999999');
  assert(bgTheoDon.status === 400 || bgTheoDon.status === 404, "Tra cứu bàn giao theo đơn không tồn tại (HTTP 400/404)");

  // Tạo phiếu bàn giao nháp với đơn không tồn tại -> 400 hoặc 404
  const taoNhapFake = await request('POST', '/api/v1/ban-giao/nhap/999999');
  assert(taoNhapFake.status === 400 || taoNhapFake.status === 404, "Tạo phiếu bàn giao nháp với đơn không tồn tại (HTTP 400/404)");

  // Cập nhật phiếu bàn giao nháp không tồn tại -> 400 hoặc 404
  const capNhatNhapFake = await request('PUT', '/api/v1/ban-giao/nhap/999999', { ghiChu: 'Test' });
  assert(capNhatNhapFake.status === 400 || capNhatNhapFake.status === 404, "Cập nhật phiếu bàn giao nháp không tồn tại (HTTP 400/404)");

  // Chốt phiếu bàn giao không tồn tại -> 400 hoặc 404
  const chotBgFake = await request('POST', '/api/v1/ban-giao/999999/chot', { xacNhanKhachHang: true });
  assert(chotBgFake.status === 400 || chotBgFake.status === 404, "Chốt phiếu bàn giao không tồn tại (HTTP 400/404)");

  console.log(`\n${colors.cyan}${colors.bold}=== TỔNG KẾT ===${colors.reset}`);
  console.log(`Passed: ${colors.green}${passedCount}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failedCount}${colors.reset}`);
}

runTests();
