/**
 * Script kiểm thử tự động toàn diện cho W4-T3 của Kiện Minh:
 * - Lập, duyệt phụ phí và giải quyết tranh chấp (UC14)
 * - Chạy: node tests/week4/test_w4_kienminh.mjs
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

// Tài khoản 1: Quản trị viên
const adminToken = generateToken('QuanTriVien', 1, 'admin@geargo.vn');
// Tài khoản 2: Nhân viên vận hành
const staffToken = generateToken('NhanVien', 2, 'staff@geargo.vn');
// Tài khoản 3: Khách hàng sở hữu đơn thuê 1
const customerToken = generateToken('KhachHang', 3, 'customer@geargo.vn');
// Tài khoản 4: Khách hàng khác (không sở hữu đơn thuê 1)
const otherCustomerToken = generateToken('KhachHang', 4, 'other@geargo.vn');

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
  console.log(`${colors.bold}${colors.cyan}=== BẮT ĐẦU KIỂM THỬ WEEK 4 - KIỆN MINH (W4-T3: PHỤ PHÍ & TRANH CHẤP) ===${colors.reset}\n`);

  const testDonId = 1;
  const runId = Math.floor(Date.now() / 1000);
  const loaiPhiVeSinh = `VeSinh_${runId}`;
  const loaiPhiHuHong = `HuHong_${runId}`;

  console.log(`  ℹ Sử dụng MaDonThue = ${testDonId} để kiểm thử (RunID: ${runId})\n`);

  // =========================================================================
  // 1. PHÂN QUYỀN TRUY CẬP
  // =========================================================================
  console.log(`${colors.bold}[PHẦN 1] Kiểm tra phân quyền truy cập${colors.reset}`);

  // Test 1: Khách hàng không được tự lập phụ phí -> 403
  const t1 = await callApi('/api/phu-phi', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      maDonThue: testDonId,
      loaiPhi: loaiPhiVeSinh,
      soTienDeNghi: 150000,
      lyDo: 'Khách tự lập phụ phí'
    })
  });
  assert(t1.status === 403, `Khách hàng bị cấm lập phụ phí (HTTP ${t1.status})`);

  // Test 2: Khách hàng không được gọi API gợi ý phụ phí -> 403
  const t2 = await callApi('/api/phu-phi/goi-y?maChiTietBanGiao=1', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t2.status === 403, `Khách hàng bị cấm gọi API gợi ý phụ phí (HTTP ${t2.status})`);

  // =========================================================================
  // 2. LẬP PHỤ PHÍ VÀ CHỐNG TRÙNG LẶP TỔN THẤT
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 2] Lập phụ phí & Kiểm soát trùng lặp tổn thất${colors.reset}`);

  // Test 3: Lập phụ phí với số tiền <= 0 -> 400 SO_TIEN_KHONG_HOP_LE
  const t3 = await callApi('/api/phu-phi', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maDonThue: testDonId,
      loaiPhi: loaiPhiVeSinh,
      soTienDeNghi: 0,
      lyDo: 'Thử lập phí 0 đồng'
    })
  });
  assert(t3.status === 400 && t3.data?.maLoi === 'SO_TIEN_KHONG_HOP_LE', `Chặn lập phí với số tiền <= 0 (HTTP ${t3.status}, MaLoi: ${t3.data?.maLoi})`);

  // Test 4: Nhân viên lập phụ phí vệ sinh đặc biệt hợp lệ (150.000 VNĐ)
  const t4 = await callApi('/api/phu-phi', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maDonThue: testDonId,
      loaiPhi: loaiPhiVeSinh,
      soTienDeNghi: 150000,
      lyDo: 'Thiết bị dính nhiều bùn đất sau chuyến đi mưa',
      danhSachAnh: ['https://storage.geargo.vn/evidence/vesinh_1.jpg']
    })
  });
  assert(t4.status === 201 && t4.data?.maPhuPhi && t4.data?.trangThaiDuyet === 'ChoDuyet',
    `Nhân viên lập phụ phí thành công (HTTP ${t4.status}, ID: ${t4.data?.maPhuPhi}, Trạng thái: ${t4.data?.trangThaiDuyet})`);
  const createdPhuPhiId = t4.data?.maPhuPhi;

  // Test 5: Lập trùng loại phí cho cùng đơn khi khoản cũ chưa từ chối -> 409 PHI_TRUNG_TON_THAT
  const t5 = await callApi('/api/phu-phi', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maDonThue: testDonId,
      loaiPhi: loaiPhiVeSinh,
      soTienDeNghi: 180000,
      lyDo: 'Lập lại cùng loại phí cho cùng đơn thuê'
    })
  });
  assert(t5.status === 409 && t5.data?.maLoi === 'PHI_TRUNG_TON_THAT',
    `Chặn lập trùng loại phí cho cùng tổn thất (HTTP ${t5.status}, MaLoi: ${t5.data?.maLoi})`);

  // =========================================================================
  // 3. CẬP NHẬT PHỤ PHÍ KHI ĐANG CHỜ DUYỆT
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 3] Cập nhật phụ phí đang chờ duyệt${colors.reset}`);

  // Test 6: Cập nhật số tiền và lý do khi chưa duyệt
  const t6 = await callApi(`/api/phu-phi/${createdPhuPhiId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      soTien: 120000,
      lyDo: 'Điều chỉnh số tiền vệ sinh sau khi đánh giá lại'
    })
  });
  assert(t6.status === 200 && t6.data?.soTien === 120000,
    `Cập nhật phụ phí chưa duyệt thành công: Số tiền mới = ${t6.data?.soTien} VNĐ`);

  // =========================================================================
  // 4. PHÊ DUYỆT PHỤ PHÍ & THẨM QUYỀN HẠN MỨC
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 4] Phê duyệt phụ phí & Thẩm quyền hạn mức${colors.reset}`);

  // Test 7: Nhân viên tự duyệt khoản trong hạn mức (<= 500k) -> 200 DaDuyet
  const t7 = await callApi(`/api/phu-phi/${createdPhuPhiId}/duyet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      ketQua: 'Duyet',
      lyDo: 'Nhân viên kiểm tra và duyệt theo hạn mức cho phép'
    })
  });
  assert(t7.status === 200 && t7.data?.trangThaiDuyet === 'DaDuyet',
    `Nhân viên tự duyệt khoản trong hạn mức thành công (HTTP ${t7.status}, Trạng thái: ${t7.data?.trangThaiDuyet})`);

  // Test 8: Lập khoản phí vượt hạn mức (> 500k)
  const bigFeeRes = await callApi('/api/phu-phi', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      maDonThue: testDonId,
      loaiPhi: loaiPhiHuHong,
      soTienDeNghi: 850000,
      lyDo: 'Gãy khung lều lớn'
    })
  });
  const bigFeeId = bigFeeRes.data?.maPhuPhi;

  // Test 9: Nhân viên cố duyệt khoản vượt hạn mức -> 403 VUOT_QUYEN_DUYET_PHI
  const t9 = await callApi(`/api/phu-phi/${bigFeeId}/duyet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ ketQua: 'Duyet', lyDo: 'Nhân viên cố duyệt khoản 850k' })
  });
  assert(t9.status === 403 && t9.data?.maLoi === 'VUOT_QUYEN_DUYET_PHI',
    `Chặn nhân viên duyệt khoản vượt hạn mức 500k (HTTP ${t9.status}, MaLoi: ${t9.data?.maLoi})`);

  // Test 10: Quản trị viên duyệt khoản vượt hạn mức -> 200 DaDuyet
  const t10 = await callApi(`/api/phu-phi/${bigFeeId}/duyet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ ketQua: 'Duyet', lyDo: 'Admin duyệt khoản sửa chữa' })
  });
  assert(t10.status === 200 && t10.data?.trangThaiDuyet === 'DaDuyet',
    `Quản trị viên duyệt khoản vượt hạn mức thành công (HTTP ${t10.status})`);

  // =========================================================================
  // 5. TRANH CHẤP & GIẢI QUYẾT TRANH CHẤP
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 5] Khiếu nại tranh chấp & Xử lý khiếu nại${colors.reset}`);

  // Test 11: Khách hàng lạ không sở hữu đơn thuê mở tranh chấp -> 403 KHONG_CO_QUYEN
  const t11 = await callApi(`/api/phu-phi/${createdPhuPhiId}/tranh-chap`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${otherCustomerToken}` },
    body: JSON.stringify({
      noiDung: 'Tôi khiếu nại khoản phí không phải của tôi'
    })
  });
  assert(t11.status === 403 && t11.data?.maLoi === 'KHONG_CO_QUYEN',
    `Chặn khách hàng lạ mở tranh chấp đơn người khác (HTTP ${t11.status}, MaLoi: ${t11.data?.maLoi})`);

  // Test 12: Khách hàng chủ đơn mở tranh chấp khoản phí đã duyệt -> 200 DangTranhChap
  const t12 = await callApi(`/api/phu-phi/${createdPhuPhiId}/tranh-chap`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      noiDung: 'Tôi đã tự giặt sạch lều trước khi trả, đề nghị giảm phí vệ sinh',
      danhSachAnh: ['https://storage.geargo.vn/customer/tent_clean.jpg']
    })
  });
  assert(t12.status === 200 && t12.data?.trangThaiTranhChap === 'DangTranhChap',
    `Khách hàng chủ đơn mở tranh chấp thành công (HTTP ${t12.status}, Trạng thái tranh chấp: ${t12.data?.trangThaiTranhChap})`);

  // Test 13: Admin giải quyết tranh chấp (hòa giải điều chỉnh giảm phí) -> 200 DaGiaiQuyet
  const t13 = await callApi(`/api/phu-phi/${createdPhuPhiId}/giai-quyet-tranh-chap`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      ketQua: 'DieuChinh',
      lyDo: 'Hòa giải với khách hàng, hỗ trợ giảm xuống còn 60.000 VNĐ',
      soTienDeXuatSauXuLy: 60000
    })
  });
  assert(t13.status === 200 && t13.data?.trangThaiTranhChap === 'DaGiaiQuyet' && t13.data?.soTien === 60000,
    `Admin giải quyết tranh chấp thành công: Số tiền sau hòa giải = ${t13.data?.soTien} VNĐ`);

  // =========================================================================
  // 6. LẬP PHỤ PHÍ ĐIỀU CHỈNH SAU ĐỐI SOÁT
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 6] Lập phụ phí điều chỉnh sau đối soát${colors.reset}`);

  // Test 14: Điều chỉnh phí làm tổng nghĩa vụ âm -> 400 TONG_PHI_KHONG_DUOC_AM
  const t14 = await callApi(`/api/phu-phi/${createdPhuPhiId}/dieu-chinh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      soTienDieuChinhCoDau: -9999999, // Âm quá lớn làm tổng âm
      lyDo: 'Thử giảm phí vượt quá giá trị ban đầu'
    })
  });
  assert(t14.status === 400 && t14.data?.maLoi === 'TONG_PHI_KHONG_DUOC_AM',
    `Chặn điều chỉnh làm tổng phụ phí âm (HTTP ${t14.status}, MaLoi: ${t14.data?.maLoi})`);

  // Test 15: Admin lập phụ phí điều chỉnh hợp lệ (-20.000 VNĐ) -> 201 DaDuyet
  const t15 = await callApi(`/api/phu-phi/${createdPhuPhiId}/dieu-chinh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      soTienDieuChinhCoDau: -20000,
      lyDo: 'Giảm thêm 20.000 VNĐ tiền phụ phí vệ sinh theo thỏa thuận sau đối soát'
    })
  });
  assert(t15.status === 201 && t15.data?.maPhuPhiGoc === createdPhuPhiId && t15.data?.soTien === -20000,
    `Lập phụ phí điều chỉnh thành công (HTTP ${t15.status}, Số tiền: ${t15.data?.soTien} VNĐ, Gốc: ${t15.data?.maPhuPhiGoc})`);

  // Test 16: Lấy danh sách phụ phí của đơn thuê
  const t16 = await callApi(`/api/phu-phi/theo-don/${testDonId}`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t16.status === 200 && Array.isArray(t16.data) && t16.data.length >= 2,
    `Lấy danh sách phụ phí theo đơn thành công (HTTP ${t16.status}, Số lượng: ${t16.data?.length})`);

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  console.log(`\n${colors.bold}=== TỔNG KẾT KIỂM THỬ W4-T3 KIỆN MINH ===${colors.reset}`);
  console.log(`  Tổng số ca kiểm thử: ${passedCount + failedCount}`);
  console.log(`  ${colors.green}Thành công: ${passedCount}${colors.reset}`);
  console.log(`  ${colors.red}Thất bại: ${failedCount}${colors.reset}`);

  if (failedCount === 0) {
    console.log(`\n${colors.bold}${colors.green}>>> TẤT CẢ CÁC CA KIỂM THỬ CHO W4-T3 ĐỀU PASS 100%! <<<\n${colors.reset}`);
  } else {
    process.exit(1);
  }
}

runTests();
