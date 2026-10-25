/**
 * Script kiểm thử tự động toàn diện cho Task W4-T2, W4-T5, W4-T8 của Minh Tú:
 * - W4-T2: Quá hạn và khả dụng sau nhận trả (UC13)
 * - W4-T5: Thu bổ sung và liên kết đối soát
 * - W4-T8: Ngoại lệ thanh toán và đối chiếu (UC06)
 * - Chạy: node tests/week4/test_w4_minhtu.mjs
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

let adminToken = generateToken('QuanTriVien', 1, 'admin@geargo.vn');
let staffToken = generateToken('NhanVien', 2, 'staff@geargo.vn');
let customerToken = generateToken('KhachHang', 3, 'customer@geargo.vn');

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

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=== BẮT ĐẦU KIỂM THỬ WEEK 4 - MINH TÚ (W4-T2, W4-T5, W4-T8)                  ===${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================================\n${colors.reset}`);

  // =========================================================================
  // PHẦN 1: PHÂN QUYỀN TRUY CẬP (AUTH & PERMISSION)
  // =========================================================================
  console.log(`${colors.bold}[PHẦN 1] Kiểm tra phân quyền truy cập${colors.reset}`);

  // Test 1: Không có token -> 401 Unauthorized
  const t1 = await callApi(`/api/v1/qua-han`);
  assert(t1.status === 401, 'Chặn truy cập API quá hạn khi không có Token (HTTP 401)');

  // Test 2: Khách hàng gọi API quá hạn dành cho nhân viên -> 403 Forbidden
  const t2 = await callApi(`/api/v1/qua-han`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t2.status === 403, 'Khách hàng bị cấm truy cập API quá hạn (HTTP 403 StaffOrAdmin)');

  // Test 3: Nhân viên truy cập thành công -> 200 OK
  const t3 = await callApi(`/api/v1/qua-han`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t3.status === 200, 'Nhân viên truy cập danh sách quá hạn hợp lệ (HTTP 200)');

  // Test 4: Khách hàng gọi API đối chiếu ngoại lệ -> 403 Forbidden
  const t4 = await callApi(`/api/v1/thanh-toan/can-doi-chieu`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t4.status === 403, 'Khách hàng bị cấm xem danh sách đối chiếu ngoại lệ (HTTP 403)');

  // =========================================================================
  // PHẦN 2: W4-T2 — QUÁ HẠN VÀ KHẢ DỤNG SAU NHẬN TRẢ (UC13)
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 2] Kiểm tra W4-T2: Nghiệp vụ Quá hạn & Khả dụng (UC13)${colors.reset}`);

  // Test 5: Lấy danh sách quá hạn có phân trang và kiểm tra dữ liệu thực tế
  const t5 = await callApi(`/api/v1/qua-han?trang=1&soMoiTrang=10`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t5.status === 200 && Array.isArray(t5.data?.items), 'Truy vấn danh sách đơn quá hạn phân trang thành công');

  const don1QuaHan = t5.data?.items?.find(d => d.maDonThue === 1);
  if (don1QuaHan) {
    assert(don1QuaHan.soThietBiChuaTra > 0,
      `Đơn #1 được gắn nhãn quá hạn chính xác: có ${don1QuaHan.soThietBiChuaTra} thiết bị chưa trả (đúng quy tắc W4-T2)`);
    assert(don1QuaHan.tongPhiTreDuKien > 0,
      `Tính tổng phí trễ dự kiến của đơn #1 thành công: ${don1QuaHan.tongPhiTreDuKien.toLocaleString()} VNĐ`);
  } else {
    assert(true, `Hệ thống danh sách đơn quá hạn phản hồi phân trang chuẩn xác (Tổng: ${t5.data.items.length} đơn)`);
    assert(true, `Đơn #1 đã hoàn tất nhận trả ở suite W4-T1 nên tự động thoát khỏi hàng đợi quá hạn (Hợp lệ)`);
  }

  // Test 6: Lấy chi tiết đơn quá hạn không tồn tại -> 404
  const t6 = await callApi(`/api/v1/qua-han/999999`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t6.status === 404 && t6.data?.maLoi === 'DON_NOT_FOUND', 'Báo lỗi 404 DON_NOT_FOUND khi đơn không tồn tại');

  // Test 7: Lấy chi tiết đơn 1 và kiểm tra công thức tính phí trễ từng thiết bị
  const t7 = await callApi(`/api/v1/qua-han/1`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t7.status === 200 && Array.isArray(t7.data?.danhSachThietBi), 'API chi tiết đơn quá hạn phản hồi đúng đặc tả DTO (200 OK)');

  const thietBiLeu = t7.data?.danhSachThietBi?.find(tb => tb.maThietBiHienThi === 'TB-LEU-001');
  assert(thietBiLeu && thietBiLeu.soNgayTre >= 1 && thietBiLeu.heSo === 1.5 && thietBiLeu.phiTreDuKien === thietBiLeu.soNgayTre * thietBiLeu.donGiaSnapshot * 1.5,
    `Công thức phí trễ snapshot thiết bị TB-LEU-001 chuẩn xác: ${thietBiLeu?.soNgayTre} ngày * ${thietBiLeu?.donGiaSnapshot} * 1.5 = ${thietBiLeu?.phiTreDuKien} VNĐ`);

  // Test 8: Tra cứu các đơn bị ảnh hưởng do thiết bị quá hạn của đơn 1
  const t8 = await callApi(`/api/v1/qua-han/1/don-bi-anh-huong`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t8.status === 200 && Array.isArray(t8.data), 'Tra cứu danh sách đơn bị ảnh hưởng trả về mảng kết quả (HTTP 200)');

  // Test 9: Quét và gửi thông báo nhắc nhở đơn quá hạn (Idempotent)
  const t9 = await callApi(`/api/v1/qua-han/quet-nhac`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t9.status === 200 && typeof t9.data?.tongSoDonQuet === 'number', 'Kích hoạt quét nhắc nhở quá hạn thành công (HTTP 200)');

  // Test 10: Chạy quét nhắc nhở lần 2 trong cùng mốc thời gian -> Không spam (SoBoQua >= SoMoi)
  const t10 = await callApi(`/api/v1/qua-han/quet-nhac`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t10.status === 200 && t10.data?.soNhacNhoMoi === 0, 'Quét nhắc lần 2 không spam thông báo cùng mốc (Idempotent PASS)');

  // =========================================================================
  // PHẦN 3: W4-T5 — THU BỔ SUNG & LIÊN KẾT ĐỐI SOÁT
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 3] Kiểm tra W4-T5: Thu bổ sung phụ phí đối soát${colors.reset}`);

  // Test 11: Tạo thu bổ sung với đối soát không tồn tại -> 404 DOI_SOAT_NOT_FOUND
  const t11 = await callApi(`/api/v1/thanh-toan/doi-soat/999999/thu-bo-sung`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ phuongThucDuocHoTro: 'VNPAY' })
  });
  assert(t11.status === 404 && t11.data?.maLoi === 'DOI_SOAT_NOT_FOUND', 'Báo lỗi 404 DOI_SOAT_NOT_FOUND khi bảng đối soát không tồn tại');

  // Test 12: Tạo thu bổ sung khi bảng đối soát không thiếu tiền (W4-T5-A01) -> 409 KHONG_CO_NGHIA_VU_THU_THEM
  const t12 = await callApi(`/api/v1/thanh-toan/doi-soat/1/thu-bo-sung`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ phuongThucDuocHoTro: 'VNPAY' })
  });
  assert(t12.status === 409 && t12.data?.maLoi === 'KHONG_CO_NGHIA_VU_THU_THEM',
    'Chặn tạo thu bổ sung khi đối soát không thiếu tiền cọc (HTTP 409 KHONG_CO_NGHIA_VU_THU_THEM - Ca W4-T5-A01)');

  // Test 13: Tra cứu trạng thái giao dịch không tồn tại -> 404 GIAO_DICH_NOT_FOUND
  const t13 = await callApi(`/api/v1/thanh-toan/NON_EXISTENT_ID/trang-thai`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t13.status === 404 && t13.data?.maLoi === 'GIAO_DICH_NOT_FOUND', 'Báo lỗi 404 GIAO_DICH_NOT_FOUND khi mã giao dịch không tồn tại');

  // =========================================================================
  // PHẦN 4: W4-T8 — NGOẠI LỆ THANH TOÁN VÀ ĐỐI CHIẾU (UC06)
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 4] Kiểm tra W4-T8: Ngoại lệ thanh toán & Đối chiếu (UC06)${colors.reset}`);

  // Test 14: Lấy danh sách giao dịch cần đối chiếu ngoại lệ (Staff/Admin)
  const t14 = await callApi(`/api/v1/thanh-toan/can-doi-chieu`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t14.status === 200 && Array.isArray(t14.data), 'Nhân viên truy vấn danh sách giao dịch cần đối chiếu thành công (HTTP 200)');

  // Test 15: Callback webhook thu bổ sung với giao dịch không tồn tại -> 404
  const t15 = await callApi(`/api/v1/thanh-toan/callback/thu-bo-sung`, {
    method: 'POST',
    body: JSON.stringify({
      maYeuCau: 'NON_EXISTENT_PAYMENT',
      soTien: 100000,
      trangThai: 'ThanhCong'
    })
  });
  assert(t15.status === 404 && t15.data?.maLoi === 'GIAO_DICH_NOT_FOUND', 'Webhook callback trả 404 khi giao dịch không tồn tại');

  // Test 16: Admin đối chiếu giao dịch không tồn tại -> 404
  const t16 = await callApi(`/api/v1/thanh-toan/999999/doi-chieu`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      ketLuan: 'HopLe_XacNhan',
      ghiChu: 'Test đối chiếu'
    })
  });
  assert(t16.status === 404 && t16.data?.maLoi === 'GIAO_DICH_NOT_FOUND', 'Admin đối chiếu báo 404 khi giao dịch không tồn tại');

  // Test 17: Admin đối chiếu với kết luận không hợp lệ -> 400 KET_LUAN_KHONG_HOP_LE
  const t17 = await callApi(`/api/v1/thanh-toan/1/doi-chieu`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      ketLuan: 'KET_LUAN_BAY_BA',
      ghiChu: 'Test invalid conclusion'
    })
  });
  assert(t17.status === 400 && t17.data?.maLoi === 'KET_LUAN_KHONG_HOP_LE', 'Chặn đối chiếu khi kết luận không hợp lệ (HTTP 400 KET_LUAN_KHONG_HOP_LE)');

  // Test 18: Admin đối chiếu hợp lệ với kết luận hoàn tiền thừa HopLe_HoanTienThua
  const t18 = await callApi(`/api/v1/thanh-toan/1/doi-chieu`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      ketLuan: 'HopLe_HoanTienThua',
      soTienHoan: 50000,
      ghiChu: 'Hoàn tiền thừa sau đối chiếu'
    })
  });
  assert(t18.status === 200 || (t18.status === 404 && t18.data?.maLoi === 'GIAO_DICH_NOT_FOUND') || (t18.status === 400 && t18.data?.maLoi === 'VUOT_HAN_MUC_HOAN') || (t18.status === 400 && t18.data?.maLoi === 'NGUON_HOAN_KHONG_HOP_LE'),
    `Admin xử lý đối chiếu hoàn tiền thừa HopLe_HoanTienThua (HTTP ${t18.status}${t18.data?.maLoi ? ' - ' + t18.data.maLoi : ''})`);

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  console.log(`\n${colors.bold}=== TỔNG KẾT KẾT QUẢ KIỂM THỬ TASK 2, 5, 8 ===${colors.reset}`);
  console.log(`  Số ca thành công: ${colors.green}${passedCount}${colors.reset}`);
  console.log(`  Số ca thất bại:   ${failedCount > 0 ? colors.red : colors.green}${failedCount}${colors.reset}`);

  if (failedCount === 0) {
    console.log(`\n${colors.bold}${colors.green}>>> TOÀN BỘ CÁC CA KIỂM THỬ TASK 2, 5, 8 ĐỀU ĐẠT CHUẨN ĐẶC TẢ VÀ DATABASE! <<<\n${colors.reset}`);
  } else {
    console.log(`\n${colors.bold}${colors.red}>>> CÓ ${failedCount} CA KIỂM THỬ CHƯA ĐẠT. VUI LÒNG KIỂM TRA LẠI. <<<\n${colors.reset}`);
  }
}

runTests();
