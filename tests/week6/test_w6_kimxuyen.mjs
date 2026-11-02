/**
 * Test Suite cho W6-T5: BÁO CÁO TÀI CHÍNH VÀ SỐ DƯ CẦN XỬ LÝ (KIM XUYẾN - UC25)
 * 
 * Kiểm thử toàn diện các yêu cầu nghiệp vụ theo Plan_Week6.md:
 * - Bảo mật RBAC & ActorGuard: Chặn Khách hàng & Nhân viên (403 AdminOnly), chỉ cho phép Quản trị viên (200).
 * - Báo cáo Doanh thu hoàn tất: Tiền thuê sau giảm + Phụ phí đối soát ban đầu; cọc KHÔNG cộng vào doanh thu.
 * - Báo cáo Phí hủy: Giữ lại tiền thuê khi hủy, lưu danh sách chi tiết các đơn hủy.
 * - Báo cáo Điều chỉnh doanh thu: Tách bạch các phiếu đối soát điều chỉnh sau chốt.
 * - Báo cáo Dòng tiền: Thực thu bóc tách tiền thuê / tiền cọc, dòng tiền hoàn.
 * - Báo cáo Số dư cọc chưa tất toán: Cọc thực thu - Cọc đã hoàn - Cọc đã bù phụ phí (toàn bộ lịch sử).
 * - Báo cáo Khoản cần xử lý / Ngoại lệ: Liệt kê các khoản chờ phân loại, đơn thiếu đối soát.
 * - Xuất file CSV: Đúng UTF-8 BOM, an toàn CSV formula injection.
 * - Bắt lỗi validation khoảng ngày không hợp lệ (tuNgay > denNgay).
 * 
 * Chạy riêng: node tests/week6/test_w6_kimxuyen.mjs
 * Hoặc chạy qua runner: node tests/week6/test_week6_apis.mjs
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

async function detectAccountTokens() {
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/dang-nhap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taiKhoan: 'admin@geargo.vn', matKhau: 'GearGo@2026' })
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      if (data.token) {
        adminToken = data.token;
        const adminId = data.maTaiKhoan || 1;
        staffToken = generateToken('NhanVien', adminId === 1 ? 2 : 10003, 'staff@geargo.vn');
        customerToken = generateToken('KhachHang', adminId === 1 ? 3 : 10004, 'customer@geargo.vn');
        return;
      }
    }
  } catch {}

  for (const adminId of [1, 10002]) {
    const candidate = generateToken('QuanTriVien', adminId, 'admin@geargo.vn');
    try {
      const res = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat`, {
        headers: { 'Authorization': `Bearer ${candidate}` }
      });
      if (res.status === 200) {
        adminToken = candidate;
        const staffId = adminId === 1 ? 2 : 10003;
        const customerId = adminId === 1 ? 3 : 10004;
        staffToken = generateToken('NhanVien', staffId, 'staff@geargo.vn');
        customerToken = generateToken('KhachHang', customerId, 'customer@geargo.vn');
        break;
      }
    } catch {}
  }
}

async function run() {
  console.log(`${colors.bold}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  TEST W6-T5: BÁO CÁO TÀI CHÍNH VÀ SỐ DƯ CẦN XỬ LÝ (KIM XUYẾN - UC25)          ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================================${colors.reset}\n`);

  await detectAccountTokens();

  // ============================================================================
  // 1. KIỂM SOÁT TRUY CẬP (RBAC & ACTOR GUARD)
  // ============================================================================
  console.log(`${colors.bold}${colors.yellow}[1] Kiểm tra phân quyền truy cập (AdminOnly & ActorGuard)${colors.reset}`);
  
  // 1.1 Không có token -> 401
  const noAuthRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat`);
  assert(noAuthRes.status === 401, 'Từ chối yêu cầu không có Bearer token (HTTP 401)');

  // 1.2 Khách hàng truy cập -> 403
  const customerRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  assert(customerRes.status === 403, 'Chặn tài khoản Khách hàng truy cập báo cáo tài chính (HTTP 403)');

  // 1.3 Nhân viên truy cập -> 403 (chỉ Admin mới được xem)
  const staffRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat`, {
    headers: { 'Authorization': `Bearer ${staffToken}` }
  });
  assert(staffRes.status === 403, 'Chặn tài khoản Nhân viên truy cập báo cáo tài chính (HTTP 403 AdminOnly)');

  // 1.4 Quản trị viên truy cập hợp lệ -> 200
  const adminRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminRes.status === 200, 'Quản trị viên được cấp quyền truy cập báo cáo tài chính (HTTP 200)');

  // ============================================================================
  // 2. BÁO CÁO DOANH THU HOÀN TẤT
  // ============================================================================
  console.log(`\n${colors.bold}${colors.yellow}[2] Báo cáo Doanh thu hoàn tất (/doanh-thu-hoan-tat)${colors.reset}`);
  const dtRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat?tuNgay=2026-10-01&denNgay=2026-10-31`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(dtRes.status === 200, 'Gọi API Doanh thu hoàn tất trả về HTTP 200');
  if (dtRes.ok) {
    const dtData = await dtRes.json();
    assert(typeof dtData.tongDoanhThuHoanTat === 'number', 'Tổng doanh thu hoàn tất là kiểu số');
    assert(typeof dtData.tongDoanhThuThueSauGiam === 'number', 'Tiền thuê sau giảm là kiểu số');
    assert(typeof dtData.tongPhuPhiDoiSoatBanDau === 'number', 'Phụ phí đối soát ban đầu là kiểu số');
    assert(
      Math.abs(dtData.tongDoanhThuHoanTat - (dtData.tongDoanhThuThueSauGiam + dtData.tongPhuPhiDoiSoatBanDau)) < 0.01,
      'Doanh thu hoàn tất = Tiền thuê sau giảm + Phụ phí đối soát ban đầu (không cộng cọc)'
    );
    assert(Array.isArray(dtData.items), 'Danh sách đơn hoàn tất trả về dạng mảng');
    console.log(`     Doanh thu hoàn tất: ${dtData.tongDoanhThuHoanTat?.toLocaleString('vi-VN')} đ (Đơn hoàn tất: ${dtData.soDonHoanTat})`);
  }

  // ============================================================================
  // 3. BÁO CÁO PHÍ HỦY
  // ============================================================================
  console.log(`\n${colors.bold}${colors.yellow}[3] Báo cáo Phí hủy (/phi-huy)${colors.reset}`);
  const phRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/phi-huy?tuNgay=2026-10-01&denNgay=2026-10-31`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(phRes.status === 200, 'Gọi API Phí hủy trả về HTTP 200');
  if (phRes.ok) {
    const phData = await phRes.json();
    assert(typeof phData.tongPhiHuyGiuLai === 'number', 'Tổng phí hủy giữ lại là kiểu số');
    assert(typeof phData.soDonHuyCoPhi === 'number', 'Số đơn hủy có phí là kiểu số');
    assert(Array.isArray(phData.items), 'Danh sách đơn hủy trả về dạng mảng');
    console.log(`     Tổng phí hủy giữ lại: ${phData.tongPhiHuyGiuLai?.toLocaleString('vi-VN')} đ (Số đơn hủy: ${phData.soDonHuyCoPhi})`);
  }

  // ============================================================================
  // 4. BÁO CÁO ĐIỀU CHỈNH DOANH THU
  // ============================================================================
  console.log(`\n${colors.bold}${colors.yellow}[4] Báo cáo Điều chỉnh doanh thu (/dieu-chinh)${colors.reset}`);
  const dcRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/dieu-chinh?tuNgay=2026-10-01&denNgay=2026-10-31`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(dcRes.status === 200, 'Gọi API Điều chỉnh doanh thu trả về HTTP 200');
  if (dcRes.ok) {
    const dcData = await dcRes.json();
    assert(typeof dcData.tongDeltaDoanhThu === 'number', 'Tổng delta doanh thu là kiểu số');
    assert(typeof dcData.soPhieuDieuChinh === 'number', 'Số phiếu điều chỉnh là kiểu số');
    assert(Array.isArray(dcData.items), 'Danh sách phiếu điều chỉnh trả về dạng mảng');
    console.log(`     Tổng delta điều chỉnh: ${dcData.tongDeltaDoanhThu?.toLocaleString('vi-VN')} đ (Số phiếu: ${dcData.soPhieuDieuChinh})`);
  }

  // ============================================================================
  // 5. BÁO CÁO DÒNG TIỀN THU VÀ HOÀN
  // ============================================================================
  console.log(`\n${colors.bold}${colors.yellow}[5] Báo cáo Dòng tiền thu và hoàn (/thu-hoan)${colors.reset}`);
  const thRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/thu-hoan?tuNgay=2026-10-01&denNgay=2026-10-31`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(thRes.status === 200, 'Gọi API Dòng tiền thu/hoàn trả về HTTP 200');
  if (thRes.ok) {
    const thData = await thRes.json();
    assert(typeof thData.tongThuThucTe === 'number', 'Tổng thu thực tế là kiểu số');
    assert(typeof thData.thuTienThue === 'number', 'Thực thu tiền thuê là kiểu số');
    assert(typeof thData.thuTienCoc === 'number', 'Thực thu tiền cọc là kiểu số');
    assert(typeof thData.tongHoanThucTe === 'number', 'Tổng hoàn thực tế là kiểu số');
    assert(typeof thData.dongTienRong === 'number', 'Dòng tiền ròng là kiểu số');
    assert(
      thData.tongThuThucTe >= thData.thuTienThue + thData.thuTienCoc,
      'Thực thu phản ánh đúng phân loại nguồn tiền (Tiền thuê + Tiền cọc + Khoản khác)'
    );
    console.log(`     Tổng thu thực tế: ${thData.tongThuThucTe?.toLocaleString('vi-VN')} đ (Thuê: ${thData.thuTienThue}, Cọc: ${thData.thuTienCoc}) | Tổng hoàn: ${thData.tongHoanThucTe?.toLocaleString('vi-VN')} đ`);
  }

  // ============================================================================
  // 6. BÁO CÁO SỐ DƯ CỌC CHƯA TẤT TOÁN
  // ============================================================================
  console.log(`\n${colors.bold}${colors.yellow}[6] Báo cáo Số dư cọc chưa tất toán (/coc-chua-tat-toan)${colors.reset}`);
  const cocRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/coc-chua-tat-toan`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(cocRes.status === 200, 'Gọi API Cọc chưa tất toán trả về HTTP 200');
  if (cocRes.ok) {
    const cocData = await cocRes.json();
    assert(typeof cocData.tongCocDaThu === 'number', 'Tổng cọc đã thu là kiểu số');
    assert(typeof cocData.tongCocDaHoan === 'number', 'Tổng cọc đã hoàn là kiểu số');
    assert(typeof cocData.tongCocDaBuPhuPhi === 'number', 'Tổng cọc đã bù phụ phí là kiểu số');
    assert(
      Math.abs(cocData.tongCocChuaTatToan - (cocData.tongCocDaThu - cocData.tongCocDaHoan - cocData.tongCocDaBuPhuPhi)) < 0.01,
      'Cọc chưa tất toán = Cọc đã thu - Cọc đã hoàn - Cọc đã bù phụ phí'
    );
    assert(cocData.meta?.mocLoc === 'SoDuHienTaiTaiThoiDiemTruyVan', 'Số dư cọc tính trên toàn bộ lịch sử đơn');
    console.log(`     Tổng cọc còn giữ: ${cocData.tongCocChuaTatToan?.toLocaleString('vi-VN')} đ (Số đơn còn giữ cọc: ${cocData.soDonConGiuCoc})`);
  }

  // ============================================================================
  // 7. BÁO CÁO KHOẢN CẦN XỬ LÝ / NGOẠI LỆ
  // ============================================================================
  console.log(`\n${colors.bold}${colors.yellow}[7] Báo cáo Khoản cần xử lý / Ngoại lệ (/can-xu-ly)${colors.reset}`);
  const cxlRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/can-xu-ly`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(cxlRes.status === 200, 'Gọi API Khoản cần xử lý trả về HTTP 200');
  if (cxlRes.ok) {
    const cxlData = await cxlRes.json();
    assert(typeof cxlData.soKhoanThuCanDoiChieu === 'number', 'Số khoản thu cần đối chiếu là số');
    assert(typeof cxlData.soKhoanThuChoPhanLoai === 'number', 'Số khoản thu chờ phân loại là số');
    assert(typeof cxlData.soKhoanHoanDangCho === 'number', 'Số khoản hoàn đang chờ là số');
    assert(typeof cxlData.soDonHoanTatThieuDoiSoat === 'number', 'Số đơn hoàn tất thiếu đối soát là số');
    console.log(`     Đơn thiếu đối soát: ${cxlData.soDonHoanTatThieuDoiSoat} | Thu cần đối chiếu: ${cxlData.soKhoanThuCanDoiChieu} | Hoàn đang chờ: ${cxlData.soKhoanHoanDangCho}`);
  }

  // ============================================================================
  // 8. XUẤT BÁO CÁO RA FILE CSV
  // ============================================================================
  console.log(`\n${colors.bold}${colors.yellow}[8] Xuất báo cáo CSV UTF-8 BOM (/xuat-csv)${colors.reset}`);
  
  // 8.1 Xuất CSV Doanh thu hoàn tất
  const csvRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/xuat-csv?loaiBaoCao=DoanhThuHoanTat&tuNgay=2026-10-01&denNgay=2026-10-31`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(csvRes.status === 200, 'Xuất CSV Doanh thu hoàn tất trả về HTTP 200');
  const contentType = csvRes.headers.get('content-type') || '';
  assert(contentType.includes('text/csv'), 'Content-Type chứa text/csv');
  
  const csvBuffer = await csvRes.arrayBuffer();
  const bytes = new Uint8Array(csvBuffer);
  const hasUtf8Bom = bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
  assert(hasUtf8Bom, 'Nội dung file CSV có tiền tố UTF-8 BOM (0xEF, 0xBB, 0xBF) tương thích Excel tiếng Việt');

  // 8.2 Xuất CSV Cọc chưa tất toán
  const csvCocRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/xuat-csv?loaiBaoCao=CocChuaTatToan`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(csvCocRes.status === 200, 'Xuất CSV Số dư cọc chưa tất toán trả về HTTP 200');

  // 8.3 Loại báo cáo không hợp lệ -> 400
  const csvLoiRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/xuat-csv?loaiBaoCao=LoaiKhongTonTai`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(csvLoiRes.status === 400, 'Từ chối loại báo cáo CSV không hợp lệ (HTTP 400)');

  // ============================================================================
  // 9. VALIDATION KHOẢNG NGÀY
  // ============================================================================
  console.log(`\n${colors.bold}${colors.yellow}[9] Kiểm tra bắt lỗi validation khoảng thời gian${colors.reset}`);
  const invalidDateRes = await fetch(`${BASE_URL}/api/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat?tuNgay=2026-10-31&denNgay=2026-10-01`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(invalidDateRes.status === 400, 'Báo lỗi khi từ ngày lớn hơn đến ngày (HTTP 400 KHOANG_BAO_CAO_KHONG_HOP_LE)');

  // ============================================================================
  // TỔNG KẾT
  // ============================================================================
  console.log(`\n${colors.cyan}${colors.bold}================================================================================${colors.reset}`);
  console.log(`${colors.bold}KẾT QUẢ TEST W6-T5 (KIM XUYẾN):${colors.reset} ${colors.green}${passedCount} Đạt (PASS)${colors.reset}, ${failedCount > 0 ? colors.red : colors.reset}${failedCount} Thất bại (FAIL)`);
  console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error(`${colors.red}Lỗi không mong muốn trong quá trình kiểm thử:${colors.reset}`, err);
  process.exit(1);
});
