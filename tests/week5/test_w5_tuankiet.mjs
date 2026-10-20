import crypto from 'node:crypto';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const JWT_SECRET = 'GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!';

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m'
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

async function detectAccountTokens() {
  for (const adminId of [10002, 1]) {
    const candidate = generateToken('QuanTriVien', adminId, 'admin@geargo.vn');
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/bao-cao-van-hanh`, {
        headers: { 'Authorization': `Bearer ${candidate}` }
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

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}=== BẮT ĐẦU KIỂM THỬ WEEK 5 - TUẤN KIỆT (W5-T2: BẢO TRÌ & W5-T3: VÒNG ĐỜI THIẾT BỊ) ===${colors.reset}\n`);
  await detectAccountTokens();

  // =========================================================================
  // PHẦN 1: PHÂN QUYỀN TRUY CẬP W5-T2 & W5-T3
  // =========================================================================
  console.log(`${colors.bold}[PHẦN 1] Kiểm tra phân quyền truy cập W5-T2 & W5-T3${colors.reset}`);

  const t1 = await callApi('/api/bao-tri');
  assert(t1.status === 401, 'Chặn truy cập API bảo trì khi không có Token (HTTP 401)', t1);

  const t2 = await callApi('/api/bao-tri', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t2.status === 403, 'Khách hàng bị cấm truy cập API bảo trì (HTTP 403)', t2);

  const t3 = await callApi('/api/vong-doi-thiet-bi/1', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(t3.status === 403, 'Khách hàng bị cấm truy cập API vòng đời thiết bị (HTTP 403)', t3);

  // =========================================================================
  // PHẦN 2: W5-T2 — TRA CỨU, TIẾP NHẬN, CẬP NHẬT TIẾN ĐỘ & NGHIỆM THU BẢO TRÌ
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 2] W5-T2: Quản lý phiếu bảo trì & nghiệm thu hoàn thành${colors.reset}`);

  const dsRes = await callApi('/api/bao-tri', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(dsRes.status === 200 && Array.isArray(dsRes.data?.items),
    `Lấy danh sách phiếu bảo trì có phân trang thành công (Tổng số: ${dsRes.data?.tongSo ?? 0})`, dsRes);

  // Tìm một phiếu đang mở từ danh sách để kiểm thử luồng xử lý
  let openTicket = dsRes.data?.items?.find(p => p.trangThai === 'ChoXuLy' || p.trangThai === 'DangXuLy' || p.trangThai === 'ChoKiemTra');
  let targetDeviceId = openTicket?.maThietBi || 1;

  if (openTicket) {
    // Test W5-T2-A01 / W5-T2-A03: Chặn lập phiếu bảo trì trùng khi thiết bị đã có phiếu đang mở
    const dupRes = await callApi('/api/bao-tri', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        maThietBi: openTicket.maThietBi,
        loaiXuLy: 'SuaChua',
        moTaLoi: 'Thử lập trùng phiếu đang mở',
        mucDo: 'Nhe'
      })
    });
    assert(dupRes.status === 409 && dupRes.data?.maLoi === 'THIET_BI_DA_CO_BAO_TRI_MO',
      'Chặn lập trùng phiếu bảo trì khi thiết bị đang có phiếu mở (W5-T2-A01 / W5-T2-A03, HTTP 409)', dupRes);
  }

  // Test chặn chi phí âm
  if (openTicket) {
    const negCost = await callApi(`/api/bao-tri/${openTicket.maPhieuBaoTri}/tien-do`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        ketQua: 'Đang sửa',
        chiPhi: -50000
      })
    });
    assert(negCost.status === 400 && negCost.data?.maLoi === 'CHI_PHI_KHONG_HOP_LE',
      'Chặn cập nhật chi phí bảo trì âm (HTTP 400, CHI_PHI_KHONG_HOP_LE)', negCost);

    // Cập nhật tiến độ hợp lệ (Admin hoặc người được phân công)
    const progRes = await callApi(`/api/bao-tri/${openTicket.maPhieuBaoTri}/tien-do`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        ketQua: 'Đã vệ sinh và cân chỉnh khung lều hoàn tất',
        chiPhi: 150000,
        bangChung: '["https://geargo.vn/evidence/bt1.jpg"]'
      })
    });
    assert(progRes.status === 200 && progRes.data?.chiPhi === 150000,
      'Cập nhật tiến độ & chi phí bảo trì thành công (HTTP 200)', progRes);

    // Gửi kiểm tra
    const sendCheck = await callApi(`/api/bao-tri/${openTicket.maPhieuBaoTri}/gui-kiem-tra`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(sendCheck.status === 200 && sendCheck.data?.trangThai === 'ChoKiemTra',
      'Gửi kiểm tra nghiệm thu chuyển phiếu sang ChoKiemTra (HTTP 200)', sendCheck);

    // Nhân viên thường bị cấm xác nhận hoàn thành (AdminOnly)
    const staffConfirm = await callApi(`/api/bao-tri/${openTicket.maPhieuBaoTri}/hoan-thanh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        ketQuaKiemTra: 'Nhân viên tự duyệt'
      })
    });
    assert(staffConfirm.status === 403,
      'Nhân viên không có quyền tự xác nhận hoàn thành bảo trì (HTTP 403 AdminOnly)', staffConfirm);

    // Admin xác nhận hoàn thành -> Thiết bị về SanSang
    const adminConfirm = await callApi(`/api/bao-tri/${openTicket.maPhieuBaoTri}/hoan-thanh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        ketQuaKiemTra: 'Nghiệm thu đạt tiêu chuẩn cho thuê',
        chiPhi: 150000
      })
    });
    assert(adminConfirm.status === 200 && adminConfirm.data?.trangThai === 'HoanThanh',
      'Admin xác nhận hoàn thành bảo trì thành công (HTTP 200, HoanThanh)', adminConfirm);

    // Idempotency: Gọi hoàn thành lần 2 trả 200 an toàn
    const confirmAgain = await callApi(`/api/bao-tri/${openTicket.maPhieuBaoTri}/hoan-thanh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        ketQuaKiemTra: 'Nghiệm thu đạt tiêu chuẩn cho thuê'
      })
    });
    assert(confirmAgain.status === 200 && confirmAgain.data?.trangThai === 'HoanThanh',
      'Gọi xác nhận hoàn thành lần 2 đảm bảo Idempotency (HTTP 200)', confirmAgain);

    // Chặn sửa tiến độ phiếu đã hoàn thành
    const editClosed = await callApi(`/api/bao-tri/${openTicket.maPhieuBaoTri}/tien-do`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ ketQua: 'Sửa phiếu đã đóng' })
    });
    assert(editClosed.status === 409 && editClosed.data?.maLoi === 'PHIEU_BAO_TRI_DA_KET_THUC',
      'Chặn cập nhật tiến độ trên phiếu bảo trì đã kết thúc (HTTP 409, PHIEU_BAO_TRI_DA_KET_THUC)', editClosed);
  }

  // =========================================================================
  // PHẦN 3: W5-T3 — HỒ SƠ VÒNG ĐỜI, XEM ẢNH HƯỞNG & GIÁNG CẤP THIẾT BỊ
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 3] W5-T3: Hồ sơ vòng đời thiết bị & Đề nghị giáng cấp / ngừng sử dụng${colors.reset}`);

  // Lấy hồ sơ vòng đời bằng quyền Nhân viên (GiaNhap phải ẩn = null)
  const hoSoStaff = await callApi(`/api/vong-doi-thiet-bi/${targetDeviceId}`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(hoSoStaff.status === 200 && hoSoStaff.data?.giaNhap === null,
    'Nhân viên xem hồ sơ vòng đời thiết bị thành công và ẩn giá nhập (giaNhap = null)', hoSoStaff);

  // Lấy hồ sơ vòng đời bằng quyền Admin (GiaNhap hiển thị số thực)
  const hoSoAdmin = await callApi(`/api/vong-doi-thiet-bi/${targetDeviceId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(hoSoAdmin.status === 200 && typeof hoSoAdmin.data?.giaNhap === 'number',
    'Admin xem hồ sơ vòng đời thiết bị thấy đầy đủ giá nhập gốc và nguồn nhập', hoSoAdmin);

  const currentProductId = hoSoAdmin.data?.maSanPhamHienTai;
  const originalSourceProductId = hoSoAdmin.data?.maSanPhamNguon;

  // Xem ảnh hưởng khi chọn sản phẩm đích trùng sản phẩm hiện tại -> 400
  const invalidPreview = await callApi(`/api/vong-doi-thiet-bi/${targetDeviceId}/xem-anh-huong`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      loaiThayDoi: 'GiangCap',
      maSanPhamDich: currentProductId
    })
  });
  assert(invalidPreview.status === 400 && invalidPreview.data?.maLoi === 'SAN_PHAM_DICH_KHONG_PHU_HOP',
    'Chặn xem ảnh hưởng giáng cấp khi sản phẩm đích trùng sản phẩm hiện tại (HTTP 400)', invalidPreview);

  // Tìm một sản phẩm đích khác đang kinh doanh
  const targetProductId = currentProductId === 1 ? 2 : 1;
  const validPreview = await callApi(`/api/vong-doi-thiet-bi/${targetDeviceId}/xem-anh-huong`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      loaiThayDoi: 'GiangCap',
      maSanPhamDich: targetProductId,
      lyDo: 'Kiểm tra ảnh hưởng giáng cấp'
    })
  });
  assert(validPreview.status === 200 && typeof validPreview.data?.coTheDeNghi === 'boolean',
    'Xem phân tích ảnh hưởng thay đổi vòng đời thành công (HTTP 200)', validPreview);

  // Tạo đề nghị giáng cấp và duyệt áp dụng nếu thiết bị không vướng cam kết
  if (validPreview.data?.coTheApDungHienTai) {
    const deNghiRes = await callApi(`/api/vong-doi-thiet-bi/${targetDeviceId}/de-nghi-giang-cap`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        maSanPhamDich: targetProductId,
        tinhTrang: 'Cũ 85% sau bảo trì',
        lyDo: 'Giáng cấp sang dòng sản phẩm tương ứng',
        bangChung: '["https://geargo.vn/evidence/downgrade.jpg"]'
      })
    });
    assert(deNghiRes.status === 201 && deNghiRes.data?.trangThai === 'ChoDuyet',
      'Nhân viên lập phiếu đề nghị giáng cấp thành công (HTTP 201, ChoDuyet)', deNghiRes);

    const maPhieuDc = deNghiRes.data?.maPhieuDieuChinh;
    if (maPhieuDc) {
      // Admin duyệt đề nghị giáng cấp (W5-T3-A01)
      const duyetRes = await callApi(`/api/vong-doi-thiet-bi/de-nghi/${maPhieuDc}/duyet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert(duyetRes.status === 200 && duyetRes.data?.trangThai === 'DaApDung',
        'Admin duyệt áp dụng đề nghị giáng cấp thành công (HTTP 200, DaApDung)', duyetRes);

      // Kiểm tra lại hồ sơ: MaSanPhamHienTai đã đổi sang targetProductId, nhưng MaSanPhamNguon giữ nguyên!
      const hoSoAfter = await callApi(`/api/vong-doi-thiet-bi/${targetDeviceId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert(
        hoSoAfter.data?.maSanPhamHienTai === targetProductId &&
        hoSoAfter.data?.maSanPhamNguon === originalSourceProductId,
        'W5-T3-A01: Sản phẩm hiện tại đã đổi sang sản phẩm đích nhưng nguồn nhập gốc vẫn bất biến',
        hoSoAfter.data
      );

      // Khôi phục lại sản phẩm ban đầu để dữ liệu seed sạch cho các lần chạy sau
      const restoreDeNghi = await callApi(`/api/vong-doi-thiet-bi/${targetDeviceId}/de-nghi-giang-cap`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          maSanPhamDich: currentProductId,
          tinhTrang: 'Tốt',
          lyDo: 'Khôi phục sản phẩm gốc sau kiểm thử'
        })
      });
      if (restoreDeNghi.data?.maPhieuDieuChinh) {
        await callApi(`/api/vong-doi-thiet-bi/de-nghi/${restoreDeNghi.data.maPhieuDieuChinh}/duyet`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` }
        });
      }
    }
  }

  console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bold}  KẾT QUẢ KIỂM THỬ W5 (T2 & T3): ${passedCount} PASS / ${failedCount} FAIL (Tổng cộng: ${passedCount + failedCount} ca kiểm thử)${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
