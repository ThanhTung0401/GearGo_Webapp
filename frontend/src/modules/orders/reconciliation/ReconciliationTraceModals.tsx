import { fmt, formatDateTimeVi, type MoneyTransaction, type Order, type ReturnReceipt, type Surcharge } from "../../../store";

interface Props {
  order: Order;
  viewingTx: MoneyTransaction | null;
  setViewingTx: (v: MoneyTransaction | null) => void;
  viewingReturnReceipt: ReturnReceipt | null;
  setViewingReturnReceipt: (v: ReturnReceipt | null) => void;
  viewingSurcharge: Surcharge | null;
  setViewingSurcharge: (v: Surcharge | null) => void;
  showPrintModal: boolean;
  setShowPrintModal: (v: boolean) => void;
  depositCollected: number;
  totalApprovedSurcharges: number;
  approvedSurcharges: Surcharge[];
  priorSettled: number;
  netDifference: number;
  refundAmount: number;
  extraAmount: number;
  isBalanced: boolean;
  initialTransaction?: MoneyTransaction;
}

export function ReconciliationTraceModals(props: Props) {
  const {
    order, viewingTx, setViewingTx, viewingReturnReceipt, setViewingReturnReceipt,
    viewingSurcharge, setViewingSurcharge, showPrintModal, setShowPrintModal,
    depositCollected, totalApprovedSurcharges: approvedTotal, approvedSurcharges, priorSettled, netDifference,
    refundAmount, extraAmount, isBalanced, initialTransaction,
  } = props;
  // Lớp màu cho tổng kết chênh lệch trên biên bản in A4
  const printNetClass = isBalanced ? "" : netDifference > 0 ? "is-refund" : "is-collect";
  return (
    <>
      {/* ─── DÒNG 3: MODAL TRUY VẾT GIAO DỊCH THU CỌC BAN ĐẦU ─────────────────── */}
      {viewingTx && (
        <div role="dialog" aria-modal="true" className="recon-modal-backdrop">
          <div className="recon-modal-card is-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="recon-modal-badge-forest">
                  CHỨNG TỪ THU BAN ĐẦU (DÒNG 3)
                </span>
                <h3 className="recon-modal-title-sm">
                  Mã giao dịch: {viewingTx.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingTx(null)} className="recon-modal-close-icon">✕</button>
            </div>

            <div className="recon-trace-card">
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Loại giao dịch:</span><strong>{viewingTx.type}</strong></div>
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Thời gian thực hiện:</span><strong>{formatDateTimeVi(viewingTx.createdAt)}</strong></div>
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Số tiền giao dịch:</span><strong className="recon-mono-forest">{fmt(viewingTx.amount)}</strong></div>
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Trạng thái:</span><span className="recon-trace-status-pill">{viewingTx.status}</span></div>
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Nội dung / Ghi chú:</span><span>{viewingTx.note || "Thanh toán thành công"}</span></div>
            </div>

            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setViewingTx(null)} className="recon-modal-btn-primary">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DÒNG 3: MODAL TRUY VẾT PHIẾU NHẬN TRẢ (PNT) ───────────────────────── */}
      {viewingReturnReceipt && (
        <div role="dialog" aria-modal="true" className="recon-modal-backdrop">
          <div className="recon-modal-card is-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`recon-pnt-badge ${viewingReturnReceipt.isFinalReturn ? "is-final" : ""}`}>
                  CHỨNG TỪ GỐC: {viewingReturnReceipt.isFinalReturn ? "PHIẾU TRẢ CUỐI CÙNG" : `PHIẾU TRẢ ĐỢT ${viewingReturnReceipt.returnRound}`}
                </span>
                <h3 className="recon-modal-title">
                  Phiếu Nhận Trả: {viewingReturnReceipt.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingReturnReceipt(null)} className="recon-modal-close-icon">✕</button>
            </div>

            <div className="recon-pnt-meta">
              <div><strong>Đơn hàng:</strong> {viewingReturnReceipt.orderId} · <strong>Ngày nhận:</strong> {formatDateTimeVi(viewingReturnReceipt.returnedAt)}</div>
              <div><strong>Nhân viên nghiệm thu:</strong> {viewingReturnReceipt.staffName} · <strong>Ghi chú:</strong> {viewingReturnReceipt.note || "Không có"}</div>
            </div>

            <strong className="recon-pnt-section-title">Chi tiết thiết bị trong biên bản:</strong>
            <div className="flex flex-col gap-2 mt-2 mb-4">
              {viewingReturnReceipt.items.map((it) => (
                <div key={it.equipmentId} className="recon-pnt-item">
                  <div>
                    <strong className="recon-mono-forest">{it.equipmentId}</strong>
                    <div className="recon-pnt-item-cond">Tình trạng: <strong>{it.condition}</strong> {it.note ? `— ${it.note}` : ""}</div>
                  </div>
                  {it.surchargeAmount > 0 && (
                    <span className="recon-pnt-item-fee">
                      +{fmt(it.surchargeAmount)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 flex-wrap">
              <button type="button" onClick={() => window.print()} className="recon-modal-btn-secondary">
                🖨 In phiếu PNT
              </button>
              <button type="button" onClick={() => setViewingReturnReceipt(null)} className="recon-modal-btn-primary-wide">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DÒNG 3: MODAL TRUY VẾT PHIẾU PHỤ PHÍ ─────────────────────────────── */}
      {viewingSurcharge && (
        <div role="dialog" aria-modal="true" className="recon-modal-backdrop">
          <div className="recon-modal-card is-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="recon-modal-badge-danger">
                  CHỨNG TỪ PHỤ PHÍ (DÒNG 3)
                </span>
                <h3 className="recon-modal-title-sm">
                  Phiếu Phụ Phí: {viewingSurcharge.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingSurcharge(null)} className="recon-modal-close-icon">✕</button>
            </div>

            <div className="recon-trace-card">
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Loại phụ phí:</span><strong>{viewingSurcharge.type}</strong></div>
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Mã thiết bị:</span><strong className="recon-mono-bold">{viewingSurcharge.equipmentId}</strong></div>
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Số tiền phạt/bồi thường:</span><strong className="recon-mono-danger">{fmt(viewingSurcharge.amount)}</strong></div>
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Lý do & Tình trạng:</span><span>{viewingSurcharge.reason}</span></div>
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Người đề xuất:</span><strong>{viewingSurcharge.createdBy}</strong></div>
              <div className="flex justify-between gap-2 flex-wrap"><span className="recon-trace-label">Trạng thái duyệt:</span><span className="recon-trace-status-pill">{viewingSurcharge.status}</span></div>
            </div>

            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setViewingSurcharge(null)} className="recon-modal-btn-primary">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DÒNG 7: MODAL IN BIÊN BẢN ĐỐI SOÁT CHUẨN A4 ──────────────────────── */}
      {showPrintModal && (
        <div role="dialog" aria-modal="true" className="recon-modal-backdrop is-print">
          <div className="recon-print-sheet">
            {/* Header Biên bản in */}
            <div className="recon-print-header">
              <div>
                <h2 className="recon-print-brand">
                  GEARGO OUTDOOR RENTALS
                </h2>
                <div className="recon-print-tagline">Hệ thống cho thuê thiết bị cắm trại & dã ngoại chuyên nghiệp</div>
                <div className="recon-print-contact">Hotline: 1900-GEARGO · Website: geargo.vn</div>
              </div>
              <div className="recon-print-doc-meta">
                <div className="recon-print-doc-title">BIÊN BẢN ĐỐI SOÁT CỌC</div>
                <div className="recon-print-doc-code">BBDS-{order.displayCode || order.id}</div>
                <div className="recon-print-doc-date">Ngày lập: {formatDateTimeVi(order.reconciledAt || new Date())}</div>
              </div>
            </div>

            {/* Thông tin đơn và khách hàng */}
            <div className="recon-print-info-box">
              <div className="grid grid-cols-2 gap-2 recon-print-info-grid">
                <div><strong>Mã đơn thuê:</strong> {order.displayCode || order.id}</div>
                <div><strong>Khách hàng:</strong> {order.customerName}</div>
                <div><strong>Số điện thoại:</strong> {order.customerPhone}</div>
                <div><strong>Kỳ thuê:</strong> {formatDateTimeVi(order.pickupTime)} → {formatDateTimeVi(order.returnTime)}</div>
              </div>
            </div>

            {/* Bảng số liệu quyết toán chi tiết */}
            <div className="recon-print-table-wrap">
              <table className="recon-print-table">
                <thead>
                  <tr>
                    <th>Hạng mục tài chính</th>
                    <th>Căn cứ chứng từ</th>
                    <th className="recon-print-cell-right">Số tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>1. Tiền cọc ban đầu</strong></td>
                    <td className="recon-print-cell-muted">{initialTransaction ? initialTransaction.id : "Đã thanh toán"}</td>
                    <td className="recon-print-cell-mono-bold">+{fmt(depositCollected)}</td>
                  </tr>
                  {approvedSurcharges.map((s) => (
                    <tr key={s.id}>
                      <td>
                        2. Phụ phí: {s.type} ({s.equipmentId})
                        <div className="recon-print-cell-reason">{s.reason}</div>
                      </td>
                      <td className="recon-print-cell-muted">Phiếu duyệt {s.id}</td>
                      <td className="recon-print-cell-danger">−{fmt(s.amount)}</td>
                    </tr>
                  ))}
                  {priorSettled !== 0 && (
                    <tr>
                      <td>3. Khoản đã thu/hoàn trước</td>
                      <td className="recon-print-cell-muted">Giao dịch đối soát trước</td>
                      <td className="recon-print-cell-mono">
                        {priorSettled > 0 ? `+${fmt(priorSettled)}` : `−${fmt(Math.abs(priorSettled))}`}
                      </td>
                    </tr>
                  )}
                  <tr className="recon-print-total-row">
                    <td colSpan={2}>
                      SỐ DƯ QUYẾT TOÁN CUỐI CÙNG (
                      {isBalanced ? "CÂN BẰNG 0 Đ" : netDifference > 0 ? "HOÀN TRẢ KHÁCH" : "THU THÊM"}
                      )
                    </td>
                    <td className={`recon-print-total-val ${printNetClass}`}>
                      {fmt(Math.abs(netDifference))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Chữ ký hai bên */}
            <div className="grid grid-cols-2 gap-8 text-center pt-6 recon-print-sign-grid">
              <div>
                <strong>ĐẠI DIỆN KHÁCH HÀNG</strong>
                <div className="recon-print-sign-note">(Ký và ghi rõ họ tên)</div>
                <div className="recon-print-sign-space" />
                <strong>{order.customerName}</strong>
              </div>
              <div>
                <strong>ĐẠI DIỆN GEARGO</strong>
                <div className="recon-print-sign-note">(Người chốt đối soát)</div>
                <div className="recon-print-sign-space" />
                <strong>{order.reconciliation?.lockedBy || "NV Kho Mai"}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-8 pt-4 border-t border-gray-200 flex-wrap">
              <button type="button" onClick={() => window.print()} className="recon-print-btn-confirm">
                🖨 Xác nhận In / Xuất PDF
              </button>
              <button type="button" onClick={() => setShowPrintModal(false)} className="recon-print-btn-close">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

