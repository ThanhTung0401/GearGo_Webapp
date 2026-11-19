import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { getFutureRentalDates, uniqueSuffix } from "../../helpers/testData.js";

test.describe("Phân hệ 8: Khuyến mãi & Chính sách (UC8.1 - UC8.5)", () => {
  test("UC8.1 & UC8.1.1 - Xem, kiểm tra & ghi phiên bản chính sách", async ({ request }) => {
    const { token } = await loginApi(request, "admin");

    const curRes = await request.get("/api/chinh-sach/hien-hanh");
    expect(curRes.ok()).toBeTruthy();

    const listRes = await request.get("/api/chinh-sach", { headers: authHeaders(token) });
    expect(listRes.ok()).toBeTruthy();

    // UC8.1.1: Kiểm tra hợp lệ cấu hình chính sách trước khi ban hành
    const validateRes = await request.post("/api/chinh-sach/kiem-tra", {
      headers: authHeaders(token),
      data: {
        gioKhoiTaoPhienBan: new Date().toISOString(),
        thoiHanGiuChoPhut: 15,
        tyLePhatTreHanPhanTram: 150,
        mucHuyTruoc48hHoanPhanTram: 100,
        mucHuy24Den48hHoanPhanTram: 70,
        mucHuyDuoi24hHoanPhanTram: 50,
      },
    });
    expect(validateRes.status()).toBeLessThan(500);
  });

  test("UC8.2, UC8.2.1, UC8.3, UC8.3.1, UC8.4, UC8.5 - Tạo, cập nhật, tra cứu & ngừng khuyến mãi", async ({
    request,
  }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(2, 30);

    // UC8.4: Tra cứu danh sách khuyến mãi
    const listRes = await request.get("/api/khuyen-mai", { headers: authHeaders(token) });
    expect(listRes.ok()).toBeTruthy();

    // UC8.2 & UC8.2.1: Tạo chương trình khuyến mãi mới (loaiGiam: 0=PhanTram, phamVi: 0=TatCa)
    const code = `PW${suffix}`;
    const createRes = await request.post("/api/khuyen-mai", {
      headers: authHeaders(token),
      data: {
        maGiamGia: code,
        tenKhuyenMai: `Khuyến mãi Playwright ${suffix}`,
        loaiGiam: 0,
        giaTriGiam: 10,
        mucGiamToiDa: 100000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 50,
        gioiHanMoiKhach: 1,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as {
      duLieu?: { maKhuyenMai: number };
      maKhuyenMai?: number;
    };
    const kmId = created.duLieu?.maKhuyenMai ?? created.maKhuyenMai;
    expect(kmId).toBeGreaterThan(0);

    // UC8.3 & UC8.3.1: Cập nhật khuyến mãi
    const updRes = await request.put(`/api/khuyen-mai/${kmId}`, {
      headers: authHeaders(token),
      data: {
        tenKhuyenMai: `Khuyến mãi Playwright ${suffix} Edited`,
        loaiGiam: 0,
        giaTriGiam: 15,
        mucGiamToiDa: 120000,
        tienThueToiThieu: 100000,
        phamVi: 0,
        batDau: gioNhanIso,
        ketThuc: gioTraIso,
        gioiHanTongLuot: 50,
        gioiHanMoiKhach: 1,
      },
    });
    expect(updRes.ok()).toBeTruthy();

    // UC8.5: Ngừng chương trình khuyến mãi (POST /api/khuyen-mai/{id}/tam-an)
    const stopRes = await request.post(`/api/khuyen-mai/${kmId}/tam-an`, {
      headers: authHeaders(token),
      data: { lyDo: "Ngừng chương trình sau kiểm thử Playwright" },
    });
    expect(stopRes.ok()).toBeTruthy();
  });
});
