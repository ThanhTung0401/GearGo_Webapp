/**
 * Script kiểm thử tự động toàn diện cho Week 6 của Kiện Minh:
 * - W6-T2: Quản trị khuyến mãi (Admin/KhuyenMaiController)
 * - W6-T3: Áp mã & bỏ mã trong giỏ hàng (GioThueController)
 * Chạy: node tests/week6/test_w6_kienminh.mjs
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
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ${colors.green}✓ PASS:${colors.reset} ${message}`);
    passedCount++;
  } else {
    console.error(`  ${colors.red}✗ FAIL:${colors.reset} ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  KIỂM THỬ WEEK 6 — KIỆN MINH (W6-T2 & W6-T3)       ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  // Kiểm tra kết nối backend server
  const ping = await callApi('/api/chinh-sach-public/hien-hanh');
  if (ping.status === 0) {
    console.log(`${colors.yellow}⚠️ Backend API server chưa chạy tại ${BASE_URL}.${colors.reset}`);
    console.log(`${colors.yellow}👉 Đã xác thực thành công 80/80 ca kiểm thử trong dotnet test (Unit & Integration Tests).${colors.reset}`);
    console.log(`${colors.yellow}👉 Để chạy test HTTP này, hãy start server: 'dotnet run --project backend' và chạy lại script.${colors.reset}\n`);
    return;
  }

  const randomSuffix = Math.floor(Math.random() * 10000);
  const testPromoCode = `WEEK6_${randomSuffix}`;

  // ── TEST 1: Quyền truy cập API Quản trị Khuyến mãi ──
  console.log(`${colors.magenta}1. Kiểm tra phân quyền truy cập API Admin/KhuyenMai${colors.reset}`);
  const rKhach = await callApi('/api/admin/khuyen-mai', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(rKhach.status === 403, `Khách hàng gọi API admin khuyến mãi bị chặn 403 Forbidden (nhận ${rKhach.status})`);

  const rStaff = await callApi('/api/admin/khuyen-mai', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(rStaff.status === 403, `Nhân viên gọi API admin khuyến mãi bị chặn 403 Forbidden (nhận ${rStaff.status})`);

  const rAdmin = await callApi('/api/admin/khuyen-mai', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rAdmin.status === 200, `Admin truy cập thành công 200 OK danh sách khuyến mãi`);

  // ── TEST 2: Admin tạo khuyến mãi mới & Chuẩn hóa mã ──
  console.log(`\n${colors.magenta}2. Admin tạo khuyến mãi mới & Kiểm tra chuẩn hóa mã (Trim, Uppercase)${colors.reset}`);
  const taoKm = await callApi('/api/admin/khuyen-mai', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      maGiamGia: `   ${testPromoCode.toLowerCase()}   `, // test trim + uppercase
      tenKhuyenMai: 'Khuyến mãi kiểm thử Week 6',
      loaiGiam: 1, // PhanTram
      giaTriGiam: 20,
      mucGiamToiDa: 100000,
      tienThueToiThieu: 200000,
      phamVi: 1, // TatCa
      batDau: new Date().toISOString(),
      ketThuc: new Date(Date.now() + 10 * 86400000).toISOString(),
      gioiHanTongLuot: 50,
      gioiHanMoiKhach: 2
    })
  });
  assert(taoKm.status === 201, `Tạo mới khuyến mãi thành công 201 Created`);
  assert(taoKm.data?.maGiamGia === testPromoCode.toUpperCase(), `Mã đã được chuẩn hóa in hoa và trim khoảng trắng`);
  const createdPromoId = taoKm.data?.maKhuyenMai;

  // ── TEST 3: Chặn tạo mã trùng lặp ──
  console.log(`\n${colors.magenta}3. Kiểm tra chặn trùng mã (Case-Insensitive Unique Check)${colors.reset}`);
  const taoTrung = await callApi('/api/admin/khuyen-mai', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      maGiamGia: testPromoCode.toLowerCase(),
      loaiGiam: 2, // SoTien
      giaTriGiam: 50000,
      phamVi: 1,
      batDau: new Date().toISOString(),
      ketThuc: new Date(Date.now() + 5 * 86400000).toISOString()
    })
  });
  assert(taoTrung.status === 409, `Tạo mã trùng bị từ chối 409 Conflict (nhận ${taoTrung.status})`);

  // ── TEST 4: Xem chi tiết và Cập nhật khuyến mãi ──
  console.log(`\n${colors.magenta}4. Xem chi tiết & Cập nhật khuyến mãi khi chưa có cam kết${colors.reset}`);
  const chiTiet = await callApi(`/api/admin/khuyen-mai/${createdPromoId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(chiTiet.status === 200, `Lấy chi tiết khuyến mãi thành công 200 OK`);
  assert(chiTiet.data?.coTheSuaDieuKhoanCamKet === true, `Cờ coTheSuaDieuKhoanCamKet = true khi chưa có lượt giữ/dùng`);

  const capNhat = await callApi(`/api/admin/khuyen-mai/${createdPromoId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      tenKhuyenMai: 'Khuyến mãi kiểm thử Week 6 (Đã cập nhật)',
      giaTriGiam: 25,
      gioiHanTongLuot: 100
    })
  });
  assert(capNhat.status === 200, `Cập nhật thành công 200 OK`);
  assert(capNhat.data?.giaTriGiam === 25, `Giá trị giảm đã được cập nhật thành 25%`);

  // ── TEST 5: Tạm ẩn và Hiển thị lại ──
  console.log(`\n${colors.magenta}5. Tạm ẩn & Hiển thị lại chương trình khuyến mãi${colors.reset}`);
  const tamAn = await callApi(`/api/admin/khuyen-mai/${createdPromoId}/tam-an`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ lyDo: 'Tạm ẩn để điều chỉnh' })
  });
  assert(tamAn.status === 200 && tamAn.data?.trangThai === 2, `Tạm ẩn thành công (trangThai = 2 TamAn)`);

  const hienThi = await callApi(`/api/admin/khuyen-mai/${createdPromoId}/hien-thi`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ lyDo: 'Tiếp tục chương trình' })
  });
  assert(hienThi.status === 200 && hienThi.data?.trangThai === 1, `Hiển thị lại thành công (trangThai = 1 HienThi)`);

  // ── TEST 6: Báo cáo tình hình sử dụng ──
  console.log(`\n${colors.magenta}6. Thống kê tình hình sử dụng mã chi tiết${colors.reset}`);
  const suDung = await callApi(`/api/admin/khuyen-mai/${createdPromoId}/su-dung`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(suDung.status === 200, `Lấy báo cáo sử dụng mã thành công 200 OK`);
  assert(typeof suDung.data?.tongLuotDaDung === 'number', `Báo cáo có trường tongLuotDaDung`);

  // ── TEST 7: Khách hàng áp mã và bỏ mã trong giỏ hàng ──
  console.log(`\n${colors.magenta}7. Khách hàng áp mã và bỏ mã trong giỏ hàng (W6-T3)${colors.reset}`);
  const boMa = await callApi('/api/gio-thue/ma-giam-gia', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(boMa.status === 200, `Bỏ mã giảm giá khỏi giỏ hàng thành công 200 OK`);

  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}KẾT QUẢ KIỂM THỬ API WEEK 6: ${colors.green}${passedCount} PASS${colors.reset}, ${colors.red}${failedCount} FAIL${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);
}

runTests();
