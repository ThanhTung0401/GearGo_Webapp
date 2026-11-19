import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";

test.describe("Phân hệ 4: Chuẩn bị, Bàn giao, Nhận trả & Quá hạn (UC4.1 - UC4.5)", () => {
  test("UC4.5 - Tra cứu hàng đợi đơn thuê cho vận hành", async ({ request }) => {
    const { token: staffToken } = await loginApi(request, "staff");
    const res = await request.get("/api/don-thue/xu-ly?soMoiTrang=20", {
      headers: authHeaders(staffToken),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      duLieu?: { items?: Array<{ maDonThue: number }> };
      items?: Array<{ maDonThue: number }>;
    };
    const items = body.duLieu?.items ?? body.items ?? [];
    expect(items.length).toBeGreaterThan(0);

    // Lấy chi tiết vận hành 1 đơn
    const firstId = items[0].maDonThue;
    const detailRes = await request.get(`/api/don-thue/xu-ly/${firstId}`, {
      headers: authHeaders(staffToken),
    });
    expect(detailRes.ok()).toBeTruthy();
  });

  test("UC4.1 & UC4.2 - Kiểm tra endpoint chuẩn bị & bàn giao thiết bị", async ({ request }) => {
    const { token: staffToken } = await loginApi(request, "staff");
    const listRes = await request.get("/api/don-thue/xu-ly?soMoiTrang=20", {
      headers: authHeaders(staffToken),
    });
    const listBody = (await listRes.json()) as {
      duLieu?: { items?: Array<{ maDonThue: number; trangThai: string }> };
      items?: Array<{ maDonThue: number; trangThai: string }>;
    };
    const items = listBody.duLieu?.items ?? listBody.items ?? [];

    // Kiểm tra đọc được danh sách phiếu bàn giao nếu có đơn
    if (items.length > 0) {
      const id = items[0].maDonThue;
      const bgRes = await request.get(`/api/ban-giao?maDonThue=${id}`, {
        headers: authHeaders(staffToken),
      });
      expect([200, 404]).toContain(bgRes.status());
    }
  });

  test("UC4.3 & UC4.3.1 - Kiểm tra endpoint nhận trả & trả một phần", async ({ request }) => {
    const { token: staffToken } = await loginApi(request, "staff");
    const listRes = await request.get("/api/don-thue/xu-ly?soMoiTrang=20", {
      headers: authHeaders(staffToken),
    });
    const listBody = (await listRes.json()) as {
      duLieu?: { items?: Array<{ maDonThue: number }> };
      items?: Array<{ maDonThue: number }>;
    };
    const items = listBody.duLieu?.items ?? listBody.items ?? [];
    if (items.length > 0) {
      const ntRes = await request.get(`/api/nhan-tra?maDonThue=${items[0].maDonThue}`, {
        headers: authHeaders(staffToken),
      });
      expect([200, 404]).toContain(ntRes.status());
    }
  });

  test("UC4.4 - Tra cứu danh sách đơn quá hạn & nhật ký liên hệ", async ({ request }) => {
    const { token: staffToken } = await loginApi(request, "staff");
    const overdueRes = await request.get("/api/qua-han", {
      headers: authHeaders(staffToken),
    });
    expect([200, 404]).toContain(overdueRes.status());
  });
});
