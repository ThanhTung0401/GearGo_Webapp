import type { DoiSoatBackend, HoanTienTheoDonBackend } from "../../../services/api";
import { fmt, type Order } from "../../../store";

interface ReconciliationPaymentPanelProps {
  order: Order;
  realApi: boolean;
  userRole: "staff" | "admin";
  isOrderCompleted: boolean;
  isConfirmed: boolean;
  isBlocked: boolean;
  isBalanced: boolean;
  reconBusy: boolean;
  extraAmount: number;
  refundAmount: number;
  doiSoatBackend: DoiSoatBackend | null;
  refundsBackend: HoanTienTheoDonBackend | null;
  onConfirmStep4: () => void;
  onFinalizeBalanced: () => void;
  onOpenCollect: () => void;
  onOpenRefund: () => void;
  onLockReconciliation: () => void;
  onProcessRefund: (maHoanTien: number, maYeuCau?: string | null) => void;
  onCheckRefund: (maHoanTien: number, maYeuCau?: string | null) => void;
  onSimulateFailedTx: () => void;
  onOpenPrint: () => void;
  onOpenAdjustment: () => void;
}

/**
 * Khối thực hiện nghĩa vụ tiền (Bước 4–7) và kết quả chốt khóa đối soát (Dòng 7 UC5.4).
 */
export function ReconciliationPaymentPanel({
  order,
  realApi,
  userRole,
  isOrderCompleted,
  isConfirmed,
  isBlocked,
  isBalanced,
  reconBusy,
  extraAmount,
  refundAmount,
  doiSoatBackend,
  refundsBackend,
  onConfirmStep4,
  onFinalizeBalanced,
  onOpenCollect,
  onOpenRefund,
  onLockReconciliation,
  onProcessRefund,
  onCheckRefund,
  onSimulateFailedTx,
  onOpenPrint,
  onOpenAdjustment,
}: ReconciliationPaymentPanelProps) {
  if (isOrderCompleted) {
    return (
      <div className="recon-completed-box">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="recon-completed-icon">🎉</span>
              <strong className="recon-completed-title">
                Đơn hàng Đã Khóa Đối Soát & Hoàn Tất Thành Công (Dòng 7)
              </strong>
            </div>
            <div className="recon-completed-meta">
              Thời điểm khóa: <strong>{order.reconciledAt}</strong> · Người chốt: <strong>{order.reconciliation?.lockedBy || "Nhân viên"}</strong>
            </div>
            <div className="recon-completed-desc">
              Mọi nghĩa vụ thiết bị và tiền cọc đã được quyết toán triệt để. Dữ liệu đã khóa để phục vụ 4 trụ cột báo cáo tài chính.
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenPrint}
              className="recon-btn-print-a4"
            >
              🖨️ In Biên Bản Đối Soát A4
            </button>
            {userRole === "admin" && (
              <button
                type="button"
                onClick={onOpenAdjustment}
                className="recon-btn-adjust"
                title="Sửa sai tài chính sau khi đã đối soát có liên kết chứng từ gốc (UC5.7)"
              >
                📑 Lập điều chỉnh sau chốt (UC5.7)
              </button>
            )}
          </div>
        </div>

        {/* Lịch sử giao dịch tiền của đơn */}
        <div className="recon-tx-history">
          <strong className="recon-tx-history-title">
            Lịch sử chứng từ tiền liên quan ({order.transactions?.length || 0} giao dịch):
          </strong>
          <div className="flex flex-col gap-1.5 mt-2">
            {order.transactions?.map((tx) => {
              // Phân loại màu số tiền theo loại giao dịch (hoàn cọc / thu thêm / mặc định)
              const txAmountClass =
                tx.type === "Hoàn cọc" ? "is-refund" : tx.type === "Thu thêm" ? "is-collect" : "";
              return (
                <div key={tx.id} className="recon-tx-row">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="recon-mono-forest-bold">{tx.id}</span>
                    <span className="recon-tx-type">{tx.type}</span>
                    <span className="recon-tx-note">({tx.note})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`recon-tx-amount ${txAmountClass}`}>
                      {fmt(tx.amount)}
                    </span>
                    <span className={`recon-tx-status-pill ${tx.status === "Thành công" ? "is-success" : ""}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recon-action-panel">
      {/* Trạng thái xác nhận bảng đối soát (Bước 4) */}
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div>
          <strong className="recon-action-heading">
            Quy trình chốt đối soát & tất toán đơn:
          </strong>
          {isConfirmed ? (
            <div className="recon-status-confirmed">
              ✓ Đã xác nhận bảng đối soát{" "}
              {doiSoatBackend?.thoiDiemLap || order.reconciliation?.confirmedAt
                ? `lúc ${doiSoatBackend?.thoiDiemLap || order.reconciliation?.confirmedAt}`
                : ""}{" "}
              {doiSoatBackend?.nguoiLap || order.reconciliation?.confirmedBy
                ? `bởi ${doiSoatBackend?.nguoiLap || order.reconciliation?.confirmedBy}`
                : ""}
              . (Sẵn sàng bước quyết toán tiền / khóa đối soát)
            </div>
          ) : (
            <div className="recon-status-pending">
              Bước 4: Xác nhận căn cứ số liệu trước khi tiến hành giao dịch tiền.
            </div>
          )}
        </div>

        {!isConfirmed && (
          <button
            type="button"
            disabled={isBlocked || reconBusy}
            onClick={onConfirmStep4}
            className={`recon-confirm-btn ${isBlocked || reconBusy ? "is-disabled" : ""}`}
          >
            {reconBusy ? "Đang xác nhận..." : "Xác nhận bảng đối soát (Bước 4)"}
          </button>
        )}
      </div>

      {/* Chi tiết các lệnh hoàn tiền & thu bổ sung backend đang mở */}
      {realApi && refundsBackend && refundsBackend.items.length > 0 && (
        <div className="recon-refunds-box">
          <div className="recon-refunds-title">
            Lệnh hoàn tiền trên máy chủ ({refundsBackend.items.length} lệnh · Đã hoàn: {fmt(refundsBackend.tongDaHoan)})
          </div>
          <div className="flex flex-col gap-2">
            {refundsBackend.items.map((ht) => {
              // Ánh xạ trạng thái lệnh hoàn tiền sang modifier class
              const txBadgeClass =
                ht.trangThai === "ThanhCong"
                  ? "is-success"
                  : ht.trangThai === "ThatBai"
                  ? "is-failed"
                  : "";
              return (
                <div key={ht.maHoanTien} className="recon-refund-row">
                  <div>
                    <strong className="recon-mono-forest">{ht.maYeuCau || `HT-${ht.maHoanTien}`}</strong>
                    <span className="recon-refund-label">{ht.nhanHienThi}</span>
                    <span className="recon-refund-amt">{fmt(ht.soTien)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`recon-tx-badge ${txBadgeClass}`}>
                      {ht.trangThai}
                    </span>
                    {ht.trangThai !== "ThanhCong" && (
                      <>
                        <button
                          type="button"
                          disabled={reconBusy}
                          onClick={() => onProcessRefund(ht.maHoanTien, ht.maYeuCau)}
                          className="recon-btn-process-refund"
                        >
                          Xử lý hoàn
                        </button>
                        <button
                          type="button"
                          disabled={reconBusy}
                          onClick={() => onCheckRefund(ht.maHoanTien, ht.maYeuCau)}
                          className="recon-btn-check-refund"
                        >
                          Đối chiếu
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Các nút hành động nghiệp vụ theo Bước 5–7 */}
      <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-dashed border-gray-300">
        {isBalanced ? (
          <button
            type="button"
            disabled={isBlocked || reconBusy}
            onClick={onFinalizeBalanced}
            className={`recon-btn-settle is-balanced ${isBlocked || reconBusy ? "is-disabled" : ""}`}
          >
            ✓ Chốt đối soát & Chuyển Hoàn tất đơn (Chênh lệch 0 đ) →
          </button>
        ) : extraAmount > 0 ? (
          <button
            type="button"
            disabled={isBlocked || reconBusy}
            onClick={onOpenCollect}
            className={`recon-btn-settle is-collect ${isBlocked || reconBusy ? "is-disabled" : ""}`}
          >
            Thu thêm bổ sung: {fmt(extraAmount)} (UC5.5) →
          </button>
        ) : (
          <button
            type="button"
            disabled={isBlocked || reconBusy}
            onClick={onOpenRefund}
            className={`recon-btn-settle ${isBlocked || reconBusy ? "is-disabled" : ""}`}
          >
            Lập & xử lý hoàn tiền cọc: {fmt(refundAmount)} (UC5.6) →
          </button>
        )}

        {realApi && doiSoatBackend && doiSoatBackend.trangThai !== "ChoChot" && doiSoatBackend.trangThai !== "DaChot" && (
          <button
            type="button"
            disabled={reconBusy}
            onClick={onLockReconciliation}
            className="recon-btn-lock"
          >
            Khóa đối soát & Hoàn tất đơn
          </button>
        )}

        {!realApi && (
          <button
            type="button"
            onClick={onSimulateFailedTx}
            className="recon-btn-sim-fail"
            title="Mô phỏng khoản thu bổ sung chưa đủ hoặc giao dịch hoàn tiền thất bại (Dòng 5.2)"
          >
            Mô phỏng GD thất bại (Dòng 5.2)
          </button>
        )}
      </div>
    </div>
  );
}
