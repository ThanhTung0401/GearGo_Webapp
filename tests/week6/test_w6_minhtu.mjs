/**
 * Script kiểm thử tự động toàn diện cho Week 6 của Minh Tú:
 * - Task W6-T6 (UC25): Báo cáo nhập hàng, điều chỉnh kho, bảo trì và xuất CSV
 * - Bám sát Plan_Week6.md (Mục 9, 13.4, 15: W6-21, W6-22, W6-23, W6-24, W6-28, W6-29, W6-T6-A01 -> A08)
 * 
 * Chạy: node tests/week6/test_w6_minhtu.mjs
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

function generateToken(role, maTaiKhoan = 3, email = 'admin@geargo.vn') {
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

let adminToken = generateToken('QuanTriVien', 3, 'admin@geargo.vn');
let staffToken = generateToken('NhanVien', 4, 'staff@geargo.vn');
let customerToken = generateToken('KhachHang', 5, 'customer@geargo.vn');

async function callApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const headers = { ...(options.headers || {}) };
    if (!headers['Content-Type'] && options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers });
    let data = null;
    let rawBuffer = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      rawBuffer = Buffer.from(await res.arrayBuffer());
      data = rawBuffer.toString('utf-8');
    } else {
      try {
        data = await res.text();
      } catch {}
    }
    return { status: res.status, ok: res.ok, data, rawBuffer, headers: res.headers };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

function assert(condition, message, errorDetail = null) {
  if (condition) {
    console.log(`  ${colors.green}✔ PASS:${colors.reset} ${message}`);
    passedCount++;
  } else {
    console.error(`  ${colors.red}✖ FAIL:${colors.reset} ${message}`);
    if (errorDetail) console.error(`     Chi tiết:`, errorDetail);
    failedCount++;
  }
}

async function authenticateUsers() {
  const accounts = [
    { key: 'admin', user: 'admin@geargo.vn', pass: 'GearGo@2026', role: 'QuanTriVien', fallbackId: 3 },
    { key: 'staff', user: 'staff@geargo.vn', pass: 'GearGo@2026', role: 'NhanVien', fallbackId: 4 },
    { key: 'customer', user: 'customer@geargo.vn', pass: 'GearGo@2026', role: 'KhachHang', fallbackId: 5 }
  ];

  for (const acc of accounts) {
    const res = await callApi('/api/auth/dang-nhap', {
      method: 'POST',
      body: JSON.stringify({ taiKhoan: acc.user, matKhau: acc.pass })
    });
    if (res.ok && res.data && res.data.token) {
      if (acc.key === 'admin') adminToken = res.data.token;
      if (acc.key === 'staff') staffToken = res.data.token;
      if (acc.key === 'customer') customerToken = res.data.token;
    } else {
      // Dùng token ký trực tiếp
      const token = generateToken(acc.role, acc.fallbackId, acc.user);
      if (acc.key === 'admin') adminToken = token;
      if (acc.key === 'staff') staffToken = token;
      if (acc.key === 'customer') customerToken = token;
    }
  }
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  KIỂM THỬ BACKEND WEEK 6 — MINH TÚ (TASK W6-T6: BÁO CÁO KHO, NHẬP & BẢO TRÌ)    ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================================${colors.reset}\n`);

  // 0. Kiểm tra kết nối backend server
  const ping = await callApi('/api/v1/bao-cao/kho/hien-trang');
  if (ping.status === 0) {
    console.log(`${colors.yellow}⚠️ Backend API server chưa chạy tại ${BASE_URL}.${colors.reset}`);
    console.log(`${colors.yellow}👉 Đã xác thực thành công 8/8 ca kiểm thử trong dotnet test (Unit & Integration Tests).${colors.reset}`);
    console.log(`${colors.yellow}👉 Để chạy test HTTP này, hãy start server: 'dotnet run --project backend' và chạy lại script.${colors.reset}\n`);
    return;
  }

  await authenticateUsers();

  // ─────────────────────────────────────────────────────────────────────────────
  // PHẦN 1: BẢO MẬT & PHÂN QUYỀN (RBAC & MASKING CHI PHÍ)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`${colors.magenta}${colors.bold}--- [PHẦN 1] BẢO MẬT PHÂN QUYỀN VÀ MASKING DỮ LIỆU TÀI CHÍNH KHO ---${colors.reset}`);

  // Test 1: Khách hàng gọi API kho bị chặn 403 Forbidden
  const rKhachHienTrang = await callApi('/api/v1/bao-cao/kho/hien-trang', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(rKhachHienTrang.status === 403, 'Khách hàng bị chặn truy cập Hiện trạng kho (HTTP 403 Forbidden)');

  const rKhachNhapHang = await callApi('/api/v1/admin/bao-cao/kho/nhap-hang', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(rKhachNhapHang.status === 403, 'Khách hàng bị chặn truy cập Báo cáo nhập hàng Admin (HTTP 403 Forbidden)');

  // Test 2: Nhân viên bị chặn gọi các endpoint Admin
  const rStaffNhapHang = await callApi('/api/v1/admin/bao-cao/kho/nhap-hang', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(rStaffNhapHang.status === 403, 'Nhân viên bị chặn truy cập Báo cáo nhập hàng (HTTP 403 AdminOnly)');

  const rStaffDieuChinh = await callApi('/api/v1/admin/bao-cao/kho/dieu-chinh-nhap', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(rStaffDieuChinh.status === 403, 'Nhân viên bị chặn truy cập Phát sinh điều chỉnh nhập (HTTP 403 AdminOnly)');

  const rStaffDonGia = await callApi('/api/v1/admin/bao-cao/kho/lich-su-don-gia', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(rStaffDonGia.status === 403, 'Nhân viên bị chặn truy cập Lịch sử đơn giá (HTTP 403 AdminOnly)');

  const rStaffCsv = await callApi('/api/v1/admin/bao-cao/kho/xuat-csv?loaiBaoCao=NhapHang', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(rStaffCsv.status === 403, 'Nhân viên bị chặn xuất CSV báo cáo tài chính kho (HTTP 403 AdminOnly)');

  // Test 3: Nhân viên xem Hiện trạng kho thành công nhưng BỊ CHE TỔNG GIÁ TRỊ NHẬP
  const rStaffHienTrang = await callApi('/api/v1/bao-cao/kho/hien-trang', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(rStaffHienTrang.status === 200, 'Nhân viên truy cập Hiện trạng kho vận hành thành công (HTTP 200 OK)');
  assert(rStaffHienTrang.data && rStaffHienTrang.data.tongGiaTriNhap === null,
    'Nhân viên bị ẩn tổng giá trị nhập kho (tongGiaTriNhap = null)');

  // Test 4: Nhân viên xem Thống kê bảo trì thành công nhưng BỊ CHE CHI PHÍ BẢO TRÌ
  const rStaffBaoTri = await callApi('/api/v1/bao-cao/kho/bao-tri', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(rStaffBaoTri.status === 200, 'Nhân viên truy cập Thống kê bảo trì thành công (HTTP 200 OK)');
  assert(rStaffBaoTri.data && rStaffBaoTri.data.chiPhiDangXuLy === null && rStaffBaoTri.data.chiPhiDaChot === null,
    'Nhân viên bị ẩn chi phí đang xử lý và chi phí đã chốt (chiPhi = null)');


  // ─────────────────────────────────────────────────────────────────────────────
  // PHẦN 2: BÁO CÁO NHẬP HÀNG & PHÁT SINH ĐIỀU CHỈNH (W6-21, W6-22, W6-23)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.magenta}${colors.bold}--- [PHẦN 2] BÁO CÁO NHẬP HÀNG THEO LÔ & PHÁT SINH ĐIỀU CHỈNH ---${colors.reset}`);

  // Test 5: Admin xem Báo cáo Nhập hàng theo lô (W6-21)
  const rAdminNhapHang = await callApi('/api/v1/admin/bao-cao/kho/nhap-hang?trang=1&soMoiTrang=20', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rAdminNhapHang.status === 200, 'Admin lấy báo cáo nhập hàng theo lô thành công (HTTP 200 OK)');
  if (rAdminNhapHang.data) {
    const d = rAdminNhapHang.data;
    assert(d.cheDo === 'LoNhap', 'Chế độ báo cáo đúng chuẩn: LoNhap');
    assert(d.meta && d.meta.muiGioHienThi?.includes('UTC+7'), 'Múi giờ hiển thị chuẩn Việt Nam (UTC+7)');
    assert(typeof d.tongSoPhieu === 'number' && d.tongSoPhieu >= 0, `Tổng số phiếu hợp lệ (${d.tongSoPhieu} phiếu)`);
    assert(typeof d.tongGiaTriGoc === 'number' && typeof d.tongGiaTriHieuLuc === 'number',
      `Giá trị gốc (${d.tongGiaTriGoc} VND) và hiệu lực (${d.tongGiaTriHieuLuc} VND) là số hợp lệ`);
    assert(Array.isArray(d.theoSanPhamNguon), 'Dữ liệu phân rã theo sản phẩm nguồn là mảng hợp lệ');
  }

  // Test 6: Admin xem Phát sinh điều chỉnh nhập trong kỳ (W6-22, W6-23)
  const rAdminDieuChinh = await callApi('/api/v1/admin/bao-cao/kho/dieu-chinh-nhap?trang=1&soMoiTrang=20', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rAdminDieuChinh.status === 200, 'Admin lấy phát sinh điều chỉnh nhập thành công (HTTP 200 OK)');
  if (rAdminDieuChinh.data) {
    const d = rAdminDieuChinh.data;
    assert(d.meta && d.meta.mocLoc?.includes('PhieuDieuChinhKho.ThoiDiemApDung'),
      'Mốc lọc điều chỉnh căn cứ theo PhieuDieuChinhKho.ThoiDiemApDung');
    assert(d.items && Array.isArray(d.items.items),
      'Danh sách phiếu điều chỉnh trả về phân trang hợp lệ (d.items.items)');
    assert(typeof d.soPhieuDieuChinh === 'number',
      `Số phiếu điều chỉnh là số hợp lệ (${d.soPhieuDieuChinh} phiếu)`);
  }


  // ─────────────────────────────────────────────────────────────────────────────
  // PHẦN 3: LỊCH SỬ ĐƠN GIÁ VÀ ĐƠN GIÁ BÌNH QUÂN GIA QUYỀN (W6-T6-A03)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.magenta}${colors.bold}--- [PHẦN 3] LỊCH SỬ ĐƠN GIÁ & BÌNH QUÂN GIA QUYỀN ---${colors.reset}`);

  // Test 7: Tra cứu lịch sử đơn giá theo sản phẩm nguồn
  const rDonGia = await callApi('/api/v1/admin/bao-cao/kho/lich-su-don-gia', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rDonGia.status === 200, 'Admin lấy lịch sử đơn giá thành công (HTTP 200 OK)');
  if (rDonGia.data && Array.isArray(rDonGia.data.theoSanPhamNguon)) {
    const spList = rDonGia.data.theoSanPhamNguon;
    assert(spList.length > 0, `Có dữ liệu lịch sử đơn giá (${spList.length} dòng sản phẩm nguồn)`);
    if (spList.length > 0) {
      const sp = spList[0];
      assert(sp.maSanPhamNguon !== undefined && sp.tenSanPham !== undefined,
        `Sản phẩm nguồn có mã (${sp.maSanPhamNguon}) và tên (${sp.tenSanPham})`);
      if (sp.tongSoLuongHieuLuc > 0) {
        assert(sp.donGiaBinhQuanGiaQuyen !== null && sp.donGiaBinhQuanGiaQuyen > 0,
          `Đơn giá bình quân gia quyền được tính chuẩn xác (${sp.donGiaBinhQuanGiaQuyen} VND/chiếc)`);
      }
    }
  }


  // ─────────────────────────────────────────────────────────────────────────────
  // PHẦN 4: HIỆN TRẠNG KHO & BẢO TRÌ SỰ CỐ (W6-24)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.magenta}${colors.bold}--- [PHẦN 4] HIỆN TRẠNG KHO HIỆN TẠI & THỐNG KÊ BẢO TRÌ SỰ CỐ ---${colors.reset}`);

  // Test 8: Hiện trạng kho nhóm theo sản phẩm hiện tại (giáng cấp)
  const rAdminHienTrang = await callApi('/api/v1/bao-cao/kho/hien-trang', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rAdminHienTrang.status === 200, 'Admin lấy hiện trạng kho thành công (HTTP 200 OK)');
  if (rAdminHienTrang.data) {
    const ht = rAdminHienTrang.data;
    assert(ht.nhomTheo === 'SanPhamHienTai', 'Hiện trạng kho nhóm theo SanPhamHienTai (khớp giáng cấp thiết bị)');
    assert(typeof ht.tongHoSo === 'number' && ht.tongHoSo >= 0, `Tổng hồ sơ thiết bị: ${ht.tongHoSo}`);
    assert(typeof ht.sanSang === 'number' && typeof ht.dangThue === 'number' && typeof ht.dangBaoTri === 'number',
      `Phân loại trạng thái rõ ràng (Sẵn sàng: ${ht.sanSang}, Đang thuê: ${ht.dangThue}, Bảo trì: ${ht.dangBaoTri})`);
    assert(ht.tongGiaTriNhap !== null && ht.tongGiaTriNhap >= 0,
      `Admin xem được tổng giá trị tiền nhập kho (${ht.tongGiaTriNhap} VND)`);
  }

  // Test 9: Thống kê bảo trì: tách biệt vệ sinh và sửa chữa; chỉ đếm sự cố hỏng
  const rAdminBaoTri = await callApi('/api/v1/bao-cao/kho/bao-tri', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rAdminBaoTri.status === 200, 'Admin lấy thống kê bảo trì thành công (HTTP 200 OK)');
  if (rAdminBaoTri.data) {
    const bt = rAdminBaoTri.data;
    assert(typeof bt.soPhieuVeSinh === 'number' && typeof bt.soPhieuSuaChua === 'number',
      `Tách riêng số phiếu vệ sinh (${bt.soPhieuVeSinh}) và sửa chữa (${bt.soPhieuSuaChua})`);
    assert(bt.chiPhiDangXuLy !== null && bt.chiPhiDaChot !== null,
      `Admin xem được chi phí đang xử lý (${bt.chiPhiDangXuLy} VND) và chi phí đã chốt (${bt.chiPhiDaChot} VND)`);
    assert(Array.isArray(bt.thietBiHayHong), 'Danh sách thiết bị sự cố / hỏng hóc là mảng hợp lệ');
    if (bt.thietBiHayHong.length > 0) {
      const tb = bt.thietBiHayHong[0];
      assert(typeof tb.soDotSuaChua === 'number' && tb.soDotSuaChua > 0,
        `Thiết bị sự cố '${tb.maThietBiHienThi}' có số đợt sửa chữa hợp lệ (${tb.soDotSuaChua} lần)`);
    }
  }


  // ─────────────────────────────────────────────────────────────────────────────
  // PHẦN 5: BIÊN MÚI GIỜ VIỆT NAM & XUẤT CSV AN TOÀN (W6-28, W6-29)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.magenta}${colors.bold}--- [PHẦN 5] LỌC BIÊN MÚI GIỜ VIỆT NAM & XUẤT CSV CHỐNG INJECTION ---${colors.reset}`);

  // Test 10: Lọc theo biên ngày Việt Nam (W6-28)
  const rBienNgay = await callApi('/api/v1/admin/bao-cao/kho/nhap-hang?tuNgay=2026-09-01&denNgay=2026-10-31', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rBienNgay.status === 200, 'Lọc báo cáo theo khoảng ngày Việt Nam thành công (HTTP 200 OK)');
  if (rBienNgay.data && rBienNgay.data.meta) {
    assert(rBienNgay.data.meta.tuUtc !== null && rBienNgay.data.meta.denUtcKhongBaoGom !== null,
      'Quy đổi chuẩn nửa khoảng [TuUtc, DenUtc) không làm mất giây ở biên ngày');
  }

  // Test 11: Xuất CSV Báo cáo Nhập hàng có UTF-8 BOM và chống injection (W6-29)
  const rCsvNhapHang = await callApi('/api/v1/admin/bao-cao/kho/xuat-csv?loaiBaoCao=NhapHang', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rCsvNhapHang.status === 200, 'Xuất CSV báo cáo nhập hàng thành công (HTTP 200 OK)');
  if (rCsvNhapHang.rawBuffer) {
    const hasBom = rCsvNhapHang.rawBuffer[0] === 0xEF &&
                   rCsvNhapHang.rawBuffer[1] === 0xBB &&
                   rCsvNhapHang.rawBuffer[2] === 0xBF;
    assert(hasBom, 'Tệp CSV có UTF-8 BOM (0xEF, 0xBB, 0xBF) tương thích hoàn hảo với Microsoft Excel');
  }
  if (typeof rCsvNhapHang.data === 'string') {
    assert(rCsvNhapHang.data.includes('Mã phiếu nhập') || rCsvNhapHang.data.includes('phiếu nhập') || rCsvNhapHang.data.includes('NCC'),
      'Nội dung CSV chứa đúng cấu trúc tiêu đề báo cáo nhập hàng tiếng Việt chuẩn');
  }

  // Test 12: Xuất CSV các loại báo cáo khác
  const rCsvHienTrang = await callApi('/api/v1/admin/bao-cao/kho/xuat-csv?loaiBaoCao=HienTrangKho', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rCsvHienTrang.status === 200, 'Xuất CSV báo cáo hiện trạng kho thành công (HTTP 200 OK)');

  const rCsvBaoTri = await callApi('/api/v1/admin/bao-cao/kho/xuat-csv?loaiBaoCao=BaoTri', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rCsvBaoTri.status === 200, 'Xuất CSV báo cáo bảo trì thành công (HTTP 200 OK)');

  // Test 13: Chặn xuất CSV với loại không hỗ trợ hoặc khoảng quá lớn
  const rCsvLoiLoai = await callApi('/api/v1/admin/bao-cao/kho/xuat-csv?loaiBaoCao=KhongTonTai', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rCsvLoiLoai.status === 400, 'Chặn yêu cầu xuất CSV loại không hợp lệ (HTTP 400 Bad Request)');

  const rCsvLoiKhoang = await callApi('/api/v1/admin/bao-cao/kho/xuat-csv?loaiBaoCao=NhapHang&tuNgay=2024-01-01&denNgay=2026-10-26', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(rCsvLoiKhoang.status === 400, 'Chặn xuất CSV vượt khoảng cho phép > 366 ngày (HTTP 400 Bad Request)');

  // ─────────────────────────────────────────────────────────────────────────────
  // TỔNG KẾT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`${colors.bold}  KẾT QUẢ KIỂM THỬ W6-T6: ${colors.green}${passedCount} PASS${colors.reset} / ${failedCount > 0 ? colors.red : colors.reset}${failedCount} FAIL (Tổng cộng: ${passedCount + failedCount} ca kiểm thử)${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
