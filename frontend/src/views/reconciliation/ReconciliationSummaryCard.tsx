import { fmt, type Order, type Surcharge, type MoneyTransaction, type ReturnReceipt } from "../../store";

interface ReconciliationSummaryCardProps {
  order: Order;
  isOrderCompleted: boolean;
  initialTransaction?: MoneyTransaction;
  depositCollected: number;
  approvedSurcharges: Surcharge[];
  totalApprovedSurcharges: number;
  priorCollect: number;
  priorRefund: number;
  priorSettled: number;
  isBalanced: boolean;
  netDifference: number;
  refundAmount: number;
  extraAmount: number;
  netStateClass: string;
  onOpenPrint: () => void;
  onViewTx: (tx: MoneyTransaction) => void;
  onViewReturnReceipt: (receipt: ReturnReceipt) => void;
  onViewSurcharge: (surcharge: Surcharge) => void;
}

/**
 * Bảng kê quyết toán đối soát cọc (Dòng 2 & truy vết chứng từ gốc Dòng 3 UC5.4).
 */
export function ReconciliationSummaryCard({
  order,
  isOrderCompleted,
  initialTransaction,
  depositCollected,
  approvedSurcharges,
  totalApprovedSurcharges,
  priorCollect,
  priorRefund,
  priorSettled,
  isBalanced,
  netDifference,
  refundAmount,
  extraAmount,
  netStateClass,
  onOpenPrint,
  onViewTx,
  onViewReturnReceipt,
  onViewSurcharge,
}: ReconciliationSummaryCardProps) {
  return (
    <div className="reconcile-sheet-card">
      <div className="reconcile-sheet-header recon-sheet-header">
        <div>
          <strong className="recon-sheet-heading">
            Bảng Kê Quyết Toán Đối Soát Cọc
          </strong>
          <div className="recon-muted-xs">
            Số dư = Nghĩa vụ hợp lệ trừ tiền đã xử lý (Không cộng cọc vào doanh thu)
          </div>
        </div>
        <div className="flex gap-2">
          {isOrderCompleted && (
            <button
              type="button"
              onClick={onOpenPrint}
              className="recon-print-btn"
            >
              🖨️ In biên bản A4
            </button>
          )}
        </div>
      </div>

      {/* Dòng 1: Cọc thực thu ban đầu */}
      <div className="reconcile-sheet-row recon-sheet-row recon-row-subtle">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <strong>1. Tiền cọc thực thu ban đầu:</strong>
            {initialTransaction && (
              <button
                type="button"
                onClick={() => onViewTx(initialTransaction)}
                className="reconcile-trace-btn"
                title="Truy về chứng từ thu ban đầu (Dòng 3)"
              >
                🔍 Xem GD: {initialTransaction.id}
              </button>
            )}
          </div>
          <div className="recon-muted-xs">
            Thanh toán lúc đặt đơn qua Cổng thanh toán / Chuyển khoản
          </div>
        </div>
        <div className="recon-amount-positive">
          +{fmt(depositCollected)}
        </div>
      </div>

      {/* Dòng 2: Chi tiết các khoản phụ phí đã duyệt (Căn cứ điều chỉnh) */}
      <div className="recon-surcharges-section">
        <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
          <strong className="recon-row-label">
            2. Các khoản phụ phí đã duyệt (Căn cứ điều chỉnh):
          </strong>
          <span className={`recon-surcharge-total ${totalApprovedSurcharges > 0 ? "has-amount" : ""}`}>
            −{fmt(totalApprovedSurcharges)}
          </span>
        </div>

        {approvedSurcharges.length === 0 ? (
          <div className="recon-empty-surcharge">
            ✓ Thiết bị hoàn trả đầy đủ, nguyên vẹn — Không phát sinh phụ phí bồi thường hoặc trễ hạn.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 recon-surcharge-list">
            {approvedSurcharges.map((s) => {
              // Tìm phiếu nhận trả liên quan để phục vụ truy vết chứng từ gốc (Dòng 3)
              const relatedReceipt = (order.returnReceipts || []).find((r) =>
                r.items.some((it) => it.equipmentId === s.equipmentId && it.surchargeAmount === s.amount)
              );

              return (
                <div key={s.id} className="recon-surcharge-item">
                  <div>
                    <span className="recon-surcharge-type">{s.type}</span> — Thiết bị: <span className="recon-mono-bold">{s.equipmentId}</span>
                    <span className="recon-surcharge-reason">({s.reason})</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {relatedReceipt && (
                      <button
                        type="button"
                        onClick={() => onViewReturnReceipt(relatedReceipt)}
                        className="reconcile-trace-btn"
                        title="Truy về Phiếu nhận trả (Dòng 3)"
                      >
                        📄 PNT: {relatedReceipt.id}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onViewSurcharge(s)}
                      className="reconcile-trace-btn"
                      title="Xem chi tiết phiếu phụ phí"
                    >
                      🔍 Chi tiết phí
                    </button>
                    <span className="recon-mono-danger">
                      −{fmt(s.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dòng 3: Các khoản đã thu bổ sung / hoàn trước đó (nếu có) */}
      <div className="reconcile-sheet-row recon-sheet-row recon-row-subtle">
        <div>
          <strong>3. Các khoản đã thu thêm / hoàn cọc trước đó:</strong>
          <div className="recon-muted-xs">
            Thu thêm trước đó: {fmt(priorCollect)} · Đã hoàn trước đó: {fmt(priorRefund)}
          </div>
        </div>
        <div className="recon-prior-amount">
          {priorSettled !== 0 ? (priorSettled > 0 ? `+${fmt(priorSettled)}` : `−${fmt(Math.abs(priorSettled))}`) : "0 đ"}
        </div>
      </div>

      {/* Dòng 4: TỔNG KẾT CHÊNH LỆCH ĐỐI SOÁT (Net Settlement Difference) */}
      {/* Nền đỏ nhạt khi cần thu thêm, nền xanh lá nhạt khi cân bằng hoặc hoàn cọc */}
      <div className={`recon-net-box ${!isBalanced && netDifference <= 0 ? "is-collect" : ""}`}>
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <span className="recon-net-eyebrow">
              Kết luận chênh lệch đối soát:
            </span>
            <div className={`recon-net-title ${netStateClass}`}>
              {isBalanced
                ? "✓ Cân bằng tuyệt đối (0 đ) — Không phát sinh nghĩa vụ tiền"
                : netDifference > 0
                ? `Cửa hàng phải HOÀN TRẢ CỌC cho khách: +${fmt(refundAmount)}`
                : `Khách hàng cần THANH TOÁN BỔ SUNG: −${fmt(extraAmount)}`}
            </div>
            <div className="recon-net-formula">
              Căn cứ tính: Cọc {fmt(depositCollected)} − Phụ phí {fmt(totalApprovedSurcharges)} {priorSettled !== 0 ? `− Đã xử lý ${fmt(priorSettled)}` : ""} = {fmt(Math.abs(netDifference))}
            </div>
          </div>

          <div className="recon-net-right">
            <div className={`recon-net-value ${netStateClass}`}>
              {fmt(Math.abs(netDifference))}
            </div>
            <span className="recon-net-code">
              {isBalanced ? "Dòng 5.1" : netDifference > 0 ? "EP5.4-HOAN (UC5.6)" : "EP5.4-THU (UC5.5)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
