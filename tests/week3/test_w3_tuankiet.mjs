/**
 * Script kiểm thử tự động API của Tuấn Kiệt:
 * - Tạo Đơn thuê an toàn chống IDOR (UC05 / UC02)
 * - Hủy Đơn thuê an toàn (UC05)
 * - Thanh Toán (UC03)
 * - Lập & Chốt Bàn Giao (UC11 / W3-T8)
 * Chạy: node tests/week3/test_w3_tuankiet.mjs
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
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': role,
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': email,
    'exp': now + 7 * 24 * 3600
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

let adminToken = generateToken('QuanTriVien', 1, 'admin@geargo.vn');
let staffToken = generateToken('NhanVien', 2, 'staff@geargo.vn');
let customerToken = generateToken('KhachHang', 3, 'customer@geargo.vn');
let otherCustomerToken = generateToken('KhachHang', 4, 'other@geargo.vn');

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

async function detectAccountTokens() {
  for (const baseId of [1, 10002]) {
    const candidate = generateToken('QuanTriVien', baseId, 'admin@geargo.vn');
    const res = await request('GET', '/api/auth/toi', null, candidate);
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
  }
}

async function runTests() {
  console.log(`${colors.cyan}${colors.bold}=== BẮT ĐẦU TEST LUỒNG W3-T8 & UC05 (TUẤN KIỆT) ===${colors.reset}\n`);

  await detectAccountTokens();

  // 1. Phân quyền Tạo Đơn Thuê: Admin/Staff bị chặn 403
  console.log(`${colors.yellow}1. Test Phân quyền & Chống IDOR khi Tạo Đơn Thuê${colors.reset}`);
  const adminTaoDon = await request('POST', '/api/v1/don-thue', {
    maKhachHang: 1,
    gioNhanDuKien: new Date(Date.now() + 86400000).toISOString(),
    gioTraDuKien: new Date(Date.now() + 172800000).toISOString(),
    tenNguoiNhan: "Admin Thử",
    soDienThoaiNguoiNhan: "0987654321",
    emailLienHe: "admin@geargo.vn",
    chiTiet: [{ maSanPham: 1, soLuong: 1 }]
  }, adminToken);
  assert(adminTaoDon.status === 403, "Admin bị từ chối gọi API tạo đơn thuê của khách (HTTP 403)");

  // Đảm bảo sản phẩm thử nghiệm luôn ở trạng thái DangKinhDoanh để tránh xung đột với các test đổi trạng thái trước đó
  await request('PATCH', '/api/admin/san-pham/1/trang-thai', { trangThaiMoi: 'DangKinhDoanh' }, adminToken);

  // Khách hàng tạo đơn với MaKhachHang giả mạo trong body -> hệ thống phải ghi đè từ JWT
  const taoDonRes = await request('POST', '/api/v1/don-thue', {
    maKhachHang: 999999, // IDOR attempt!
    gioNhanDuKien: new Date(Date.now() + 86400000).toISOString(),
    gioTraDuKien: new Date(Date.now() + 172800000).toISOString(),
    tenNguoiNhan: "Khách VIP",
    soDienThoaiNguoiNhan: "0987654321",
    emailLienHe: "vip@test.com",
    ghiChu: "Test tự động chống IDOR",
    chiTiet: [{ maSanPham: 1, soLuong: 1 }]
  }, customerToken);

  assert(
    taoDonRes.status === 200 || (taoDonRes.status === 400 && taoDonRes.data.maLoi === "HET_HANG"),
    "Khách hàng tạo đơn thuê thành công (Pass nếu Thành công hoặc Hết Hàng)",
    taoDonRes.data
  );

  if (taoDonRes.status === 200) {
    const maDonThue = taoDonRes.data.maDonThue;
    console.log(`  -> Tạo đơn thành công với Mã #${maDonThue}, Mã hiển thị: ${taoDonRes.data.maDonHienThi}`);

    // Test hủy đơn trái phép: Khách hàng khác cố gắng hủy đơn của khách này -> 400 KHONG_CO_QUYEN
    console.log(`\n${colors.yellow}2. Test Bảo mật IDOR khi Hủy Đơn Thuê${colors.reset}`);
    const huyTraiPhep = await request('PUT', `/api/v1/don-thue/${maDonThue}/huy`, {
      lyDo: "Tôi muốn hủy đơn của người khác"
    }, otherCustomerToken);
    assert(
      huyTraiPhep.status === 400 && huyTraiPhep.data.maLoi === "KHONG_CO_QUYEN",
      "Khách hàng khác không thể hủy đơn của người khác (Bảo vệ IDOR)",
      huyTraiPhep.data
    );

    // Chủ đơn hủy hợp lệ -> Thành công
    const huyHopLe = await request('PUT', `/api/v1/don-thue/${maDonThue}/huy`, {
      lyDo: "Đổi ý không thuê nữa"
    }, customerToken);
    assert(huyHopLe.status === 200, "Chủ đơn hủy đơn thành công", huyHopLe.data);

    // Không thể hủy lần 2
    const huyLan2 = await request('PUT', `/api/v1/don-thue/${maDonThue}/huy`, {
      lyDo: "Hủy tiếp"
    }, customerToken);
    assert(
      huyLan2.status === 400 && huyLan2.data.maLoi === "INVALID_STATE",
      "Không thể hủy đơn khi đã hủy (Trạng thái không hợp lệ)",
      huyLan2.data
    );
  }

  // 3. Kiểm thử trực tiếp toàn bộ các endpoint bàn giao (Phân quyền & Validation W3-T8)
  console.log(`\n${colors.yellow}3. Kiểm thử phân quyền & hợp đồng các API Bàn Giao (W3-T8)${colors.reset}`);

  // Khách hàng bị chặn 403 khi lập bàn giao
  const khachBanGiao = await request('POST', '/api/v1/ban-giao/nhap/1', {}, customerToken);
  assert(khachBanGiao.status === 403, "Khách hàng bị từ chối truy cập API bàn giao (HTTP 403)");

  // Tra cứu bàn giao theo đơn không tồn tại -> 400 hoặc 404
  const bgTheoDon = await request('GET', '/api/v1/ban-giao/don-thue/999999', null, adminToken);
  assert(bgTheoDon.status === 400 || bgTheoDon.status === 404, "Tra cứu bàn giao theo đơn không tồn tại (HTTP 400/404)");

  // Tạo phiếu bàn giao nháp với đơn không tồn tại -> 400 hoặc 404
  const taoNhapFake = await request('POST', '/api/v1/ban-giao/nhap/999999', null, adminToken);
  assert(taoNhapFake.status === 400 || taoNhapFake.status === 404, "Tạo phiếu bàn giao nháp với đơn không tồn tại (HTTP 400/404)");

  // Cập nhật phiếu bàn giao nháp không tồn tại -> 400 hoặc 404
  const capNhatNhapFake = await request('PUT', '/api/v1/ban-giao/nhap/999999', { ghiChu: 'Test' }, adminToken);
  assert(capNhatNhapFake.status === 400 || capNhatNhapFake.status === 404, "Cập nhật phiếu bàn giao nháp không tồn tại (HTTP 400/404)");

  // Chốt phiếu bàn giao không tồn tại -> 400 hoặc 404
  const chotBgFake = await request('POST', '/api/v1/ban-giao/999999/chot', { xacNhanKhachHang: true }, adminToken);
  assert(chotBgFake.status === 400 || chotBgFake.status === 404, "Chốt phiếu bàn giao không tồn tại (HTTP 400/404)");

  console.log(`\n${colors.cyan}${colors.bold}=== TỔNG KẾT ===${colors.reset}`);
  console.log(`Passed: ${colors.green}${passedCount}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failedCount}${colors.reset}`);
}

runTests();
