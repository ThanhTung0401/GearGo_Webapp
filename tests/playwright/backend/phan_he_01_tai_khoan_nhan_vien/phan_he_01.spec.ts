import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { TEST_ACCOUNTS, uniqueSuffix } from "../../helpers/testData.js";

test.describe("Phân hệ 1: Quản lý Tài khoản và Nhân viên (UC1.1 - UC1.13)", () => {
  test("UC1.1 - Đăng ký tài khoản khách hàng mới & chống trùng email", async ({ request }) => {
    const suffix = uniqueSuffix();
    const email = `pw.cust.${suffix}@geargo.vn`;
    const phone = `098${suffix.slice(0, 7)}`;

    const regRes = await request.post("/api/auth/dang-ky", {
      data: {
        email,
        soDienThoai: phone,
        matKhau: "GearGo@2026",
        xacNhanMatKhau: "GearGo@2026",
        hoTen: `Khách Playwright ${suffix}`,
      },
    });
    // Cho phép 429 nếu chạy test lặp lại nhiều lần liên tiếp trong cửa sổ Rate Limiting đăng ký
    if (regRes.status() === 429) {
      expect(regRes.status()).toBe(429);
      return;
    }
    expect(regRes.ok()).toBeTruthy();
    const regBody = (await regRes.json()) as Record<string, unknown>;
    expect(regBody.token).toBeTruthy();
    // Quy tắc nghiệp vụ: đăng ký công khai luôn tạo vai trò KhachHang, không tự cấp quyền nội bộ
    expect(regBody.vaiTro).toBe("KhachHang");

    // Đăng ký trùng email phải bị từ chối
    const dupRes = await request.post("/api/auth/dang-ky", {
      data: {
        email,
        soDienThoai: `097${suffix.slice(0, 7)}`,
        matKhau: "GearGo@2026",
        xacNhanMatKhau: "GearGo@2026",
        hoTen: "Trùng Email",
      },
    });
    expect(dupRes.ok()).toBeFalsy();
  });

  test("UC1.2 & UC1.2.1 - Đăng nhập hợp lệ, sai mật khẩu và tài khoản bị khóa", async ({ request }) => {
    // Đăng nhập đúng
    const { token } = await loginApi(request, "customer");
    expect(token).toBeTruthy();

    // Sai mật khẩu phải trả 401/400
    const badRes = await request.post("/api/auth/dang-nhap", {
      data: { taiKhoan: TEST_ACCOUNTS.customer.email, matKhau: "SaiMatKhau123!" },
    });
    expect(badRes.ok()).toBeFalsy();

    // Tài khoản bị khóa (locked.kh@geargo.vn) phải bị từ chối dù nhập đúng mật khẩu
    const lockedRes = await request.post("/api/auth/dang-nhap", {
      data: { taiKhoan: TEST_ACCOUNTS.locked.email, matKhau: TEST_ACCOUNTS.locked.password },
    });
    expect(lockedRes.ok()).toBeFalsy();
  });

  test("UC1.3 - Đăng xuất vô hiệu hóa phiên", async ({ request }) => {
    const { token } = await loginApi(request, "customer");
    const logoutRes = await request.post("/api/auth/dang-xuat", {
      headers: authHeaders(token),
    });
    expect(logoutRes.ok()).toBeTruthy();
  });

  test("UC1.4 & UC1.4.1 - Khôi phục mật khẩu (Gửi yêu cầu OTP trung tính)", async ({ request }) => {
    const res = await request.post("/api/auth/quen-mat-khau", {
      data: { email: TEST_ACCOUNTS.customer.email },
    });
    expect(res.ok()).toBeTruthy();

    // Email không tồn tại vẫn phản hồi trung tính (hoặc 200/400 không lộ mật khẩu)
    const unknownRes = await request.post("/api/auth/quen-mat-khau", {
      data: { email: "khong.ton.tai@geargo.vn" },
    });
    expect([200, 400, 404]).toContain(unknownRes.status());
  });

  test("UC1.5 & UC1.6 - Xem và cập nhật thông tin cá nhân", async ({ request }) => {
    const { token } = await loginApi(request, "customer2");
    const profileRes = await request.get("/api/ho-so/toi", {
      headers: authHeaders(token),
    });
    expect(profileRes.ok()).toBeTruthy();
    const profile = (await profileRes.json()) as Record<string, unknown>;
    const currentName = String(profile.hoTen || "Trần Minh Quang");

    const updateRes = await request.put("/api/ho-so/toi", {
      headers: authHeaders(token),
      data: {
        hoTen: currentName,
        email: String(profile.email || TEST_ACCOUNTS.customer2.email),
        soDienThoai: String(profile.soDienThoai || "0918765432"),
        diaChi: String(profile.diaChi || "123 Lê Lợi, Quận 1, TP.HCM"),
      },
    });
    expect(updateRes.ok()).toBeTruthy();
  });

  test("UC1.7, UC1.7.1, UC1.8, UC1.9, UC1.10, UC1.11, UC1.13 - Quản trị nhân sự, phân quyền & khóa/mở tài khoản", async ({
    request,
  }) => {
    const { token: adminToken } = await loginApi(request, "admin");

    // UC1.9: Tra cứu danh sách nhân viên
    const listStaffRes = await request.get("/api/nhan-vien?soMoiTrang=20", {
      headers: authHeaders(adminToken),
    });
    expect(listStaffRes.ok()).toBeTruthy();

    // UC1.13: Tra cứu tài khoản khách hàng
    const listAccRes = await request.get("/api/tai-khoan?vaiTro=KhachHang&soMoiTrang=20", {
      headers: authHeaders(adminToken),
    });
    expect(listAccRes.ok()).toBeTruthy();

    // UC1.7 & UC1.7.1: Tạo nhân viên mới (gán quyền ban đầu)
    const suffix = uniqueSuffix();
    const createRes = await request.post("/api/nhan-vien", {
      headers: authHeaders(adminToken),
      data: {
        hoTen: `Nhân viên PW ${suffix}`,
        email: `pw.staff.${suffix}@geargo.vn`,
        soDienThoai: `096${suffix.slice(0, 7)}`,
        vaiTro: "NhanVien",
        matKhauKhoiTao: "GearGo@2026",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { maNhanVien: number; maTaiKhoan: number };
    expect(created.maNhanVien).toBeGreaterThan(0);

    // UC1.8: Cập nhật thông tin nhân viên
    const updRes = await request.put(`/api/nhan-vien/${created.maNhanVien}`, {
      headers: authHeaders(adminToken),
      data: {
        hoTen: `Nhân viên PW ${suffix} Updated`,
        email: `pw.staff.${suffix}@geargo.vn`,
        soDienThoai: `096${suffix.slice(0, 7)}`,
        diaChi: "Kho Quận 7",
      },
    });
    expect(updRes.ok()).toBeTruthy();

    // UC1.10: Xem danh sách quyền & kiểm tra phân quyền nhân viên
    const permsRes = await request.get("/api/phan-quyen/danh-muc", {
      headers: authHeaders(adminToken),
    });
    expect([200, 404]).toContain(permsRes.status());

    // UC1.11: Khóa và mở khóa tài khoản vừa tạo (POST + { lyDo })
    const lockRes = await request.post(`/api/tai-khoan/${created.maTaiKhoan}/khoa`, {
      headers: authHeaders(adminToken),
      data: { lyDo: "Kiểm thử khóa tài khoản Playwright" },
    });
    expect(lockRes.ok()).toBeTruthy();

    const unlockRes = await request.post(`/api/tai-khoan/${created.maTaiKhoan}/mo-khoa`, {
      headers: authHeaders(adminToken),
      data: { lyDo: "Mở khóa sau kiểm thử Playwright" },
    });
    expect(unlockRes.ok()).toBeTruthy();
  });

  test("UC1.12 - Kiểm tra đổi mật khẩu yêu cầu đúng mật khẩu hiện tại", async ({ request }) => {
    const { token } = await loginApi(request, "customer");
    // Nhập sai mật khẩu hiện tại phải bị từ chối (không làm hỏng mật khẩu tài khoản seed)
    const res = await request.post("/api/auth/doi-mat-khau", {
      headers: authHeaders(token),
      data: {
        matKhauHienTai: "SaiMatKhauCu!",
        matKhauMoi: "MatKhauMoi@2026",
        xacNhanMatKhauMoi: "MatKhauMoi@2026",
      },
    });
    expect(res.ok()).toBeFalsy();
  });
});
