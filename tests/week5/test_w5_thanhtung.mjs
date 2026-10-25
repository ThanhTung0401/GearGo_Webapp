/**
 * Kiểm thử tự động WEEK 5 - THANH TÙNG:
 * - W5-T1: Quản lý tài khoản & nhân viên (tạo, sửa hồ sơ, đổi vai trò, khóa/mở khóa, nghỉ việc)
 *          + quyền xét theo trạng thái/vai trò HIỆN TẠI (JWT cũ không còn hiệu lực sau khi hạ quyền/khóa)
 *
 * Yêu cầu: backend chạy tại API_URL (mặc định http://localhost:5000) với dữ liệu seed
 * (admin@geargo.vn / staff@geargo.vn, mật khẩu GearGo@2026). Token lấy bằng đăng nhập thật, vì quyền
 * được kiểm tra lại trong database. Mỗi lần chạy tạo dữ liệu có hậu tố riêng và dọn lại trạng thái seed.
 * Chạy: node tests/week5/test_w5_thanhtung.mjs
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const SEED_PASSWORD = 'GearGo@2026';
const NEW_PASSWORD = 'Passw0rd!23';

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m'
};

let passedCount = 0;
let failedCount = 0;
let blockedCount = 0;

function assert(condition, message, errorDetail = null) {
  if (condition) {
    console.log(`  ${colors.green}✔ PASS:${colors.reset} ${message}`);
    passedCount++;
  } else {
    console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${message}`);
    if (errorDetail !== null) console.log('     Chi tiết:', JSON.stringify(errorDetail));
    failedCount++;
  }
}

function blocked(message) {
  console.log(`  ${colors.yellow}⏸ BLOCKED:${colors.reset} ${message}`);
  blockedCount++;
}

async function callApi(endpoint, { token, method = 'GET', body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data };
  } catch (err) {
    return { status: 0, data: null, error: err.message };
  }
}

async function login(taiKhoan, matKhau) {
  const r = await callApi('/api/auth/dang-nhap', { method: 'POST', body: { taiKhoan, matKhau } });
  return { ...r, token: r.data?.token };
}

const runId = Date.now().toString().slice(-8);
// SĐT di động hợp lệ, duy nhất theo mỗi lần chạy (8 chữ số cuối).
const phone = (n) => `09${String((Number(runId) + n) % 100000000).padStart(8, '0')}`;
const email = (tag) => `w5t1.${tag}.${runId}@geargo.vn`;

const nhanVienBody = (tag, n, vaiTro = 'NhanVien', extra = {}) => ({
  hoTen: `Nhân Sự ${tag} ${runId}`,
  email: email(tag),
  soDienThoai: phone(n),
  diaChi: 'Hà Nội',
  ngayVaoLam: '2026-01-05',
  vaiTro,
  matKhauKhoiTao: NEW_PASSWORD,
  ...extra
});

async function taoNhanSu(adminToken, tag, n, vaiTro = 'NhanVien') {
  const r = await callApi('/api/admin/nhan-vien', { token: adminToken, method: 'POST', body: nhanVienBody(tag, n, vaiTro) });
  const l = r.status === 201 ? await login(email(tag), NEW_PASSWORD) : { token: null };
  return { ...r, nv: r.data, token: l.token };
}

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}=== BẮT ĐẦU KIỂM THỬ WEEK 5 - THANH TÙNG (W5-T1: TÀI KHOẢN & NHÂN VIÊN) ===${colors.reset}\n`);

  const health = await callApi('/api/test');
  if (health.status !== 200) {
    console.log(`${colors.red}Không kết nối được backend tại ${BASE_URL}. Hãy chạy backend trước.${colors.reset}`);
    process.exit(1);
  }

  const adminLogin = await login('admin@geargo.vn', SEED_PASSWORD);
  const staffLogin = await login('staff@geargo.vn', SEED_PASSWORD);
  const custLogin = await login('customer@geargo.vn', SEED_PASSWORD);
  const adminToken = adminLogin.token, staffToken = staffLogin.token, customerToken = custLogin.token;
  if (!adminToken || !staffToken || !customerToken) {
    console.log(`${colors.red}Không đăng nhập được tài khoản seed (admin/staff/customer).${colors.reset}`);
    process.exit(1);
  }
  const seedAdminTk = adminLogin.data.maTaiKhoan;

  const cleanup = []; // việc dọn dẹp chạy cuối cùng, theo thứ tự ngược lại.

  // =========================================================================
  // PHẦN 1: PHÂN QUYỀN TRUY CẬP
  // =========================================================================
  console.log(`${colors.bold}[PHẦN 1] Phân quyền truy cập các route quản trị${colors.reset}`);

  const noToken = await callApi('/api/admin/tai-khoan');
  assert(noToken.status === 401, 'Không có token bị từ chối (401)', noToken);

  const routes = [
    ['GET', '/api/admin/tai-khoan'],
    ['GET', `/api/admin/tai-khoan/${seedAdminTk}`],
    ['GET', '/api/admin/nhan-vien'],
    ['POST', '/api/admin/nhan-vien'],
    ['POST', '/api/admin/nhan-vien/1/doi-vai-tro'],
    ['POST', '/api/admin/nhan-vien/1/nghi-viec'],
    ['POST', `/api/admin/tai-khoan/${seedAdminTk}/khoa`]
  ];
  for (const [method, path] of routes) {
    const body = method === 'POST' ? {} : undefined;
    const asStaff = await callApi(path, { token: staffToken, method, body });
    const asCust = await callApi(path, { token: customerToken, method, body });
    assert(asStaff.status === 403, `Nhân viên thường bị cấm ${method} ${path} (403)`, asStaff);
    assert(asCust.status === 403, `Khách hàng bị cấm ${method} ${path} (403)`, asCust);
  }

  // W5-T1-A07: khách gọi tạo nhân viên / gửi role trong hồ sơ cá nhân
  console.log(`\n${colors.bold}[W5-T1-A07] Khách không thể tạo nhân sự hoặc tự nâng quyền${colors.reset}`);
  const custCreate = await callApi('/api/admin/nhan-vien', { token: customerToken, method: 'POST', body: nhanVienBody('khach', 90) });
  assert(custCreate.status === 403, 'Khách gọi route tạo nhân viên bị 403', custCreate);

  const hoSo = await callApi('/api/v1/ho-so/toi', { token: customerToken });
  if (hoSo.status === 200) {
    const hs = hoSo.data;
    const put = await callApi('/api/v1/ho-so/toi', {
      token: customerToken, method: 'PUT',
      body: { hoTen: hs.hoTen, email: hs.email, soDienThoai: hs.soDienThoai, diaChi: hs.diaChi, ngaySinh: hs.ngaySinh,
              anhDaiDien: hs.anhDaiDien, vaiTro: 'QuanTriVien', trangThai: 'HoatDong' }
    });
    const after = await callApi(`/api/admin/tai-khoan/${custLogin.data.maTaiKhoan}`, { token: adminToken });
    assert(after.status === 200 && after.data.vaiTro === 'KhachHang',
      'Gửi vaiTro=QuanTriVien trong hồ sơ cá nhân không đổi vai trò (vẫn KhachHang)', { put: put.status, after: after.data });
  } else {
    blocked(`Không đọc được hồ sơ khách (HTTP ${hoSo.status}) nên chưa kiểm tra gửi role trong hồ sơ.`);
  }

  // =========================================================================
  // PHẦN 2: TẠO NHÂN VIÊN
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 2] Tạo nhân viên (TAI_KHOAN + NHAN_VIEN cùng transaction)${colors.reset}`);

  const A = await taoNhanSu(adminToken, 'a', 1);
  assert(A.status === 201, 'Admin tạo nhân viên thành công (201)', A);
  assert(A.nv?.maNhanVien > 0 && A.nv?.maTaiKhoan > 0 && A.nv.maNhanVien !== undefined,
    'Response có ID nhân viên và ID tài khoản riêng', A.nv);
  assert(A.nv?.vaiTro === 'NhanVien' && A.nv?.trangThaiLamViec === 'DangLamViec' && A.nv?.trangThaiTaiKhoan === 'HoatDong',
    'Nhân viên mới: vai trò NhanVien, đang làm việc, tài khoản hoạt động', A.nv);
  const raw = JSON.stringify(A.data);
  assert(!/matKhau|mat_khau|bam/i.test(raw) && !raw.includes(NEW_PASSWORD),
    'Response không chứa mật khẩu hoặc mật khẩu băm', A.data);
  assert(!!A.token, 'Nhân viên mới đăng nhập được bằng mật khẩu khởi tạo (băm qua cơ chế cũ)');
  cleanup.push(async () => A.nv && callApi(`/api/admin/tai-khoan/${A.nv.maTaiKhoan}/khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Dọn dẹp test W5-T1' } }));

  const dupEmail = await callApi('/api/admin/nhan-vien', { token: adminToken, method: 'POST', body: nhanVienBody('a', 2) });
  assert(dupEmail.status === 409 && dupEmail.data?.maLoi === 'LIEN_HE_DA_TON_TAI', 'Trùng email -> 409 LIEN_HE_DA_TON_TAI', dupEmail);
  const dupPhone = await callApi('/api/admin/nhan-vien', { token: adminToken, method: 'POST', body: nhanVienBody('dupphone', 1) });
  assert(dupPhone.status === 409 && dupPhone.data?.maLoi === 'LIEN_HE_DA_TON_TAI', 'Trùng số điện thoại -> 409 LIEN_HE_DA_TON_TAI', dupPhone);

  // W5-T1-A01: lỗi khi tạo không để lại TAI_KHOAN mồ côi / email bị chiếm
  const afterDup = await callApi(`/api/admin/tai-khoan?tuKhoa=${encodeURIComponent(email('dupphone'))}`, { token: adminToken });
  assert(afterDup.status === 200 && afterDup.data.tongSo === 0,
    'W5-T1-A01: lần tạo thất bại không để lại TAI_KHOAN mồ côi, email không bị chiếm', afterDup.data);

  const badRole = await callApi('/api/admin/nhan-vien', { token: adminToken, method: 'POST', body: nhanVienBody('badrole', 3, 'KhachHang') });
  assert(badRole.status === 400 && badRole.data?.maLoi === 'VAI_TRO_KHONG_HOP_LE', 'Tạo với vai trò KhachHang -> 400 VAI_TRO_KHONG_HOP_LE', badRole);
  const badMail = await callApi('/api/admin/nhan-vien', { token: adminToken, method: 'POST', body: nhanVienBody('badmail', 4, 'NhanVien', { email: 'khong-phai-email' }) });
  assert(badMail.status === 400, 'Email sai định dạng -> 400', badMail);
  const badPhone = await callApi('/api/admin/nhan-vien', { token: adminToken, method: 'POST', body: nhanVienBody('badphone', 5, 'NhanVien', { soDienThoai: '12345' }) });
  assert(badPhone.status === 400, 'Số điện thoại sai định dạng -> 400', badPhone);
  const shortPw = await callApi('/api/admin/nhan-vien', { token: adminToken, method: 'POST', body: nhanVienBody('shortpw', 6, 'NhanVien', { matKhauKhoiTao: '123' }) });
  assert(shortPw.status === 400, 'Mật khẩu khởi tạo quá ngắn -> 400', shortPw);

  // Hai request tạo đồng thời cùng email: đúng một cái thành công
  const race = await Promise.all([0, 1].map((i) =>
    callApi('/api/admin/nhan-vien', { token: adminToken, method: 'POST', body: nhanVienBody('race', 7, 'NhanVien', { hoTen: `Race ${i}` }) })));
  const raceCodes = race.map((r) => r.status).sort();
  assert(raceCodes[0] === 201 && raceCodes[1] === 409, 'Hai request tạo đồng thời cùng liên hệ: 1 x 201 và 1 x 409', race.map((r) => r.status));
  const raceOk = race.find((r) => r.status === 201);
  if (raceOk) cleanup.push(() => callApi(`/api/admin/tai-khoan/${raceOk.data.maTaiKhoan}/khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Dọn dẹp test W5-T1' } }));

  // =========================================================================
  // PHẦN 3: TRA CỨU & CẬP NHẬT HỒ SƠ
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 3] Tra cứu, phân trang và cập nhật hồ sơ${colors.reset}`);

  const list = await callApi(`/api/admin/tai-khoan?tuKhoa=${runId}&soMoiTrang=1&trang=1`, { token: adminToken });
  assert(list.status === 200 && list.data.soMoiTrang === 1 && list.data.items.length === 1 && list.data.tongSo >= 2,
    'Tra cứu tài khoản theo từ khóa, phân trang trả items/tongSo/trang/soMoiTrang', list.data);
  assert(!/matKhau|bam/i.test(JSON.stringify(list.data)), 'Danh sách tài khoản không lộ mật khẩu băm');
  const big = await callApi('/api/admin/tai-khoan?soMoiTrang=100000', { token: adminToken });
  assert(big.status === 200 && big.data.soMoiTrang === 100, 'soMoiTrang bị giới hạn tối đa 100', big.data);
  const filt = await callApi('/api/admin/tai-khoan?vaiTro=KhachHang&trangThai=HoatDong', { token: adminToken });
  assert(filt.status === 200 && filt.data.items.every((t) => t.vaiTro === 'KhachHang' && t.trangThai === 'HoatDong'),
    'Lọc theo vai trò + trạng thái chính xác', filt.data);
  const detail = await callApi(`/api/admin/tai-khoan/${A.nv.maTaiKhoan}`, { token: adminToken });
  assert(detail.status === 200 && detail.data.maNhanVien === A.nv.maNhanVien, 'Chi tiết tài khoản có mã nhân viên tương ứng', detail.data);
  const noAcc = await callApi('/api/admin/tai-khoan/99999999', { token: adminToken });
  assert(noAcc.status === 404, 'Tài khoản không tồn tại -> 404', noAcc);

  const nvList = await callApi(`/api/admin/nhan-vien?tuKhoa=${runId}&vaiTro=NhanVien`, { token: adminToken });
  assert(nvList.status === 200 && nvList.data.items.some((n) => n.maNhanVien === A.nv.maNhanVien), 'Tra cứu nhân viên theo từ khóa/vai trò', nvList.data);
  const nvGet = await callApi(`/api/admin/nhan-vien/${A.nv.maNhanVien}`, { token: adminToken });
  assert(nvGet.status === 200 && nvGet.data.maTaiKhoan === A.nv.maTaiKhoan, 'Xem chi tiết nhân viên', nvGet.data);
  const nvNone = await callApi('/api/admin/nhan-vien/99999999', { token: adminToken });
  assert(nvNone.status === 404, 'Nhân viên không tồn tại -> 404', nvNone);

  const upd = await callApi(`/api/admin/nhan-vien/${A.nv.maNhanVien}`, {
    token: adminToken, method: 'PUT',
    body: { hoTen: `Nhân Sự A Đã Sửa ${runId}`, email: email('a'), soDienThoai: phone(1), diaChi: 'Đà Nẵng', ngayVaoLam: '2026-01-06' }
  });
  assert(upd.status === 200 && upd.data.hoTen.includes('Đã Sửa') && upd.data.diaChi === 'Đà Nẵng', 'Cập nhật hồ sơ nhân viên thành công', upd);
  assert(upd.data?.vaiTro === 'NhanVien' && upd.data?.maTaiKhoan === A.nv.maTaiKhoan, 'PUT hồ sơ không đổi vai trò / tài khoản gắn hồ sơ', upd.data);
  const updDup = await callApi(`/api/admin/nhan-vien/${A.nv.maNhanVien}`, {
    token: adminToken, method: 'PUT',
    body: { hoTen: 'X', email: 'staff@geargo.vn', soDienThoai: phone(1), diaChi: null, ngayVaoLam: '2026-01-06' }
  });
  assert(updDup.status === 409 && updDup.data?.maLoi === 'LIEN_HE_DA_TON_TAI', 'Sửa sang email của người khác -> 409 LIEN_HE_DA_TON_TAI', updDup);
  const updBad = await callApi(`/api/admin/nhan-vien/${A.nv.maNhanVien}`, {
    token: adminToken, method: 'PUT',
    body: { hoTen: '', email: email('a'), soDienThoai: phone(1), diaChi: null, ngayVaoLam: '2026-01-06' }
  });
  assert(updBad.status === 400, 'Họ tên rỗng -> 400', updBad);

  // W5-T1-A05: đổi họ tên nhân viên đã ký biên bản giao -> snapshot trong biên bản giữ nguyên
  console.log(`\n${colors.bold}[W5-T1-A05] Đổi họ tên nhân viên đã ký biên bản giao${colors.reset}`);
  const banGiao = await callApi('/api/ban-giao/don-thue/1', { token: adminToken });
  const nvSeed = await callApi('/api/admin/nhan-vien/2', { token: adminToken });
  if (banGiao.status === 200 && banGiao.data?.maNhanVien === 2 && nvSeed.status === 200) {
    const tenCu = nvSeed.data.hoTen;
    const snapshotCu = banGiao.data.tenNhanVienLucGiao;
    const seedBody = { hoTen: tenCu, email: nvSeed.data.email, soDienThoai: nvSeed.data.soDienThoai, diaChi: nvSeed.data.diaChi, ngayVaoLam: nvSeed.data.ngayVaoLam };
    cleanup.push(() => callApi('/api/admin/nhan-vien/2', { token: adminToken, method: 'PUT', body: seedBody }));
    const rename = await callApi('/api/admin/nhan-vien/2', { token: adminToken, method: 'PUT', body: { ...seedBody, hoTen: `Tên Mới ${runId}` } });
    const banGiao2 = await callApi('/api/ban-giao/don-thue/1', { token: adminToken });
    assert(rename.status === 200 && rename.data.hoTen === `Tên Mới ${runId}`, 'Hồ sơ nhân viên đã đổi tên', rename);
    assert(banGiao2.data?.tenNhanVienLucGiao === snapshotCu, 'Snapshot tên trong biên bản giao giữ nguyên sau khi đổi tên hồ sơ', banGiao2.data);
  } else {
    blocked('Không có biên bản giao đơn #1 của nhân viên #2 trong dữ liệu seed; chưa kiểm tra A05.');
  }

  // =========================================================================
  // PHẦN 4: KHÓA / MỞ KHÓA
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 4] Khóa và mở khóa tài khoản${colors.reset}`);

  const noReason = await callApi(`/api/admin/tai-khoan/${A.nv.maTaiKhoan}/khoa`, { token: adminToken, method: 'POST', body: { lyDo: '   ' } });
  assert(noReason.status === 400, 'Khóa không có lý do -> 400', noReason);

  const lock = await callApi(`/api/admin/tai-khoan/${A.nv.maTaiKhoan}/khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Vi phạm quy trình kiểm thử' } });
  assert(lock.status === 200 && lock.data.trangThai === 'BiKhoa' && lock.data.lyDoKhoa === 'Vi phạm quy trình kiểm thử', 'Khóa tài khoản có lý do -> BiKhoa', lock);
  const lockAgain = await callApi(`/api/admin/tai-khoan/${A.nv.maTaiKhoan}/khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Lần hai' } });
  assert(lockAgain.status === 409, 'Khóa lại tài khoản đã khóa -> 409', lockAgain);
  const oldTokenLocked = await callApi('/api/auth/toi', { token: A.token });
  assert(oldTokenLocked.status === 401, 'JWT cũ của tài khoản bị khóa bị từ chối ngay (401)', oldTokenLocked);
  const loginLocked = await login(email('a'), NEW_PASSWORD);
  assert(loginLocked.status === 400 || loginLocked.status === 403 || loginLocked.status === 401 || loginLocked.data?.maLoi === 'TAI_KHOAN_BI_KHOA',
    'Đăng nhập tài khoản bị khóa không cấp token mới', loginLocked.data);

  const unlock = await callApi(`/api/admin/tai-khoan/${A.nv.maTaiKhoan}/mo-khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Đã xử lý xong' } });
  assert(unlock.status === 200 && unlock.data.trangThai === 'HoatDong' && unlock.data.lyDoKhoa == null, 'Mở khóa tài khoản thành công', unlock);
  const unlockAgain = await callApi(`/api/admin/tai-khoan/${A.nv.maTaiKhoan}/mo-khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Lần hai' } });
  assert(unlockAgain.status === 409, 'Mở khóa tài khoản không bị khóa -> 409', unlockAgain);
  const relog = await login(email('a'), NEW_PASSWORD);
  A.token = relog.token;
  assert(!!A.token, 'Sau mở khóa đăng nhập lại được');

  // W5-T1-A06: khóa khách không xóa dữ liệu của khách
  console.log(`\n${colors.bold}[W5-T1-A06] Khóa khách hàng không xóa hồ sơ/đơn${colors.reset}`);
  const kPhone = `09${String((Number(runId) + 31) % 100000000).padStart(8, '0')}`;
  const reg = await callApi('/api/auth/dang-ky', {
    method: 'POST',
    body: { email: email('khach'), soDienThoai: kPhone, matKhau: NEW_PASSWORD, xacNhanMatKhau: NEW_PASSWORD, hoTen: `Khách ${runId}`, diaChi: 'Huế' }
  });
  if (reg.status === 200 || reg.status === 201) {
    const khTk = reg.data.maTaiKhoan;
    const before = await callApi(`/api/admin/tai-khoan/${khTk}`, { token: adminToken });
    const lockK = await callApi(`/api/admin/tai-khoan/${khTk}/khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Khóa khách để kiểm thử' } });
    const afterK = await callApi(`/api/admin/tai-khoan/${khTk}`, { token: adminToken });
    assert(lockK.status === 200 && afterK.data?.maKhachHang === before.data?.maKhachHang && afterK.data?.maKhachHang > 0,
      'Khóa khách: hồ sơ khách và liên kết giữ nguyên, không bị xóa', afterK.data);
    const tokKhach = await callApi('/api/v1/ho-so/toi', { token: reg.data.token });
    assert(tokKhach.status === 401, 'Khách bị khóa không còn thao tác mới bằng JWT cũ (401)', tokKhach);
    const staffStill = await callApi('/api/bao-tri', { token: staffToken });
    assert(staffStill.status === 200, 'Nhân viên vẫn làm việc bình thường khi khách bị khóa', staffStill.status);
    const unlockK = await callApi(`/api/admin/tai-khoan/${khTk}/mo-khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Dọn dẹp' } });
    assert(unlockK.status === 200 && unlockK.data.trangThai === 'HoatDong', 'Mở khóa khách không đổi dữ liệu cũ', unlockK);
    blocked('W5-T1-A06 phần callback/nhân viên hoàn tiền cho đơn của khách bị khóa cần luồng hoàn Tuần 4 với dữ liệu đơn chờ hoàn; chưa kiểm tra trong suite này.');
  } else {
    blocked(`Không đăng ký được khách thử nghiệm (HTTP ${reg.status}); bỏ qua A06.`);
  }

  // =========================================================================
  // PHẦN 5: ĐỔI VAI TRÒ & QUYỀN HIỆN TẠI (JWT cũ)
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 5] Đổi vai trò và quyền xét theo trạng thái hiện tại${colors.reset}`);

  const badRoleChange = await callApi(`/api/admin/nhan-vien/${A.nv.maNhanVien}/doi-vai-tro`, { token: adminToken, method: 'POST', body: { vaiTroMoi: 'KhachHang', lyDo: 'x' } });
  assert(badRoleChange.status === 400 && badRoleChange.data?.maLoi === 'VAI_TRO_KHONG_HOP_LE', 'Đổi sang KhachHang -> 400 VAI_TRO_KHONG_HOP_LE', badRoleChange);
  const noReasonRole = await callApi(`/api/admin/nhan-vien/${A.nv.maNhanVien}/doi-vai-tro`, { token: adminToken, method: 'POST', body: { vaiTroMoi: 'QuanTriVien', lyDo: '' } });
  assert(noReasonRole.status === 400, 'Đổi vai trò thiếu lý do -> 400', noReasonRole);

  // Nâng A lên quản trị: JWT cũ của A (vai trò NhanVien) phải được nâng quyền theo database
  const staffOnlyBefore = await callApi('/api/admin/tai-khoan', { token: A.token });
  assert(staffOnlyBefore.status === 403, 'Trước khi nâng quyền, A (NhanVien) bị cấm route admin (403)', staffOnlyBefore);
  const promote = await callApi(`/api/admin/nhan-vien/${A.nv.maNhanVien}/doi-vai-tro`, { token: adminToken, method: 'POST', body: { vaiTroMoi: 'QuanTriVien', lyDo: 'Bổ nhiệm quản trị thử nghiệm' } });
  assert(promote.status === 200 && promote.data.vaiTro === 'QuanTriVien', 'Nâng NhanVien -> QuanTriVien thành công', promote);
  const promoteAgain = await callApi(`/api/admin/nhan-vien/${A.nv.maNhanVien}/doi-vai-tro`, { token: adminToken, method: 'POST', body: { vaiTroMoi: 'QuanTriVien', lyDo: 'Retry' } });
  assert(promoteAgain.status === 200 && promoteAgain.data.vaiTro === 'QuanTriVien', 'Retry đổi vai trò đã thành công trả kết quả cũ (200)', promoteAgain);
  const promotedUse = await callApi('/api/admin/tai-khoan?soMoiTrang=1', { token: A.token });
  assert(promotedUse.status === 200, 'Quyền mới có hiệu lực ngay: JWT cũ của A dùng được route admin', promotedUse);

  // W5-T1-A03: hạ quyền rồi dùng JWT cũ
  console.log(`\n${colors.bold}[W5-T1-A03] Hạ quyền admin -> JWT cũ không còn quyền ngay${colors.reset}`);
  // JWT cấp lúc A đang là quản trị viên (claim vai trò = QuanTriVien).
  const oldAdminToken = (await login(email('a'), NEW_PASSWORD)).token;
  assert(!!oldAdminToken, 'A đăng nhập khi đang là quản trị viên để lấy JWT quản trị');
  const demote = await callApi(`/api/admin/nhan-vien/${A.nv.maNhanVien}/doi-vai-tro`, { token: adminToken, method: 'POST', body: { vaiTroMoi: 'NhanVien', lyDo: 'Hạ quyền thử nghiệm' } });
  assert(demote.status === 200 && demote.data.vaiTro === 'NhanVien', 'Hạ QuanTriVien -> NhanVien thành công', demote);
  const staleAdmin = await callApi('/api/admin/nhan-vien', { token: oldAdminToken });
  assert(staleAdmin.status === 403, 'JWT cũ (claim QuanTriVien) bị từ chối ở route admin (403)', staleAdmin);
  assert(staleAdmin.data?.maLoi === 'QUYEN_DA_THAY_DOI', 'Mã lỗi QUYEN_DA_THAY_DOI để UI yêu cầu đăng nhập lại', staleAdmin.data);
  // Hành động duyệt nhạy cảm đã có từ tuần trước: chỉ AdminOnly -> phải bị chặn
  const staleApprove = await callApi('/api/bao-tri/1/hoan-thanh', { token: oldAdminToken, method: 'POST', body: { ketQuaKiemTra: 'Dat' } });
  assert(staleApprove.status === 403, 'JWT cũ không duyệt được nghiệp vụ AdminOnly khác (xác nhận hoàn thành bảo trì) (403)', staleApprove);
  const staleInStaffArea = await callApi('/api/bao-tri', { token: oldAdminToken });
  assert(staleInStaffArea.status === 200, 'Vẫn dùng được vùng NhanVien theo vai trò hiện tại (200)', staleInStaffArea.status);

  // Đổi vai trò cho tài khoản không phải nhân sự
  const khachNv = await callApi(`/api/admin/nhan-vien/99999999/doi-vai-tro`, { token: adminToken, method: 'POST', body: { vaiTroMoi: 'QuanTriVien', lyDo: 'x' } });
  assert(khachNv.status === 404, 'Đổi vai trò nhân viên không tồn tại (khách không có hồ sơ) -> 404', khachNv);

  // =========================================================================
  // PHẦN 6: NGHỈ VIỆC & BẢO TRÌ ĐANG MỞ
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 6] Nghỉ việc và việc cần bàn giao${colors.reset}`);

  const B = await taoNhanSu(adminToken, 'b', 11);
  assert(B.status === 201 && !!B.token, 'Tạo nhân viên B để thử nghỉ việc', B);
  const badNghi = await callApi(`/api/admin/nhan-vien/${B.nv.maNhanVien}/nghi-viec`, { token: adminToken, method: 'POST', body: { ngayNghiViec: '2020-01-01', lyDo: 'Trước ngày vào làm' } });
  assert(badNghi.status === 400, 'Ngày nghỉ trước ngày vào làm -> 400', badNghi);
  const futureNghi = await callApi(`/api/admin/nhan-vien/${B.nv.maNhanVien}/nghi-viec`, { token: adminToken, method: 'POST', body: { ngayNghiViec: '2099-01-01', lyDo: 'Tương lai' } });
  assert(futureNghi.status === 400, 'Ngày nghỉ ở tương lai -> 400', futureNghi);
  const noReasonNghi = await callApi(`/api/admin/nhan-vien/${B.nv.maNhanVien}/nghi-viec`, { token: adminToken, method: 'POST', body: { ngayNghiViec: '2026-02-01', lyDo: '' } });
  assert(noReasonNghi.status === 400, 'Nghỉ việc thiếu lý do -> 400', noReasonNghi);

  // Tạo 2 phiếu bảo trì giao cho B (cần 2 thiết bị sẵn sàng chưa có phiếu mở)
  const devs = await callApi('/api/thiet-bi?soMoiTrang=50', { token: adminToken });
  const ready = (devs.data?.duLieu?.items ?? devs.data?.items ?? []).filter((d) => d.trangThaiSuDung === 'SanSang').slice(0, 2);
  const tickets = [];
  for (const d of ready) {
    const t = await callApi('/api/bao-tri', { token: adminToken, method: 'POST', body: { maThietBi: d.maThietBi, loaiXuLy: 'SuaChua', moTaLoi: `W5-T1 ${runId}`, mucDo: 'Nhe' } });
    if (t.status === 201 || t.status === 200) {
      // BaoTriService nhận maNguoiXuLy theo "MaTaiKhoan hoặc MaNhanVien" nên ID có thể trùng người khác;
      // thử cả hai và chỉ nhận kết quả khi phiếu thật sự gắn đúng hồ sơ của B.
      for (const id of [B.nv.maNhanVien, B.nv.maTaiKhoan]) {
        const pc = await callApi(`/api/bao-tri/${t.data.maPhieuBaoTri}/phan-cong`, { token: adminToken, method: 'POST', body: { maNguoiXuLy: id, lyDo: 'Giao việc thử nghiệm' } });
        if (pc.status === 200 && pc.data.maNguoiXuLy === B.nv.maNhanVien) { tickets.push(t.data.maPhieuBaoTri); break; }
      }
      if (!tickets.includes(t.data.maPhieuBaoTri)) tickets.push(-t.data.maPhieuBaoTri); // đánh dấu để dọn dẹp
    }
  }
  // Dọn dẹp: giao lại cho nhân viên seed, gửi kiểm tra rồi admin xác nhận hoàn thành để thiết bị về SanSang.
  const cleanupTickets = async () => {
    for (const raw of tickets) {
      const id = Math.abs(raw);
      await callApi(`/api/bao-tri/${id}/phan-cong`, { token: adminToken, method: 'POST', body: { maNguoiXuLy: 2, lyDo: 'Dọn dẹp test W5-T1' } });
      await callApi(`/api/bao-tri/${id}/gui-kiem-tra`, { token: staffToken, method: 'POST' });
      await callApi(`/api/bao-tri/${id}/hoan-thanh`, { token: adminToken, method: 'POST', body: { ketQuaKiemTra: 'Dọn dẹp test W5-T1' } });
    }
  };
  cleanup.push(cleanupTickets);

  const nghi = await callApi(`/api/admin/nhan-vien/${B.nv.maNhanVien}/nghi-viec`, { token: adminToken, method: 'POST', body: { ngayNghiViec: '2026-02-01', lyDo: 'Nghỉ việc theo nguyện vọng' } });
  assert(nghi.status === 200 && nghi.data.trangThaiLamViec === 'DaNghiViec' && nghi.data.ngayNghiViec === '2026-02-01', 'Ghi nhận nghỉ việc: trạng thái + ngày nghỉ', nghi);
  assert(nghi.data?.trangThaiTaiKhoan === 'BiKhoa', 'Nghỉ việc ngừng quyền truy cập tài khoản cùng transaction (BiKhoa)', nghi.data);
  const assigned = tickets.filter((x) => x > 0);
  if (assigned.length === 2) {
    const viec = nghi.data.congViecCanBanGiao.map((v) => v.maPhieuBaoTri).sort();
    assert(JSON.stringify(viec) === JSON.stringify([...assigned].sort()), 'W5-T1-A04: trả danh sách 2 phiếu bảo trì cần bàn giao', nghi.data.congViecCanBanGiao);
    const t1 = await callApi(`/api/bao-tri/${assigned[0]}`, { token: adminToken });
    assert(t1.status === 200 && t1.data.maNguoiXuLy === B.nv.maNhanVien, 'W5-T1-A04: phiếu vẫn giữ người xử lý cũ để admin bàn giao, không bị xóa', t1.data);
  } else {
    blocked(`W5-T1-A04 cần 2 thiết bị SanSang để lập phiếu bảo trì; chỉ gán đúng người được ${assigned.length} phiếu giao cho nhân viên nghỉ việc.`);
  }
  const resignedToken = await callApi('/api/bao-tri', { token: B.token });
  assert(resignedToken.status === 401, 'Nhân viên nghỉ việc mất quyền ngay (JWT cũ 401)', resignedToken);
  const nghiAgain = await callApi(`/api/admin/nhan-vien/${B.nv.maNhanVien}/nghi-viec`, { token: adminToken, method: 'POST', body: { ngayNghiViec: '2026-02-01', lyDo: 'Lần hai' } });
  assert(nghiAgain.status === 409 && nghiAgain.data?.maLoi === 'NHAN_VIEN_DA_NGHI_VIEC', 'Ghi nghỉ việc lần hai -> 409 NHAN_VIEN_DA_NGHI_VIEC', nghiAgain);
  const unlockResigned = await callApi(`/api/admin/tai-khoan/${B.nv.maTaiKhoan}/mo-khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Thử mở lại' } });
  assert(unlockResigned.status === 409 && unlockResigned.data?.maLoi === 'NHAN_VIEN_DA_NGHI_VIEC', 'Mở khóa người đã nghỉ việc bị chặn (409 NHAN_VIEN_DA_NGHI_VIEC)', unlockResigned);
  const roleResigned = await callApi(`/api/admin/nhan-vien/${B.nv.maNhanVien}/doi-vai-tro`, { token: adminToken, method: 'POST', body: { vaiTroMoi: 'QuanTriVien', lyDo: 'Thử' } });
  assert(roleResigned.status === 409, 'Không đổi vai trò cho nhân viên đã nghỉ việc (409)', roleResigned);
  const reloginResigned = await login(email('b'), NEW_PASSWORD);
  assert(!reloginResigned.token, 'Nhân viên nghỉ việc không đăng nhập lại được', reloginResigned.data);
  const histB = await callApi(`/api/admin/nhan-vien/${B.nv.maNhanVien}`, { token: adminToken });
  assert(histB.status === 200 && histB.data.hoTen === B.nv.hoTen, 'Hồ sơ nhân viên nghỉ việc còn nguyên (không xóa lịch sử)', histB.data);
  const delB = await callApi(`/api/admin/nhan-vien/${B.nv.maNhanVien}`, { token: adminToken, method: 'DELETE' });
  assert(delB.status === 404 || delB.status === 405, 'Không có API xóa cứng nhân viên (404/405)', delB.status);

  // =========================================================================
  // PHẦN 7: BẢO VỆ QUẢN TRỊ VIÊN HOẠT ĐỘNG CUỐI CÙNG
  // =========================================================================
  console.log(`\n${colors.bold}[PHẦN 7] Quản trị viên hoạt động cuối cùng (W5-T1-A02)${colors.reset}`);

  const admins = async () => callApi('/api/admin/tai-khoan?vaiTro=QuanTriVien&trangThai=HoatDong&soMoiTrang=100', { token: adminToken });
  const P = await taoNhanSu(adminToken, 'p', 21, 'QuanTriVien');
  const Q = await taoNhanSu(adminToken, 'q', 22, 'QuanTriVien');
  assert(P.status === 201 && Q.status === 201 && !!P.token && !!Q.token, 'Tạo hai quản trị viên tạm P và Q', [P.status, Q.status]);
  cleanup.push(() => callApi(`/api/admin/tai-khoan/${P.nv.maTaiKhoan}/khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Dọn dẹp test W5-T1' } }));
  cleanup.push(() => callApi(`/api/admin/tai-khoan/${Q.nv.maTaiKhoan}/khoa`, { token: adminToken, method: 'POST', body: { lyDo: 'Dọn dẹp test W5-T1' } }));

  if (P.token && Q.token) {
    // Mọi quản trị khác (ngoài seed, P, Q) làm kết quả không "chạm đáy"; chỉ khẳng định quy tắc khi môi trường sạch.
    const before = await admins();
    const allowed = new Set([seedAdminTk, P.nv.maTaiKhoan, Q.nv.maTaiKhoan]);
    const strangers = before.data.items.filter((t) => !allowed.has(t.maTaiKhoan));
    const seedNv = (await callApi(`/api/admin/nhan-vien?tuKhoa=${encodeURIComponent('admin@geargo.vn')}`, { token: adminToken })).data?.items?.[0];

    if (strangers.length === 0 && seedNv) {
      // P hạ seed admin: còn P, Q
      const demoteSeed = await callApi(`/api/admin/nhan-vien/${seedNv.maNhanVien}/doi-vai-tro`, { token: P.token, method: 'POST', body: { vaiTroMoi: 'NhanVien', lyDo: 'Chuẩn bị ca còn hai admin' } });
      assert(demoteSeed.status === 200, 'Hạ quyền admin seed khi còn P, Q hoạt động (200)', demoteSeed);
      // Khôi phục seed admin bằng admin còn sống (P hoặc Q) ở bước dọn dẹp, trước khi khóa P/Q.
      cleanup.push(async () => {
        const alive = (await callApi('/api/admin/tai-khoan', { token: P.token })).status === 200 ? P.token : Q.token;
        await callApi(`/api/admin/nhan-vien/${seedNv.maNhanVien}/doi-vai-tro`, { token: alive, method: 'POST', body: { vaiTroMoi: 'QuanTriVien', lyDo: 'Khôi phục admin seed sau test W5-T1' } });
      });

      // Hai admin hạ quyền nhau đồng thời
      const [r1, r2] = await Promise.all([
        callApi(`/api/admin/nhan-vien/${Q.nv.maNhanVien}/doi-vai-tro`, { token: P.token, method: 'POST', body: { vaiTroMoi: 'NhanVien', lyDo: 'P hạ Q' } }),
        callApi(`/api/admin/nhan-vien/${P.nv.maNhanVien}/doi-vai-tro`, { token: Q.token, method: 'POST', body: { vaiTroMoi: 'NhanVien', lyDo: 'Q hạ P' } })
      ]);
      const oks = [r1, r2].filter((r) => r.status === 200).length;
      assert(oks === 1, 'W5-T1-A02: hai admin hạ quyền nhau đồng thời -> đúng một yêu cầu thành công', [r1.status, r2.status]);
      const loser = [r1, r2].find((r) => r.status !== 200);
      assert(loser && (loser.data?.maLoi === 'ADMIN_HOAT_DONG_CUOI_CUNG' || loser.status === 403),
        'Yêu cầu còn lại bị chặn (ADMIN_HOAT_DONG_CUOI_CUNG hoặc 403 vì đã mất quyền)', loser);
      // Dùng token của người thắng (còn là admin) kiểm tra không còn 0 admin
      const survivor = r1.status === 200 ? P.token : Q.token;
      const survivorNv = r1.status === 200 ? P.nv : Q.nv;
      const after = await callApi('/api/admin/tai-khoan?vaiTro=QuanTriVien&trangThai=HoatDong', { token: survivor });
      assert(after.status === 200 && after.data.tongSo >= 1, 'Sau cuộc đua vẫn còn ít nhất 1 quản trị viên hoạt động', after.data);

      // Người cuối cùng không tự hạ / khóa / nghỉ việc
      const selfDemote = await callApi(`/api/admin/nhan-vien/${survivorNv.maNhanVien}/doi-vai-tro`, { token: survivor, method: 'POST', body: { vaiTroMoi: 'NhanVien', lyDo: 'Tự hạ' } });
      assert(selfDemote.status === 409 && selfDemote.data?.maLoi === 'ADMIN_HOAT_DONG_CUOI_CUNG', 'Admin cuối không tự hạ quyền (409 ADMIN_HOAT_DONG_CUOI_CUNG)', selfDemote);
      const selfLock = await callApi(`/api/admin/tai-khoan/${survivorNv.maTaiKhoan}/khoa`, { token: survivor, method: 'POST', body: { lyDo: 'Tự khóa' } });
      assert(selfLock.status === 409 && selfLock.data?.maLoi === 'ADMIN_HOAT_DONG_CUOI_CUNG', 'Admin cuối không tự khóa (409 ADMIN_HOAT_DONG_CUOI_CUNG)', selfLock);
      const selfResign = await callApi(`/api/admin/nhan-vien/${survivorNv.maNhanVien}/nghi-viec`, { token: survivor, method: 'POST', body: { ngayNghiViec: '2026-02-01', lyDo: 'Tự nghỉ' } });
      assert(selfResign.status === 409 && selfResign.data?.maLoi === 'ADMIN_HOAT_DONG_CUOI_CUNG', 'Admin cuối không tự nghỉ việc (409 ADMIN_HOAT_DONG_CUOI_CUNG)', selfResign);
    } else {
      blocked(`W5-T1-A02: môi trường có ${strangers.length} quản trị viên hoạt động khác ngoài admin seed và tài khoản tạm; không thể chạm ngưỡng "admin cuối" mà không đụng dữ liệu thật. Cần DB sạch.`);
    }
  }

  // =========================================================================
  // DỌN DẸP: khôi phục dữ liệu seed, khóa tài khoản tạm
  // =========================================================================
  console.log(`\n${colors.bold}[DỌN DẸP] Khôi phục dữ liệu seed và khóa tài khoản thử nghiệm${colors.reset}`);
  for (const fn of cleanup.reverse()) {
    try { await fn(); } catch { /* bỏ qua lỗi dọn dẹp */ }
  }
  const adminOk = await callApi('/api/admin/tai-khoan?soMoiTrang=1', { token: adminToken });
  assert(adminOk.status === 200, 'Admin seed vẫn là quản trị viên hoạt động sau khi dọn dẹp', adminOk.status);

  console.log(`\n${colors.bold}${colors.cyan}==============================================================${colors.reset}`);
  console.log(`${colors.bold}  KẾT QUẢ KIỂM THỬ W5-T1: ${passedCount} PASS / ${failedCount} FAIL / ${blockedCount} BLOCKED (Tổng: ${passedCount + failedCount + blockedCount})${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}==============================================================${colors.reset}`);
  process.exit(failedCount > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(`${colors.red}Lỗi không mong muốn khi chạy test:${colors.reset}`, err);
  process.exit(1);
});
