import { useApp } from "../../../context/AppContext";
import { fmt, formatDateTimeVi, Order } from "../../../store";
import Icon from "../../../components/Icon";
import type { OverdueInfoState } from "./returnTypes";

interface ReturnOverdueBannerProps {
  app: ReturnType<typeof useApp>;
  order: Order;
  overdueInfo: OverdueInfoState;
  overdueConflicts: ReturnType<ReturnType<typeof useApp>["getOverdueConflicts"]>;
  affectedOrdersBackend: Array<Record<string, unknown>>;
  contactLogCount: number;
  debtCount: number;
  returnedCount: number;
  returnLoading: boolean;
  returnBusy: boolean;
  onOpenContactModal: () => void;
  onApplyOverdueFee: () => Promise<void>;
}

// Header thông tin đơn đang nhận trả & Banner cảnh báo quá hạn / xung đột đơn kế tiếp (UC4.4)
export function ReturnOverdueBanner({
  app,
  order,
  overdueInfo,
  overdueConflicts,
  affectedOrdersBackend,
  contactLogCount,
  debtCount,
  returnedCount,
  returnLoading,
  returnBusy,
  onOpenContactModal,
  onApplyOverdueFee,
}: ReturnOverdueBannerProps) {
  const totalDelivered = Math.max(order.assignedEquipment.length, debtCount);
  const canApplyOverdueFee = overdueInfo.surcharge > 0;
  return (
    <>
      {/* Header info đơn */}
      <div className="so-order-header">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <div className="so-order-code">{order.displayCode || order.id}</div>
            <div className="so-order-customer">
              {order.customerName} {order.customerPhone ? `· ${order.customerPhone}` : ""}
            </div>
            <div className="so-order-meta">
              Hẹn trả dự kiến:{" "}
              <strong className={`so-overdue-date ${overdueInfo.isOverdue ? "is-overdue" : ""}`}>
                {formatDateTimeVi(order.returnTime)}
              </strong>
            </div>
          </div>
          <div className="so-order-stats">
            <div className="so-order-stat-muted">
              Tổng thiết bị đã giao: <strong>{totalDelivered}</strong>
            </div>
            <div className="so-order-stat-ok">
              Đã trả / xử lý:{" "}
              <strong>
                {app.realApi ? Math.max(0, totalDelivered - debtCount) : returnedCount}
              </strong>
            </div>
            <div className={`so-order-stat-debt ${debtCount > 0 ? "is-debt" : ""}`}>
              Còn nợ: {debtCount} chiếc
            </div>
          </div>
        </div>
        {returnLoading && (
          <div className="so-loading-inline">
            Đang đồng bộ danh sách thiết bị còn nợ và phiếu nhận trả từ máy chủ...
          </div>
        )}
      </div>

      {/* Banner Cảnh báo quá hạn & Đơn kế tiếp bị ảnh hưởng */}
      {overdueInfo.isOverdue && (
        <div className="so-overdue-banner">
          <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="so-overdue-banner-title">
                  <span className="icon-label">
                    <Icon name="alert-circle" size={16} />
                    ĐƠN THUÊ QUÁ HẠN: Trễ {overdueInfo.overdueDays} ngày
                  </span>
                </span>
                {(overdueConflicts.length > 0 || affectedOrdersBackend.length > 0) && (
                  <span className="so-overdue-badge-impact">
                    ẢNH HƯỞNG {app.realApi ? affectedOrdersBackend.length : overdueConflicts.length} ĐƠN SAU
                  </span>
                )}
              </div>
              <div className="so-overdue-banner-sub">
                Phạt trễ 150% đơn giá ngày = <strong>+{fmt(overdueInfo.surcharge)}</strong>.
                {!canApplyOverdueFee && (
                  <span className="ml-1 text-rose-700">(Đơn chưa có thiết bị nợ quá hạn hợp lệ để lập phí)</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <button onClick={onOpenContactModal} className="so-btn-blue-sm">
                Nhật ký gọi ({contactLogCount})
              </button>
              <button
                disabled={returnBusy || !canApplyOverdueFee}
                onClick={() => void onApplyOverdueFee()}
                title={!canApplyOverdueFee ? "Số tiền phạt dự kiến phải lớn hơn 0đ" : "Lập phụ phí trễ hạn"}
                className="so-btn-danger-action disabled:opacity-50"
              >
                + Lập phụ phí trễ
              </button>
            </div>
          </div>

          {overdueConflicts.length > 0 && (
            <div className="so-conflict-box">
              <div className="so-conflict-title">CẢNH BÁO KẸT THIẾT BỊ ĐƠN TIẾP THEO:</div>
              {overdueConflicts.map((c, idx) => (
                <div key={idx} className="so-conflict-row">
                  • Thiết bị <strong className="so-conflict-equip">{c.equipmentId}</strong> đang bị trễ cho đơn kế tiếp:{" "}
                  <strong>{c.nextOrderId}</strong> ({c.nextCustomerName} - Hẹn nhận: {c.nextPickupTime}).
                  {c.availableSubstitutes.length > 0 ? (
                    <span className="so-conflict-sub-ok">
                      Gợi ý mã thay thế: <strong>{c.availableSubstitutes.slice(0, 3).join(", ")}</strong>
                    </span>
                  ) : (
                    <span className="so-conflict-sub-bad">(Kho không còn mã thay thế)</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {app.realApi && affectedOrdersBackend.length > 0 && (
            <div className="so-conflict-box">
              <div className="so-conflict-title">ĐƠN ĐẶT KẾ TIẾP BỊ ẢNH HƯỞNG BỞI THIẾT BỊ TRỄ HẠN:</div>
              {affectedOrdersBackend.map((item, idx) => (
                <div key={idx} className="so-conflict-row">
                  • {String(item.maDonHienThi || item.maDonThue || `Đơn #${idx + 1}`)} —{" "}
                  {String(item.tenSanPham || item.tenKhachHang || "Cần điều phối thiết bị dự phòng")}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
