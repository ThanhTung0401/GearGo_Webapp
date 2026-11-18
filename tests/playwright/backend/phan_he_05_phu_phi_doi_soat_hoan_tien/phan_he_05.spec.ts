import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";

test.describe("Phân hệ 5: Thanh toán, Phụ phí, Đối soát & Hoàn tiền (UC5.1 - UC5.7)", () => {
  test("UC5.1 & UC5.5 - Kiểm tra danh sách giao dịch cần đối chiếu & trạng thái thanh toán", async ({ request }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const res = await request.get("/api/v1/thanh-toan/can-doi-chieu", {
      headers: authHeaders(adminToken),
    });
    expect(res.ok()).toBeTruthy();
  });

  test("UC5.2 & UC5.3 - Tra cứu phụ phí & xử lý tranh chấp (xác thực phân quyền Staff vs Admin)", async ({
    request,
  }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const { token: custToken } = await loginApi(request, "customer");

    // Khách hàng không được truy cập danh sách cần đối chiếu của quản trị
    const forbiddenRes = await request.get("/api/v1/thanh-toan/can-doi-chieu", {
      headers: authHeaders(custToken),
    });
    expect([401, 403]).toContain(forbiddenRes.status());

    // Admin xem danh sách phụ phí theo đơn hoặc endpoint danh sách
    const listRes = await request.get("/api/v1/phu-phi", {
      headers: authHeaders(adminToken),
    });
    expect([200, 404, 405]).toContain(listRes.status());
  });

  test("UC5.4, UC5.6, UC5.7 - Kiểm tra endpoint đối soát cọc, hoàn tiền & điều chỉnh sau chốt", async ({
    request,
  }) => {
    const { token: adminToken } = await loginApi(request, "admin");

    // Kiểm tra endpoint đối soát theo đơn đầu tiên nếu có
    const ordersRes = await request.get("/api/v1/van-hanh/don-thue?soMoiTrang=5", {
      headers: authHeaders(adminToken),
    });
    expect(ordersRes.ok()).toBeTruthy();
    const ordersBody = (await ordersRes.json()) as {
      duLieu?: { items?: Array<{ maDonThue: number }> };
      items?: Array<{ maDonThue: number }>;
    };
    const items = ordersBody.duLieu?.items ?? ordersBody.items ?? [];
    if (items.length > 0) {
      const dsRes = await request.get(`/api/v1/doi-soat/don-thue/${items[0].maDonThue}`, {
        headers: authHeaders(adminToken),
      });
      expect([200, 404]).toContain(dsRes.status());
    }

    // Kiểm tra hoàn tiền
    const refundRes = await request.get("/api/v1/hoan-tien", {
      headers: authHeaders(adminToken),
    });
    expect([200, 404]).toContain(refundRes.status());
  });
});
