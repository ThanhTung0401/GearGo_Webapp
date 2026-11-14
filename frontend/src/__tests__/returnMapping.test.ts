import { describe, expect, it } from "vitest";
import { mapReturnCondToBackend, mapReturnCondToSurchargeType } from "../views/staff/returnMapping";

describe("returnMapping", () => {
  it("maps return condition to backend ketLuan enum", () => {
    expect(mapReturnCondToBackend("Bình thường")).toBe("Dat");
    expect(mapReturnCondToBackend("Cần vệ sinh")).toBe("CanVeSinh");
    expect(mapReturnCondToBackend("Hỏng nhẹ")).toBe("HongNhe");
    expect(mapReturnCondToBackend("Hỏng nặng")).toBe("HongNang");
    expect(mapReturnCondToBackend("Thiếu phụ kiện")).toBe("ThieuPhuKien");
    expect(mapReturnCondToBackend("Mất thiết bị")).toBe("MatThietBi");
  });

  it("maps return condition to backend loaiPhi surcharge type", () => {
    expect(mapReturnCondToSurchargeType("Cần vệ sinh")).toBe("VeSinhDacBiet");
    expect(mapReturnCondToSurchargeType("Thiếu phụ kiện")).toBe("MatPhuKien");
    expect(mapReturnCondToSurchargeType("Mất thiết bị")).toBe("MatThietBi");
    expect(mapReturnCondToSurchargeType("Hỏng nhẹ")).toBe("HuHong");
    expect(mapReturnCondToSurchargeType("Hỏng nặng")).toBe("HuHong");
  });
});
