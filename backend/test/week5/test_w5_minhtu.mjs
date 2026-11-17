import crypto from 'node:crypto';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const JWT_SECRET = 'GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!';

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m'
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

async function callApi(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

async function runTests() {
  console.log(`${colors.cyan}${colors.bold}=== BẮT ĐẦU TEST SUITE W5-T4 & W5-T5 (MINH TÚ) ===${colors.reset}\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // PHẦN 1: W5-T4 — THEO DÕI KHO, KIỂM KÊ VÀ KHẢ DỤNG
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`${colors.yellow}>>> [W5-T4] KIỂM TRA TỔNG QUAN VÀ TRA CỨU KHO <<<${colors.reset}`);

  // Test W5-T4-A01: Thống kê tổng quan kho
  const resTongQuanAdmin = await callApi('/api/kho/tong-quan', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(resTongQuanAdmin.status === 200, 'W5-T4-A01: Admin lấy tổng quan kho thành công (HTTP 200)');
  if (resTongQuanAdmin.data) {
    assert(typeof resTongQuanAdmin.data.tongHoSoThietBi === 'number' && resTongQuanAdmin.data.tongHoSoThietBi > 0,
      `W5-T4-A01: Tổng hồ sơ thiết bị hợp lệ (${resTongQuanAdmin.data.tongHoSoThietBi} thiết bị)`);
    assert(resTongQuanAdmin.data.tongGiaTriNhap !== null && resTongQuanAdmin.data.tongGiaTriNhap > 0,
      `W5-T4-A01: Admin xem được tổng giá trị tiền nhập (${resTongQuanAdmin.data.tongGiaTriNhap} VNĐ)`);
  }

  // Test W5-T4-A06: Nhân viên không xem được tổng tiền nhập (Bảo mật chi phí)
  const resTongQuanStaff = await callApi('/api/kho/tong-quan', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(resTongQuanStaff.status === 200, 'W5-T4-A06: Nhân viên lấy tổng quan kho thành công (HTTP 200)');
  if (resTongQuanStaff.data) {
    assert(resTongQuanStaff.data.tongGiaTriNhap === null,
      'W5-T4-A06: Nhân viên bị che tổng giá trị tiền nhập (null)');
  }

  // Test Tra cứu thiết bị phân trang
  const resDsThietBi = await callApi('/api/kho/thiet-bi?trang=1&soMoiTrang=10', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(resDsThietBi.status === 200, 'W5-T4: Tra cứu thiết bị kho phân trang thành công (HTTP 200)');
  let thietBiMau = null;
  if (resDsThietBi.data && resDsThietBi.data.items && resDsThietBi.data.items.length > 0) {
    thietBiMau = resDsThietBi.data.items[0];
    assert(thietBiMau.maThietBiHienThi !== undefined && thietBiMau.tenSanPhamHienTai !== undefined,
      `W5-T4: Dòng thiết bị có đầy đủ thông tin mã hiện thị (${thietBiMau.maThietBiHienThi}) và sản phẩm hiện tại`);
    assert(thietBiMau.giaNhap === null, 'W5-T4: Nhân viên không thấy giá nhập trong danh sách thiết bị');
  }

  // Test W5-T4-A02 & W5-T4-A03: Đối chiếu kiểm kê thực tế
  console.log(`\n${colors.yellow}>>> [W5-T4] KIỂM TRA ĐỐI CHIẾU KIỂM KÊ TẠI KHO <<<${colors.reset}`);
  const payloadKiemKe = {
    danhSachMaQuet: [
      thietBiMau ? thietBiMau.maThietBiHienThi : 'TB-LEU-001',
      thietBiMau ? thietBiMau.maThietBiHienThi : 'TB-LEU-001', // Quét trùng
      'MA_LA_KHONG_TON_TAI_99999' // Mã lạ
    ],
    thoiDiemKiemKe: new Date().toISOString(),
    ghiChu: 'Kiểm kê mẫu tự động'
  };

  const resKiemKe = await callApi('/api/kho/kiem-ke/doi-chieu', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify(payloadKiemKe)
  });

  assert(resKiemKe.status === 200, 'W5-T4-A02: Đối chiếu kiểm kê thành công (HTTP 200)');
  if (resKiemKe.data) {
    assert(resKiemKe.data.danhSachQuetTrung && resKiemKe.data.danhSachQuetTrung.length > 0,
      'W5-T4-A03: Phát hiện chính xác mã quét trùng lặp');
    assert(resKiemKe.data.danhSachMaLa && resKiemKe.data.danhSachMaLa.includes('MA_LA_KHONG_TON_TAI_99999'),
      'W5-T4-A03: Phát hiện chính xác mã lạ không có trong hệ thống');
    assert(resKiemKe.data.danhSachDangLuuHanhNgoaiKho !== undefined,
      'W5-T4-A02: Thiết bị đang thuê/bảo trì được tách riêng sang nhóm lưu hành ngoài kho');
  }

  // Test Phân tích ảnh hưởng cam kết
  console.log(`\n${colors.yellow}>>> [W5-T4] PHÂN TÍCH ẢNH HƯỞNG CAM KẾT KHI GIẢM NGUỒN <<<${colors.reset}`);
  if (thietBiMau) {
    const resAnhHuong = await callApi('/api/kho/dieu-chinh/xem-anh-huong', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        maThietBi: thietBiMau.maThietBi,
        loaiThayDoi: 'GiangCap',
        lyDo: 'Thử nghiệm phân tích ảnh hưởng'
      })
    });
    assert(resAnhHuong.status === 200, 'W5-T4: Phân tích ảnh hưởng thay đổi thiết bị thành công (HTTP 200)');
    if (resAnhHuong.data) {
      assert(typeof resAnhHuong.data.coTheApDungHienTai === 'boolean',
        `W5-T4: Kết luận khả năng áp dụng thành công (CoTheApDungHienTai = ${resAnhHuong.data.coTheApDungHienTai})`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHẦN 2: W5-T5 — ĐIỀU CHỈNH KHO VÀ SAI LỆCH PHIẾU NHẬP
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.yellow}>>> [W5-T5] LẬP VÀ DUYỆT ĐIỀU CHỈNH KHO <<<${colors.reset}`);

  // 1. Lập phiếu điều chỉnh sai giá nhập (SaiGiaNhap)
  const payloadSaiGia = {
    loaiDieuChinh: 'SaiGiaNhap',
    maPhieuNhapLienQuan: 1,
    lyDo: 'Đối chiếu hóa đơn NCC giảm giá nhập',
    bangChung: ['https://example.com/hoa-don-ncc.pdf'],
    chiTiet: [
      {
        maChiTietPhieuNhap: 1,
        giaTriDeNghiSau: { donGiaHieuLuc: 950000 },
        ghiChu: 'Giá gốc 1tr sửa xuống 950k'
      }
    ]
  };

  const resLapPhieu = await callApi('/api/dieu-chinh-kho', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify(payloadSaiGia)
  });

  assert(resLapPhieu.status === 201, 'W5-T5-A01: Nhân viên lập phiếu điều chỉnh sai giá nhập thành công (HTTP 201)');
  let maPhieuMoi = null;
  if (resLapPhieu.data) {
    maPhieuMoi = resLapPhieu.data.maPhieuDieuChinh;
    assert(resLapPhieu.data.trangThai === 'ChoDuyet', 'W5-T5-A01: Phiếu mới lập ở trạng thái ChoDuyet');
    assert(resLapPhieu.data.chiTiet && resLapPhieu.data.chiTiet.length > 0 && resLapPhieu.data.chiTiet[0].giaTriTruoc !== null,
      'W5-T5-A01: Server tự động dựng snapshot GiaTriTruoc từ DB');
  }

  // 2. Test W5-T5-A08: Nhân viên không được tự ý duyệt phiếu điều chỉnh (403 Forbidden)
  if (maPhieuMoi) {
    const resDuyetStaff = await callApi(`/api/dieu-chinh-kho/${maPhieuMoi}/duyet-ap-dung`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(resDuyetStaff.status === 403, 'W5-T5-A08: Nhân viên không có quyền Admin bị chặn duyệt điều chỉnh (HTTP 403)');

    // 3. Quản trị viên duyệt và áp dụng điều chỉnh
    const resDuyetAdmin = await callApi(`/api/dieu-chinh-kho/${maPhieuMoi}/duyet-ap-dung`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(resDuyetAdmin.status === 200, 'W5-T5: Quản trị viên duyệt và áp dụng phiếu điều chỉnh thành công (HTTP 200)');
    if (resDuyetAdmin.data) {
      assert(resDuyetAdmin.data.trangThai === 'DaApDung', 'W5-T5: Trạng thái phiếu chuyển sang DaApDung');
      assert(resDuyetAdmin.data.thoiDiemApDung !== null, 'W5-T5: Ghi nhận thời điểm áp dụng thành công');
    }

    // 4. Test W5-T5-A03: Bấm duyệt lại lần 2 (Idempotent test)
    const resDuyetLan2 = await callApi(`/api/dieu-chinh-kho/${maPhieuMoi}/duyet-ap-dung`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(resDuyetLan2.status === 200, 'W5-T5-A03: Bấm duyệt lại lần 2 trả về kết quả an toàn (Idempotent, HTTP 200)');
  }

  // 5. Test Tra cứu giá trị nhập hiệu lực sau chuỗi điều chỉnh
  const resHieuLuc = await callApi('/api/dieu-chinh-kho/hieu-luc/1', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(resHieuLuc.status === 200, 'W5-T5-A01: Tra cứu giá trị nhập hiệu lực thành công (HTTP 200)');
  if (resHieuLuc.data) {
    assert(resHieuLuc.data.tongTienGoc !== undefined && resHieuLuc.data.tongTienHieuLuc !== undefined,
      `W5-T5-A01: Hiển thị tách biệt giá trị gốc (${resHieuLuc.data.tongTienGoc}) và giá trị hiệu lực (${resHieuLuc.data.tongTienHieuLuc})`);
  }

  // 6. Test Lập phiếu điều chỉnh giáng cấp thiết bị
  if (thietBiMau) {
    const resGiangCap = await callApi('/api/dieu-chinh-kho', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        loaiDieuChinh: 'GiangCap',
        lyDo: 'Thiết bị cũ sau nhiều lượt thuê',
        chiTiet: [
          {
            maThietBi: thietBiMau.maThietBi,
            giaTriDeNghiSau: {
              maSanPhamHienTai: thietBiMau.maSanPhamHienTai,
              tinhTrang: 'Cũ 80%'
            }
          }
        ]
      })
    });
    assert(resGiangCap.status === 201, 'W5-T5: Lập phiếu điều chỉnh giáng cấp thiết bị thành công (HTTP 201)');
  }

  console.log(`\n${colors.cyan}${colors.bold}================================================================================${colors.reset}`);
  console.log(`${colors.bold}TỔNG KẾT MINH TÚ (W5-T4 & W5-T5):${colors.reset} ${colors.green}${passedCount} PASS${colors.reset}, ${failedCount > 0 ? colors.red : colors.reset}${failedCount} FAIL`);
  console.log(`${colors.cyan}${colors.bold}================================================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Lỗi thực thi test:', err);
  process.exit(1);
});
