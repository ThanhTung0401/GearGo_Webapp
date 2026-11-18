import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { getFutureRentalDates } from "../../helpers/testData.js";

test.describe("Phân hệ 2: Tìm kiếm, Khả dụng & Tư vấn AI (UC2.1 - UC2.4.2)", () => {
  test("UC2.1 - Tìm kiếm và lọc sản phẩm + danh mục công khai", async ({ request }) => {
    const catRes = await request.get("/api/danh-muc");
    expect(catRes.ok()).toBeTruthy();

    const prodRes = await request.get("/api/san-pham?soMoiTrang=50");
    expect(prodRes.ok()).toBeTruthy();
    const body = (await prodRes.json()) as { duLieu?: { items?: unknown[] }; items?: unknown[] };
    const items = body.duLieu?.items ?? body.items ?? [];
    expect(items.length).toBeGreaterThan(0);

    // Tìm theo từ khóa
    const searchRes = await request.get("/api/san-pham?tuKhoa=L%E1%BB%81u");
    expect(searchRes.ok()).toBeTruthy();
  });

  test("UC2.2 & UC2.3 - Xem chi tiết sản phẩm và kiểm tra khả dụng theo khoảng ngày", async ({ request }) => {
    const listRes = await request.get("/api/san-pham?soMoiTrang=10");
    const listBody = (await listRes.json()) as { duLieu?: { items?: Array<{ maSanPham: number }> }; items?: Array<{ maSanPham: number }> };
    const items = listBody.duLieu?.items ?? listBody.items ?? [];
    expect(items.length).toBeGreaterThan(0);
    const spId = items[0].maSanPham;

    const { gioNhanIso, gioTraIso } = getFutureRentalDates(6, 2);
    const detailRes = await request.get(
      `/api/san-pham/${spId}?gioNhan=${encodeURIComponent(gioNhanIso)}&gioTra=${encodeURIComponent(gioTraIso)}`
    );
    expect(detailRes.ok()).toBeTruthy();
    const detailBody = (await detailRes.json()) as { duLieu?: { maSanPham: number; soLuongKhaDung?: number }; maSanPham?: number };
    const prod = detailBody.duLieu ?? detailBody;
    expect(prod.maSanPham).toBe(spId);
  });

  test("UC2.4, UC2.4.1, UC2.4.2 - Tư vấn bộ dụng cụ bằng AI & đưa bộ gợi ý vào giỏ thuê", async ({ request }) => {
    const { token } = await loginApi(request, "customer2");
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(14, 2);

    // UC2.4 & UC2.4.1: Gửi yêu cầu tư vấn bộ đồ (kỳ vọng AI/QuyTac/Mock trả phương án)
    const aiRes = await request.post("/api/tu-van/bo-do", {
      headers: authHeaders(token),
      data: {
        diemDen: "Đà Lạt",
        soNguoi: 2,
        gioNhan: gioNhanIso,
        gioTra: gioTraIso,
        nganSach: 1000000,
        loaiNganSach: "TienThue",
      },
    });
    expect(aiRes.ok(), `AI advisor status: ${aiRes.status()}`).toBeTruthy();
    const aiBody = (await aiRes.json()) as {
      duLieu?: { cacDong?: Array<{ maSanPham: number; soLuong: number }> };
      cacDong?: Array<{ maSanPham: number; soLuong: number }>;
    };
    const data = aiBody.duLieu ?? aiBody;

    // Kiểm tra lại bộ đồ
    const checkRes = await request.post("/api/tu-van/bo-do/kiem-tra", {
      headers: authHeaders(token),
      data: {
        diemDen: "Đà Lạt",
        soNguoi: 2,
        gioNhan: gioNhanIso,
        gioTra: gioTraIso,
        nganSach: 1000000,
        loaiNganSach: "TienThue",
      },
    });
    expect(checkRes.ok()).toBeTruthy();

    // UC2.4.2: Nếu có gợi ý sản phẩm còn khả dụng, đưa vào giỏ thuê
    const cacDong = (data.cacDong ?? []).filter((d: { maSanPham: number }) => d.maSanPham > 0);
    if (cacDong.length > 0) {
      const addRes = await request.post("/api/tu-van/bo-do/them-vao-gio", {
        headers: authHeaders(token),
        data: {
          gioNhan: gioNhanIso,
          gioTra: gioTraIso,
          cacDong: [{ maSanPham: cacDong[0].maSanPham, soLuong: 1 }],
          xuLyXungDotLich: "ThayThe",
        },
      });
      expect(addRes.status()).toBeLessThan(500);
    }
  });
});
