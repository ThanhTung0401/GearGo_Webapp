import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";

test.describe("Phân hệ 10: Báo cáo & Tra cứu lịch sử (UC10.1 - UC10.4.2)", () => {
  test("UC10.1 & UC10.1.1 - Xem và lọc báo cáo vận hành", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.get("/api/bao-cao-van-hanh", { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();

    const khoRes = await request.get("/api/bao-cao/kho/hien-trang", { headers: authHeaders(token) });
    expect(khoRes.ok()).toBeTruthy();
  });

  test("UC10.2 & UC10.2.1 - Xem báo cáo doanh thu và dòng tiền (phân biệt rõ doanh thu vs tiền cọc)", async ({
    request,
  }) => {
    const { token } = await loginApi(request, "admin");
    const revRes = await request.get("/api/bao-cao/tai-chinh/doanh-thu-hoan-tat", {
      headers: authHeaders(token),
    });
    expect(revRes.ok()).toBeTruthy();

    const depRes = await request.get("/api/bao-cao/tai-chinh/coc-chua-tat-toan", {
      headers: authHeaders(token),
    });
    expect(depRes.ok()).toBeTruthy();
  });

  test("UC10.3 - Xem báo cáo nhập hàng", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const res = await request.get("/api/bao-cao/kho/nhap-hang", {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
  });

  test("UC10.4, UC10.4.1, UC10.4.2 - Tra cứu nhật ký hệ thống & kiểm tra quyền truy cập", async ({
    request,
  }) => {
    const { token: adminToken } = await loginApi(request, "admin");
    const { token: custToken } = await loginApi(request, "customer");

    // UC10.4.1: Khách hàng không được xem nhật ký kiểm toán hệ thống
    const forbiddenRes = await request.get("/api/nhat-ky", {
      headers: authHeaders(custToken),
    });
    expect([401, 403]).toContain(forbiddenRes.status());

    // UC10.4: Admin tra cứu nhật ký
    const logRes = await request.get("/api/nhat-ky?soMoiTrang=20", {
      headers: authHeaders(adminToken),
    });
    expect(logRes.ok()).toBeTruthy();
  });
});
