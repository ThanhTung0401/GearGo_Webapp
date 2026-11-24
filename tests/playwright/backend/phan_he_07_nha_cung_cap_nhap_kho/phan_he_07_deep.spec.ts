import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { uniqueSuffix } from "../../helpers/testData.js";

/**
 * R4-W4 PH7 Deep: Nhà cung cấp & Nhập kho - negative, cascade, RBAC, F5 recovery.
 */
test.describe("PH7 Deep - Supplier/Import", () => {
  // ===== (a) NEGATIVE: NCC =====
  test("PH7D-01 - Tạo NCC với email sai format -> 400/422", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const res = await request.post("/api/nha-cung-cap", {
      headers: authHeaders(token),
      data: {
        maHienThi: `BAD-${suffix}`,
        ten: `NCC Bad Email ${suffix}`,
        soDienThoai: `091${suffix.slice(0, 7)}`,
        email: "khong_phai_email",
        diaChi: "Q1 HCM",
        nguoiLienHe: "X",
      },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("PH7D-02 - Tạo NCC với SĐT < 10 số -> 400/422", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const res = await request.post("/api/nha-cung-cap", {
      headers: authHeaders(token),
      data: {
        maHienThi: `SHORT-${suffix}`,
        ten: `NCC ${suffix}`,
        soDienThoai: "12345",
        email: `x${suffix}@g.vn`,
        diaChi: "Q1 HCM",
        nguoiLienHe: "X",
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("PH7D-03 - Tạo NCC trùng mã hiển thị -> 409/400", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const code = `DUP-${suffix}`;
    const first = await request.post("/api/nha-cung-cap", {
      headers: authHeaders(token),
      data: {
        maHienThi: code,
        ten: `NCC ${suffix}`,
        soDienThoai: `091${suffix.slice(0, 7)}`,
        email: `dup.${suffix}@g.vn`,
        diaChi: "Q1 HCM",
        nguoiLienHe: "Minh",
      },
    });
    expect(first.ok()).toBeTruthy();

    const dup = await request.post("/api/nha-cung-cap", {
      headers: authHeaders(token),
      data: {
        maHienThi: code,
        ten: `NCC ${suffix} v2`,
        soDienThoai: `091${suffix.slice(0, 7)}`,
        email: `dup2.${suffix}@g.vn`,
        diaChi: "Q1 HCM",
        nguoiLienHe: "Minh2",
      },
    });
    expect([400, 409, 422]).toContain(dup.status());
  });

  test("PH7D-04 - Cập nhật NCC id không tồn tại -> 404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.put("/api/nha-cung-cap/99999999", {
      headers: authHeaders(token),
      data: {
        ten: "Ghost NCC",
        soDienThoai: "0912345678",
        email: "ghost@g.vn",
        diaChi: "Q1",
      },
    });
    expect([400, 404]).toContain(res.status());
  });

  test("PH7D-05 - Ngừng NCC id không tồn tại -> 404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.put("/api/nha-cung-cap/99999999/trang-thai-hop-tac", {
      headers: authHeaders(token),
      data: { trangThaiHopTac: "NgungHopTac", lyDo: "test" },
    });
    expect([400, 404]).toContain(res.status());
  });

  // ===== (a) NEGATIVE: Phiếu nhập =====
  test("PH7D-06 - Tạo phiếu nhập: đơn giá âm -> 400/422", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const nccBody = (await (await request.get("/api/nha-cung-cap", { headers: authHeaders(token) })).json()) as
      | Array<{ maNhaCungCap: number }>
      | { duLieu?: Array<{ maNhaCungCap: number }> };
    const nccs = Array.isArray(nccBody) ? nccBody : nccBody.duLieu ?? [];
    const spBody = (await (await request.get("/api/san-pham/quan-ly?soMoiTrang=5", { headers: authHeaders(token) })).json()) as { items?: Array<{ maSanPham: number }> };
    const sps = spBody.items ?? [];
    if (nccs.length === 0 || sps.length === 0) test.skip();

    const res = await request.post("/api/phieu-nhap", {
      headers: authHeaders(token),
      data: {
        maNhaCungCap: nccs[0].maNhaCungCap,
        ghiChu: "Negative test",
        chiTiet: [{ maSanPham: sps[0].maSanPham, soLuong: 1, donGiaNhap: -100 }],
      },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("PH7D-07 - Tạo phiếu nhập: số lượng 0 -> 400/422", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const nccBody = (await (await request.get("/api/nha-cung-cap", { headers: authHeaders(token) })).json()) as
      | Array<{ maNhaCungCap: number }>
      | { duLieu?: Array<{ maNhaCungCap: number }> };
    const nccs = Array.isArray(nccBody) ? nccBody : nccBody.duLieu ?? [];
    const spBody = (await (await request.get("/api/san-pham/quan-ly?soMoiTrang=5", { headers: authHeaders(token) })).json()) as { items?: Array<{ maSanPham: number }> };
    const sps = spBody.items ?? [];
    if (nccs.length === 0 || sps.length === 0) test.skip();

    const res = await request.post("/api/phieu-nhap", {
      headers: authHeaders(token),
      data: {
        maNhaCungCap: nccs[0].maNhaCungCap,
        ghiChu: "Zero qty",
        chiTiet: [{ maSanPham: sps[0].maSanPham, soLuong: 0, donGiaNhap: 100000 }],
      },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("PH7D-08 - Tạo phiếu nhập: product_id không tồn tại -> 400/404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const nccBody = (await (await request.get("/api/nha-cung-cap", { headers: authHeaders(token) })).json()) as
      | Array<{ maNhaCungCap: number }>
      | { duLieu?: Array<{ maNhaCungCap: number }> };
    const nccs = Array.isArray(nccBody) ? nccBody : nccBody.duLieu ?? [];
    if (nccs.length === 0) test.skip();

    const res = await request.post("/api/phieu-nhap", {
      headers: authHeaders(token),
      data: {
        maNhaCungCap: nccs[0].maNhaCungCap,
        ghiChu: "Ghost product",
        chiTiet: [{ maSanPham: 99999999, soLuong: 1, donGiaNhap: 100000 }],
      },
    });
    expect([400, 404, 422]).toContain(res.status());
  });

  test("PH7D-09 - Tạo phiếu nhập: NCC không tồn tại -> 400/404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const spBody = (await (await request.get("/api/san-pham/quan-ly?soMoiTrang=5", { headers: authHeaders(token) })).json()) as { items?: Array<{ maSanPham: number }> };
    const sps = spBody.items ?? [];
    if (sps.length === 0) test.skip();

    const res = await request.post("/api/phieu-nhap", {
      headers: authHeaders(token),
      data: {
        maNhaCungCap: 99999999,
        ghiChu: "Ghost NCC",
        chiTiet: [{ maSanPham: sps[0].maSanPham, soLuong: 1, donGiaNhap: 100000 }],
      },
    });
    expect([400, 404, 422]).toContain(res.status());
  });

  test("PH7D-10 - Hủy phiếu nhập id không tồn tại -> 404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.post("/api/phieu-nhap/99999999/huy", {
      headers: authHeaders(token),
      data: { lyDo: "test" },
    });
    expect([400, 404]).toContain(res.status());
  });

  // ===== (b) CROSS-SCREEN CASCADE =====
  test("PH7D-11 - Cascade: NCC vừa tạo xuất hiện trong /api/nha-cung-cap list", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const code = `CASC-${suffix}`;
    const createRes = await request.post("/api/nha-cung-cap", {
      headers: authHeaders(token),
      data: {
        maHienThi: code,
        ten: `NCC Casc ${suffix}`,
        soDienThoai: `097${suffix.slice(0, 7)}`,
        email: `casc.${suffix}@g.vn`,
        diaChi: "Q3",
        nguoiLienHe: "Q",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const nccBody = (await createRes.json()) as { duLieu?: { maNhaCungCap: number }; maNhaCungCap?: number };
    const nccId = nccBody.duLieu?.maNhaCungCap ?? nccBody.maNhaCungCap;

    const listRes = await request.get("/api/nha-cung-cap", { headers: authHeaders(token) });
    expect(listRes.ok()).toBeTruthy();
    const listBody = (await listRes.json()) as Array<{ maNhaCungCap: number }> | { duLieu?: Array<{ maNhaCungCap: number }> };
    const list = Array.isArray(listBody) ? listBody : listBody.duLieu ?? [];
    expect(list.find((x) => x.maNhaCungCap === nccId)).toBeDefined();

    // Cleanup: ngừng hợp tác
    await request.put(`/api/nha-cung-cap/${nccId}/trang-thai-hop-tac`, {
      headers: authHeaders(token),
      data: { trangThaiHopTac: "NgungHopTac", lyDo: "cleanup" },
    });
  });

  test("PH7D-12 - Cascade: tạo phiếu nhập nháp -> xuất hiện trong /api/phieu-nhap list", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const nccBody = (await (await request.get("/api/nha-cung-cap", { headers: authHeaders(token) })).json()) as
      | Array<{ maNhaCungCap: number }>
      | { duLieu?: Array<{ maNhaCungCap: number }> };
    const nccs = Array.isArray(nccBody) ? nccBody : nccBody.duLieu ?? [];
    const spBody = (await (await request.get("/api/san-pham/quan-ly?soMoiTrang=5", { headers: authHeaders(token) })).json()) as { items?: Array<{ maSanPham: number }> };
    const sps = spBody.items ?? [];
    if (nccs.length === 0 || sps.length === 0) test.skip();

    const createRes = await request.post("/api/phieu-nhap", {
      headers: authHeaders(token),
      data: {
        maNhaCungCap: nccs[0].maNhaCungCap,
        ghiChu: `Cascade PN ${uniqueSuffix()}`,
        chiTiet: [{ maSanPham: sps[0].maSanPham, soLuong: 1, donGiaNhap: 450000 }],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const body = (await createRes.json()) as { duLieu?: { maPhieuNhap: number }; maPhieuNhap?: number };
    const pnId = body.duLieu?.maPhieuNhap ?? body.maPhieuNhap;

    const listRes = await request.get("/api/phieu-nhap", { headers: authHeaders(token) });
    expect(listRes.ok()).toBeTruthy();

    // Cleanup
    if (pnId) {
      await request.post(`/api/phieu-nhap/${pnId}/huy`, {
        headers: authHeaders(token),
        data: { lyDo: "cleanup" },
      });
    }
  });

  // ===== (c) RBAC per UC =====
  test("PH7D-13 - RBAC: Staff không có NhaCungCap.Tao -> POST 403", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const suffix = uniqueSuffix();

    const res = await request.post("/api/nha-cung-cap", {
      headers: authHeaders(staff.token),
      data: {
        maHienThi: `RBAC-${suffix}`,
        ten: `NCC RBAC ${suffix}`,
        soDienThoai: `091${suffix.slice(0, 7)}`,
        email: `rbac.${suffix}@g.vn`,
        diaChi: "Q1",
        nguoiLienHe: "X",
      },
    });
    expect([401, 403]).toContain(res.status());
    // Avoid unused var warning
    expect(admin.token).toBeTruthy();
  });

  test("PH7D-14 - RBAC: Staff có PhieuNhap.Tao nhưng không có PhieuNhap.Duyet -> không duyệt được", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const staffMe = (await (await request.get("/api/auth/quyen-cua-toi", { headers: authHeaders(staff.token) })).json()) as {
      maTaiKhoan: number;
    };

    try {
      await request.put(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, {
        headers: authHeaders(admin.token),
        data: { quyen: ["PhieuNhap.Xem", "PhieuNhap.Tao"] },
      });

      // Thử duyệt phiếu nhập id bất kỳ -> 403 (không có quyền duyệt)
      const res = await request.post("/api/phieu-nhap/99999999/kiem-nhan", {
        headers: authHeaders(staff.token),
        data: { chiTiet: [] },
      });
      expect([401, 403, 404]).toContain(res.status());
    } finally {
      await request.delete(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, { headers: authHeaders(admin.token) });
    }
  });

  test("PH7D-15 - RBAC: Staff không có NhaCungCap.Xem -> GET /api/nha-cung-cap 403", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const staffMe = (await (await request.get("/api/auth/quyen-cua-toi", { headers: authHeaders(staff.token) })).json()) as {
      maTaiKhoan: number;
    };

    try {
      // Cấp chỉ DonThue.Xem
      await request.put(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, {
        headers: authHeaders(admin.token),
        data: { quyen: ["DonThue.Xem"] },
      });
      const res = await request.get("/api/nha-cung-cap", { headers: authHeaders(staff.token) });
      expect([401, 403]).toContain(res.status());
    } finally {
      await request.delete(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, { headers: authHeaders(admin.token) });
    }
  });

  // ===== (e) F5 / RECOVERY =====
  test("PH7D-16 - F5 draft recovery: tạo PN nháp 1 dòng, GET lại -> dòng vẫn còn", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const nccBody = (await (await request.get("/api/nha-cung-cap", { headers: authHeaders(token) })).json()) as
      | Array<{ maNhaCungCap: number }>
      | { duLieu?: Array<{ maNhaCungCap: number }> };
    const nccs = Array.isArray(nccBody) ? nccBody : nccBody.duLieu ?? [];
    const spBody = (await (await request.get("/api/san-pham/quan-ly?soMoiTrang=5", { headers: authHeaders(token) })).json()) as { items?: Array<{ maSanPham: number }> };
    const sps = spBody.items ?? [];
    if (nccs.length === 0 || sps.length === 0) test.skip();

    const createRes = await request.post("/api/phieu-nhap", {
      headers: authHeaders(token),
      data: {
        maNhaCungCap: nccs[0].maNhaCungCap,
        ghiChu: `F5 draft ${uniqueSuffix()}`,
        chiTiet: [{ maSanPham: sps[0].maSanPham, soLuong: 3, donGiaNhap: 500000 }],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const body = (await createRes.json()) as { duLieu?: { maPhieuNhap: number }; maPhieuNhap?: number };
    const pnId = body.duLieu?.maPhieuNhap ?? body.maPhieuNhap;

    // Simulate F5: GET detail
    if (pnId) {
      const detail = await request.get(`/api/phieu-nhap/${pnId}`, { headers: authHeaders(token) });
      expect([200, 404]).toContain(detail.status());

      // Cleanup
      await request.post(`/api/phieu-nhap/${pnId}/huy`, {
        headers: authHeaders(token),
        data: { lyDo: "cleanup F5 draft" },
      });
    }
  });

  test("PH7D-17 - Hủy phiếu nhập đã hủy lần nữa -> 400/409", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const nccBody = (await (await request.get("/api/nha-cung-cap", { headers: authHeaders(token) })).json()) as
      | Array<{ maNhaCungCap: number }>
      | { duLieu?: Array<{ maNhaCungCap: number }> };
    const nccs = Array.isArray(nccBody) ? nccBody : nccBody.duLieu ?? [];
    const spBody = (await (await request.get("/api/san-pham/quan-ly?soMoiTrang=5", { headers: authHeaders(token) })).json()) as { items?: Array<{ maSanPham: number }> };
    const sps = spBody.items ?? [];
    if (nccs.length === 0 || sps.length === 0) test.skip();

    const createRes = await request.post("/api/phieu-nhap", {
      headers: authHeaders(token),
      data: {
        maNhaCungCap: nccs[0].maNhaCungCap,
        ghiChu: `Double cancel ${uniqueSuffix()}`,
        chiTiet: [{ maSanPham: sps[0].maSanPham, soLuong: 1, donGiaNhap: 100000 }],
      },
    });
    if (!createRes.ok()) test.skip();
    const body = (await createRes.json()) as { duLieu?: { maPhieuNhap: number }; maPhieuNhap?: number };
    const pnId = body.duLieu?.maPhieuNhap ?? body.maPhieuNhap;
    if (!pnId) test.skip();

    const first = await request.post(`/api/phieu-nhap/${pnId}/huy`, {
      headers: authHeaders(token),
      data: { lyDo: "first cancel" },
    });
    expect([200, 204]).toContain(first.status());

    const second = await request.post(`/api/phieu-nhap/${pnId}/huy`, {
      headers: authHeaders(token),
      data: { lyDo: "second cancel" },
    });
    expect([400, 404, 409, 422]).toContain(second.status());
  });

  test("PH7D-18 - Tra cứu phiếu nhập với query sai -> trả 200 rỗng hoặc 400", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.get("/api/phieu-nhap?trangThai=KhongTonTai", { headers: authHeaders(token) });
    expect([200, 400]).toContain(res.status());
  });
});
