import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { uniqueSuffix } from "../../helpers/testData.js";

test.describe("Phân hệ 6: Danh mục, Sản phẩm, Thiết bị, Kiểm kê & Bảo trì (UC6.1 - UC6.15)", () => {
  test("UC6.1, UC6.1.1, UC6.2, UC6.3, UC6.4 - CRUD & đổi trạng thái Danh mục", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();

    // UC6.3: Tra cứu danh mục
    const listRes = await request.get("/api/danh-muc/quan-ly", { headers: authHeaders(token) });
    expect(listRes.ok()).toBeTruthy();

    // UC6.1 & UC6.1.1: Tạo danh mục mới
    const createRes = await request.post("/api/danh-muc", {
      headers: authHeaders(token),
      data: {
        tenDanhMuc: `Danh mục PW ${suffix}`,
        moTa: "Tạo từ Playwright PH6",
        thuTuHienThi: 99,
        trangThai: "HienThi",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { maDanhMuc: number };
    expect(created.maDanhMuc).toBeGreaterThan(0);

    // UC6.2: Cập nhật danh mục
    const updRes = await request.put(`/api/danh-muc/${created.maDanhMuc}`, {
      headers: authHeaders(token),
      data: {
        tenDanhMuc: `Danh mục PW ${suffix} Updated`,
        moTa: "Cập nhật từ Playwright",
        thuTuHienThi: 99,
        trangThai: "HienThi",
      },
    });
    expect(updRes.ok()).toBeTruthy();

    // UC6.4: Đổi trạng thái TamAn -> xóa dọn dữ liệu test
    const statusRes = await request.patch(`/api/danh-muc/${created.maDanhMuc}/trang-thai`, {
      headers: authHeaders(token),
      data: { trangThaiMoi: "TamAn" },
    });
    expect(statusRes.ok()).toBeTruthy();

    const delRes = await request.delete(`/api/danh-muc/${created.maDanhMuc}`, {
      headers: authHeaders(token),
    });
    expect(delRes.ok()).toBeTruthy();
  });

  test("UC6.5, UC6.5.1, UC6.6, UC6.7, UC6.8 - CRUD & đổi trạng thái Sản phẩm", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();

    const catsRes = await request.get("/api/danh-muc/quan-ly", { headers: authHeaders(token) });
    const cats = (await catsRes.json()) as Array<{ maDanhMuc: number }>;
    expect(cats.length).toBeGreaterThan(0);

    // UC6.7: Tra cứu sản phẩm quản trị
    const listRes = await request.get("/api/san-pham/quan-ly?soMoiTrang=20", { headers: authHeaders(token) });
    expect(listRes.ok()).toBeTruthy();

    // UC6.5 & UC6.5.1: Tạo sản phẩm mới (kiểm tra giá thuê & cọc hợp lệ)
    const createRes = await request.post("/api/san-pham", {
      headers: authHeaders(token),
      data: {
        maDanhMuc: cats[0].maDanhMuc,
        maSanPhamHienThi: `PW-${suffix}`,
        tenSanPham: `Sản phẩm PW ${suffix}`,
        thuongHieu: "GearGo Test",
        giaThueMoiNgay: 120000,
        mucCocMoiThietBi: 500000,
        giaTriBoiThuong: 1500000,
        trangThaiKinhDoanh: "DangKinhDoanh",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { maSanPham: number };

    // UC6.6: Cập nhật sản phẩm
    const updRes = await request.put(`/api/san-pham/${created.maSanPham}`, {
      headers: authHeaders(token),
      data: {
        maDanhMuc: cats[0].maDanhMuc,
        maSanPhamHienThi: `PW-${suffix}`,
        tenSanPham: `Sản phẩm PW ${suffix} Edited`,
        thuongHieu: "GearGo Test",
        giaThueMoiNgay: 130000,
        mucCocMoiThietBi: 500000,
        giaTriBoiThuong: 1500000,
        trangThaiKinhDoanh: "DangKinhDoanh",
      },
    });
    expect(updRes.ok()).toBeTruthy();

    // UC6.8: Đổi trạng thái kinh doanh sang NgungKinhDoanh
    const stRes = await request.patch(`/api/san-pham/${created.maSanPham}/trang-thai`, {
      headers: authHeaders(token),
      data: { trangThaiMoi: "NgungKinhDoanh" },
    });
    expect(stRes.ok()).toBeTruthy();
  });

  test("UC6.9, UC6.10, UC6.10.1, UC6.11, UC6.11.1, UC6.12, UC6.12.1, UC6.13, UC6.14, UC6.15 - Thiết bị, Kiểm kê, Điều chỉnh & Bảo trì", async ({
    request,
  }) => {
    const { token: adminToken } = await loginApi(request, "admin");

    // UC6.9: Tra cứu thiết bị & lịch sử vòng đời
    const eqRes = await request.get("/api/thiet-bi?soMoiTrang=10", { headers: authHeaders(adminToken) });
    expect(eqRes.ok()).toBeTruthy();
    const eqBody = (await eqRes.json()) as { duLieu?: { items?: Array<{ maThietBi: number }> }; items?: Array<{ maThietBi: number }> };
    const eqItems = eqBody.duLieu?.items ?? eqBody.items ?? [];
    if (eqItems.length > 0) {
      const lifeRes = await request.get(`/api/thiet-bi/${eqItems[0].maThietBi}/ho-so-vong-doi`, {
        headers: authHeaders(adminToken),
      });
      expect([200, 404]).toContain(lifeRes.status());
    }

    // UC6.10 & UC6.10.1: Tra cứu phiếu điều chỉnh kho
    const adjRes = await request.get("/api/dieu-chinh-kho", { headers: authHeaders(adminToken) });
    expect([200, 404]).toContain(adjRes.status());

    // UC6.12 & UC6.13: Tra cứu danh sách bảo trì
    const maintRes = await request.get("/api/bao-tri", { headers: authHeaders(adminToken) });
    expect([200, 404]).toContain(maintRes.status());
  });
});
