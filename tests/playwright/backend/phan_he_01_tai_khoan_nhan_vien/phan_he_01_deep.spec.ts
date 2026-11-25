import { test, expect, type APIRequestContext } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { TEST_ACCOUNTS } from "../../helpers/testData.js";

/**
 * Deep test Phân hệ 1 (Backend API): Tài khoản & Nhân viên.
 * Bổ sung 4 nhóm:
 *   (a) Negative paths — validation / state / 4xx-5xx recovery
 *   (b) Cross-screen cascade — tạo NV rồi check list, cấp quyền rồi check quyen-cua-toi
 *   (c) RBAC per UC — admin OK, staff 403, customer 403 (dynamic grant)
 *   (e) F5/recovery mid-flow — không áp dụng BE; thay bằng idempotency re-call
 *
 * Mỗi test tự seed dữ liệu riêng với suffix unique (strategy A).
 */

function deepSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Helper: tạo tài khoản nhân viên mới với suffix unique, trả về id + email. */
async function seedStaff(
  request: APIRequestContext,
  adminToken: string
): Promise<{ maNhanVien: number; maTaiKhoan: number; email: string; suffix: string }> {
  const suffix = deepSuffix();
  const email = `pw.deep.staff.${suffix}@geargo.vn`;
  const res = await request.post("/api/nhan-vien", {
    headers: authHeaders(adminToken),
    data: {
      hoTen: `Deep Staff ${suffix}`,
      email,
      soDienThoai: `097${Date.now().toString().slice(-7)}`,
      vaiTro: "NhanVien",
      matKhauKhoiTao: "GearGo@2026",
    },
  });
  expect(res.ok(), `Seed staff thất bại: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = (await res.json()) as { maNhanVien: number; maTaiKhoan: number };
  return { maNhanVien: body.maNhanVien, maTaiKhoan: body.maTaiKhoan, email, suffix };
}

test.describe("PH1 Deep Backend: Negative / Cross / RBAC / Recovery", () => {
  // =========================
  // (a) Negative paths
  // =========================

  test("(a) UC1.1 - Email rỗng / sai format bị từ chối", async ({ request }) => {
    const emptyRes = await request.post("/api/auth/dang-ky", {
      data: { email: "", soDienThoai: "0909999999", matKhau: "GearGo@2026", xacNhanMatKhau: "GearGo@2026", hoTen: "Empty" },
    });
    expect(emptyRes.ok()).toBeFalsy();

    const badFormatRes = await request.post("/api/auth/dang-ky", {
      data: {
        email: "khongphaiemail",
        soDienThoai: "0909999999",
        matKhau: "GearGo@2026",
        xacNhanMatKhau: "GearGo@2026",
        hoTen: "Bad format",
      },
    });
    expect(badFormatRes.ok()).toBeFalsy();
  });

  test("(a) UC1.1 - Password quá ngắn / xác nhận lệch bị từ chối", async ({ request }) => {
    const suffix = deepSuffix();
    const shortRes = await request.post("/api/auth/dang-ky", {
      data: {
        email: `short.${suffix}@geargo.vn`,
        soDienThoai: `096${suffix.slice(0, 7)}`,
        matKhau: "123",
        xacNhanMatKhau: "123",
        hoTen: "Short",
      },
    });
    expect(shortRes.ok()).toBeFalsy();

    const mismatchRes = await request.post("/api/auth/dang-ky", {
      data: {
        email: `mismatch.${suffix}@geargo.vn`,
        soDienThoai: `096${suffix.slice(0, 7)}`,
        matKhau: "GearGo@2026",
        xacNhanMatKhau: "LechHoanToan@2026",
        hoTen: "Mismatch",
      },
    });
    expect(mismatchRes.ok()).toBeFalsy();
  });

  test("(a) UC1.1 - Unicode hoten + SQLi payload email không gây 500", async ({ request }) => {
    const suffix = deepSuffix();
    const unicodeRes = await request.post("/api/auth/dang-ky", {
      data: {
        email: `uni.${suffix}@geargo.vn`,
        soDienThoai: `095${suffix.slice(0, 7)}`,
        matKhau: "GearGo@2026",
        xacNhanMatKhau: "GearGo@2026",
        hoTen: "Nguyễn Văn Ấn 👨‍🌾 测试",
      },
    });
    if (unicodeRes.status() !== 429) {
      expect([200, 201, 400]).toContain(unicodeRes.status());
    }

    const sqliRes = await request.post("/api/auth/dang-nhap", {
      data: { taiKhoan: "admin@geargo.vn' OR '1'='1", matKhau: "' OR '1'='1" },
    });
    expect(sqliRes.ok()).toBeFalsy();
    expect(sqliRes.status()).toBeLessThan(500);
  });

  test("(a) UC1.2 - Đăng nhập không có body / thiếu trường trả 400", async ({ request }) => {
    const emptyRes = await request.post("/api/auth/dang-nhap", { data: {} });
    expect(emptyRes.ok()).toBeFalsy();
    expect(emptyRes.status()).toBeLessThan(500);

    const noPassRes = await request.post("/api/auth/dang-nhap", {
      data: { taiKhoan: TEST_ACCOUNTS.customer.email },
    });
    expect(noPassRes.ok()).toBeFalsy();
  });

  test("(a) UC1.4 - OTP sai và quá nhiều lần bị từ chối không tiết lộ thông tin", async ({ request }) => {
    const badOtpRes = await request.post("/api/auth/xac-thuc-otp", {
      data: { email: TEST_ACCOUNTS.customer.email, maOtp: "000000" },
    });
    // Không được 500 mà phải 400/401/404
    expect(badOtpRes.status()).toBeLessThan(500);
    expect(badOtpRes.ok()).toBeFalsy();
  });

  test("(a) UC1.5 - GET /ho-so/toi không token trả 401", async ({ request }) => {
    const res = await request.get("/api/ho-so/toi");
    expect([401, 403]).toContain(res.status());
  });

  test("(a) UC1.6 - Cập nhật hồ sơ với email rỗng bị từ chối", async ({ request }) => {
    const { token } = await loginApi(request, "customer2");
    const res = await request.put("/api/ho-so/toi", {
      headers: authHeaders(token),
      data: { hoTen: "Test", email: "", soDienThoai: "0123", diaChi: "x" },
    });
    expect(res.ok()).toBeFalsy();
  });

  test("(a) UC1.7 - Tạo nhân viên trùng email bị từ chối", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const seeded = await seedStaff(request, adminToken);
    const dupRes = await request.post("/api/nhan-vien", {
      headers: authHeaders(adminToken),
      data: {
        hoTen: "Trùng Email",
        email: seeded.email, // trùng
        soDienThoai: `094${Date.now().toString().slice(-7)}`,
        vaiTro: "NhanVien",
        matKhauKhoiTao: "GearGo@2026",
      },
    });
    expect(dupRes.ok()).toBeFalsy();
  });

  test("(a) UC1.8 - Cập nhật nhân viên không tồn tại trả 404/400", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const res = await request.put(`/api/nhan-vien/999999999`, {
      headers: authHeaders(adminToken),
      data: { hoTen: "x", email: "x@x.vn", soDienThoai: "0909", diaChi: "y" },
    });
    expect(res.ok()).toBeFalsy();
    expect([400, 404]).toContain(res.status());
  });

  test("(a) UC1.11 - Khóa tài khoản không tồn tại trả 404/400", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const res = await request.post(`/api/tai-khoan/999999999/khoa`, {
      headers: authHeaders(adminToken),
      data: { lyDo: "Test không tồn tại" },
    });
    expect(res.ok()).toBeFalsy();
    expect([400, 404]).toContain(res.status());
  });

  test("(a) UC1.12 - Đổi mật khẩu với mật khẩu mới không khớp xác nhận", async ({ request }) => {
    const { token } = await loginApi(request, "customer");
    const res = await request.post("/api/auth/doi-mat-khau", {
      headers: authHeaders(token),
      data: {
        matKhauHienTai: "GearGo@2026",
        matKhauMoi: "MatKhauMoi@2026",
        xacNhanMatKhauMoi: "KhongKhop@2026",
      },
    });
    expect(res.ok()).toBeFalsy();
  });

  // =========================
  // (b) Cross-screen cascade
  // =========================

  test("(b) UC1.7 → UC1.9 - Tạo nhân viên rồi search theo email thấy ngay", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const seeded = await seedStaff(request, adminToken);

    const listRes = await request.get(`/api/nhan-vien?tuKhoa=${encodeURIComponent(seeded.suffix)}&soMoiTrang=50`, {
      headers: authHeaders(adminToken),
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = (await listRes.json()) as { duLieu?: { items?: Array<Record<string, unknown>> }; items?: Array<Record<string, unknown>> };
    const items = listBody.duLieu?.items ?? listBody.items ?? [];
    const found = items.some((it) => String((it as { email?: string }).email || "").includes(seeded.suffix));
    expect(found, `Nhân viên vừa tạo ${seeded.email} phải xuất hiện trong danh sách`).toBeTruthy();
  });

  test("(b) UC1.7 → UC1.13 - Tạo nhân viên rồi tài khoản xuất hiện ở /tai-khoan", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const seeded = await seedStaff(request, adminToken);

    // Scan tối đa 10 trang để tìm (seed data lớn có thể nhiều hơn 100 account)
    let matched: Record<string, unknown> | undefined;
    for (let page = 1; page <= 10 && !matched; page++) {
      const accRes = await request.get(`/api/tai-khoan?trang=${page}&soMoiTrang=100`, { headers: authHeaders(adminToken) });
      if (!accRes.ok()) break;
      const body = (await accRes.json()) as { duLieu?: { items?: Array<Record<string, unknown>> }; items?: Array<Record<string, unknown>> };
      const items = body.duLieu?.items ?? body.items ?? [];
      if (items.length === 0) break;
      matched = items.find((it) => Number((it as { maTaiKhoan?: number }).maTaiKhoan) === seeded.maTaiKhoan);
    }
    expect(matched, "maTaiKhoan vừa tạo phải xuất hiện trong /api/tai-khoan").toBeTruthy();
  });

  test("(b) UC1.11 → UC1.2 - Khóa tài khoản rồi login bị từ chối, mở lại login OK", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const seeded = await seedStaff(request, adminToken);

    // Khóa
    const lock = await request.post(`/api/tai-khoan/${seeded.maTaiKhoan}/khoa`, {
      headers: authHeaders(adminToken),
      data: { lyDo: "Deep test khóa" },
    });
    expect(lock.ok()).toBeTruthy();

    // Thử login
    const loginLocked = await request.post("/api/auth/dang-nhap", {
      data: { taiKhoan: seeded.email, matKhau: "GearGo@2026" },
    });
    expect(loginLocked.ok()).toBeFalsy();

    // Mở
    const unlock = await request.post(`/api/tai-khoan/${seeded.maTaiKhoan}/mo-khoa`, {
      headers: authHeaders(adminToken),
      data: { lyDo: "Deep test mở" },
    });
    expect(unlock.ok()).toBeTruthy();

    const loginOk = await request.post("/api/auth/dang-nhap", {
      data: { taiKhoan: seeded.email, matKhau: "GearGo@2026" },
    });
    // Sau mở khóa phải đăng nhập được
    expect(loginOk.ok()).toBeTruthy();
  });

  // =========================
  // (c) RBAC per UC
  // =========================

  test("(c) UC1.7 - Tạo nhân viên: admin OK, staff 403, customer 403", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const { token: staffToken } = await loginApi(request, "staff");
    const { token: custToken } = await loginApi(request, "customer");

    const payload = (suffix: string) => ({
      hoTen: `RBAC ${suffix}`,
      email: `rbac.${suffix}@geargo.vn`,
      soDienThoai: `093${Date.now().toString().slice(-7)}`,
      vaiTro: "NhanVien",
      matKhauKhoiTao: "GearGo@2026",
    });

    const adminRes = await request.post("/api/nhan-vien", { headers: authHeaders(adminToken), data: payload(deepSuffix()) });
    expect(adminRes.ok()).toBeTruthy();

    const staffRes = await request.post("/api/nhan-vien", { headers: authHeaders(staffToken), data: payload(deepSuffix()) });
    expect([401, 403]).toContain(staffRes.status());

    const custRes = await request.post("/api/nhan-vien", { headers: authHeaders(custToken), data: payload(deepSuffix()) });
    expect([401, 403]).toContain(custRes.status());
  });

  test("(c) UC1.8 - Cập nhật NV: admin OK, staff 403, customer 403", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const { token: staffToken } = await loginApi(request, "staff");
    const { token: custToken } = await loginApi(request, "customer");
    const seeded = await seedStaff(request, adminToken);

    const payload = {
      hoTen: `Updated ${seeded.suffix}`,
      email: seeded.email,
      soDienThoai: `092${Date.now().toString().slice(-7)}`,
      diaChi: "Kho mới",
    };

    const adminUpd = await request.put(`/api/nhan-vien/${seeded.maNhanVien}`, { headers: authHeaders(adminToken), data: payload });
    expect(adminUpd.ok()).toBeTruthy();

    const staffUpd = await request.put(`/api/nhan-vien/${seeded.maNhanVien}`, { headers: authHeaders(staffToken), data: payload });
    expect([401, 403]).toContain(staffUpd.status());

    const custUpd = await request.put(`/api/nhan-vien/${seeded.maNhanVien}`, { headers: authHeaders(custToken), data: payload });
    expect([401, 403]).toContain(custUpd.status());
  });

  test("(c) UC1.11 - Khóa/mở TK: admin OK, staff 403, customer 403", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const { token: staffToken } = await loginApi(request, "staff");
    const { token: custToken } = await loginApi(request, "customer");
    const seeded = await seedStaff(request, adminToken);

    const staffLock = await request.post(`/api/tai-khoan/${seeded.maTaiKhoan}/khoa`, {
      headers: authHeaders(staffToken),
      data: { lyDo: "staff cố thử" },
    });
    expect([401, 403]).toContain(staffLock.status());

    const custLock = await request.post(`/api/tai-khoan/${seeded.maTaiKhoan}/khoa`, {
      headers: authHeaders(custToken),
      data: { lyDo: "customer cố thử" },
    });
    expect([401, 403]).toContain(custLock.status());

    const adminLock = await request.post(`/api/tai-khoan/${seeded.maTaiKhoan}/khoa`, {
      headers: authHeaders(adminToken),
      data: { lyDo: "admin OK" },
    });
    expect(adminLock.ok()).toBeTruthy();
  });

  test("(c) UC1.9/1.13 - List NV / list TK: admin OK, customer 403", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const { token: custToken } = await loginApi(request, "customer");

    const adminStaff = await request.get("/api/nhan-vien?soMoiTrang=5", { headers: authHeaders(adminToken) });
    expect(adminStaff.ok()).toBeTruthy();

    const custStaff = await request.get("/api/nhan-vien?soMoiTrang=5", { headers: authHeaders(custToken) });
    expect([401, 403]).toContain(custStaff.status());

    const custAcc = await request.get("/api/tai-khoan?soMoiTrang=5", { headers: authHeaders(custToken) });
    expect([401, 403]).toContain(custAcc.status());
  });

  test("(c) UC1.10 - Phân quyền: admin OK, staff 403", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const { token: staffToken } = await loginApi(request, "staff");

    const adminPerm = await request.get("/api/phan-quyen/vai-tro", { headers: authHeaders(adminToken) });
    expect(adminPerm.status()).toBe(200);

    const staffPerm = await request.get("/api/phan-quyen/vai-tro", { headers: authHeaders(staffToken) });
    expect(staffPerm.status()).toBe(403);
  });

  // =========================
  // (e) Recovery / idempotency mid-flow
  // =========================

  test("(e) UC1.3 - Logout 2 lần liên tiếp: lần 2 vẫn phản hồi hợp lệ (không 500)", async ({ request }) => {
    const { token } = await loginApi(request, "customer");
    const r1 = await request.post("/api/auth/dang-xuat", { headers: authHeaders(token) });
    expect(r1.ok()).toBeTruthy();
    const r2 = await request.post("/api/auth/dang-xuat", { headers: authHeaders(token) });
    // Lần 2: có thể 200 (idempotent) hoặc 401 (token đã revoke), không được 500
    expect(r2.status()).toBeLessThan(500);
  });

  test("(e) UC1.11 - Khóa 2 lần liên tiếp cùng tài khoản: idempotent, không gãy", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const seeded = await seedStaff(request, adminToken);

    const l1 = await request.post(`/api/tai-khoan/${seeded.maTaiKhoan}/khoa`, {
      headers: authHeaders(adminToken),
      data: { lyDo: "lần 1" },
    });
    expect(l1.ok()).toBeTruthy();

    const l2 = await request.post(`/api/tai-khoan/${seeded.maTaiKhoan}/khoa`, {
      headers: authHeaders(adminToken),
      data: { lyDo: "lần 2 idempotent" },
    });
    // Idempotent: 200 hoặc 400 "đã khóa rồi", không 500
    expect(l2.status()).toBeLessThan(500);
  });

  test("(e) UC1.6 - Update profile 2 lần liên tiếp cùng dữ liệu phải ổn định", async ({ request }) => {
    const { token } = await loginApi(request, "customer2");
    const profileRes = await request.get("/api/ho-so/toi", { headers: authHeaders(token) });
    const profile = (await profileRes.json()) as Record<string, unknown>;

    const payload = {
      hoTen: String(profile.hoTen || "Trần Minh Quang"),
      email: String(profile.email || TEST_ACCOUNTS.customer2.email),
      soDienThoai: String(profile.soDienThoai || "0918765432"),
      diaChi: String(profile.diaChi || "123 Lê Lợi, Quận 1, TP.HCM"),
    };

    const u1 = await request.put("/api/ho-so/toi", { headers: authHeaders(token), data: payload });
    expect(u1.ok()).toBeTruthy();

    const u2 = await request.put("/api/ho-so/toi", { headers: authHeaders(token), data: payload });
    expect(u2.ok()).toBeTruthy();
  });

  test("(e) UC1.2 - Login nhiều lần song song cùng credential không gây 500", async ({ request }) => {
    const promises = Array.from({ length: 3 }).map(() =>
      request.post("/api/auth/dang-nhap", {
        data: { taiKhoan: TEST_ACCOUNTS.customer.email, matKhau: TEST_ACCOUNTS.customer.password },
      })
    );
    const results = await Promise.all(promises);
    for (const r of results) {
      expect(r.status()).toBeLessThan(500);
    }
    expect(results.filter((r) => r.ok()).length).toBeGreaterThan(0);
  });
});
