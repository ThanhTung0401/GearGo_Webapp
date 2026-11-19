import type { DoiSoatBackend, XemTruocDoiSoatBackend } from "../../../services/api";
import type { Order, Surcharge } from "../../../store";

/**
 * Tính toán toàn bộ chỉ số tiền điều kiện, cọc, phụ phí đã duyệt và chênh lệch
 * quyết toán cho bảng đối soát cọc (UC5.4).
 */
export function computeReconciliationMetrics(
  order: Order,
  realApi: boolean,
  previewBackend: XemTruocDoiSoatBackend | null,
  doiSoatBackend: DoiSoatBackend | null,
  surchargesBackend: Surcharge[] | null
) {
  const effectiveSurcharges = realApi && surchargesBackend ? surchargesBackend : order.surcharges;

  // 1. Kiểm tra tiền điều kiện & dòng sự kiện phụ 1.1
  const debtEquipment = order.assignedEquipment.filter((ae) => !ae.returnedAt);
  const pendingSurcharges = effectiveSurcharges.filter((s) => s.status === "Chờ duyệt");
  const disputedSurcharges = effectiveSurcharges.filter((s) => s.status === "Tranh chấp");
  const isBlocked =
    realApi && previewBackend
      ? !previewBackend.duDieuKien || pendingSurcharges.length > 0 || disputedSurcharges.length > 0
      : debtEquipment.length > 0 || pendingSurcharges.length > 0 || disputedSurcharges.length > 0;

  // 2. Tính toán căn cứ bảng đối soát (ưu tiên số liệu máy chủ khi bật realApi)
  const depositCollected = realApi
    ? Number(doiSoatBackend?.tienCocDuocDoiSoat ?? previewBackend?.tienCocDuocDoiSoat ?? order.depositTotal)
    : order.depositTotal;

  const approvedSurcharges = effectiveSurcharges.filter((s) => s.status === "Đã duyệt");
  const totalApprovedSurcharges = realApi
    ? Number(
        doiSoatBackend?.tongPhuPhiDuocDuyet ??
          previewBackend?.tongPhuPhiDuocDuyet ??
          approvedSurcharges.reduce((sum, s) => sum + s.amount, 0)
      )
    : approvedSurcharges.reduce((sum, s) => sum + s.amount, 0);

  const priorRefund = (order.transactions || [])
    .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const priorCollect = (order.transactions || [])
    .filter((t) => t.type === "Thu thêm" && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const priorSettled = priorCollect - priorRefund;

  const mockNetDifference = depositCollected - totalApprovedSurcharges - priorSettled;
  const refundAmount = realApi
    ? Number(doiSoatBackend?.soTienCanHoan ?? previewBackend?.soTienCanHoan ?? Math.max(0, mockNetDifference))
    : Math.max(0, mockNetDifference);
  const extraAmount = realApi
    ? Number(doiSoatBackend?.soTienCanThuThem ?? previewBackend?.soTienCanThuThem ?? Math.max(0, -mockNetDifference))
    : Math.max(0, -mockNetDifference);
  const netDifference = refundAmount > 0 ? refundAmount : -extraAmount;
  const isBalanced = refundAmount === 0 && extraAmount === 0;

  const isOrderCompleted = order.status === "Hoàn tất" || doiSoatBackend?.trangThai === "DaChot";
  const isConfirmed =
    Boolean(order.reconciliation?.confirmedAt) ||
    doiSoatBackend?.trangThai === "DaXacNhan" ||
    doiSoatBackend?.trangThai === "DangXuLyTien" ||
    isOrderCompleted;

  const initialTransaction = (order.transactions || []).find((t) => t.type === "Thanh toán ban đầu");
  const netStateClass = isBalanced ? "" : netDifference > 0 ? "is-refund" : "is-collect";

  return {
    debtEquipment,
    pendingSurcharges,
    disputedSurcharges,
    isBlocked,
    depositCollected,
    approvedSurcharges,
    totalApprovedSurcharges,
    priorRefund,
    priorCollect,
    priorSettled,
    refundAmount,
    extraAmount,
    netDifference,
    isBalanced,
    isOrderCompleted,
    isConfirmed,
    initialTransaction,
    netStateClass,
  };
}
