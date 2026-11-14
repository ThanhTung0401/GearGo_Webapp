import type { ReturnReceiptItem } from "../../store";

export type StaffTab = "overview" | "orders" | "handover" | "return" | "equipment" | "reports";

/** Ánh xạ tên tình trạng nhận trả UI sang enum backend ketLuan. */
export function mapReturnCondToBackend(cond: ReturnReceiptItem["condition"]): string {
  switch (cond) {
    case "Bình thường":
      return "Dat";
    case "Cần vệ sinh":
      return "CanVeSinh";
    case "Hỏng nhẹ":
      return "HongNhe";
    case "Hỏng nặng":
      return "HongNang";
    case "Thiếu phụ kiện":
      return "ThieuPhuKien";
    case "Mất thiết bị":
      return "MatThietBi";
    default:
      return "Dat";
  }
}

/** Ánh xạ tên tình trạng nhận trả sang loại phụ phí loaiPhi. */
export function mapReturnCondToSurchargeType(cond: ReturnReceiptItem["condition"]): string {
  switch (cond) {
    case "Cần vệ sinh":
      return "VeSinhDacBiet";
    case "Thiếu phụ kiện":
      return "MatPhuKien";
    case "Mất thiết bị":
      return "MatThietBi";
    case "Hỏng nhẹ":
    case "Hỏng nặng":
    default:
      return "HuHong";
  }
}
