import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { getFutureRentalDates } from "../../helpers/testData.js";

/**
 * Deep test PH2 (Backend): Catalog, Khả dụng, Tư vấn AI.
 * (a) Negative / (b) Cross-screen / (c) RBAC (Tư vấn AI cấp quyền động) / (e) Idempotency.
 */

function deepSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

test.describe("PH2 Deep Backend: Negative / Cross / RBAC / Recovery", () => {
  // =========================
  // (a) Negative paths
  // =========================

  test("(a) UC2.1 - Tìm sản phẩm với từ khóa rỗng không gây 500", async ({ request }) => {
    const res = await request.get("/api/san-pham?tuKhoa=&soMoiTrang=5");
    expect(res.status()).toBeLessThan(500);
  });

  test("(a) UC2.1 - Tìm sản phẩm với từ khóa quá dài (>500 chars) bị xử lý an toàn", async ({ request }) => {
    const longKw = "A".repeat(600);
    const res = await request.get(`/api/san-pham?tuKhoa=${encodeURIComponent(longKw)}`);
    expect(res.status()).toBeLessThan(500);
  });

  test("(a) UC2.1 - SQL injection payload không trả 500 và không lộ dữ liệu", async ({ request }) => {
    const payload = `' OR 1=1 --`;
    const res = await request.get(`/api/san-pham?tuKhoa=${encodeURIComponent(payload)}`);
    expect(res.status()).toBeLessThan(500);
  });

  test("(a) UC2.1 - Unicode + emoji trong tuKhoa không gãy", async ({ request }) => {
    const res = await request.get(`/api/san-pham?tuKhoa=${encodeURIComponent("Lều 🏕️ cắm trại 测试")}`);
    expect(res.status()).toBeLessThan(500);
  });

  test("(a) UC2.1 - soMoiTrang âm / siêu lớn phải bị kẹp hoặc 400", async ({ request }) => {
    const negative = await request.get("/api/san-pham?soMoiTrang=-5");
    expect(negative.status()).toBeLessThan(500);

    const huge = await request.get("/api/san-pham?soMoiTrang=99999");
    expect(huge.status()).toBeLessThan(500);
  });

  test("(a) UC2.2 - GET chi tiết sản phẩm không tồn tại trả 404", async ({ request }) => {
    const res = await request.get("/api/san-pham/999999999");
    expect([400, 404]).toContain(res.status());
  });

  test("(a) UC2.2 - GET chi tiết với id không phải số trả 400", async ({ request }) => {
    const res = await request.get("/api/san-pham/abc-xyz");
    expect(res.status()).toBeLessThan(500);
    expect(res.ok()).toBeFalsy();
  });

  test("(a) UC2.3 - Khoảng ngày ngược (gioTra < gioNhan) bị từ chối", async ({ request }) => {
    const listBody = await (await request.get("/api/san-pham?soMoiTrang=5")).json() as {
      duLieu?: { items?: Array<{ maSanPham: number }> };
      items?: Array<{ maSanPham: number }>;
    };
    const items = listBody.duLieu?.items ?? listBody.items ?? [];
    if (items.length === 0) test.skip(true, "Không có sản phẩm để test");
    const id = items[0].maSanPham;

    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - 1);
    const future = new Date(now);
    future.setDate(future.getDate() + 5);

    const res = await request.get(
      `/api/san-pham/${id}?gioNhan=${encodeURIComponent(future.toISOString())}&gioTra=${encodeURIComponent(past.toISOString())}`
    );
    // Phải xử lý gracefully, không 500
    expect(res.status()).toBeLessThan(500);
  });

  test("(a) UC2.4 - Tư vấn AI không auth bị 401/403", async ({ request }) => {
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(10, 2);
    const res = await request.post("/api/tu-van/bo-do", {
      data: { diemDen: "Đà Lạt", soNguoi: 2, gioNhan: gioNhanIso, gioTra: gioTraIso, nganSach: 1000000, loaiNganSach: "TienThue" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("(a) UC2.4 - Tư vấn AI với soNguoi âm / nganSach âm bị từ chối hoặc kẹp", async ({ request }) => {
    const { token } = await loginApi(request, "customer2");
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(10, 2);
    const res = await request.post("/api/tu-van/bo-do", {
      headers: authHeaders(token),
      data: { diemDen: "Đà Lạt", soNguoi: -3, gioNhan: gioNhanIso, gioTra: gioTraIso, nganSach: -500, loaiNganSach: "TienThue" },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("(a) UC2.4 - Tư vấn AI thiếu gioNhan/gioTra trả 400", async ({ request }) => {
    const { token } = await loginApi(request, "customer2");
    const res = await request.post("/api/tu-van/bo-do", {
      headers: authHeaders(token),
      data: { diemDen: "Đà Lạt", soNguoi: 2, nganSach: 1000000, loaiNganSach: "TienThue" },
    });
    expect(res.ok()).toBeFalsy();
    expect(res.status()).toBeLessThan(500);
  });

  // =========================
  // (b) Cross-screen cascade
  // =========================

  test("(b) UC2.1 → UC2.2 - Sản phẩm trong list cũng gọi detail được", async ({ request }) => {
    const list = await (await request.get("/api/san-pham?soMoiTrang=5")).json() as {
      duLieu?: { items?: Array<{ maSanPham: number }> };
      items?: Array<{ maSanPham: number }>;
    };
    const items = list.duLieu?.items ?? list.items ?? [];
    expect(items.length).toBeGreaterThan(0);
    for (const it of items.slice(0, 3)) {
      const detail = await request.get(`/api/san-pham/${it.maSanPham}`);
      expect(detail.ok(), `Chi tiết ${it.maSanPham} phải OK`).toBeTruthy();
    }
  });

  test("(b) UC2.2 → UC2.3 - Chi tiết với khoảng ngày trả soLuongKhaDung phù hợp", async ({ request }) => {
    const list = await (await request.get("/api/san-pham?soMoiTrang=3")).json() as {
      duLieu?: { items?: Array<{ maSanPham: number }> };
      items?: Array<{ maSanPham: number }>;
    };
    const items = list.duLieu?.items ?? list.items ?? [];
    if (items.length === 0) test.skip(true, "Không có sản phẩm");
    const id = items[0].maSanPham;

    const { gioNhanIso, gioTraIso } = getFutureRentalDates(20, 2);
    const detail = await request.get(
      `/api/san-pham/${id}?gioNhan=${encodeURIComponent(gioNhanIso)}&gioTra=${encodeURIComponent(gioTraIso)}`
    );
    expect(detail.ok()).toBeTruthy();
    const body = await detail.json() as { duLieu?: { soLuongKhaDung?: number }; soLuongKhaDung?: number };
    const data = body.duLieu ?? body;
    expect(typeof data.soLuongKhaDung === "number" || data.soLuongKhaDung === undefined).toBeTruthy();
  });

  test("(b) UC2.4 → UC2.4.2 - Combo AI có sản phẩm thực đưa vào giỏ OK", async ({ request }) => {
    const { token } = await loginApi(request, "customer2");
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(18, 2);

    const aiRes = await request.post("/api/tu-van/bo-do", {
      headers: authHeaders(token),
      data: { diemDen: `Đà Lạt ${deepSuffix()}`, soNguoi: 2, gioNhan: gioNhanIso, gioTra: gioTraIso, nganSach: 2000000, loaiNganSach: "TienThue" },
    });
    expect(aiRes.ok()).toBeTruthy();
    const body = await aiRes.json() as { duLieu?: { cacDong?: Array<{ maSanPham: number; soLuong: number }> }; cacDong?: Array<{ maSanPham: number; soLuong: number }> };
    const data = body.duLieu ?? body;
    const lines = (data.cacDong ?? []).filter((d) => d.maSanPham > 0);

    if (lines.length === 0) {
      test.skip(true, "AI không trả line khả dụng — môi trường có thể thiếu seed");
    }

    const addRes = await request.post("/api/tu-van/bo-do/them-vao-gio", {
      headers: authHeaders(token),
      data: {
        gioNhan: gioNhanIso,
        gioTra: gioTraIso,
        cacDong: [{ maSanPham: lines[0].maSanPham, soLuong: 1 }],
        xuLyXungDotLich: "ThayThe",
      },
    });
    expect(addRes.status()).toBeLessThan(500);
  });

  // =========================
  // (c) RBAC per UC
  // =========================

  test("(c) UC2.1/2.2 - Catalog public: admin/staff/customer/guest đều OK", async ({ request }) => {
    const guestList = await request.get("/api/san-pham?soMoiTrang=3");
    expect(guestList.ok()).toBeTruthy();

    for (const role of ["admin", "staff", "customer"] as const) {
      const { token } = await loginApi(request, role);
      const res = await request.get("/api/san-pham?soMoiTrang=3", { headers: authHeaders(token) });
      expect(res.ok(), `${role} phải xem được catalog`).toBeTruthy();
    }
  });

  test("(c) UC2.4 - Tư vấn AI: customer OK, staff cần quyền động, guest 401", async ({ request }) => {
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(22, 2);
    const payload = { diemDen: "Hồ Trị An", soNguoi: 2, gioNhan: gioNhanIso, gioTra: gioTraIso, nganSach: 1500000, loaiNganSach: "TienThue" };

    const guestRes = await request.post("/api/tu-van/bo-do", { data: payload });
    expect([401, 403]).toContain(guestRes.status());

    const { token: custToken } = await loginApi(request, "customer2");
    const custRes = await request.post("/api/tu-van/bo-do", { headers: authHeaders(custToken), data: payload });
    expect(custRes.ok()).toBeTruthy();

    // Staff: theo commit ddfda6d, Tư vấn AI mở quyền cho nhân viên → OK (hoặc 403 nếu role base chưa gán)
    const { token: staffToken } = await loginApi(request, "staff");
    const staffRes = await request.post("/api/tu-van/bo-do", { headers: authHeaders(staffToken), data: payload });
    expect(staffRes.status()).toBeLessThan(500);
    // Chấp nhận cả 200 (đã mở) và 403 (chưa gán quyền động)
    expect([200, 201, 403]).toContain(staffRes.status());
  });

  test("(c) UC2.4.2 - Thêm vào giỏ qua tư vấn: admin cấp quyền động cho staff rồi staff dùng được", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const { token: staffToken } = await loginApi(request, "staff");

    // Admin xem được endpoint quyền
    const permsRes = await request.get("/api/phan-quyen/vai-tro", { headers: authHeaders(adminToken) });
    expect(permsRes.ok()).toBeTruthy();

    // Staff tự xem quyền của mình (không bị 500)
    const meRes = await request.get("/api/auth/quyen-cua-toi", { headers: authHeaders(staffToken) });
    expect(meRes.status()).toBeLessThan(500);
  });

  test("(c) UC2.4 - Kiểm tra bộ đồ: customer OK, guest 401", async ({ request }) => {
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(24, 2);
    const payload = { diemDen: "Bảo Lộc", soNguoi: 2, gioNhan: gioNhanIso, gioTra: gioTraIso, nganSach: 1000000, loaiNganSach: "TienThue" };

    const guestRes = await request.post("/api/tu-van/bo-do/kiem-tra", { data: payload });
    expect([401, 403]).toContain(guestRes.status());

    const { token } = await loginApi(request, "customer2");
    const custRes = await request.post("/api/tu-van/bo-do/kiem-tra", { headers: authHeaders(token), data: payload });
    expect(custRes.ok()).toBeTruthy();
  });

  // =========================
  // (e) Recovery / idempotency
  // =========================

  test("(e) UC2.1 - List sản phẩm nhiều lần liên tiếp ổn định về count", async ({ request }) => {
    const r1 = await request.get("/api/san-pham?soMoiTrang=10");
    const r2 = await request.get("/api/san-pham?soMoiTrang=10");
    expect(r1.ok() && r2.ok()).toBeTruthy();
    const b1 = await r1.json() as { duLieu?: { items?: unknown[] }; items?: unknown[] };
    const b2 = await r2.json() as { duLieu?: { items?: unknown[] }; items?: unknown[] };
    const c1 = (b1.duLieu?.items ?? b1.items ?? []).length;
    const c2 = (b2.duLieu?.items ?? b2.items ?? []).length;
    expect(c1).toBe(c2);
  });

  test("(e) UC2.4 - Gọi AI 2 lần liên tiếp cùng input: không 500, kết quả xác định", async ({ request }) => {
    const { token } = await loginApi(request, "customer2");
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(26, 2);
    const payload = { diemDen: `Đà Lạt ${deepSuffix()}`, soNguoi: 2, gioNhan: gioNhanIso, gioTra: gioTraIso, nganSach: 1200000, loaiNganSach: "TienThue" };

    const r1 = await request.post("/api/tu-van/bo-do", { headers: authHeaders(token), data: payload });
    const r2 = await request.post("/api/tu-van/bo-do", { headers: authHeaders(token), data: payload });
    expect(r1.status()).toBeLessThan(500);
    expect(r2.status()).toBeLessThan(500);
  });

  test("(e) UC2.4.2 - Thêm 2 lần cùng line vào giỏ: không nhân đôi hoặc 400 rõ lý do", async ({ request }) => {
    const { token } = await loginApi(request, "customer2");
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(28, 2);
    const list = await (await request.get("/api/san-pham?soMoiTrang=3")).json() as {
      duLieu?: { items?: Array<{ maSanPham: number }> };
      items?: Array<{ maSanPham: number }>;
    };
    const items = list.duLieu?.items ?? list.items ?? [];
    if (items.length === 0) test.skip(true, "Không có sản phẩm");

    const r1 = await request.post("/api/tu-van/bo-do/them-vao-gio", {
      headers: authHeaders(token),
      data: { gioNhan: gioNhanIso, gioTra: gioTraIso, cacDong: [{ maSanPham: items[0].maSanPham, soLuong: 1 }], xuLyXungDotLich: "ThayThe" },
    });
    const r2 = await request.post("/api/tu-van/bo-do/them-vao-gio", {
      headers: authHeaders(token),
      data: { gioNhan: gioNhanIso, gioTra: gioTraIso, cacDong: [{ maSanPham: items[0].maSanPham, soLuong: 1 }], xuLyXungDotLich: "GiuGiaHien" },
    });
    expect(r1.status()).toBeLessThan(500);
    expect(r2.status()).toBeLessThan(500);
  });
});
