/**
 * Script kiểm thử tự động toàn diện các task độc lập của Kiện Minh:
 * - W3-T3: Quản lý Nhà cung cấp (NhaCungCap)
 * - W3-T4: Quản lý Phiếu nhập nháp & Dòng chi tiết (PhieuNhapHang & ChiTietPhieuNhap)
 * Chạy: node tests/test_w3_kienminh.mjs
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
  console.log(`${colors.bold}${colors.cyan}=== BẮT ĐẦU KIỂM THỬ WEEK 3 - KIỆN MINH (W3-T3 & W3-T4) ===${colors.reset}\n`);

  // =========================================================================
  // 1. KIỂM THỬ W3-T3: NHÀ CUNG CẤP
  // =========================================================================
  console.log(`${colors.bold}[PHẦN 1] Kiểm thử W3-T3: Nhà Cung Cấp${colors.reset}`);

  // Test 1: Khách hàng gọi API NCC -> 401 hoặc 403
  const t1 = await callApi('/api/nha-cung-cap', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t1.status === 403, `Khách hàng bị cấm truy cập API NCC (HTTP ${t1.status})`);

  // Test 2: Nhân viên tạo NCC -> 403 (chỉ Quản trị viên được tạo)
  const t2 = await callApi('/api/nha-cung-cap', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maHienThi: 'NCC-TEST-STAFF',
      ten: 'Nhà cung cấp thử nghiệm',
      soDienThoai: '0901234567'
    })
  });
  assert(t2.status === 403, `Nhân viên không thể tạo mới NCC (HTTP ${t2.status})`);

  // Test 3: Tạo NCC thiếu cả SĐT và Email -> 400 THIEU_LIEN_HE
  const t3 = await callApi('/api/nha-cung-cap', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      maHienThi: 'NCC-NO-CONTACT',
      ten: 'NCC Thiếu Liên Hệ'
    })
  });
  assert(t3.status === 400 && t3.data?.maLoi === 'THIEU_LIEN_HE', `Bắt buộc có ít nhất 1 kênh liên hệ (HTTP ${t3.status}, MaLoi: ${t3.data?.maLoi})`);

  // Test 4: Admin tạo NCC mới hợp lệ
  const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
  const maNccMoi = `NCC-TEST-${randomSuffix}`;
  const t4 = await callApi('/api/nha-cung-cap', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      maHienThi: maNccMoi,
      ten: `Nhà Cung Cấp Dã Ngoại ${randomSuffix}`,
      nguoiLienHe: 'Nguyễn Văn Minh',
      soDienThoai: `0987${randomSuffix}`,
      email: `ncc${randomSuffix}@outdoor.vn`,
      diaChi: 'Hà Nội'
    })
  });
  assert(t4.status === 201 && t4.data?.maNhaCungCap, `Admin tạo mới NCC thành công (HTTP ${t4.status}, ID: ${t4.data?.maNhaCungCap})`);
  const createdNccId = t4.data?.maNhaCungCap;

  // Test 5: Tạo trùng mã hiển thị -> 409 MA_NCC_TRUNG
  const t5 = await callApi('/api/nha-cung-cap', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      maHienThi: maNccMoi.toLowerCase(), // thử chữ thường
      ten: 'Trùng mã NCC',
      soDienThoai: '0912345678'
    })
  });
  assert(t5.status === 409 && t5.data?.maLoi === 'MA_NCC_TRUNG', `Chặn trùng mã hiển thị (HTTP ${t5.status}, MaLoi: ${t5.data?.maLoi})`);

  // Test 6: Tìm kiếm NCC
  const t6 = await callApi(`/api/nha-cung-cap?tuKhoa=${maNccMoi}`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t6.status === 200 && t6.data?.items?.length > 0, `Nhân viên tìm kiếm danh sách NCC (HTTP ${t6.status}, Tổng: ${t6.data?.totalItems})`);

  // Test 7: Cập nhật thông tin NCC
  const t7 = await callApi(`/api/nha-cung-cap/${createdNccId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      ten: `Nhà Cung Cấp Đã Cập Nhật ${randomSuffix}`,
      soDienThoai: `0988${randomSuffix}`,
      email: `updated${randomSuffix}@outdoor.vn`,
      diaChi: 'TP. Hồ Chí Minh',
      lyDoThayDoi: 'Cập nhật địa chỉ văn phòng mới'
    })
  });
  assert(t7.status === 200 && t7.data?.diaChi === 'TP. Hồ Chí Minh', `Cập nhật NCC thành công (HTTP ${t7.status})`);

  // Test 8: Đổi trạng thái hợp tác sang NgungHopTac
  const t8 = await callApi(`/api/nha-cung-cap/${createdNccId}/trang-thai-hop-tac`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      trangThaiHopTac: 'NgungHopTac',
      lyDo: 'Hết hợp đồng cung ứng'
    })
  });
  assert(t8.status === 200 && t8.data?.trangThaiHopTac === 'NgungHopTac', `Đổi trạng thái hợp tác sang NgungHopTac (HTTP ${t8.status})`);

  // Test 9: Lịch sử nhập hàng của NCC
  const t9 = await callApi(`/api/nha-cung-cap/${createdNccId}/lich-su-nhap`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t9.status === 200 && t9.data?.tongSoPhieuDaNhap === 0, `Xem lịch sử nhập ban đầu rỗng (HTTP ${t9.status}, Tổng phiếu: ${t9.data?.tongSoPhieuDaNhap})`);

  // =========================================================================
  // 2. KIỂM THỬ W3-T4: PHIẾU NHẬP NHÁP & CHI TIẾT DÒNG
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 2] Kiểm thử W3-T4: Phiếu Nhập Nháp & Dòng Chi Tiết${colors.reset}`);

  // Test 10: Lập phiếu với NCC đã NgungHopTac -> 409 NCC_NGUNG_HOP_TAC
  const t10 = await callApi('/api/phieu-nhap', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maNhaCungCap: createdNccId,
      ghiChu: 'Thử tạo phiếu với NCC đã ngừng hợp tác'
    })
  });
  assert(t10.status === 409 && t10.data?.maLoi === 'NCC_NGUNG_HOP_TAC', `Chặn lập phiếu với NCC NgungHopTac (HTTP ${t10.status}, MaLoi: ${t10.data?.maLoi})`);

  // Đổi NCC lại DangHopTac để tiếp tục kiểm thử
  await callApi(`/api/nha-cung-cap/${createdNccId}/trang-thai-hop-tac`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      trangThaiHopTac: 'DangHopTac',
      lyDo: 'Tái ký hợp đồng'
    })
  });

  // Test 11: Tạo phiếu nhập nháp thành công
  const t11 = await callApi('/api/phieu-nhap', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maNhaCungCap: createdNccId,
      ngayNhapDuKien: new Date(Date.now() + 86400000).toISOString(),
      soChungTuNhaCungCap: `HD-${randomSuffix}`,
      ghiChu: 'Lập phiếu nhập đợt 1'
    })
  });
  assert(t11.status === 201 && t11.data?.maPhieuNhap && t11.data?.trangThai === 1, `Tạo phiếu nhập nháp thành công (HTTP ${t11.status}, Mã: ${t11.data?.maPhieuHienThi}, Trạng thái: Nháp)`);
  const createdPhieuId = t11.data?.maPhieuNhap;

  // Lấy 1 sản phẩm có sẵn trong DB để test thêm dòng
  const listSpRes = await callApi('/api/san-pham?soMoiTrang=2');
  const sanPhamTest1 = listSpRes.data?.items?.[0]?.maSanPham || 1;
  const sanPhamTest2 = listSpRes.data?.items?.[1]?.maSanPham || 2;

  // Test 12: Thêm dòng chi tiết 1: 3 chiếc x 1.200.000đ -> TongTien = 3.600.000đ
  const t12 = await callApi(`/api/phieu-nhap/${createdPhieuId}/chi-tiet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maSanPham: sanPhamTest1,
      soLuong: 3,
      donGiaNhap: 1200000,
      tinhTrangKhiNhap: 'Mới 100%',
      ghiChu: 'Lô 1'
    })
  });
  assert(t12.status === 201 && t12.data?.tongTien === 3600000, `Thêm dòng 1 (3 x 1.200.000đ), Tổng tiền: ${t12.data?.tongTien}đ`);
  const dongChiTiet1Id = t12.data?.chiTietPhieuNhaps?.[0]?.maChiTietPhieuNhap;

  // Test 13: Thêm lại CÙNG sản phẩm, CÙNG giá và CÙNG tình trạng (2 chiếc) -> TỰ ĐỘNG GỘP DÒNG: 5 chiếc x 1.200.000đ = 6.000.000đ
  const t13 = await callApi(`/api/phieu-nhap/${createdPhieuId}/chi-tiet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maSanPham: sanPhamTest1,
      soLuong: 2,
      donGiaNhap: 1200000,
      tinhTrangKhiNhap: 'Mới 100%',
      ghiChu: 'Gộp thêm 2 chiếc'
    })
  });
  const dongGop = t13.data?.chiTietPhieuNhaps?.find(x => x.maSanPham === sanPhamTest1);
  assert(t13.status === 201 && dongGop?.soLuong === 5 && t13.data?.tongTien === 6000000, 
    `Tự động gộp dòng: Số lượng thành ${dongGop?.soLuong}, Tổng tiền: ${t13.data?.tongTien}đ`);

  // Test 14: Thêm dòng chi tiết 2: sản phẩm khác (5 chiếc x 200.000đ) -> TongTien = 6.000.000 + 1.000.000 = 7.000.000đ
  const t14 = await callApi(`/api/phieu-nhap/${createdPhieuId}/chi-tiet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maSanPham: sanPhamTest2,
      soLuong: 5,
      donGiaNhap: 200000,
      tinhTrangKhiNhap: 'Mới 100%',
      ghiChu: 'Ghế dã ngoại'
    })
  });
  assert(t14.status === 201 && t14.data?.chiTietPhieuNhaps?.length === 2 && t14.data?.tongTien === 7000000,
    `Thêm dòng 2 thành công, Tổng tiền phiếu cập nhật: ${t14.data?.tongTien}đ`);
  const dongChiTiet2Id = t14.data?.chiTietPhieuNhaps?.find(x => x.maSanPham === sanPhamTest2)?.maChiTietPhieuNhap;

  // Test 15: Sửa dòng chi tiết của phiếu khác (kiểm tra route validation) -> 404 DONG_KHONG_THUOC_PHIEU
  const t15 = await callApi(`/api/phieu-nhap/${createdPhieuId}/chi-tiet/999999`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maSanPham: sanPhamTest1,
      soLuong: 1,
      donGiaNhap: 100000,
      tinhTrangKhiNhap: 'Mới 100%'
    })
  });
  assert(t15.status === 404 && t15.data?.maLoi === 'DONG_KHONG_THUOC_PHIEU', `Chặn sửa dòng chi tiết không thuộc phiếu (HTTP ${t15.status}, MaLoi: ${t15.data?.maLoi})`);

  // Test 16: Xóa dòng chi tiết 2 -> Tổng tiền trở về 6.000.000đ
  const t16 = await callApi(`/api/phieu-nhap/${createdPhieuId}/chi-tiet/${dongChiTiet2Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t16.status === 200 && t16.data?.chiTietPhieuNhaps?.length === 1 && t16.data?.tongTien === 6000000,
    `Xóa dòng 2 thành công, Tổng tiền tính lại chuẩn xác: ${t16.data?.tongTien}đ`);

  // Test 17: Hủy phiếu nhập nháp
  const t17 = await callApi(`/api/phieu-nhap/${createdPhieuId}/huy`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ lyDo: 'Hủy phiếu để đặt lô hàng khác' })
  });
  assert(t17.status === 200 && t17.data?.trangThai === 3, `Hủy phiếu nhập nháp thành công (Trạng thái: Đã hủy)`);

  // Test 18: Thử thêm dòng vào phiếu đã hủy -> 409 PHIEU_KHONG_CON_NHAP
  const t18 = await callApi(`/api/phieu-nhap/${createdPhieuId}/chi-tiet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maSanPham: sanPhamTest1,
      soLuong: 1,
      donGiaNhap: 500000,
      tinhTrangKhiNhap: 'Mới'
    })
  });
  assert(t18.status === 409 && t18.data?.maLoi === 'PHIEU_KHONG_CON_NHAP', `Chặn sửa/thêm dòng trên phiếu đã hủy (HTTP ${t18.status}, MaLoi: ${t18.data?.maLoi})`);

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  console.log(`\n${colors.bold}=== TỔNG KẾT KIỂM THỬ ===${colors.reset}`);
  console.log(`  Tổng ca kiểm thử: ${passedCount + failedCount}`);
  console.log(`  ${colors.green}Thành công: ${passedCount}${colors.reset}`);
  console.log(`  ${colors.red}Thất bại: ${failedCount}${colors.reset}`);

  if (failedCount === 0) {
    console.log(`\n${colors.bold}${colors.green}>>> TẤT CẢ CÁC CA KIỂM THỬ ĐỀU ĐẠT CHUẨN 100%! <<<\n${colors.reset}`);
  } else {
    process.exit(1);
  }
}

runTests();
