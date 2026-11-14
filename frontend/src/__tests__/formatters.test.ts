import { describe, it, expect } from "vitest";
import { fmt } from "../utils/formatters";
import { statusColors } from "../utils/statusColors";

describe("formatters & statusColors", () => {
  it("định dạng tiền tệ VNĐ chính xác", () => {
    expect(fmt(0)).toBe("0đ");
    expect(fmt(null)).toBe("0đ");
    expect(fmt(undefined)).toBe("0đ");
    expect(fmt(150000)).toBe("150.000đ");
  });

  it("có đầy đủ màu cho các trạng thái đơn chính", () => {
    expect(statusColors["Chờ thanh toán"]).toBeDefined();
    expect(statusColors["Đang thuê"]).toBeDefined();
    expect(statusColors["Hoàn tất"]).toBeDefined();
    expect(statusColors["Khách hủy"]).toBeDefined();
  });
});
