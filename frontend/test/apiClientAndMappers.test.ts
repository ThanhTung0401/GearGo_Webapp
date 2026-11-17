import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiError, getAuthToken, setAuthToken, TOKEN_KEY } from "../src/services/apiClient";
import { mapDanhMucToCategory, mapSanPhamToProduct, mapThietBiToEquipment } from "../src/services/mappers/catalogEquipmentMapper";
import { mapChinhSachToRentalConfig, mapKhuyenMaiToPromotion } from "../src/services/mappers/policyPromoMapper";
import { mapDanhGiaToReview, mapThongBaoToNotification, mapNhatKyToAuditLog } from "../src/services/mappers/reviewNotifAuditMapper";
import { mapNhaCungCapToSupplier, mapPhieuNhapToImportReceipt } from "../src/services/mappers/supplierImportMapper";
import { getErrorMessage, validateImageFile } from "../src/utils";

describe("apiClient & Mappers Core", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gắn Bearer token vào header và trả về JSON khi gọi GET thành công", async () => {
    setAuthToken("jwt-test-123");
    expect(getAuthToken()).toBe("jwt-test-123");
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe("jwt-test-123");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ id: 1, name: "GearGo" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await apiClient.get<{ id: number; name: string }>("/api/v1/test");
    expect(res.data).toEqual({ id: 1, name: "GearGo" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/test",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-test-123" }),
      })
    );
  });

  it("xử lý 401 tự xóa token và 403 QUYEN_DA_THAY_DOI phát sự kiện đồng bộ quyền", async () => {
    setAuthToken("expired-token");
    const fetch401 = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ maLoi: "UNAUTHORIZED", thongDiep: "Phiên hết hạn" }),
    });
    vi.stubGlobal("fetch", fetch401);

    await expect(apiClient.get("/api/v1/me")).rejects.toThrow(ApiError);
    expect(getAuthToken()).toBeNull();

    const permListener = vi.fn();
    window.addEventListener("geargo:permissions-changed", permListener);
    const fetch403 = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ maLoi: "QUYEN_DA_THAY_DOI", thongDiep: "Quyền đã thay đổi" }),
    });
    vi.stubGlobal("fetch", fetch403);

    await expect(apiClient.post("/api/v1/admin/action", {})).rejects.toThrow("Quyền đã thay đổi");
    expect(permListener).toHaveBeenCalledTimes(1);
    window.removeEventListener("geargo:permissions-changed", permListener);
  });

  it("ánh xạ catalogEquipmentMapper (Danh mục, Sản phẩm, Thiết bị)", () => {
    const cat = mapDanhMucToCategory({
      maDanhMuc: 5,
      tenDanhMuc: "Lều trại",
      thuTuHienThi: 1,
      trangThai: "TamAn",
    });
    expect(cat.id).toBe("5");
    expect(cat.status).toBe("inactive");

    const prod = mapSanPhamToProduct({
      maSanPham: 12,
      maSanPhamHienThi: "SP012",
      tenSanPham: "Lều 4 người",
      maDanhMuc: 5,
      giaThueMoiNgay: 180000,
      mucCocMoiThietBi: 900000,
      giaTriBoiThuong: 1800000,
      trangThaiKinhDoanh: "DangKinhDoanh",
      soLuongKhaDung: 3,
    });
    expect(prod.id).toBe("12");
    expect(prod.pricePerDay).toBe(180000);
    expect(prod.status).toBe("active");

    const eq = mapThietBiToEquipment({
      maThietBi: 99,
      maThietBiHienThi: "TB-099",
      maSanPhamHienTai: 12,
      maSanPhamNguon: 12,
      ngayNhap: "2026-10-01T00:00:00Z",
      tinhTrang: "Tốt",
      trangThaiSuDung: "SanSang",
      soLanThue: 7,
    });
    expect(eq.displayCode).toBe("TB-099");
    expect(eq.equipmentStatus).toBe("Sẵn sàng");
  });

  it("ánh xạ policyPromoMapper, reviewNotifAuditMapper và supplierImportMapper", () => {
    const policy = mapChinhSachToRentalConfig({
      maChinhSach: 2,
      phienBan: 3,
      tenChinhSach: "Chính sách v3",
      hieuLuc: "HienHanh",
      thoiDiemApDung: "2026-10-01T00:00:00Z",
      ngayTao: "2026-10-01T00:00:00Z",
      maNguoiTao: 1,
      noiDung: {
        thoiGianGiuChoPhut: 20,
        heSoTre: 1.5,
        tyLeCocPhanTram: 100,
        hanMucNhanVien: 1500000,
        huyDon: {
          tyLeGiuLaiTu24Den48Gio: 0.25,
          tyLeGiuLaiDuoi24Gio: 0.8,
        },
      },
    });
    expect(policy.cancellationTier1FeePercent).toBe(25);
    expect(policy.overdueMultiplier).toBe(1.5);

    const promo = mapKhuyenMaiToPromotion({
      maKhuyenMai: 7,
      maGiamGia: "CAMP20",
      tenKhuyenMai: "Giảm 20%",
      loaiGiam: "PhanTram",
      giaTriGiam: 20,
      tienThueToiThieu: 200000,
      mucGiamToiDa: 100000,
      phamVi: "ToanBo",
      sanPhamIds: [],
      danhMucIds: [],
      batDau: "2026-01-01T00:00:00Z",
      ketThuc: "2026-12-31T23:59:59Z",
      trangThai: "DangHoatDong",
      gioiHanTongLuot: 50,
      soLuotDaDung: 10,
      soLuotDangGiuConHan: 0,
      soLuotDaGiaiPhong: 0,
    });
    expect(promo.code).toBe("CAMP20");
    expect(promo.discountType).toBe("percentage");
    expect(promo.status).toBe("active");

    const review = mapDanhGiaToReview({
      maDanhGia: 1,
      maChiTietDonThue: 10,
      maDonThue: 20,
      maSanPham: 12,
      tenSanPham: "Lều 4 người",
      maKhachHang: 3,
      tenKhachHang: "Minh",
      soSao: 5,
      noiDung: "Rất tốt",
      danhSachAnh: ["https://img.test/1.jpg"],
      thoiDiemTao: "2026-10-10T10:00:00Z",
      trangThaiHienThi: "HienThi",
    });
    expect(review.rating).toBe(5);
    expect(review.images).toHaveLength(1);

    const notif = mapThongBaoToNotification({
      maThongBao: 8,
      tieuDe: "Đơn đã xác nhận",
      noiDung: "Đơn #20 đã được xác nhận",
      loaiSuKien: "DonHang",
      trangThaiGui: "DaGui",
      daDoc: false,
      thoiDiemTao: "2026-10-10T10:00:00Z",
      maDonThue: 20,
    });
    expect(notif.isRead).toBe(false);
    expect(notif.actionLink).toEqual({
      type: "order",
      targetId: "20",
      label: "Xem đơn #20",
    });

    const audit = mapNhatKyToAuditLog({
      maNhatKy: 15,
      nguoiThucHien: "Admin",
      hanhDong: "CAP_NHAT_CHINH_SACH",
      loaiDoiTuong: "ChinhSach",
      maDoiTuong: "2",
      lyDo: "Cập nhật chính sách",
      thoiDiem: "2026-10-10T10:00:00Z",
    });
    expect(audit.action).toBe("CAP_NHAT_CHINH_SACH");

    const supplier = mapNhaCungCapToSupplier({
      maNhaCungCap: 4,
      maNhaCungCapHienThi: "NCC004",
      tenNhaCungCap: "Outdoor VN",
      soDienThoai: "0909123456",
      email: "contact@outdoor.vn",
      diaChi: "HCM",
      trangThaiHopTac: "DangHopTac",
    });
    expect(supplier.cooperationStatus).toBe("active");

    const receipt = mapPhieuNhapToImportReceipt({
      maPhieuNhap: 11,
      maPhieuHienThi: "PN011",
      maNhaCungCap: 4,
      tenNhaCungCap: "Outdoor VN",
      maNguoiLap: 1,
      ngayLap: "2026-10-05T00:00:00Z",
      trangThai: "DaNhapKho",
      coTheSua: false,
      tongTien: 5000000,
      chiTietPhieuNhaps: [],
    });
    expect(receipt.status).toBe("Đã nhập kho");
  });

  it("getErrorMessage và validateImageFile xử lý lỗi và kiểm tra tệp ảnh hợp lệ", () => {
    expect(getErrorMessage(new Error("Lỗi API"), "Mặc định")).toBe("Lỗi API");
    expect(getErrorMessage("Chuỗi lỗi", "Mặc định")).toBe("Chuỗi lỗi");
    expect(getErrorMessage({}, "Mặc định")).toBe("Mặc định");

    const validImg = new File(["abc"], "camp.jpg", { type: "image/jpeg" });
    expect(() => validateImageFile(validImg, 5)).not.toThrow();

    const invalidType = new File(["abc"], "doc.pdf", { type: "application/pdf" });
    expect(() => validateImageFile(invalidType, 5)).toThrow(/không phải định dạng ảnh/i);
  });
});
