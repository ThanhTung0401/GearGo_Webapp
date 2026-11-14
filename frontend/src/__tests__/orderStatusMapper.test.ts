import { describe, expect, it } from "vitest";
import {
  mapOrderStatusFromBackend,
  mapOrderStatusToBackend,
  mapTransactionStatus,
} from "../services/mappers/orderStatusMapper";

describe("orderStatusMapper", () => {
  it("maps backend order status enum to Vietnamese UI status", () => {
    expect(mapOrderStatusFromBackend("ChoThanhToan")).toBe("Chờ thanh toán");
    expect(mapOrderStatusFromBackend("DangThue")).toBe("Đang thuê");
    expect(mapOrderStatusFromBackend("ChoDoiSoat")).toBe("Chờ đối soát");
    expect(mapOrderStatusFromBackend("HoanTat")).toBe("Hoàn tất");
    expect(mapOrderStatusFromBackend("KhachHuy")).toBe("Khách hủy");
    expect(mapOrderStatusFromBackend("Unknown")).toBe("Chờ thanh toán");
  });

  it("maps Vietnamese UI status back to backend enum", () => {
    expect(mapOrderStatusToBackend("Chờ thanh toán")).toBe("ChoThanhToan");
    expect(mapOrderStatusToBackend("Đang thuê")).toBe("DangThue");
    expect(mapOrderStatusToBackend("Hoàn tất")).toBe("HoanTat");
    expect(mapOrderStatusToBackend("Không tồn tại")).toBeUndefined();
  });

  it("maps backend transaction status", () => {
    expect(mapTransactionStatus("ThanhCong")).toBe("Thành công");
    expect(mapTransactionStatus("ThatBai")).toBe("Thất bại");
    expect(mapTransactionStatus("HetHan")).toBe("Hết hạn");
    expect(mapTransactionStatus(null)).toBe("Đang xử lý");
  });
});
