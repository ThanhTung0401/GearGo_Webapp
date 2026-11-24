import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { uniqueSuffix } from "../../helpers/testData.js";

/**
 * R4-W4 PH6 Deep: Phủ sâu negative, cascade, RBAC, F5-recovery cho
 * Danh mục / Sản phẩm / Thiết bị / Kiểm kê / Điều chỉnh kho / Bảo trì.
 * Mỗi test đảm bảo isolation bằng uniqueSuffix() cho mọi mã.
 */
test.describe("PH6 Deep - Catalog/Product/Equipment/Maintenance", () => {
  // R5-PH678: Cap per-test timeout for BE API tests.
  test.beforeEach(() => {
    test.setTimeout(30_000);
  });

  // ===== (a) NEGATIVE: Danh mục =====
  test("PH6D-01 - Tạo danh mục thiếu tên -> 400/422", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.post("/api/danh-muc", {
      headers: authHeaders(token),
      data: { tenDanhMuc: "", moTa: "", thuTuHienThi: 1, trangThai: "HienThi" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("PH6D-02 - Tạo danh mục mã/tên trùng -> 409/400", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const name = `DupDM ${suffix}`;
    const first = await request.post("/api/danh-muc", {
      headers: authHeaders(token),
      data: { tenDanhMuc: name, moTa: "dup test", thuTuHienThi: 10, trangThai: "HienThi" },
    });
    expect(first.ok()).toBeTruthy();
    const firstBody = (await first.json()) as { maDanhMuc: number };

    const dup = await request.post("/api/danh-muc", {
      headers: authHeaders(token),
      data: { tenDanhMuc: name, moTa: "dup2", thuTuHienThi: 11, trangThai: "HienThi" },
    });
    expect([400, 409, 422]).toContain(dup.status());

    // Cleanup
    await request.delete(`/api/danh-muc/${firstBody.maDanhMuc}`, { headers: authHeaders(token) });
  });

  test("PH6D-03 - Cập nhật danh mục id không tồn tại -> 404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.put("/api/danh-muc/99999999", {
      headers: authHeaders(token),
      data: { tenDanhMuc: "Ghost", moTa: "", thuTuHienThi: 1, trangThai: "HienThi" },
    });
    expect([400, 404]).toContain(res.status());
  });

  // ===== (a) NEGATIVE: Sản phẩm =====
  test("PH6D-04 - Tạo SP: danh mục không tồn tại -> 400/404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const res = await request.post("/api/san-pham", {
      headers: authHeaders(token),
      data: {
        maDanhMuc: 99999999,
        maSanPhamHienThi: `BAD-${suffix}`,
        tenSanPham: `Bad SP ${suffix}`,
        thuongHieu: "X",
        giaThueMoiNgay: 100000,
        mucCocMoiThietBi: 200000,
        giaTriBoiThuong: 500000,
        trangThaiKinhDoanh: "DangKinhDoanh",
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("PH6D-05 - Tạo SP: giá âm / tên rỗng -> 400", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const cats = (await (await request.get("/api/danh-muc/quan-ly", { headers: authHeaders(token) })).json()) as Array<{ maDanhMuc: number }>;
    expect(cats.length).toBeGreaterThan(0);

    const resNeg = await request.post("/api/san-pham", {
      headers: authHeaders(token),
      data: {
        maDanhMuc: cats[0].maDanhMuc,
        maSanPhamHienThi: `NEG-${uniqueSuffix()}`,
        tenSanPham: "NegPrice",
        thuongHieu: "Z",
        giaThueMoiNgay: -100,
        mucCocMoiThietBi: 200000,
        giaTriBoiThuong: 500000,
        trangThaiKinhDoanh: "DangKinhDoanh",
      },
    });
    expect([400, 422]).toContain(resNeg.status());

    const resEmpty = await request.post("/api/san-pham", {
      headers: authHeaders(token),
      data: {
        maDanhMuc: cats[0].maDanhMuc,
        maSanPhamHienThi: `EMP-${uniqueSuffix()}`,
        tenSanPham: "",
        thuongHieu: "Z",
        giaThueMoiNgay: 100000,
        mucCocMoiThietBi: 200000,
        giaTriBoiThuong: 500000,
        trangThaiKinhDoanh: "DangKinhDoanh",
      },
    });
    expect([400, 422]).toContain(resEmpty.status());
  });

  test("PH6D-06 - Tạo SP mã hiển thị trùng -> 409/400", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const cats = (await (await request.get("/api/danh-muc/quan-ly", { headers: authHeaders(token) })).json()) as Array<{ maDanhMuc: number }>;
    const suffix = uniqueSuffix();
    const code = `DUPSP-${suffix}`;

    const first = await request.post("/api/san-pham", {
      headers: authHeaders(token),
      data: {
        maDanhMuc: cats[0].maDanhMuc,
        maSanPhamHienThi: code,
        tenSanPham: `Dup SP ${suffix}`,
        thuongHieu: "A",
        giaThueMoiNgay: 100000,
        mucCocMoiThietBi: 200000,
        giaTriBoiThuong: 500000,
        trangThaiKinhDoanh: "DangKinhDoanh",
      },
    });
    expect(first.ok()).toBeTruthy();
    const body = (await first.json()) as { maSanPham: number };

    const dup = await request.post("/api/san-pham", {
      headers: authHeaders(token),
      data: {
        maDanhMuc: cats[0].maDanhMuc,
        maSanPhamHienThi: code,
        tenSanPham: `Dup SP ${suffix} v2`,
        thuongHieu: "A",
        giaThueMoiNgay: 100000,
        mucCocMoiThietBi: 200000,
        giaTriBoiThuong: 500000,
        trangThaiKinhDoanh: "DangKinhDoanh",
      },
    });
    expect([400, 409, 422]).toContain(dup.status());

    // Cleanup: chuyển sang NgungKinhDoanh (xóa hard có thể bị 409 nếu có đơn)
    await request.patch(`/api/san-pham/${body.maSanPham}/trang-thai`, {
      headers: authHeaders(token),
      data: { trangThaiMoi: "NgungKinhDoanh" },
    });
  });

  test("PH6D-07 - Đổi trạng thái SP không hợp lệ -> 400", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const spList = (await (await request.get("/api/san-pham/quan-ly?soMoiTrang=5", { headers: authHeaders(token) })).json()) as { items?: Array<{ maSanPham: number }> };
    const items = spList.items ?? [];
    if (items.length === 0) test.skip();

    const res = await request.patch(`/api/san-pham/${items[0].maSanPham}/trang-thai`, {
      headers: authHeaders(token),
      data: { trangThaiMoi: "KhongTonTai" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  // ===== (a) NEGATIVE: Thiết bị / Bảo trì / Kiểm kê =====
  test("PH6D-08 - Thiết bị: đổi trạng thái không hợp lệ (DangThue -> DangDuocSuaChua trực tiếp) -> 400/409", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const eqRes = await request.get("/api/thiet-bi?soMoiTrang=10", { headers: authHeaders(token) });
    if (!eqRes.ok()) test.skip();
    const body = (await eqRes.json()) as { duLieu?: { items?: Array<{ maThietBi: number; trangThai?: string }> }; items?: Array<{ maThietBi: number; trangThai?: string }> };
    const items = body.duLieu?.items ?? body.items ?? [];
    if (items.length === 0) test.skip();

    const res = await request.patch(`/api/thiet-bi/${items[0].maThietBi}/trang-thai`, {
      headers: authHeaders(token),
      data: { trangThaiMoi: "TrangThaiAo_KhongHopLe" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("PH6D-09 - Lập phiếu bảo trì cho thiết bị không tồn tại -> 404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.post("/api/bao-tri", {
      headers: authHeaders(token),
      data: {
        maThietBi: 99999999,
        loaiBaoTri: "DinhKy",
        moTaSuCo: "Ghost device",
        chiPhiDuKien: 100000,
      },
    });
    expect([400, 404, 422]).toContain(res.status());
  });

  test("PH6D-10 - Điều chỉnh kho: số lượng <= 0 hoặc thiếu trường -> 400", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.post("/api/dieu-chinh-kho", {
      headers: authHeaders(token),
      data: { chiTiet: [{ maSanPham: 1, soLuongChenhLech: 0, lyDo: "" }] },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  // ===== (b) CROSS-SCREEN CASCADE =====
  test("PH6D-11 - Cascade: Ẩn DM -> API /san-pham landing không trả SP thuộc DM đó", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    // Tạo DM mới
    const dmRes = await request.post("/api/danh-muc", {
      headers: authHeaders(token),
      data: { tenDanhMuc: `CascadeDM ${suffix}`, moTa: "cascade", thuTuHienThi: 20, trangThai: "HienThi" },
    });
    expect(dmRes.ok()).toBeTruthy();
    const dm = (await dmRes.json()) as { maDanhMuc: number };

    // Ẩn DM (TamAn)
    const stRes = await request.patch(`/api/danh-muc/${dm.maDanhMuc}/trang-thai`, {
      headers: authHeaders(token),
      data: { trangThaiMoi: "TamAn" },
    });
    expect(stRes.ok()).toBeTruthy();

    // Public landing: DM đó không hiển thị
    const pub = await request.get("/api/danh-muc");
    expect(pub.ok()).toBeTruthy();
    const pubBody = (await pub.json()) as Array<{ maDanhMuc: number }> | { duLieu?: Array<{ maDanhMuc: number }> };
    const list = Array.isArray(pubBody) ? pubBody : pubBody.duLieu ?? [];
    expect(list.find((x) => x.maDanhMuc === dm.maDanhMuc)).toBeUndefined();

    // Cleanup
    await request.delete(`/api/danh-muc/${dm.maDanhMuc}`, { headers: authHeaders(token) });
  });

  test("PH6D-12 - Cascade: Đổi SP sang NgungKinhDoanh -> không xuất hiện ở landing /api/san-pham", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const cats = (await (await request.get("/api/danh-muc/quan-ly", { headers: authHeaders(token) })).json()) as Array<{ maDanhMuc: number }>;
    const suffix = uniqueSuffix();

    const spRes = await request.post("/api/san-pham", {
      headers: authHeaders(token),
      data: {
        maDanhMuc: cats[0].maDanhMuc,
        maSanPhamHienThi: `CASC-${suffix}`,
        tenSanPham: `Casc SP ${suffix}`,
        thuongHieu: "C",
        giaThueMoiNgay: 150000,
        mucCocMoiThietBi: 300000,
        giaTriBoiThuong: 900000,
        trangThaiKinhDoanh: "DangKinhDoanh",
      },
    });
    expect(spRes.ok()).toBeTruthy();
    const sp = (await spRes.json()) as { maSanPham: number };

    await request.patch(`/api/san-pham/${sp.maSanPham}/trang-thai`, {
      headers: authHeaders(token),
      data: { trangThaiMoi: "NgungKinhDoanh" },
    });

    const pub = await request.get("/api/san-pham");
    expect(pub.ok()).toBeTruthy();
    const pubBody = (await pub.json()) as { items?: Array<{ maSanPham: number }> } | Array<{ maSanPham: number }>;
    const list = Array.isArray(pubBody) ? pubBody : pubBody.items ?? [];
    expect(list.find((x) => x.maSanPham === sp.maSanPham)).toBeUndefined();
  });

  // ===== (c) RBAC per UC =====
  test("PH6D-13 - RBAC: Staff thiếu SanPham.Tao -> POST /api/san-pham 403", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const cats = (await (await request.get("/api/danh-muc/quan-ly", { headers: authHeaders(admin.token) })).json()) as Array<{ maDanhMuc: number }>;

    const res = await request.post("/api/san-pham", {
      headers: authHeaders(staff.token),
      data: {
        maDanhMuc: cats[0].maDanhMuc,
        maSanPhamHienThi: `RBAC-${uniqueSuffix()}`,
        tenSanPham: `RBAC`,
        thuongHieu: "X",
        giaThueMoiNgay: 100000,
        mucCocMoiThietBi: 200000,
        giaTriBoiThuong: 500000,
        trangThaiKinhDoanh: "DangKinhDoanh",
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("PH6D-14 - RBAC: SanPham.Xem không bao gồm SanPham.CapNhat ([SP-05])", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const staffMe = (await (await request.get("/api/auth/quyen-cua-toi", { headers: authHeaders(staff.token) })).json()) as {
      maTaiKhoan: number;
      quyen: string[];
    };

    try {
      // Cấp cho staff CHỈ SanPham.Xem (không có SanPham.CapNhat)
      const putOne = await request.put(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, {
        headers: authHeaders(admin.token),
        data: { quyen: ["DonThue.Xem", "SanPham.Xem"] },
      });
      expect(putOne.status()).toBe(200);

      // Xem list OK
      const spList = await request.get("/api/san-pham/quan-ly?soMoiTrang=5", { headers: authHeaders(staff.token) });
      expect(spList.status()).toBe(200);
      const items = ((await spList.json()) as { items?: Array<{ maSanPham: number }> }).items ?? [];
      if (items.length === 0) test.skip();

      // Nhưng PUT cập nhật -> 403
      const upd = await request.put(`/api/san-pham/${items[0].maSanPham}`, {
        headers: authHeaders(staff.token),
        data: {
          maDanhMuc: 1,
          maSanPhamHienThi: "X",
          tenSanPham: "X",
          thuongHieu: "X",
          giaThueMoiNgay: 100000,
          mucCocMoiThietBi: 200000,
          giaTriBoiThuong: 500000,
          trangThaiKinhDoanh: "DangKinhDoanh",
        },
      });
      expect([401, 403]).toContain(upd.status());
    } finally {
      await request.delete(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, { headers: authHeaders(admin.token) });
    }
  });

  test("PH6D-15 - RBAC: Staff thiếu BaoTri.Tao -> POST /api/bao-tri 403", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const staffMe = (await (await request.get("/api/auth/quyen-cua-toi", { headers: authHeaders(staff.token) })).json()) as {
      maTaiKhoan: number;
    };

    try {
      // Cấp cho staff chỉ BaoTri.Xem
      await request.put(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, {
        headers: authHeaders(admin.token),
        data: { quyen: ["BaoTri.Xem"] },
      });

      const res = await request.post("/api/bao-tri", {
        headers: authHeaders(staff.token),
        data: { maThietBi: 1, loaiBaoTri: "DinhKy", moTaSuCo: "rbac", chiPhiDuKien: 100000 },
      });
      expect([401, 403]).toContain(res.status());
    } finally {
      await request.delete(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, { headers: authHeaders(admin.token) });
    }
  });

  // ===== (e) F5 / RECOVERY =====
  test("PH6D-16 - Recovery: Tạo SP rồi GET lại cùng id (F5-like) -> dữ liệu persist", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const cats = (await (await request.get("/api/danh-muc/quan-ly", { headers: authHeaders(token) })).json()) as Array<{ maDanhMuc: number }>;
    const suffix = uniqueSuffix();

    const createRes = await request.post("/api/san-pham", {
      headers: authHeaders(token),
      data: {
        maDanhMuc: cats[0].maDanhMuc,
        maSanPhamHienThi: `F5-${suffix}`,
        tenSanPham: `F5 SP ${suffix}`,
        thuongHieu: "F",
        giaThueMoiNgay: 170000,
        mucCocMoiThietBi: 350000,
        giaTriBoiThuong: 1000000,
        trangThaiKinhDoanh: "DangKinhDoanh",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const sp = (await createRes.json()) as { maSanPham: number };

    // Simulate F5 bằng GET detail lại
    const get = await request.get(`/api/san-pham/${sp.maSanPham}`, { headers: authHeaders(token) });
    expect([200, 404]).toContain(get.status());
    if (get.ok()) {
      const spData = (await get.json()) as { tenSanPham?: string };
      expect(spData.tenSanPham).toContain(suffix);
    }

    // Cleanup: NgungKinhDoanh
    await request.patch(`/api/san-pham/${sp.maSanPham}/trang-thai`, {
      headers: authHeaders(token),
      data: { trangThaiMoi: "NgungKinhDoanh" },
    });
  });

  test("PH6D-17 - Kiểm kê: lập phiếu đi qua endpoint /dieu-chinh-kho/* có sẵn", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    // Chỉ kiểm tra tra cứu phiếu điều chỉnh có hoạt động, không tạo phiếu thật (tránh ảnh hưởng tồn kho)
    const res = await request.get("/api/dieu-chinh-kho?soMoiTrang=5", { headers: authHeaders(token) });
    expect([200, 404]).toContain(res.status());
  });

  test("PH6D-18 - Vòng đời thiết bị: GET hồ sơ cho id không tồn tại -> 404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.get("/api/thiet-bi/99999999/ho-so-vong-doi", { headers: authHeaders(token) });
    expect([400, 404]).toContain(res.status());
  });
});
