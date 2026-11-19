import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";

test.describe("Phân hệ 9: Đánh giá sản phẩm & Thông báo (UC9.1 - UC9.4.1)", () => {
  test("UC9.1, UC9.1.1, UC9.1.2, UC9.2, UC9.2.1 - Đánh giá sản phẩm, kiểm tra điều kiện & kiểm duyệt", async ({
    request,
  }) => {
    const { token: custToken } = await loginApi(request, "customer");
    const { token: adminToken } = await loginApi(request, "admin");

    // UC9.1.1: Kiểm tra danh sách đơn đủ điều kiện đánh giá của khách hàng
    const eligibleRes = await request.get("/api/danh-gia/du-dieu-kien", {
      headers: authHeaders(custToken),
    });
    expect(eligibleRes.ok()).toBeTruthy();

    // Xem đánh giá công khai của sản phẩm đầu tiên
    const prodRes = await request.get("/api/san-pham?soMoiTrang=1");
    const prodBody = (await prodRes.json()) as { duLieu?: { items?: Array<{ maSanPham: number }> }; items?: Array<{ maSanPham: number }> };
    const sps = prodBody.duLieu?.items ?? prodBody.items ?? [];
    if (sps.length > 0) {
      const revRes = await request.get(`/api/san-pham/${sps[0].maSanPham}/danh-gia`);
      expect([200, 404]).toContain(revRes.status());
    }

    // UC9.2 & UC9.2.1: Admin xem danh sách đánh giá cần kiểm duyệt
    const adminRevRes = await request.get("/api/danh-gia", {
      headers: authHeaders(adminToken),
    });
    expect(adminRevRes.ok()).toBeTruthy();
  });

  test("UC9.3, UC9.3.1, UC9.4, UC9.4.1 - Xem thông báo, đánh dấu đã đọc & quản trị gửi thông báo", async ({
    request,
  }) => {
    const { token: custToken } = await loginApi(request, "customer");
    const { token: adminToken } = await loginApi(request, "admin");

    // UC9.3 & UC9.3.1: Khách hàng xem thông báo & đếm chưa đọc
    const listRes = await request.get("/api/thong-bao", { headers: authHeaders(custToken) });
    expect(listRes.ok()).toBeTruthy();

    const unreadRes = await request.get("/api/thong-bao/chua-doc/dem", {
      headers: authHeaders(custToken),
    });
    expect(unreadRes.ok()).toBeTruthy();

    // Đánh dấu tất cả đã đọc
    const readAllRes = await request.post("/api/thong-bao/da-doc-tat-ca", {
      headers: authHeaders(custToken),
    });
    expect(readAllRes.ok()).toBeTruthy();

    // UC9.4 & UC9.4.1: Admin xem danh sách thông báo gửi lỗi & gửi thông báo thủ công
    const adminListRes = await request.get("/api/thong-bao/gui-loi", {
      headers: authHeaders(adminToken),
    });
    expect(adminListRes.ok()).toBeTruthy();

    const sendRes = await request.post("/api/thong-bao", {
      headers: authHeaders(adminToken),
      data: {
        tieuDe: "Thông báo bảo trì định kỳ Playwright",
        noiDung: "Kiểm thử gửi thông báo phân hệ 9",
        maTaiKhoanNhan: 4,
        loaiSuKien: "HeThong",
      },
    });
    expect(sendRes.ok()).toBeTruthy();
  });
});
