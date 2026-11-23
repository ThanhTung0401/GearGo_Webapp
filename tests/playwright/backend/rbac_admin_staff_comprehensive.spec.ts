import { test, expect } from "@playwright/test";
import { loginApi, authHeaders } from "../helpers/auth.js";

const CLEAN_DEFAULT_STAFF = [
  "DonThue.Xem", "DonThue.Tao", "DonThue.CapNhat", "DonThue.Huy",
  "SanPham.Xem", "DanhMuc.Xem",
  "KhuyenMai.Xem", "ChinhSach.Xem", "BaoCao.Xem",
  "PhuPhi.Xem", "PhuPhi.Tao", "PhuPhi.Duyet",
  "DoiSoat.Xem", "DoiSoat.Chot",
  "QuaHan.Xem", "QuaHan.XuLy",
  "PhieuNhap.Xem", "PhieuNhap.Tao", "PhieuNhap.Duyet", "PhieuNhap.Huy",
  "ChuanBiDon.Xem", "ChuanBiDon.Thao",
  "BanGiao.Xem", "BanGiao.Thao",
  "BaoTri.Xem", "BaoTri.Tao", "BaoTri.Duyet",
  "NhanTra.Xem", "NhanTra.Thao",
  "HoanTien.Xem", "HoanTien.Duyet",
  "NhaCungCap.Xem",
  "Kho.Xem", "DieuChinhKho.Xem", "VongDoiThietBi.Xem",
  "BaoCaoKho.Xem", "BaoCaoVanHanh.Xem",
  "ThongBao.Xem",
  "DanhGia.Xem", "DanhGia.Duyet",
  "NhatKy.Xem",
];

test.describe.serial("Backend RBAC: Quản trị viên độc quyền Phân quyền (2 chế độ) & Chặn SanPham.Xem", () => {
  test("1. Chỉ Quản trị viên được gọi /api/phan-quyen/*; Nhân viên bị chặn 403", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");

    // Admin truy cập bình thường
    const adminRoles = await request.get("/api/phan-quyen/vai-tro", { headers: authHeaders(admin.token) });
    expect(adminRoles.status()).toBe(200);

    const adminCatalog = await request.get("/api/phan-quyen/quyen", { headers: authHeaders(admin.token) });
    expect(adminCatalog.status()).toBe(200);

    // Nhân viên bị chặn 403 trên mọi endpoint phân quyền
    const staffRoles = await request.get("/api/phan-quyen/vai-tro", { headers: authHeaders(staff.token) });
    expect(staffRoles.status()).toBe(403);

    const staffCatalog = await request.get("/api/phan-quyen/quyen", { headers: authHeaders(staff.token) });
    expect(staffCatalog.status()).toBe(403);

    const staffPut = await request.put("/api/phan-quyen/vai-tro/NhanVien", {
      headers: authHeaders(staff.token),
      data: { quyen: ["DonThue.Xem"] },
    });
    expect(staffPut.status()).toBe(403);
  });

  test("2. Cấm gán quyền PhanQuyen.* cho Nhân viên ở cả 2 chế độ (Role & 1 nhân viên)", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const staffMeRes = await request.get("/api/auth/quyen-cua-toi", { headers: authHeaders(staff.token) });
    const staffMe = (await staffMeRes.json()) as { maTaiKhoan: number; quyen: string[] };

    // Không cho phép role NhanVien nhận PhanQuyen.*
    const badRole = await request.put("/api/phan-quyen/vai-tro/NhanVien", {
      headers: authHeaders(admin.token),
      data: { quyen: ["DonThue.Xem", "PhanQuyen.Xem"] },
    });
    expect(badRole.status()).toBe(400);

    // Không cho phép override riêng 1 nhân viên nhận PhanQuyen.*
    const badUser = await request.put(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, {
      headers: authHeaders(admin.token),
      data: { quyen: ["DonThue.Xem", "PhanQuyen.Quan"] },
    });
    expect(badUser.status()).toBe(400);

    // Đảm bảo quyen-cua-toi của nhân viên không bao giờ chứa PhanQuyen.*
    expect(staffMe.quyen.filter((p) => p.startsWith("PhanQuyen."))).toEqual([]);
  });

  test("3. Phân quyền 2 chế độ (Tất cả NV vs Riêng 1 NV) cho SanPham.Xem có hiệu lực ngay", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const staffMe = (await (await request.get("/api/auth/quyen-cua-toi", { headers: authHeaders(staff.token) })).json()) as {
      maTaiKhoan: number;
    };

    try {
      // Đảm bảo xóa override cũ nếu có
      await request.delete(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, { headers: authHeaders(admin.token) });

      // Cách 1: Gỡ SanPham.Xem khỏi vai trò NhanVien (tất cả nhân viên)
      const withoutSanPham = CLEAN_DEFAULT_STAFF.filter((p) => p !== "SanPham.Xem");
      const putRole = await request.put("/api/phan-quyen/vai-tro/NhanVien", {
        headers: authHeaders(admin.token),
        data: { quyen: withoutSanPham },
      });
      expect(putRole.status()).toBe(200);

      // Nhân viên gọi API quản lý sản phẩm phải bị 403 ngay lập tức
      const blockedAdminList = await request.get("/api/san-pham/quan-ly", { headers: authHeaders(staff.token) });
      expect(blockedAdminList.status()).toBe(403);

      // Trang công khai vẫn 200 cho khách
      const publicList = await request.get("/api/san-pham");
      expect(publicList.status()).toBe(200);

      // Cách 2: Cấp riêng SanPham.Xem chỉ cho nhân viên này
      const putOne = await request.put(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, {
        headers: authHeaders(admin.token),
        data: { quyen: ["DonThue.Xem", "SanPham.Xem"] },
      });
      expect(putOne.status()).toBe(200);

      const allowedAdminList = await request.get("/api/san-pham/quan-ly", { headers: authHeaders(staff.token) });
      expect(allowedAdminList.status()).toBe(200);

      // Xóa phân quyền riêng -> quay lại kế thừa role (không có SanPham.Xem) -> bị 403 lại
      const delOverride = await request.delete(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, {
        headers: authHeaders(admin.token),
      });
      expect(delOverride.status()).toBe(200);

      const blockedAgain = await request.get("/api/san-pham/quan-ly", { headers: authHeaders(staff.token) });
      expect(blockedAgain.status()).toBe(403);
    } finally {
      // Khôi phục bộ quyền DefaultStaff chuẩn sạch cho vai trò NhanVien và xóa override
      await request.delete(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, { headers: authHeaders(admin.token) });
      await request.put("/api/phan-quyen/vai-tro/NhanVien", {
        headers: authHeaders(admin.token),
        data: { quyen: CLEAN_DEFAULT_STAFF },
      });
    }
  });
});
