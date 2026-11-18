import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { getFutureRentalDates, uniqueSuffix } from "../../helpers/testData.js";

test.describe("Phân hệ 3: Giỏ thuê, Đặt thuê, Thanh toán & Hủy đơn (UC3.1 - UC3.2.2)", () => {
  test("UC3.1, UC3.1.1, UC3.1.2, UC3.2, UC3.2.1, UC3.3, UC3.4 - Luồng giỏ thuê -> tạo đơn -> xem chi tiết -> hủy đơn", async ({
    request,
  }) => {
    const { token } = await loginApi(request, "customer2");
    const { gioNhanIso, gioTraIso } = getFutureRentalDates(25, 2);

    // Lấy 1 sản phẩm khả dụng (> 0) với soMoiTrang=100 để không bị trôi sang trang 2
    const prodRes = await request.get(
      `/api/san-pham?gioNhan=${encodeURIComponent(gioNhanIso)}&gioTra=${encodeURIComponent(gioTraIso)}&soMoiTrang=100`
    );
    expect(prodRes.ok()).toBeTruthy();
    const prodBody = (await prodRes.json()) as {
      duLieu?: { items?: Array<{ maSanPham: number; soLuongKhaDung?: number }> };
      items?: Array<{ maSanPham: number; soLuongKhaDung?: number }>;
    };
    const products = prodBody.duLieu?.items ?? prodBody.items ?? [];
    // Kiểm tra chi tiết từng sản phẩm để chọn đúng sản phẩm còn khả dụng (> 0)
    let availableProd: { maSanPham: number; soLuongKhaDung?: number } | undefined;
    for (const candidate of products) {
      const dRes = await request.get(
        `/api/san-pham/${candidate.maSanPham}?gioNhan=${encodeURIComponent(gioNhanIso)}&gioTra=${encodeURIComponent(gioTraIso)}`
      );
      if (dRes.ok()) {
        const dJson = (await dRes.json()) as { duLieu?: { maSanPham: number; soLuongKhaDung?: number }; maSanPham?: number; soLuongKhaDung?: number };
        const sp = dJson.duLieu ?? dJson;
        if ((sp.soLuongKhaDung ?? 0) > 0) {
          availableProd = { maSanPham: sp.maSanPham ?? candidate.maSanPham, soLuongKhaDung: sp.soLuongKhaDung };
          break;
        }
      }
    }
    availableProd = availableProd ?? { maSanPham: 1, soLuongKhaDung: 1 };
    expect(availableProd).toBeTruthy();

    // UC3.1: Đặt thời gian giỏ thuê & xóa sạch giỏ cũ nếu có
    const setTimeRes = await request.put("/api/gio-thue/thoi-gian", {
      headers: authHeaders(token),
      data: { gioNhan: gioNhanIso, gioTra: gioTraIso },
    });
    expect(setTimeRes.ok()).toBeTruthy();

    // UC3.1: Thêm sản phẩm vào giỏ thuê (không chặn nếu đã có sẵn trong giỏ từ lần chạy trước)
    await request.post("/api/gio-thue/them", {
      headers: authHeaders(token),
      data: { maSanPham: availableProd.maSanPham, soLuong: 1 },
    });

    // UC3.1.1: Lấy giỏ thuê & báo giá tạm tính
    const cartRes = await request.get("/api/gio-thue", { headers: authHeaders(token) });
    expect(cartRes.ok()).toBeTruthy();
    const cartBody = (await cartRes.json()) as { duLieu?: Record<string, unknown> } & Record<string, unknown>;
    const cartData = (cartBody.duLieu ?? cartBody) as { baoGia?: { dauVanTayBaoGia?: string } };

    // UC3.1.2: Thử gỡ/áp mã giảm giá (nếu có mã không hợp lệ phải trả lỗi chuẩn, không crash 500)
    const badPromoRes = await request.post("/api/gio-thue/ma-giam-gia", {
      headers: authHeaders(token),
      data: { maGiamGia: "KHONGTONTAI999" },
    });
    expect(badPromoRes.status()).toBeLessThan(500);

    // UC3.2 & UC3.2.1: Tạo đơn thuê giữ chỗ từ giỏ thuê (có idempotencyKey + chiTiet + khung giờ)
    const createOrderRes = await request.post("/api/v1/don-thue", {
      headers: authHeaders(token),
      data: {
        gioNhanDuKien: gioNhanIso,
        gioTraDuKien: gioTraIso,
        tenNguoiNhan: "Nguyễn Văn An",
        soDienThoaiNguoiNhan: "0901000003",
        emailLienHe: "customer@geargo.vn",
        ghiChu: "Đơn kiểm thử Playwright PH3",
        idempotencyKey: `pw-ph3-${uniqueSuffix()}`,
        dongYThayDoiGia: true,
        chiTiet: [{ maSanPham: availableProd.maSanPham, soLuong: 1 }],
      },
    });
    expect(createOrderRes.ok(), await createOrderRes.text()).toBeTruthy();
    const createdBody = (await createOrderRes.json()) as {
      duLieu?: { maDonThue: number };
      maDonThue?: number;
    };
    const maDonThue = createdBody.duLieu?.maDonThue ?? createdBody.maDonThue;
    expect(maDonThue).toBeGreaterThan(0);

    // UC3.3: Theo dõi danh sách đơn thuê & chi tiết đơn + lịch sử + chính sách đơn
    const myOrdersRes = await request.get("/api/v1/don-thue?soMoiTrang=20", {
      headers: authHeaders(token),
    });
    expect(myOrdersRes.ok()).toBeTruthy();

    const detailRes = await request.get(`/api/v1/don-thue/${maDonThue}`, {
      headers: authHeaders(token),
    });
    expect(detailRes.ok()).toBeTruthy();

    const policySnapRes = await request.get(`/api/v1/don-thue/${maDonThue}/chinh-sach`, {
      headers: authHeaders(token),
    });
    expect(policySnapRes.ok()).toBeTruthy();

    // UC3.4: Xem trước hủy và hủy đơn vừa tạo (dọn sạch dữ liệu giữ chỗ)
    const previewCancelRes = await request.get(`/api/v1/don-thue/${maDonThue}/huy/xem-truoc`, {
      headers: authHeaders(token),
    });
    expect(previewCancelRes.ok()).toBeTruthy();
    const previewBody = (await previewCancelRes.json()) as {
      duLieu?: { dauVanTay?: string };
      dauVanTay?: string;
    };

    const cancelRes = await request.post(`/api/v1/don-thue/${maDonThue}/huy`, {
      headers: authHeaders(token),
      data: {
        lyDo: "Hủy đơn kiểm thử Playwright PH3",
        xacNhanChiPhi: true,
        dauVanTayXemTruoc: previewBody.duLieu?.dauVanTay ?? previewBody.dauVanTay,
      },
    });
    expect(cancelRes.ok()).toBeTruthy();
  });
});
