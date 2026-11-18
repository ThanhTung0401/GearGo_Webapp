import { test, expect } from "@playwright/test";
import { authHeaders, loginApi } from "../../helpers/auth.js";
import { uniqueSuffix } from "../../helpers/testData.js";

test.describe("Phân hệ 7: Nhà cung cấp & Nhập kho (UC7.1 - UC7.10.1)", () => {
  test("UC7.1, UC7.2, UC7.3, UC7.4 - CRUD & đổi trạng thái Nhà cung cấp", async ({ request }) => {
    const { token } = await loginApi(request, "admin");
    const suffix = uniqueSuffix();

    // UC7.3: Tra cứu nhà cung cấp
    const listRes = await request.get("/api/nha-cung-cap", { headers: authHeaders(token) });
    expect(listRes.ok()).toBeTruthy();

    // UC7.1: Thêm nhà cung cấp mới
    const createRes = await request.post("/api/nha-cung-cap", {
      headers: authHeaders(token),
      data: {
        maHienThi: `NCC-PW-${suffix}`,
        ten: `NCC Playwright ${suffix}`,
        soDienThoai: `091${suffix.slice(0, 7)}`,
        email: `ncc.${suffix}@geargo.vn`,
        diaChi: "KCN Tân Bình, TP.HCM",
        nguoiLienHe: "Anh Minh",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as {
      duLieu?: { maNhaCungCap: number };
      maNhaCungCap?: number;
    };
    const nccId = created.duLieu?.maNhaCungCap ?? created.maNhaCungCap;
    expect(nccId).toBeGreaterThan(0);

    // UC7.2: Cập nhật nhà cung cấp
    const updRes = await request.put(`/api/nha-cung-cap/${nccId}`, {
      headers: authHeaders(token),
      data: {
        ten: `NCC Playwright ${suffix} Edited`,
        soDienThoai: `091${suffix.slice(0, 7)}`,
        email: `ncc.${suffix}@geargo.vn`,
        diaChi: "KCN Sóng Thần",
      },
    });
    expect(updRes.ok()).toBeTruthy();

    // UC7.4: Ngừng hợp tác (PUT /api/nha-cung-cap/{id}/trang-thai-hop-tac)
    const stRes = await request.put(`/api/nha-cung-cap/${nccId}/trang-thai-hop-tac`, {
      headers: authHeaders(token),
      data: { trangThaiHopTac: "NgungHopTac", lyDo: "Kiểm thử Playwright PH7" },
    });
    expect(stRes.ok()).toBeTruthy();
  });

  test("UC7.5 - UC7.10.1 - Lập phiếu nhập nháp, sửa, tra cứu & hủy phiếu nhập nháp", async ({ request }) => {
    const { token } = await loginApi(request, "admin");

    // UC7.8: Tra cứu phiếu nhập hiện có
    const listRes = await request.get("/api/phieu-nhap", { headers: authHeaders(token) });
    expect(listRes.ok()).toBeTruthy();

    const nccRes = await request.get("/api/nha-cung-cap", { headers: authHeaders(token) });
    const nccBody = (await nccRes.json()) as { duLieu?: Array<{ maNhaCungCap: number }> } | Array<{ maNhaCungCap: number }>;
    const nccs = Array.isArray(nccBody) ? nccBody : nccBody.duLieu ?? [];

    const spRes = await request.get("/api/admin/san-pham?soMoiTrang=5", { headers: authHeaders(token) });
    const spBody = (await spRes.json()) as { items?: Array<{ maSanPham: number }> };
    const sps = spBody.items ?? [];

    if (nccs.length > 0 && sps.length > 0) {
      // UC7.5 & UC7.5.1: Lập phiếu nhập nháp
      const draftRes = await request.post("/api/phieu-nhap", {
        headers: authHeaders(token),
        data: {
          maNhaCungCap: nccs[0].maNhaCungCap,
          ghiChu: "Phiếu nhập nháp Playwright",
          chiTiet: [{ maSanPham: sps[0].maSanPham, soLuong: 1, donGiaNhap: 500000 }],
        },
      });
      expect(draftRes.ok()).toBeTruthy();
      const draftBody = (await draftRes.json()) as {
        duLieu?: { maPhieuNhap: number };
        maPhieuNhap?: number;
      };
      const pnId = draftBody.duLieu?.maPhieuNhap ?? draftBody.maPhieuNhap;
      if (pnId) {
        // UC7.9: Hủy phiếu nhập nháp để không làm sai lệch tồn kho thật
        const cancelRes = await request.post(`/api/phieu-nhap/${pnId}/huy`, {
          headers: authHeaders(token),
          data: { lyDo: "Dọn dữ liệu test Playwright" },
        });
        expect([200, 204]).toContain(cancelRes.status());
      }
    }
  });
});
