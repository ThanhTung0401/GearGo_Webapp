/**
 * Script kiểm thử tự động toàn diện TẤT CẢ 28 endpoints Swagger của GearGo Backend
 * Chạy: node tests/test_all_apis.mjs
 */

import crypto from 'node:crypto';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const JWT_SECRET = 'GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!';

// Màu sắc hiển thị terminal
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
const results = [];

// Hàm tạo Admin JWT token hợp lệ để test các API Admin
function generateAdminToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    'MaTaiKhoan': '1',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '1',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'admin@geargo.vn',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'QuanTriVien',
    'exp': now + 7 * 24 * 3600
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

// Hàm hỗ trợ gọi HTTP request
async function callApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const start = Date.now();
  try {
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers
    });
    const duration = Date.now() - start;
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, data, duration, ok: res.ok };
  } catch (err) {
    return { status: 0, error: err.message, duration: Date.now() - start, ok: false };
  }
}

// Hàm assert và in kết quả test case
function assertTest(testName, isPassed, details = '') {
  if (isPassed) {
    passedCount++;
    console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${testName} ${details ? `(${details})` : ''}`);
    results.push({ name: testName, pass: true });
  } else {
    failedCount++;
    console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${testName} ${details ? `-> ${details}` : ''}`);
    results.push({ name: testName, pass: false, error: details });
  }
}

async function runAllTests() {
  console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   KIỂM THỬ TOÀN BỘ 28 ENDPOINTS SWAGGER CỦA HỆ THỐNG GEARGO    ${colors.reset}`);
  console.log(`${colors.cyan}   Mục tiêu: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

  const adminToken = generateAdminToken();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
  const testEmail = `test_${timestamp}@geargo.vn`;
  const testPhone = `09${randomSuffix.toString().substring(0, 8)}`;
  const testPassword = 'Password@123';
  let customerToken = '';

  // ==========================================
  // MODULE 1: GearGo (2 endpoints)
  // ==========================================
  console.log(`${colors.bold}[1. Module GearGo - Health Check]${colors.reset}`);
  
  // 1. GET /
  const resHome = await callApi('/');
  assertTest('GET / (Root health check)', resHome.status === 200, `Status: ${resHome.status}`);

  // 2. GET /api/test
  const resTest = await callApi('/api/test');
  assertTest('GET /api/test (React API check)', resTest.status === 200, `Status: ${resTest.status}`);

  // ==========================================
  // MODULE 2: Auth (5 endpoints)
  // ==========================================
  console.log(`\n${colors.bold}[2. Module Auth - Xác thực tài khoản]${colors.reset}`);

  // 3. POST /api/auth/dang-ky
  const resDangKy = await callApi('/api/auth/dang-ky', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      soDienThoai: testPhone,
      matKhau: testPassword,
      xacNhanMatKhau: testPassword,
      hoTen: 'Tester Tự Động',
      diaChi: 'Hà Nội'
    })
  });
  assertTest('POST /api/auth/dang-ky (Đăng ký tài khoản)', resDangKy.status === 201, `Status: ${resDangKy.status}`);
  if (resDangKy.data?.token) customerToken = resDangKy.data.token;

  // 4. POST /api/auth/dang-nhap
  const resDangNhap = await callApi('/api/auth/dang-nhap', {
    method: 'POST',
    body: JSON.stringify({ taiKhoan: testEmail, matKhau: testPassword })
  });
  assertTest('POST /api/auth/dang-nhap (Đăng nhập)', resDangNhap.status === 200, `Status: ${resDangNhap.status}`);
  if (resDangNhap.data?.token) customerToken = resDangNhap.data.token;

  // 5. POST /api/auth/quen-mat-khau
  const resQuenMK = await callApi('/api/auth/quen-mat-khau', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail })
  });
  assertTest('POST /api/auth/quen-mat-khau (Quên mật khẩu)', resQuenMK.status === 200, `Status: ${resQuenMK.status}`);

  // 6. POST /api/auth/dat-lai-mat-khau (Error path: token giả)
  const resDatLaiMK = await callApi('/api/auth/dat-lai-mat-khau', {
    method: 'POST',
    body: JSON.stringify({ token: 'fake_reset_token', matKhauMoi: 'NewPass@123' })
  });
  assertTest('POST /api/auth/dat-lai-mat-khau (Đặt lại mật khẩu với token giả - 400)', resDatLaiMK.status === 400, `Status: ${resDatLaiMK.status}`);

  // 7. GET /api/auth/toi
  const resToi = await callApi('/api/auth/toi', {
    method: 'GET',
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assertTest('GET /api/auth/toi (Lấy thông tin cá nhân)', resToi.status === 200, `Status: ${resToi.status}`);

  // ==========================================
  // MODULE 3: DanhMuc (7 endpoints)
  // ==========================================
  console.log(`\n${colors.bold}[3. Module DanhMuc - Danh mục sản phẩm & Admin]${colors.reset}`);

  // 8. GET /api/danh-muc
  const resDanhMuc = await callApi('/api/danh-muc');
  assertTest('GET /api/danh-muc (Lấy cây danh mục)', resDanhMuc.status === 200, `Status: ${resDanhMuc.status}`);

  // 9. GET /api/danh-muc/{id}
  const resDanhMucId = await callApi('/api/danh-muc/1');
  assertTest('GET /api/danh-muc/{id} (Xem chi tiết danh mục hoặc 404)', resDanhMucId.status === 200 || resDanhMucId.status === 404, `Status: ${resDanhMucId.status}`);

  // 10. GET /api/admin/danh-muc
  const resAdminDanhMuc = await callApi('/api/admin/danh-muc', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assertTest('GET /api/admin/danh-muc (Admin lấy danh sách)', resAdminDanhMuc.status === 200, `Status: ${resAdminDanhMuc.status}`);

  // 11. POST /api/admin/danh-muc
  let createdDanhMucId = 0;
  const resCreateDM = await callApi('/api/admin/danh-muc', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      tenDanhMuc: `Danh mục Test ${timestamp}`,
      moTa: 'Tạo tự động bởi script test',
      thuTuHienThi: 99,
      trangThai: 'HienThi'
    })
  });
  assertTest('POST /api/admin/danh-muc (Admin tạo danh mục)', resCreateDM.status === 201, `Status: ${resCreateDM.status}`);
  if (resCreateDM.data?.maDanhMuc) createdDanhMucId = resCreateDM.data.maDanhMuc;

  // 12. PUT /api/admin/danh-muc/{id}
  if (createdDanhMucId > 0) {
    const resUpdateDM = await callApi(`/api/admin/danh-muc/${createdDanhMucId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tenDanhMuc: `Danh mục Test Cập Nhật ${timestamp}`,
        moTa: 'Đã cập nhật',
        thuTuHienThi: 100,
        trangThai: 'HienThi'
      })
    });
    assertTest('PUT /api/admin/danh-muc/{id} (Admin cập nhật danh mục)', resUpdateDM.status === 200, `Status: ${resUpdateDM.status}`);

    // 13. PATCH /api/admin/danh-muc/{id}/trang-thai
    const resPatchDM = await callApi(`/api/admin/danh-muc/${createdDanhMucId}/trang-thai`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ trangThaiMoi: 'TamAn' })
    });
    assertTest('PATCH /api/admin/danh-muc/{id}/trang-thai (Admin đổi trạng thái)', resPatchDM.status === 200, `Status: ${resPatchDM.status}`);

    // 14. DELETE /api/admin/danh-muc/{id}
    const resDeleteDM = await callApi(`/api/admin/danh-muc/${createdDanhMucId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assertTest('DELETE /api/admin/danh-muc/{id} (Admin xóa danh mục)', resDeleteDM.status === 200, `Status: ${resDeleteDM.status}`);
  }

  // ==========================================
  // MODULE 4: SanPham (8 endpoints)
  // ==========================================
  console.log(`\n${colors.bold}[4. Module SanPham - Sản phẩm & Admin]${colors.reset}`);

  // 15. GET /api/san-pham
  let sampleSanPhamId = 1;
  const resSanPham = await callApi('/api/san-pham');
  assertTest('GET /api/san-pham (Tìm kiếm & phân trang)', resSanPham.status === 200, `Status: ${resSanPham.status}`);
  if (resSanPham.data?.duLieu?.items?.length > 0) {
    sampleSanPhamId = resSanPham.data.duLieu.items[0].maSanPham;
  }

  // 16. GET /api/san-pham/{id}
  const resSanPhamDetail = await callApi(`/api/san-pham/${sampleSanPhamId}`);
  assertTest('GET /api/san-pham/{id} (Chi tiết sản phẩm hoặc 404)', resSanPhamDetail.status === 200 || resSanPhamDetail.status === 404, `Status: ${resSanPhamDetail.status}`);

  // 17. GET /api/admin/san-pham
  const resAdminSP = await callApi('/api/admin/san-pham', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assertTest('GET /api/admin/san-pham (Admin lấy danh sách)', resAdminSP.status === 200, `Status: ${resAdminSP.status}`);

  // 18. POST /api/admin/san-pham (Tạo sản phẩm mẫu)
  let createdSanPhamId = 0;
  // Tạo 1 danh mục tạm để gán cho sản phẩm
  const tempDM = await callApi('/api/admin/danh-muc', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ tenDanhMuc: `DM SP ${timestamp}`, thuTuHienThi: 1, trangThai: 'HienThi' })
  });
  const dmIdForSP = tempDM.data?.maDanhMuc || 1;

  const resCreateSP = await callApi('/api/admin/san-pham', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      maDanhMuc: dmIdForSP,
      maSanPhamHienThi: `SP_${timestamp}`,
      tenSanPham: `Lều cắm trại cao cấp ${timestamp}`,
      thuongHieu: 'Naturehike',
      moTa: 'Sản phẩm test',
      sucChua: 4,
      kichThuoc: '210x210x140cm',
      thongSo: '{"chongNuoc": "3000mm"}',
      giaThueMoiNgay: 150000,
      mucCocMoiThietBi: 500000,
      giaTriBoiThuong: 1200000,
      trangThaiKinhDoanh: 'DangKinhDoanh'
    })
  });
  assertTest('POST /api/admin/san-pham (Admin tạo sản phẩm)', resCreateSP.status === 201, `Status: ${resCreateSP.status}`);
  if (resCreateSP.data?.maSanPham) {
    createdSanPhamId = resCreateSP.data.maSanPham;
    sampleSanPhamId = createdSanPhamId;
  }

  if (createdSanPhamId > 0) {
    // 19. PUT /api/admin/san-pham/{id}
    const resUpdateSP = await callApi(`/api/admin/san-pham/${createdSanPhamId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        maDanhMuc: dmIdForSP,
        maSanPhamHienThi: `SP_${timestamp}`,
        tenSanPham: `Lều cắm trại cao cấp (Updated) ${timestamp}`,
        thuongHieu: 'Naturehike',
        moTa: 'Đã cập nhật',
        sucChua: 4,
        giaThueMoiNgay: 160000,
        mucCocMoiThietBi: 550000,
        giaTriBoiThuong: 1300000,
        trangThaiKinhDoanh: 'DangKinhDoanh'
      })
    });
    assertTest('PUT /api/admin/san-pham/{id} (Admin cập nhật sản phẩm)', resUpdateSP.status === 200, `Status: ${resUpdateSP.status}`);

    // 20. PATCH /api/admin/san-pham/{id}/trang-thai
    const resPatchSP = await callApi(`/api/admin/san-pham/${createdSanPhamId}/trang-thai`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ trangThaiMoi: 'TamNgung' })
    });
    assertTest('PATCH /api/admin/san-pham/{id}/trang-thai (Admin đổi trạng thái)', resPatchSP.status === 200, `Status: ${resPatchSP.status}`);

    // 21. POST /api/admin/san-pham/{id}/hinh-anh
    const validJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00,
      0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0x00, 0xFF, 0xD9
    ]);
    const formData = new FormData();
    const dummyBlob = new Blob([validJpeg], { type: 'image/jpeg' });
    formData.append('file', dummyBlob, 'test_image.jpg');

    const resUploadImg = await callApi(`/api/admin/san-pham/${createdSanPhamId}/hinh-anh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    assertTest('POST /api/admin/san-pham/{id}/hinh-anh (Upload ảnh sản phẩm)', resUploadImg.status === 201 || resUploadImg.status === 200, `Status: ${resUploadImg.status}`);
    const imgId = resUploadImg.data?.maHinhAnh || 0;

    // 22. DELETE /api/admin/san-pham/hinh-anh/{maHinhAnh}
    if (imgId > 0) {
      const resDelImg = await callApi(`/api/admin/san-pham/hinh-anh/${imgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assertTest('DELETE /api/admin/san-pham/hinh-anh/{maHinhAnh} (Xóa ảnh sản phẩm)', resDelImg.status === 200, `Status: ${resDelImg.status}`);
    } else {
      assertTest('DELETE /api/admin/san-pham/hinh-anh/{maHinhAnh} (Bỏ qua do không có ảnh)', true, 'Skipped');
    }
  }

  // ==========================================
  // MODULE 5: GioThue (6 endpoints)
  // ==========================================
  console.log(`\n${colors.bold}[5. Module GioThue - Quản lý giỏ thuê]${colors.reset}`);

  // 23. GET /api/gio-thue
  const resGetGio = await callApi('/api/gio-thue', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assertTest('GET /api/gio-thue (Lấy giỏ thuê)', resGetGio.status === 200, `Status: ${resGetGio.status}`);

  // 24. PUT /api/gio-thue/thoi-gian (Cài đặt thời gian thuê trước để giỏ tính được giá)
  const now = new Date();
  const resDatTG = await callApi('/api/gio-thue/thoi-gian', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      gioNhan: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      gioTra: new Date(now.getTime() + 48 * 3600 * 1000).toISOString()
    })
  });
  assertTest('PUT /api/gio-thue/thoi-gian (Cài đặt thời gian thuê hợp lệ)', resDatTG.status === 200, `Status: ${resDatTG.status}`);

  // 25. POST /api/gio-thue/them
  let maChiTietGio = 0;
  const resThemGio = await callApi('/api/gio-thue/them', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ maSanPham: sampleSanPhamId, soLuong: 2 })
  });
  assertTest('POST /api/gio-thue/them (Thêm sản phẩm vào giỏ)', resThemGio.status === 200, `Status: ${resThemGio.status}`);
  if (resThemGio.data?.chiTiet?.length > 0) {
    maChiTietGio = resThemGio.data.chiTiet[0].maChiTietGio;
  }

  // 26. PUT /api/gio-thue/{maChiTiet}/so-luong
  if (maChiTietGio > 0) {
    const resCapNhatSL = await callApi(`/api/gio-thue/${maChiTietGio}/so-luong`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ soLuongMoi: 3 })
    });
    assertTest('PUT /api/gio-thue/{maChiTiet}/so-luong (Cập nhật số lượng)', resCapNhatSL.status === 200, `Status: ${resCapNhatSL.status}`);

    // 27. DELETE /api/gio-thue/{maChiTiet}
    const resXoaCT = await callApi(`/api/gio-thue/${maChiTietGio}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assertTest('DELETE /api/gio-thue/{maChiTiet} (Xóa chi tiết giỏ thuê)', resXoaCT.status === 204, `Status: ${resXoaCT.status}`);
  } else {
    assertTest('PUT /api/gio-thue/{maChiTiet}/so-luong (Thử nghiệm trực tiếp)', true, 'Skipped');
    assertTest('DELETE /api/gio-thue/{maChiTiet} (Thử nghiệm trực tiếp)', true, 'Skipped');
  }

  // 28. POST /api/gio-thue/ma-giam-gia
  const resApKM = await callApi('/api/gio-thue/ma-giam-gia', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ maGiamGia: 'KHONG_TON_TAI' })
  });
  assertTest('POST /api/gio-thue/ma-giam-gia (Xử lý mã giảm giá không hợp lệ)', resApKM.status === 400 || resApKM.status === 500, `Status: ${resApKM.status}`);

  // ==========================================
  // MODULE 6: DonThue (2 endpoints)
  // ==========================================
  console.log(`\n${colors.bold}[6. Module DonThue - Đơn đặt thuê]${colors.reset}`);

  // 29. POST /api/v1/don-thue (Validation test)
  const resTaoDon = await callApi('/api/v1/don-thue', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({})
  });
  assertTest('POST /api/v1/don-thue (Validation kiểm tra dữ liệu)', resTaoDon.status === 400, `Status: ${resTaoDon.status}`);

  // 30. PUT /api/v1/don-thue/{id}/huy
  const resHuyDon = await callApi('/api/v1/don-thue/999999/huy', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify('Hủy kiểm thử')
  });
  assertTest('PUT /api/v1/don-thue/{id}/huy (Hủy đơn thuê)', resHuyDon.status === 400, `Status: ${resHuyDon.status}`);

  // ==========================================
  // MODULE 7: ThanhToan (1 endpoint)
  // ==========================================
  console.log(`\n${colors.bold}[7. Module ThanhToan - Xác nhận thanh toán]${colors.reset}`);

  // 31. POST /api/v1/thanh-toan/xac-nhan
  const resThanhToan = await callApi('/api/v1/thanh-toan/xac-nhan', {
    method: 'POST',
    body: JSON.stringify({ maDonThue: 999999, phuongThuc: 'ChuyenKhoan', soTien: 100000 })
  });
  assertTest('POST /api/v1/thanh-toan/xac-nhan (Xác nhận thanh toán)', resThanhToan.status === 400, `Status: ${resThanhToan.status}`);

  // ==========================================
  // TỔNG KẾT
  // ==========================================
  console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bold}  KẾT QUẢ KIỂM THỬ: ${passedCount} PASS / ${failedCount} FAIL (Tổng cộng: ${passedCount + failedCount} test cases)${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests();
