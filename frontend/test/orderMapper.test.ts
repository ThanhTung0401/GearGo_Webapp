import { describe, it, expect } from "vitest";
import {
  mapOrderStatusFromBackend,
  mapOrderStatusToBackend,
  mapPhuPhiToSurcharge,
  mapDonTomTatToOrder,
} from "../src/services/mappers/orderMapper";

describe("orderMapper", () => {
  it("ánh xạ 2 chiều trạng thái đơn hàng chính xác", () => {
    const pairs: Array<[string, ReturnType<typeof mapOrderStatusFromBackend>]> = [
      ["ChoThanhToan", "Chờ thanh toán"],
      ["DaXacNhan", "Đã xác nhận"],
      ["DangChuanBi", "Đang chuẩn bị"],
      ["SanSangNhan", "Sẵn sàng nhận"],
      ["DangThue", "Đang thuê"],
      ["DaNhanTra", "Đã nhận trả"],
      ["ChoDoiSoat", "Chờ đối soát"],
      ["HoanTat", "Hoàn tất"],
      ["HetHan", "Hết hạn"],
      ["KhachHuy", "Khách hủy"],
      ["CuaHangHuy", "Cửa hàng hủy"],
    ];

    for (const [backend, frontend] of pairs) {
      expect(mapOrderStatusFromBackend(backend)).toBe(frontend);
      expect(mapOrderStatusToBackend(frontend)).toBe(backend);
    }

    expect(mapOrderStatusFromBackend(undefined)).toBe("Chờ thanh toán");
    expect(mapOrderStatusToBackend("Không hợp lệ")).toBeUndefined();
  });

  it("ánh xạ phụ phí và trạng thái tranh chấp", () => {
    const disputed = mapPhuPhiToSurcharge({
      maPhuPhi: 10,
      loaiPhi: "HuHong",
      soTien: 250000,
      lyDo: "Gãy gọng lều",
      trangThaiDuyet: "ChoDuyet",
      trangThaiTranhChap: "DangTranhChap",
    });

    expect(disputed.id).toBe("10");
    expect(disputed.type).toBe("Hư hỏng nhẹ/nặng");
    expect(disputed.amount).toBe(250000);
    expect(disputed.status).toBe("Tranh chấp");
    expect(disputed.isDisputed).toBe(true);
  });

  it("ánh xạ đơn tóm tắt sang Order frontend", () => {
    const order = mapDonTomTatToOrder(
      {
        maDonThue: 5,
        maDonHienThi: "GG-005",
        trangThai: "DangThue",
        gioNhanDuKien: "2026-05-01T08:00:00Z",
        gioTraDuKien: "2026-05-03T20:00:00Z",
        ngayDat: "2026-04-30T10:00:00Z",
        tongTienThue: 400000,
        tongTienCoc: 1000000,
        daThu: 0,
        nhan: [],
      },
      "Nguyễn Văn A",
      "CUST-1"
    );

    expect(order.id).toBe("5");
    expect(order.displayCode).toBe("GG-005");
    expect(order.backendId).toBe(5);
    expect(order.status).toBe("Đang thuê");
    expect(order.customerName).toBe("Nguyễn Văn A");
    expect(order.total).toBe(1400000);
  });
});
