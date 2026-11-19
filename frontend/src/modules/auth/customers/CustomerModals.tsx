import Icon from "../../../components/Icon";
import { fmt, statusColors, type CustomerAccount, type Order } from "../../../store";

interface CustomerModalsProps {
  selectedCustomer: CustomerAccount | null;
  customerOrders: Order[];
  onCloseOrders: () => void;
  lockModalCustomer: CustomerAccount | null;
  lockReason: string;
  setLockReason: (v: string) => void;
  lockError: string;
  actionLoading: boolean;
  onCloseLock: () => void;
  onConfirmLock: () => void;
}

/**
 * Hai modal của quản trị khách hàng:
 * 1. Tra cứu lịch sử đơn thuê và tiền cọc của khách.
 * 2. Xác nhận khóa tài khoản kèm lý do.
 */
export function CustomerModals({
  selectedCustomer,
  customerOrders,
  onCloseOrders,
  lockModalCustomer,
  lockReason,
  setLockReason,
  lockError,
  actionLoading,
  onCloseLock,
  onConfirmLock,
}: CustomerModalsProps) {
  return (
    <>
      {/* Modal Lịch sử Đơn thuê của khách */}
      {selectedCustomer && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-700">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Lịch sử thuê đồ: {selectedCustomer.name}</h3>
                <p className="text-xs text-gray-500 mt-1">SĐT: {selectedCustomer.phone} · Email: {selectedCustomer.email}</p>
              </div>
              <button onClick={onCloseOrders} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {customerOrders.length === 0 ? (
                <div className="adm-table-empty">Khách hàng chưa có đơn thuê nào trên hệ thống.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {customerOrders.map((o) => {
                    const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
                    return (
                      <div key={o.id} className="adm-card--cream">
                        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                          <div>
                            <strong className="adm-cell-code text-[0.9rem]">{o.id}</strong>
                            <span className="adm-hint-text ml-2">Tạo lúc: {o.createdAt}</span>
                          </div>
                          {/* Huy hiệu trạng thái đơn trong modal lịch sử lấy màu động theo statusColors */}
                          <span className="adm-pill" style={{ background: sc.bg, color: sc.text }}>
                            {o.status}
                          </span>
                        </div>
                        <div className="text-[0.8rem] text-[#4B5563] mb-1.5">
                          {o.items.map((it) => `${it.productName} (SL: ${it.qty})`).join(", ")}
                        </div>
                        <div className="flex justify-between items-center text-xs pt-2 border-t border-dashed border-bone flex-wrap gap-2">
                          <span>Tiền thuê: <strong>{fmt(o.rental - o.discount)}</strong></span>
                          <span>Tiền cọc: <strong className="text-[#B45309]">{fmt(o.depositTotal)}</strong></span>
                          <span>Thời gian: {o.pickupTime} → {o.returnTime}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Khóa Tài Khoản Khách */}
      {lockModalCustomer && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-sm">
            <div className="modal-header">
              <h3 className="modal-title">Khóa tài khoản {lockModalCustomer.name}</h3>
              <button onClick={onCloseLock} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {lockError && (
                <div role="alert" className="adm-alert adm-alert--compact is-error">
                  <Icon name="alert-circle" size={15} />
                  <span>{lockError}</span>
                </div>
              )}
              <p className="text-[0.85rem] text-[#4B5563] mb-3">
                Khi bị khóa, khách hàng sẽ không thể đặt thuê thiết bị mới. Vui lòng nhập lý do khóa tài khoản:
              </p>
              <textarea
                rows={3}
                placeholder="VD: Không hoàn trả đồ đúng hạn, chưa thanh toán phụ phí bồi thường..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="adm-field adm-field--compact mb-3.5"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={onCloseLock}
                  className="btn btn-secondary btn-md adm-btn-flex"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={onConfirmLock}
                  className="btn btn-md adm-btn-flex adm-btn-danger-solid"
                >
                  {actionLoading ? "Đang xử lý..." : "Xác nhận khóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
