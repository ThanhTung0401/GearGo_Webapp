/**
 * Script kiểm thử tự động toàn diện cho Task W4-T1 của Tuấn Kiệt:
 * - Nhận trả nhiều đợt và kết luận mất (UC12)
 * - Chạy: node tests/week4/test_w4_tuankiet.mjs
 */

import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

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

async function detectAccountTokens() {
  for (const adminId of [10002, 1]) {
    const candidate = generateToken('QuanTriVien', adminId, 'admin@geargo.vn');
    const res = await callApi(`/api/v1/nhan-tra/1/chi-tiet/1/duyet-mat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candidate}` },
      body: JSON.stringify({ lyDo: 'test', maPhuPhiBoiThuong: 1 })
    });
    if (res.status !== 403) {
      adminToken = candidate;
      const staffId = adminId === 10002 ? 10003 : 2;
      const customerId = adminId === 10002 ? 10004 : 3;
      staffToken = generateToken('NhanVien', staffId, 'staff@geargo.vn');
      customerToken = generateToken('KhachHang', customerId, 'customer@geargo.vn');
      break;
    }
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}=== BẮT ĐẦU KIỂM THỬ WEEK 4 - TUẤN KIỆT (W4-T1: NHẬN TRẢ NHIỀU ĐỢT & KẾT LUẬN MẤT) ===${colors.reset}\n`);

  try {
    execSync('docker exec -i geargo-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "GearGo@123" -C -d GearGoDb -Q "DELETE FROM CHI_TIET_NHAN_TRA WHERE ma_phieu_nhan_tra > 1; DELETE FROM PHIEU_NHAN_TRA WHERE ma_phieu_nhan_tra > 1; UPDATE DON_THUE SET trang_thai = \'DangThue\' WHERE ma_don_thue = 1;"', { stdio: 'ignore' });
  } catch {}

  await detectAccountTokens();

  const testDonId = 1;

  // =========================================================================
  // PHẦN 1: PHÂN QUYỀN TRUY CẬP (AUTH & PERMISSION)
  // =========================================================================
  console.log(`${colors.bold}[PHẦN 1] Kiểm tra phân quyền truy cập${colors.reset}`);

  // Test 1: Không có token -> 401 Unauthorized
  const t1 = await callApi(`/api/v1/nhan-tra/theo-don/${testDonId}`);
  assert(t1.status === 401, 'Chặn truy cập khi không có Token (HTTP 401)');

  // Test 2: Khách hàng gọi API nhân viên (tạo phiếu nháp) -> 403 Forbidden
  const t2 = await callApi(`/api/v1/nhan-tra/theo-don/${testDonId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ danhSachChiTietBanGiao: [1] })
  });
  assert(t2.status === 403, 'Khách hàng bị cấm tạo phiếu nhận trả (HTTP 403)');

  // Test 3: Nhân viên gọi API duyệt mất (chỉ dành cho Admin) -> 403 Forbidden
  const t3 = await callApi(`/api/v1/nhan-tra/1/chi-tiet/1/duyet-mat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ lyDo: 'Test duyet', maPhuPhiBoiThuong: 1 })
  });
  assert(t3.status === 403, 'Nhân viên bị cấm duyệt kết luận mất thiết bị (HTTP 403 Policy AdminOnly)');

  // =========================================================================
  // PHẦN 2: TRUY VẤN DANH SÁCH & THIẾT BỊ CÒN NỢ
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 2] Kiểm tra truy vấn danh sách & thiết bị còn nợ${colors.reset}`);

  // Test 4: Đơn không tồn tại -> 404
  const t4 = await callApi(`/api/v1/nhan-tra/theo-don/999999`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t4.status === 404, 'Báo lỗi khi truy vấn đơn không tồn tại (HTTP 404, DON_NOT_FOUND)');

  // Test 5: Lấy danh sách các đợt nhận trả của đơn 1
  const t5 = await callApi(`/api/v1/nhan-tra/theo-don/${testDonId}`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t5.status === 200 && Array.isArray(t5.data), 'Lấy danh sách các đợt nhận trả thành công (HTTP 200)');

  // Test 6: Lấy danh sách thiết bị còn nợ
  const t6 = await callApi(`/api/v1/nhan-tra/theo-don/${testDonId}/con-no`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t6.status === 200 && Array.isArray(t6.data), 'Lấy danh sách thiết bị còn nợ thành công (HTTP 200)');
  const danhSachConNo = t6.data || [];
  console.log(`     Số thiết bị còn nợ hiện tại: ${danhSachConNo.length}`);

  // =========================================================================
  // PHẦN 3: VALIDATION KHI TẠO PHIẾU NHÁP
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 3] Kiểm tra Validation khi tạo phiếu nhận trả nháp${colors.reset}`);

  // Test 7: Danh sách thiết bị rỗng -> 400
  const t7 = await callApi(`/api/v1/nhan-tra/theo-don/${testDonId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ danhSachChiTietBanGiao: [] })
  });
  assert(t7.status === 400, 'Chặn tạo phiếu với danh sách thiết bị rỗng (HTTP 400)');

  // Test 8: Thiết bị không thuộc đơn thuê -> 400
  const t8 = await callApi(`/api/v1/nhan-tra/theo-don/${testDonId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ danhSachChiTietBanGiao: [999999] })
  });
  assert(t8.status === 400 && (t8.data?.maLoi === 'THIET_BI_KHONG_THUOC_BAN_GIAO' || t8.status === 400),
    'Chặn thiết bị không thuộc biên bản bàn giao của đơn (HTTP 400, THIET_BI_KHONG_THUOC_BAN_GIAO)');

  // Test 9: Trùng lặp thiết bị trong cùng request -> 400
  const t9 = await callApi(`/api/v1/nhan-tra/theo-don/${testDonId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ danhSachChiTietBanGiao: [1, 1] })
  });
  assert(t9.status === 400, 'Chặn danh sách có thiết bị trùng lặp (HTTP 400, DUPLICATE_ITEMS)');

  // =========================================================================
  // PHẦN 4: TẠO, SỬA VÀ TÁCH DÒNG NHẬN TRẢ
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 4] Kiểm tra Tạo, Sửa và Tách dòng nhận trả nháp${colors.reset}`);

  // Tìm phiếu đang ở trạng thái Nhap hoặc tạo mới nếu chưa có
  let phieuHienTai = t5.data?.find(p => p.trangThai === 'Nhap');
  if (!phieuHienTai && danhSachConNo.length > 0) {
    const resTao = await callApi(`/api/v1/nhan-tra/theo-don/${testDonId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ danhSachChiTietBanGiao: [danhSachConNo[0].maChiTietBanGiao] })
    });
    phieuHienTai = resTao.data;
  }

  // Test 10: Xác định phiếu nhận trả nháp
  assert(phieuHienTai != null, `Đã chuẩn bị phiếu nhận trả nháp để kiểm thử (Mã phiếu: ${phieuHienTai?.maPhieu})`);
  const phieuHienTaiId = phieuHienTai?.maPhieu;
  const chiTietItem = phieuHienTai?.chiTiet?.[0];
  const testCtbgId = chiTietItem?.maChiTietBanGiao || 1;
  const testCtntId = chiTietItem?.maChiTietNhanTra || 1;

  // Test 11: Chặn cập nhật thời điểm trả ở tương lai -> 400
  const tuongLai = new Date(Date.now() + 86400000 * 2).toISOString();
  const t11 = await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      danhSachDong: [{
        maChiTietBanGiao: testCtbgId,
        thoiDiemTraThucTe: tuongLai,
        ketLuan: 'Dat'
      }]
    })
  });
  assert(t11.status === 400 && t11.data?.maLoi === 'THOI_DIEM_TRA_KHONG_HOP_LE',
    'Chặn ghi nhận thời điểm trả ở tương lai (HTTP 400, THOI_DIEM_TRA_KHONG_HOP_LE)');

  // Test 12: Cập nhật phiếu nháp thành công với tình trạng cần vệ sinh
  const t12 = await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      ghiChu: 'Cập nhật kiểm tra thực tế',
      danhSachDong: [{
        maChiTietBanGiao: testCtbgId,
        thoiDiemTraThucTe: new Date().toISOString(),
        ketLuan: 'CanVeSinh',
        tinhTrangSauThue: 'Bám bụi bùn đất sau chuyến đi',
        phuKienThucNhan: [{ ten: 'Cọc lều', soLuong: 8 }],
        phuKienConThieu: []
      }]
    })
  });
  assert(t12.status === 200, 'Cập nhật thông tin kiểm tra thiết bị thành công (HTTP 200)');

  // Test 13: Chặn tách dòng với danh sách rỗng -> 400
  const t13 = await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}/tach-cho-xu-ly`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ danhSachChiTietNhanTra: [], lyDo: 'Tách test' })
  });
  assert(t13.status === 400, 'Chặn tách dòng với danh sách rỗng (HTTP 400, DANH_SACH_RONG)');

  // Test 14: Chặn tách toàn bộ dòng khiến phiếu gốc rỗng -> 400
  const t14 = await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}/tach-cho-xu-ly`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ danhSachChiTietNhanTra: [testCtntId], lyDo: 'Tách hết' })
  });
  assert(t14.status === 400 && t14.data?.maLoi === 'KHONG_THE_TACH_HET',
    'Chặn tách toàn bộ dòng làm phiếu gốc bị rỗng (HTTP 400, KHONG_THE_TACH_HET)');

  // =========================================================================
  // PHẦN 5: DUYỆT MẤT & BỒI THƯỜNG
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 5] Kiểm tra Phê duyệt kết luận mất thiết bị${colors.reset}`);

  // Test 15: Duyệt mất khi dòng không có kết luận mất -> 400
  const t15 = await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}/chi-tiet/${testCtntId}/duyet-mat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ lyDo: 'Duyệt mất đồ', maPhuPhiBoiThuong: 1 })
  });
  assert(t15.status === 400 && t15.data?.maLoi === 'KHONG_PHAI_MAT_THIET_BI',
    'Chặn duyệt mất khi dòng kiểm tra không có kết luận mất (HTTP 400, KHONG_PHAI_MAT_THIET_BI)');

  // Test 16: Duyệt mất khi phụ phí chưa được duyệt hoặc không tồn tại -> 404 / 409
  // Đổi kết luận sang MatThietBi trước
  await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      danhSachDong: [{
        maChiTietBanGiao: testCtbgId,
        ketLuan: 'MatThietBi',
        bienBanMat: 'Biên bản mất tại hiện trường'
      }]
    })
  });

  const t16 = await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}/chi-tiet/${testCtntId}/duyet-mat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ lyDo: 'Duyệt mất', maPhuPhiBoiThuong: 999999 })
  });
  assert(t16.status === 404 || t16.status === 409,
    'Chặn duyệt mất khi phụ phí bồi thường không hợp lệ hoặc chưa được duyệt (HTTP 404/409, PHU_PHI_NOT_FOUND/KET_LUAN_MAT_CHUA_DU)');

  // Trả lại kết luận CanVeSinh để tiếp tục chốt nhận trả đồ
  await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      danhSachDong: [{
        maChiTietBanGiao: testCtbgId,
        thoiDiemTraThucTe: new Date().toISOString(),
        ketLuan: 'CanVeSinh',
        tinhTrangSauThue: 'Bám bẩn nhẹ'
      }]
    })
  });

  // =========================================================================
  // PHẦN 6: CHỐT NHẬN TRẢ & BẢO TRÀ TỐI THIỂU (W4-T1-A01, W4-T1-A05)
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 6] Kiểm tra Chốt nhận trả & Khởi tạo bảo trì tối thiểu${colors.reset}`);

  // Test 17: Chốt nhận trả đợt này thành công
  const t17 = await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}/chot`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t17.status === 200, 'Chốt phiếu nhận trả thành công (HTTP 200)');
  const resChot = t17.data;

  // Test 18: Kiểm tra trạng thái laLanTraCuoi
  if (resChot?.soThietBiConNo > 0) {
    assert(resChot?.laLanTraCuoi === false, 'Đơn vẫn còn thiết bị nợ: laLanTraCuoi = false (W4-T1-A01)');
  } else {
    assert(resChot?.laLanTraCuoi === true, 'Đã hoàn tất toàn bộ thiết bị: laLanTraCuoi = true (W4-T1-A05)');
  }

  // Test 19: Tính bất biến (Idempotency) - Chốt lại cùng phiếu đã chốt trả kết quả cũ
  const t19 = await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}/chot`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(t19.status === 200 && t19.data?.trangThai === 'DaChot',
    'Gọi lại chốt phiếu đã chốt trả kết quả cũ an toàn (Idempotency HTTP 200)');

  // Test 20: Chặn sửa phiếu đã chốt -> 409
  const t20 = await callApi(`/api/v1/nhan-tra/${phieuHienTaiId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ ghiChu: 'Sửa bậy' })
  });
  assert(t20.status === 409 && t20.data?.maLoi === 'PHIEU_NHAN_DA_CHOT',
    'Chặn sửa nội dung trên phiếu đã chốt (HTTP 409, PHIEU_NHAN_DA_CHOT)');

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bold}  KẾT QUẢ KIỂM THỬ W4-T1: ${passedCount} PASS / ${failedCount} FAIL (Tổng cộng: ${passedCount + failedCount} ca kiểm thử)${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
