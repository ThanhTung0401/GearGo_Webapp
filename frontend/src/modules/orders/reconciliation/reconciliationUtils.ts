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

  const isOrderCompleted = order.status === "Hoàn tất" || doiSoatBackend?.trangThai === "DaChot";

  // 1. Kiểm tra tiền điều kiện & dòng sự kiện phụ 1.1 (bỏ qua nếu đơn đã chốt/hoàn tất để tránh hiện hộp chặn đỏ)
  const debtEquipment = order.assignedEquipment.filter((ae) => !ae.returnedAt);
  const pendingSurcharges = effectiveSurcharges.filter((s) => s.status === "Chờ duyệt");
  const disputedSurcharges = effectiveSurcharges.filter((s) => s.status === "Tranh chấp");
  const isBlocked =
    !isOrderCompleted &&
    (realApi && previewBackend
      ? !previewBackend.duDieuKien || pendingSurcharges.length > 0 || disputedSurcharges.length > 0
      : debtEquipment.length > 0 || pendingSurcharges.length > 0 || disputedSurcharges.length > 0);

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
  const backendCollected = realApi ? Number(doiSoatBackend?.daThuThemThanhCong ?? 0) : 0;
  const backendRefunded = realApi ? Number(doiSoatBackend?.daHoanThanhCong ?? 0) : 0;
  const effectivePriorCollect = realApi ? Math.max(priorCollect, backendCollected) : priorCollect;
  const effectivePriorRefund = realApi ? Math.max(priorRefund, backendRefunded) : priorRefund;
  const priorSettled = effectivePriorCollect - effectivePriorRefund;

  const mockNetDifference = depositCollected - totalApprovedSurcharges + priorSettled;
  const rawRefund = realApi
    ? Math.max(0, Number(doiSoatBackend?.soTienCanHoan ?? previewBackend?.soTienCanHoan ?? Math.max(0, mockNetDifference)) - backendRefunded)
    : Math.max(0, mockNetDifference);
  const rawExtra = realApi
    ? Math.max(0, Number(doiSoatBackend?.soTienCanThuThem ?? previewBackend?.soTienCanThuThem ?? Math.max(0, -mockNetDifference)) - backendCollected)
    : Math.max(0, -mockNetDifference);
  // Đơn đã chốt khóa đối soát (Hoàn tất) không còn nghĩa vụ tiền tồn đọng trên bảng đối soát gốc
  const refundAmount = isOrderCompleted ? 0 : rawRefund;
  const extraAmount = isOrderCompleted ? 0 : rawExtra;
  const netDifference = refundAmount > 0 ? refundAmount : -extraAmount;
  const isBalanced = refundAmount === 0 && extraAmount === 0;

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
    priorRefund: effectivePriorRefund,
    priorCollect: effectivePriorCollect,
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
