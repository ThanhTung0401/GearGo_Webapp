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

function generateToken(role, maTaiKhoan = 10002, email = 'admin@geargo.vn') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    MaTaiKhoan: maTaiKhoan.toString(),
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': maTaiKhoan.toString(),
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': email,
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': role,
    exp: now + 7 * 24 * 3600
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
    if (errorDetail) console.log('     Chi tiết:', errorDetail);
    failedCount++;
  }
}

async function detectAccountTokens() {
  for (const adminId of [10002, 1]) {
    const candidate = generateToken('QuanTriVien', adminId, 'admin@geargo.vn');
    try {
      const res = await fetch(`${BASE_URL}/api/chinh-sach`, {
        headers: { Authorization: `Bearer ${candidate}` }
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
  console.log(`${colors.bold}${colors.cyan}=== TEST W6-T1 & W6-T7: CHÍNH SÁCH & NHẬT KÝ HỆ THỐNG (THANH TÙNG) ===${colors.reset}\n`);

  await detectAccountTokens();

  // --- PHẦN 1: W6-T1 (Quản trị chính sách - UC83) ---
  console.log(`${colors.bold}[PHẦN 1] W6-T1: Quản trị chính sách thuê & hủy${colors.reset}`);

  const noAuthPolicy = await fetch(`${BASE_URL}/api/chinh-sach`);
  assert(noAuthPolicy.status === 401, 'Từ chối yêu cầu không có token khi xem chính sách (HTTP 401)');

  const custPolicy = await fetch(`${BASE_URL}/api/chinh-sach`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(custPolicy.status === 403, 'Khách hàng bị cấm truy cập quản trị chính sách (HTTP 403)');

  const staffPolicy = await fetch(`${BASE_URL}/api/chinh-sach`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(staffPolicy.status === 403, 'Nhân viên bị cấm truy cập quản trị chính sách (HTTP 403 AdminOnly)');

  const adminPoliciesRes = await fetch(`${BASE_URL}/api/chinh-sach?trang=1&kichThuoc=10`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminPoliciesRes.status === 200, 'Admin lấy danh sách phiên bản chính sách thành công (HTTP 200)');

  let firstPolicyId = null;
  if (adminPoliciesRes.status === 200) {
    const data = await adminPoliciesRes.json();
    const list = data.items || data.duLieu || [];
    assert(Array.isArray(list), 'Danh sách chính sách trả về dạng mảng hợp lệ');
    if (list.length > 0) {
      firstPolicyId = list[0].maChinhSach ?? list[0].id;
    }
  }

  if (firstPolicyId) {
    const detailRes = await fetch(`${BASE_URL}/api/chinh-sach/${firstPolicyId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(detailRes.status === 200, `Admin xem chi tiết phiên bản chính sách #${firstPolicyId} (HTTP 200)`);
  }

  const notFoundPolicy = await fetch(`${BASE_URL}/api/chinh-sach/999999`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(notFoundPolicy.status === 404, 'Báo 404 khi xem phiên bản chính sách không tồn tại');

  // Kiểm tra validation endpoint /kiem-tra với dữ liệu lỗi (không ghi DB)
  const invalidCheckRes = await fetch(`${BASE_URL}/api/chinh-sach/kiem-tra`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  assert(invalidCheckRes.status === 400, 'Endpoint /kiem-tra chặn payload rỗng / thiếu trường bắt buộc (HTTP 400)');

  // Kiểm tra chặn tạo phiên bản khi thiếu dữ liệu bắt buộc
  const invalidCreateRes = await fetch(`${BASE_URL}/api/chinh-sach`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  assert(invalidCreateRes.status === 400, 'Chặn ban hành chính sách mới khi thiếu dữ liệu bắt buộc (HTTP 400)');

  // --- PHẦN 2: W6-T7 (Nhật ký hệ thống - UC100-UC102) ---
  console.log(`\n${colors.bold}[PHẦN 2] W6-T7: Nhật ký thao tác & Kiểm toán (Audit Log)${colors.reset}`);

  const noAuthAudit = await fetch(`${BASE_URL}/api/nhat-ky`);
  assert(noAuthAudit.status === 401, 'Từ chối yêu cầu không có token khi xem nhật ký (HTTP 401)');

  const custAudit = await fetch(`${BASE_URL}/api/nhat-ky`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(custAudit.status === 403, 'Khách hàng bị cấm truy cập nhật ký hệ thống (HTTP 403)');

  const staffAudit = await fetch(`${BASE_URL}/api/nhat-ky?trang=1&soMoiTrang=10`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(staffAudit.status === 200, 'Nhân viên truy cập nhật ký vận hành thành công (HTTP 200 StaffOrAdmin)');

  if (staffAudit.status === 200) {
    const staffData = await staffAudit.json();
    const staffItems = staffData.items || [];
    const sensitive = ['TAI_KHOAN', 'NHAN_VIEN', 'CHINH_SACH', 'QUYEN_VAI_TRO', 'ROLE_PERMISSION'];
    const leaked = staffItems.some((item) => {
      const loai = (item.loaiDoiTuong || '').toUpperCase();
      return sensitive.includes(loai) && item.maTaiKhoan !== 10003 && item.maTaiKhoan !== 2;
    });
    assert(!leaked, 'Nhân viên không xem được nhật ký nhạy cảm (tài khoản/chính sách/phân quyền) của người khác');
  }

  const adminAudit = await fetch(`${BASE_URL}/api/nhat-ky?trang=1&soMoiTrang=15`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminAudit.status === 200, 'Admin tra cứu nhật ký hệ thống thành công (HTTP 200)');

  if (adminAudit.status === 200) {
    const auditData = await adminAudit.json();
    assert(Array.isArray(auditData.items), 'Kết quả nhật ký trả về mảng items phân trang chuẩn PagedResult');
    assert(typeof auditData.totalItems === 'number', 'Kết quả nhật ký có tổng số bản ghi totalItems hợp lệ');
  }

  const filteredAudit = await fetch(`${BASE_URL}/api/nhat-ky?tuKhoa=DON&trang=1&soMoiTrang=5`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(filteredAudit.status === 200, 'Lọc nhật ký hệ thống theo từ khóa thành công (HTTP 200)');

  console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bold}  KẾT QUẢ KIỂM THỬ W6-T1 & W6-T7: ${passedCount} PASS / ${failedCount} FAIL (Tổng: ${passedCount + failedCount})${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Lỗi thực thi test_w6_thanhtung:', err);
  process.exit(1);
});
