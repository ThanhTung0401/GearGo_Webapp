import crypto from 'node:crypto';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const JWT_SECRET = 'GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!';

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m'
};

let passedCount = 0;
let failedCount = 0;

function generateToken(role, maTaiKhoan = 10002, email = 'admin@geargo.vn') {
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

let adminToken = generateToken('QuanTriVien', 10002, 'admin@geargo.vn');
let staffToken = generateToken('NhanVien', 10003, 'staff@geargo.vn');
let customerToken = generateToken('KhachHang', 10004, 'customer@geargo.vn');

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
  for (const adminId of [10002, 1]) {
    const candidate = generateToken('QuanTriVien', adminId, 'admin@geargo.vn');
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/bao-cao-van-hanh`, {
        headers: { 'Authorization': `Bearer ${candidate}` }
      });
      if (res.status === 200) {
        adminToken = candidate;
        const staffId = adminId === 10002 ? 10003 : 2;
        const customerId = adminId === 10002 ? 10004 : 3;
        staffToken = generateToken('NhanVien', staffId, 'staff@geargo.vn');
        customerToken = generateToken('KhachHang', customerId, 'customer@geargo.vn');
        break;
      }
    } catch {}
  }
}

async function run() {
  console.log(`${colors.bold}${colors.cyan}=== TEST W6-T4: BÁO CÁO VẬN HÀNH & CHỈ SỐ THUÊ (TUẤN KIỆT) ===${colors.reset}\n`);

  await detectAccountTokens();

  // 1. Phân quyền: Khách hàng bị chặn 403
  const customerRes = await fetch(`${BASE_URL}/api/v1/admin/bao-cao-van-hanh`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  assert(customerRes.status === 403, 'Chặn khách hàng xem báo cáo vận hành (HTTP 403)');

  // 2. Phân quyền: Nhân viên bị chặn 403 (AdminOnly policy)
  const staffRes = await fetch(`${BASE_URL}/api/v1/admin/bao-cao-van-hanh`, {
    headers: { 'Authorization': `Bearer ${staffToken}` }
  });
  assert(staffRes.status === 403, 'Chặn nhân viên xem báo cáo vận hành (HTTP 403 AdminOnly)');

  // 3. Admin truy vấn thành công 200
  const adminRes = await fetch(`${BASE_URL}/api/v1/admin/bao-cao-van-hanh`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminRes.status === 200, 'Admin lấy báo cáo vận hành thành công (HTTP 200)');

  if (adminRes.status === 200) {
    const data = await adminRes.json();
    assert(data.tongQuan != null, 'Dữ liệu tổng quan tồn tại');
    assert(typeof data.tongQuan?.tongDonPhatSinh === 'number', 'Chỉ số tổng đơn phát sinh là số hợp lệ');
    assert(typeof data.tongQuan?.tyLeHuyDonPhanTram === 'number', 'Chỉ số tỷ lệ hủy đơn là số hợp lệ');
    assert(typeof data.tongQuan?.tyLeHaoMonPhanTram === 'number', 'Chỉ số tỷ lệ hao mòn là số hợp lệ');
    assert(typeof data.tongQuan?.tyLeQuayVongThietBi === 'number', 'Chỉ số tỷ lệ quay vòng là số hợp lệ');
    assert(Array.isArray(data.chiSoTheoSanPham), 'Dữ liệu chỉ số theo sản phẩm là danh sách');

    console.log(`\n  ${colors.yellow}── Chi tiết chỉ số vận hành ──${colors.reset}`);
    console.log(`     Tổng đơn phát sinh: ${data.tongQuan?.tongDonPhatSinh}`);
    console.log(`     Tổng đơn thành công: ${data.tongQuan?.tongDonThanhCong}`);
    console.log(`     Tổng đơn hủy: ${data.tongQuan?.tongDonBiHuy}`);
    console.log(`     Tỷ lệ hủy: ${data.tongQuan?.tyLeHuyDonPhanTram}%`);
    console.log(`     Tổng thiết bị trong kho: ${data.tongQuan?.tongThietBiTrongKho}`);
    console.log(`     Số thiết bị đang thuê: ${data.tongQuan?.soThietBiDangChoThue}`);
    console.log(`     Số thiết bị bảo trì: ${data.tongQuan?.soThietBiDangBaoTri}`);
    console.log(`     Số thiết bị thất lạc: ${data.tongQuan?.soThietBiThatLac}`);
    console.log(`     Tỷ lệ hao mòn: ${data.tongQuan?.tyLeHaoMonPhanTram}%`);
    console.log(`     Số ngày thuê TB: ${data.tongQuan?.soNgayThueTrungBinh} ngày`);
    console.log(`     Tỷ lệ quay vòng: ${data.tongQuan?.tyLeQuayVongThietBi}`);
  }

  // 4. Lọc theo khoảng ngày
  const tuNgay = new Date(Date.now() - 7 * 86400000).toISOString();
  const denNgay = new Date().toISOString();
  const filterRes = await fetch(`${BASE_URL}/api/v1/admin/bao-cao-van-hanh?TuNgay=${tuNgay}&DenNgay=${denNgay}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(filterRes.status === 200, 'Lọc báo cáo vận hành theo ngày thành công (HTTP 200)');

  // 5. Lọc theo danh mục
  const filterDmRes = await fetch(`${BASE_URL}/api/v1/admin/bao-cao-van-hanh?MaDanhMuc=1`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(filterDmRes.status === 200, 'Lọc báo cáo vận hành theo danh mục thành công (HTTP 200)');

  console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bold}  KẾT QUẢ KIỂM THỬ W6-T4: ${passedCount} PASS / ${failedCount} FAIL (Tổng cộng: ${passedCount + failedCount} ca kiểm thử)${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

run();
