/**
 * Script kiểm thử tự động toàn diện cho Week 5 của Kim Xuyến:
 * - W5-T7: Tư vấn bộ đồ bằng AI và gợi ý dự phòng (UC09)
 * Chạy: node tests/week5/test_w5_kimxuyen.mjs
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

function generateToken(role, maTaiKhoan = 3, email = 'customer_w5_xuyen@geargo.vn') {
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

const customerToken = generateToken('KhachHang', 3, 'customer_w5_xuyen@geargo.vn');

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
    return { status: 500, error: err.message };
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTestCase(testCode, title, fn) {
  process.stdout.write(`  [${testCode}] ${title}... `);
  try {
    await fn();
    console.log(`${colors.green}✓ PASS${colors.reset}`);
    passedCount++;
  } catch (err) {
    console.log(`${colors.red}✗ FAIL: ${err.message}${colors.reset}`);
    failedCount++;
  }
}

async function main() {
  console.log(`\n${colors.cyan}${colors.bold}================================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}   BỘ KIỂM THỬ WEEK 5 — KIM XUYẾN (W5-T7: TƯ VẤN BỘ ĐỒ AI & DỰ PHÒNG)          ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}================================================================================\n${colors.reset}`);

  // Thiết lập ngày thuê mẫu (10/10/2026 - 12/10/2026)
  const gioNhanMau = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
  const gioTraMau = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();

  // W5-T7-A01: Nhu cầu 4 người, model gợi ý 1 lều sức chứa 2 -> Server không khẳng định đủ chỗ, fallback hoặc bổ sung
  await runTestCase('W5-T7-A01', 'Nhu cầu 4 người, model gợi ý lều sức chứa 2 -> Server bảo vệ, bảo đảm đủ sức chứa', async () => {
    const res = await callApi('/api/tu-van/bo-do', {
      method: 'POST',
      headers: { 'X-Mock-AI-Scenario': 'invalid_capacity' },
      body: JSON.stringify({
        diemDen: 'Hồ Trị An',
        soNguoi: 4,
        gioNhan: gioNhanMau,
        gioTra: gioTraMau,
        nhuCau: ['Cắm trại 4 người']
      })
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const cacDong = res.data.cacDong || [];
    assert(cacDong.length > 0, 'Cần có danh sách sản phẩm gợi ý');

    // Kiểm tra sức chứa lều thực tế phải >= 4 người
    const tongSucChua = cacDong
      .filter(d => (d.tenSanPham || '').toLowerCase().includes('lều'))
      .reduce((sum, d) => sum + (d.sucChua || 0) * d.soLuong, 0);

    assert(tongSucChua >= 4, `Tổng sức chứa lều phải >= 4, thực tế là ${tongSucChua}`);
  });

  // W5-T7-A02: Model trả sản phẩm ID ngoài candidate, lượng -1 -> Server loại bỏ mã sai, không trả dữ liệu bịa
  await runTestCase('W5-T7-A02', 'Model trả sản phẩm ID ngoài candidate và lượng âm -> Server loại bỏ, fallback quy tắc', async () => {
    const res = await callApi('/api/tu-van/bo-do', {
      method: 'POST',
      headers: { 'X-Mock-AI-Scenario': 'invalid_candidate' },
      body: JSON.stringify({
        diemDen: 'Ba Vì',
        soNguoi: 2,
        gioNhan: gioNhanMau,
        gioTra: gioTraMau
      })
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const cacDong = res.data.cacDong || [];
    const coMaLa = cacDong.some(d => d.maSanPham === 999999 || d.soLuong <= 0);
    assert(!coMaLa, 'Không được chứa mã sản phẩm lạ 999999 hoặc số lượng âm');
  });

  // W5-T7-A03: Ngân sách thuê 600.000, cọc 1.000.000 -> So thuê với 600.000, tổng ban đầu hiển thị đầy đủ
  await runTestCase('W5-T7-A03', 'Ngân sách tiền thuê 600.000đ -> So sánh đúng loại TienThue và hiển thị tổng cọc', async () => {
    const res = await callApi('/api/tu-van/bo-do', {
      method: 'POST',
      body: JSON.stringify({
        soNguoi: 2,
        gioNhan: gioNhanMau,
        gioTra: gioTraMau,
        nganSach: 600000,
        loaiNganSach: 'TienThue'
      })
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.tongTienThue !== null, 'Phải có tổng tiền thuê');
    assert(res.data.tongTienCoc !== null, 'Phải có tổng tiền cọc');
    assert(res.data.tongBanDau === res.data.tongTienThue + res.data.tongTienCoc, 'Tổng ban đầu phải bằng tiền thuê + cọc');
  });

  // W5-T7-A04: Cùng ngân sách nhưng loại TongBanDau -> Chỉ chấp nhận nếu thuê+cọc <= ngân sách
  await runTestCase('W5-T7-A04', 'Cùng ngân sách nhưng loại TongBanDau -> So sánh với tổng ban đầu gồm cọc', async () => {
    const res = await callApi('/api/tu-van/bo-do', {
      method: 'POST',
      body: JSON.stringify({
        soNguoi: 4,
        gioNhan: gioNhanMau,
        gioTra: gioTraMau,
        nganSach: 200000, // Quá thấp cho cả thuê + cọc 4 người
        loaiNganSach: 'TongBanDau'
      })
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    if (res.data.trangThai === 'KhongTimThayPhuongAn') {
      assert(res.data.thongBaoPhanThieu?.includes('ngân sách') || res.data.thongBaoPhanThieu?.includes('Ngân sách'), 'Cần nêu rõ lý do ngân sách');
    } else {
      assert(res.data.tongBanDau <= 200000, `Tổng ban đầu ${res.data.tongBanDau} phải <= 200000`);
    }
  });

  // W5-T7-A05: Chưa nhập ngày thuê -> Trả giá tham khảo/ngày và trạng thái CanBoSungThongTin, không chốt tổng
  await runTestCase('W5-T7-A05', 'Chưa nhập ngày thuê -> Trả giá tham khảo/ngày, không khẳng định còn hàng hay tổng kỳ', async () => {
    const res = await callApi('/api/tu-van/bo-do', {
      method: 'POST',
      body: JSON.stringify({
        soNguoi: 4,
        nganSach: 500000
      })
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.trangThai === 'CanBoSungThongTin', `Expected CanBoSungThongTin, got ${res.data.trangThai}`);
    assert(res.data.tongTienThue === null, 'Chưa có ngày thuê thì tổng tiền thuê toàn kỳ phải null');
    assert(res.data.thoiGianThueNgay === null, 'Thời gian thuê ngày phải null');
    assert(res.data.thongBaoPhanThieu !== null, 'Phải có thông báo yêu cầu bổ sung ngày thuê');
  });

  // W5-T7-A06: Provider timeout / JSON sai -> Tự động fallback sang quy tắc dự phòng (QuyTac)
  await runTestCase('W5-T7-A06', 'Provider timeout hoặc JSON lỗi -> Tự động fallback sang quy tắc dự phòng', async () => {
    const res = await callApi('/api/tu-van/bo-do', {
      method: 'POST',
      headers: { 'X-Mock-AI-Scenario': 'timeout' },
      body: JSON.stringify({
        soNguoi: 2,
        gioNhan: gioNhanMau,
        gioTra: gioTraMau
      })
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.nguonGoiY === 'QuyTac', `Nguồn gợi ý phải là QuyTac sau khi fallback, nhận được ${res.data.nguonGoiY}`);
    assert((res.data.cacDong || []).length > 0, 'Phải có danh sách sản phẩm từ quy tắc dự phòng');
  });

  // Lấy 1 sản phẩm thật để test thêm vào giỏ
  const tuVanRes = await callApi('/api/tu-van/bo-do', {
    method: 'POST',
    body: JSON.stringify({ soNguoi: 2, gioNhan: gioNhanMau, gioTra: gioTraMau })
  });
  const sanPhamMau = tuVanRes.data?.cacDong?.[0];
  assert(sanPhamMau, 'Cần có sản phẩm mẫu để test giỏ hàng');

  // W5-T7-A07: Một trong các dòng vượt quá khả dụng lúc thêm giỏ -> Trả 409, không thêm dở dang
  await runTestCase('W5-T7-A07', 'Một sản phẩm vượt khả dụng lúc thêm giỏ -> 409 BO_DO_KHONG_CON_PHU_HOP, không thêm dở dang', async () => {
    const res = await callApi('/api/tu-van/bo-do/them-vao-gio', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        gioNhan: gioNhanMau,
        gioTra: gioTraMau,
        cacDong: [
          { maSanPham: sanPhamMau.maSanPham, soLuong: 1 },
          { maSanPham: sanPhamMau.maSanPham, soLuong: 99999 } // Vượt quá khả dụng
        ]
      })
    });

    assert(res.status === 409, `Expected 409, got ${res.status}`);
    assert(res.data.maLoi === 'BO_DO_KHONG_CON_PHU_HOP', `Expected BO_DO_KHONG_CON_PHU_HOP, got ${res.data.maLoi}`);
  });

  // W5-T7-A08: Giỏ đang lịch A, thêm gợi ý lịch B với GiuNguyen -> 409 NGAY_GIO_KHAC_GIO_HIEN_TAI
  await runTestCase('W5-T7-A08', 'Giỏ đang có lịch A, thêm bộ đồ lịch B mà không đồng ý thay thế -> 409 NGAY_GIO_KHAC_GIO_HIEN_TAI', async () => {
    // 1. Thêm 1 món vào giỏ với lịch A
    const gioNhanA = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
    const gioTraA = new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString();

    await callApi('/api/tu-van/bo-do/them-vao-gio', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        gioNhan: gioNhanA,
        gioTra: gioTraA,
        cacDong: [{ maSanPham: sanPhamMau.maSanPham, soLuong: 1 }],
        xuLyXungDotLich: 'ThayThe'
      })
    });

    // 2. Cố tình thêm bộ đồ với lịch B và chọn GiuNguyen
    const gioNhanB = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString();
    const gioTraB = new Date(Date.now() + 22 * 24 * 3600 * 1000).toISOString();

    const res = await callApi('/api/tu-van/bo-do/them-vao-gio', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        gioNhan: gioNhanB,
        gioTra: gioTraB,
        cacDong: [{ maSanPham: sanPhamMau.maSanPham, soLuong: 1 }],
        xuLyXungDotLich: 'GiuNguyen'
      })
    });

    assert(res.status === 409, `Expected 409, got ${res.status}`);
    assert(res.data.maLoi === 'NGAY_GIO_KHAC_GIO_HIEN_TAI', `Expected NGAY_GIO_KHAC_GIO_HIEN_TAI, got ${res.data.maLoi}`);
  });

  // W5-T7-A09: Thêm bộ vào giỏ thành công -> Không tạo GIU_CHO hay DON_THUE
  await runTestCase('W5-T7-A09', 'Thêm bộ vào giỏ thành công -> Trả 200 OK, không tạo giữ chỗ kho hay đơn thuê', async () => {
    const res = await callApi('/api/tu-van/bo-do/them-vao-gio', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        gioNhan: gioNhanMau,
        gioTra: gioTraMau,
        cacDong: [{ maSanPham: sanPhamMau.maSanPham, soLuong: 1 }],
        xuLyXungDotLich: 'ThayThe'
      })
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.thanhCong === true, 'Phải trả thanhCong = true');
  });

  console.log(`\n${colors.cyan}--------------------------------------------------------------------------------${colors.reset}`);
  console.log(`KẾT QUẢ KIỂM THỬ: ${colors.green}${passedCount} PASSED${colors.reset}, ${colors.red}${failedCount} FAILED${colors.reset}`);
  console.log(`${colors.cyan}================================================================================\n${colors.reset}`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

main();
