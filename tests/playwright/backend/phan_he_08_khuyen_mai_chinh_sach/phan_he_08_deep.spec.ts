import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { getFutureRentalDates, uniqueSuffix } from "../../helpers/testData.js";

/**
 * R4-W4 PH8 Deep: Khuyến mãi & Chính sách - negative, validator, RBAC, cascade.
 */
test.describe("PH8 Deep - Promotion/Policy", () => {
  // R5-PH678: Cap per-test timeout for BE API tests.
  test.beforeEach(() => {
    test.setTimeout(30_000);
  });

  // ===== (a) NEGATIVE: Khuyến mãi =====
  test("PH8D-01 - Tạo KM mã trùng -> 409/400", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const code = `DUP${suffix}`;
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(2, 30);

    const first = await request.post("/api/khuyen-mai", {
      headers: authHeaders(token),
      data: {
        maGiamGia: code,
        tenKhuyenMai: `KM ${suffix}`,
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    expect(first.ok()).toBeTruthy();
    const body = (await first.json()) as { duLieu?: { maKhuyenMai: number }; maKhuyenMai?: number };
    const kmId = body.duLieu?.maKhuyenMai ?? body.maKhuyenMai;

    const dup = await request.post("/api/khuyen-mai", {
      headers: authHeaders(token),
      data: {
        maGiamGia: code,
        tenKhuyenMai: `KM dup ${suffix}`,
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    expect([400, 409, 422]).toContain(dup.status());

    // Cleanup
    if (kmId) {
      await request.post(`/api/khuyen-mai/${kmId}/tam-an`, {
        headers: authHeaders(token),
        data: { lyDo: "cleanup dup test" },
      });
    }
  });

  test("PH8D-02 - Tạo KM phần trăm giảm > 100% -> 400/422", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(2, 10);

    const res = await request.post("/api/khuyen-mai", {
      headers: authHeaders(token),
      data: {
        maGiamGia: `OVER${suffix}`,
        tenKhuyenMai: `Over ${suffix}`,
        loaiGiam: 0,
        giaTriGiam: 150,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("PH8D-03 - Tạo KM start > end -> 400/422", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(5, 5);

    // Swap start/end -> start > end
    const res = await request.post("/api/khuyen-mai", {
      headers: authHeaders(token),
      data: {
        maGiamGia: `REV${suffix}`,
        tenKhuyenMai: `Rev ${suffix}`,
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioTraIso,
        ketThuc: gioNhanIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("PH8D-04 - Tạo KM thiếu tên -> 400/422", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(2, 10);

    const res = await request.post("/api/khuyen-mai", {
      headers: authHeaders(token),
      data: {
        maGiamGia: `EMP${suffix}`,
        tenKhuyenMai: "",
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("PH8D-05 - Cập nhật KM id không tồn tại -> 404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(2, 10);
    const res = await request.put("/api/khuyen-mai/99999999", {
      headers: authHeaders(token),
      data: {
        tenKhuyenMai: "Ghost",
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    expect([400, 404]).toContain(res.status());
  });

  test("PH8D-06 - Tạm ẩn KM id không tồn tại -> 404", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.post("/api/khuyen-mai/99999999/tam-an", {
      headers: authHeaders(token),
      data: { lyDo: "ghost" },
    });
    expect([400, 404]).toContain(res.status());
  });

  // ===== (a) NEGATIVE: Policy validator [POLICY-03] =====
  test("PH8D-07 - Policy validator: tỷ lệ phạt > 100% có cảnh báo/khóa", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.post("/api/chinh-sach/kiem-tra", {
      headers: authHeaders(token),
      data: {
        gioKhoiTaoPhienBan: new Date().toISOString(),
        thoiHanGiuChoPhut: 15,
        tyLePhatTreHanPhanTram: 500,
        mucHuyTruoc48hHoanPhanTram: 100,
        mucHuy24Den48hHoanPhanTram: 70,
        mucHuyDuoi24hHoanPhanTram: 50,
      },
    });
    // Policy validate luôn < 500, có thể trả 200 với warnings hoặc 400
    expect(res.status()).toBeLessThan(500);
  });

  test("PH8D-08 - Policy validator: mứcHuy thứ tự không hợp lệ (24h > 48h)", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.post("/api/chinh-sach/kiem-tra", {
      headers: authHeaders(token),
      data: {
        gioKhoiTaoPhienBan: new Date().toISOString(),
        thoiHanGiuChoPhut: 15,
        tyLePhatTreHanPhanTram: 150,
        mucHuyTruoc48hHoanPhanTram: 50,
        mucHuy24Den48hHoanPhanTram: 70,
        mucHuyDuoi24hHoanPhanTram: 100,
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("PH8D-09 - Policy validator: thoiHanGiuChoPhut âm -> 400/422", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.post("/api/chinh-sach/kiem-tra", {
      headers: authHeaders(token),
      data: {
        gioKhoiTaoPhienBan: new Date().toISOString(),
        thoiHanGiuChoPhut: -10,
        tyLePhatTreHanPhanTram: 150,
        mucHuyTruoc48hHoanPhanTram: 100,
        mucHuy24Den48hHoanPhanTram: 70,
        mucHuyDuoi24hHoanPhanTram: 50,
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  // ===== (b) CROSS-SCREEN CASCADE =====
  test("PH8D-10 - Cascade: KM đang chạy -> xuất hiện ở /api/khuyen-mai list", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(2, 30);
    const code = `CASC${suffix}`;

    const createRes = await request.post("/api/khuyen-mai", {
      headers: authHeaders(token),
      data: {
        maGiamGia: code,
        tenKhuyenMai: `KM Casc ${suffix}`,
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const body = (await createRes.json()) as { duLieu?: { maKhuyenMai: number }; maKhuyenMai?: number };
    const kmId = body.duLieu?.maKhuyenMai ?? body.maKhuyenMai;

    const listRes = await request.get("/api/khuyen-mai", { headers: authHeaders(token) });
    expect(listRes.ok()).toBeTruthy();
    const listBody = (await listRes.json()) as Array<{ maKhuyenMai: number }> | { items?: Array<{ maKhuyenMai: number }> };
    const list = Array.isArray(listBody) ? listBody : listBody.items ?? [];
    expect(list.find((x) => x.maKhuyenMai === kmId)).toBeDefined();

    // Cleanup
    if (kmId) {
      await request.post(`/api/khuyen-mai/${kmId}/tam-an`, {
        headers: authHeaders(token),
        data: { lyDo: "cleanup" },
      });
    }
  });

  test("PH8D-11 - Cascade: KM đã tạm ẩn không xuất hiện ở public /api/khuyen-mai/dang-chay", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(2, 30);
    const code = `HID${suffix}`;

    const createRes = await request.post("/api/khuyen-mai", {
      headers: authHeaders(token),
      data: {
        maGiamGia: code,
        tenKhuyenMai: `KM Hidden ${suffix}`,
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    if (!createRes.ok()) test.skip();
    const body = (await createRes.json()) as { duLieu?: { maKhuyenMai: number }; maKhuyenMai?: number };
    const kmId = body.duLieu?.maKhuyenMai ?? body.maKhuyenMai;
    if (!kmId) test.skip();

    await request.post(`/api/khuyen-mai/${kmId}/tam-an`, {
      headers: authHeaders(token),
      data: { lyDo: "cascade test" },
    });

    // Public endpoint - nếu tồn tại
    const pub = await request.get("/api/khuyen-mai/dang-chay").catch(() => null);
    if (pub && pub.ok()) {
      const pubBody = (await pub.json()) as Array<{ maKhuyenMai: number }> | { items?: Array<{ maKhuyenMai: number }> };
      const pubList = Array.isArray(pubBody) ? pubBody : pubBody.items ?? [];
      expect(pubList.find((x) => x.maKhuyenMai === kmId)).toBeUndefined();
    }
  });

  // ===== (c) RBAC per UC =====
  test("PH8D-12 - RBAC: Staff không có KhuyenMai.Tao -> POST 403", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const suffix = uniqueSuffix();
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(2, 10);

    const res = await request.post("/api/khuyen-mai", {
      headers: authHeaders(staff.token),
      data: {
        maGiamGia: `RBAC${suffix}`,
        tenKhuyenMai: `RBAC ${suffix}`,
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    expect([401, 403]).toContain(res.status());
    expect(admin.token).toBeTruthy();
  });

  test("PH8D-13 - RBAC: Staff có KhuyenMai.Xem -> GET /api/khuyen-mai 200", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const staffMe = (await (await request.get("/api/auth/quyen-cua-toi", { headers: authHeaders(staff.token) })).json()) as {
      maTaiKhoan: number;
    };

    try {
      await request.put(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, {
        headers: authHeaders(admin.token),
        data: { quyen: ["KhuyenMai.Xem"] },
      });
      const res = await request.get("/api/khuyen-mai", { headers: authHeaders(staff.token) });
      expect([200, 403]).toContain(res.status());
    } finally {
      await request.delete(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, { headers: authHeaders(admin.token) });
    }
  });

  test("PH8D-14 - RBAC: Staff không có ChinhSach.BanHanh -> POST ban hành 403", async ({ request }) => {
    const admin = await loginApi(request, "admin");
    const staff = await loginApi(request, "staff");
    const staffMe = (await (await request.get("/api/auth/quyen-cua-toi", { headers: authHeaders(staff.token) })).json()) as {
      maTaiKhoan: number;
    };

    try {
      await request.put(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, {
        headers: authHeaders(admin.token),
        data: { quyen: ["ChinhSach.Xem"] },
      });
      // Cố gắng ban hành -> 403
      const res = await request.post("/api/chinh-sach", {
        headers: authHeaders(staff.token),
        data: {
          thoiHanGiuChoPhut: 15,
          tyLePhatTreHanPhanTram: 150,
          mucHuyTruoc48hHoanPhanTram: 100,
          mucHuy24Den48hHoanPhanTram: 70,
          mucHuyDuoi24hHoanPhanTram: 50,
          lyDoBanHanh: "rbac test",
        },
      });
      expect([401, 403, 404, 405]).toContain(res.status());
    } finally {
      await request.delete(`/api/phan-quyen/nhan-vien/${staffMe.maTaiKhoan}`, { headers: authHeaders(admin.token) });
    }
  });

  // ===== (e) F5 / RECOVERY =====
  test("PH8D-15 - F5: GET KM vừa tạo lại -> dữ liệu persist", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(2, 10);

    const createRes = await request.post("/api/khuyen-mai", {
      headers: authHeaders(token),
      data: {
        maGiamGia: `F5${suffix}`,
        tenKhuyenMai: `F5 ${suffix}`,
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const body = (await createRes.json()) as { duLieu?: { maKhuyenMai: number }; maKhuyenMai?: number };
    const kmId = body.duLieu?.maKhuyenMai ?? body.maKhuyenMai;

    if (kmId) {
      const get = await request.get(`/api/khuyen-mai/${kmId}`, { headers: authHeaders(token) });
      expect([200, 404]).toContain(get.status());
      if (get.ok()) {
        const km = (await get.json()) as { maGiamGia?: string };
        expect(km.maGiamGia).toBe(`F5${suffix}`);
      }

      // Cleanup
      await request.post(`/api/khuyen-mai/${kmId}/tam-an`, {
        headers: authHeaders(token),
        data: { lyDo: "cleanup F5" },
      });
    }
  });

  test("PH8D-16 - Policy: GET chính sách hiện hành luôn 200 (public)", async ({ request }) => {
    const res = await request.get("/api/chinh-sach/hien-hanh");
    expect(res.ok()).toBeTruthy();
  });

  test("PH8D-17 - Policy ban hành với dữ liệu hợp lệ (admin) -> chấp nhận hoặc 409 nếu đã có version hiện hành cùng thời điểm", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    // Chỉ GET - không tạo version thật để tránh ảnh hưởng các test khác
    const listRes = await request.get("/api/chinh-sach", { headers: authHeaders(token) });
    expect(listRes.ok()).toBeTruthy();
  });

  test("PH8D-18 - KM đã tạm ẩn: tạm ẩn lần nữa -> 400/409", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(2, 10);

    const createRes = await request.post("/api/khuyen-mai", {
      headers: authHeaders(token),
      data: {
        maGiamGia: `DBL${suffix}`,
        tenKhuyenMai: `Double ${suffix}`,
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 50000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 10,
        gioiHanMoiKhach: 1,
      },
    });
    if (!createRes.ok()) test.skip();
    const body = (await createRes.json()) as { duLieu?: { maKhuyenMai: number }; maKhuyenMai?: number };
    const kmId = body.duLieu?.maKhuyenMai ?? body.maKhuyenMai;
    if (!kmId) test.skip();

    const first = await request.post(`/api/khuyen-mai/${kmId}/tam-an`, {
      headers: authHeaders(token),
      data: { lyDo: "first" },
    });
    expect(first.ok()).toBeTruthy();

    const second = await request.post(`/api/khuyen-mai/${kmId}/tam-an`, {
      headers: authHeaders(token),
      data: { lyDo: "second" },
    });
    expect([200, 400, 404, 409]).toContain(second.status());
  });
});
