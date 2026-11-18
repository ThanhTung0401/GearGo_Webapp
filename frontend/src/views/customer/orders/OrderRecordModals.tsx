import { fmt, type Order } from "../../../store";
import type { ViewingRecordType } from "./useMyOrders";

interface OrderRecordModalsProps {
  detail: Order | undefined;
  viewingRecord: ViewingRecordType;
  setViewingRecord: (v: ViewingRecordType) => void;
}

/**
 * Nhóm modal tra cứu chứng từ điện tử của đơn thuê: BBBG (UC4.2), PNT (UC4.3) và Bảng đối soát cọc (UC5.4).
 */
export function OrderRecordModals({
  detail,
  viewingRecord,
  setViewingRecord,
}: OrderRecordModalsProps) {
  if (!detail || !viewingRecord) return null;

  return (
    <>
      {/* Modal Xem BBBG (UC4.2) */}
      {viewingRecord === "bbbg" && detail.handoverRecord && (
        <div role="dialog" aria-modal="true" className="modal-overlay cp-modal-overlay cp-modal-overlay--dim">
          <div className="modal-container cp-modal-box cp-modal-box--lg">
            <div className="modal-header flex justify-between items-center mb-4">
              <h3 className="modal-title font-bold text-base">Biên bản bàn giao thiết bị ({detail.handoverRecord.id})</h3>
              <button onClick={() => setViewingRecord(null)} className="btn btn-ghost btn-sm text-lg cp-modal-close">×</button>
            </div>
            <div className="modal-body text-xs flex flex-col gap-3">
              <div className="cp-bbbg-meta">
                <div>Thời gian bàn giao: <strong>{detail.handoverRecord.handoverAt}</strong></div>
                <div>Nhân viên giao: <strong>{detail.handoverRecord.staffName}</strong></div>
                <div>Khách nhận: <strong>{detail.handoverRecord.customerName}</strong></div>
              </div>

              <div>
                <strong>Danh sách thiết bị cá thể & phụ kiện:</strong>
                <div className="flex flex-col gap-1.5 mt-2">
                  {detail.handoverRecord.items.map((it) => (
                    <div key={it.equipmentId} className="cp-bbbg-item">
                      Mã serial: <strong>{it.equipmentId}</strong> · Tình trạng: {it.condition} · Phụ kiện: {it.accessoriesOk ? "✓ Đầy đủ" : "Thiếu"}
                    </div>
                  ))}
                </div>
              </div>

              {detail.handoverRecord.accessoriesChecklist && (
                <div>
                  <strong>Checklist phụ kiện đi kèm:</strong>
                  <div className="flex flex-col gap-1 mt-1">
                    {detail.handoverRecord.accessoriesChecklist.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span>{c.checked ? "☑" : "☐"}</span>
                        <span>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.handoverRecord.initialNotes && (
                <div>Ghi chú ban đầu: <em>"{detail.handoverRecord.initialNotes}"</em></div>
              )}

              <div className="cp-bbbg-signed">
                ✓ Đã ký xác nhận bàn giao đầy đủ tại quầy
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Phiếu Nhận Trả PNT (UC4.3) */}
      {viewingRecord === "pnt" && detail.returnReceipts && (
        <div role="dialog" aria-modal="true" className="modal-overlay cp-modal-overlay cp-modal-overlay--dim">
          <div className="modal-container cp-modal-box cp-modal-box--lg">
            <div className="modal-header flex justify-between items-center mb-4">
              <h3 className="modal-title font-bold text-base">Phiếu nhận trả thiết bị (PNT)</h3>
              <button onClick={() => setViewingRecord(null)} className="btn btn-ghost btn-sm text-lg cp-modal-close">×</button>
            </div>
            <div className="modal-body text-xs flex flex-col gap-4">
              {detail.returnReceipts.map((rc, idx) => (
                <div key={rc.id || idx} className="cp-pnt-round-card">
                  <div className="flex justify-between items-center mb-2">
                    <strong className="cp-pnt-round-id">{rc.id} (Đợt {rc.returnRound})</strong>
                    <span>Thời gian: {rc.returnedAt}</span>
                  </div>
                  <div>Nhân viên tiếp nhận: <strong>{rc.staffName}</strong> · Lần trả cuối: {rc.isFinalReturn ? "Có" : "Không"}</div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {rc.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="cp-pnt-item">
                        Thiết bị: <strong>{item.equipmentId}</strong> · Tình trạng nhận lại:{" "}
                        {/* Đánh dấu xanh nếu tình trạng bình thường, đỏ nếu hư hỏng/mất */}
                        <strong className={`cp-pnt-cond ${item.condition === "Bình thường" ? "is-normal" : "is-issue"}`}>
                          {item.condition}
                        </strong>
                        {item.surchargeAmount > 0 && <span className="cp-pnt-surcharge">(Phụ phí: +{fmt(item.surchargeAmount)})</span>}
                        {item.note && <div className="cp-pnt-note">Ghi chú: {item.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Bảng Đối Soát Cọc & Hoàn Tất Đơn (UC5.4) */}
      {viewingRecord === "reconciliation" && (
        <div role="dialog" aria-modal="true" className="modal-overlay cp-modal-overlay cp-modal-overlay--dim">
          <div className="modal-container cp-modal-box cp-modal-box--520">
            <div className="modal-header flex justify-between items-center mb-4 pb-2 border-b border-bone">
              <div>
                <span className="cp-reconcile-eyebrow">Biên bản quyết toán (UC5.4)</span>
                <h3 className="modal-title font-bold text-base cp-reconcile-title">Bảng đối soát cọc & Hoàn tất đơn</h3>
              </div>
              <button onClick={() => setViewingRecord(null)} className="btn btn-ghost btn-sm text-lg cp-modal-close">×</button>
            </div>

            <div className="modal-body text-xs flex flex-col gap-3">
              <div className="cp-reconcile-summary">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Tiền cọc thực thu ban đầu:</span>
                  <strong className="font-mono text-sm">{fmt(detail.reconciliation?.depositCollected ?? detail.depositTotal)}</strong>
                </div>
                <div className="flex justify-between py-1 text-red-600">
                  <span>Tổng phụ phí bồi thường / quá hạn đã duyệt:</span>
                  <strong className="font-mono">−{fmt(detail.reconciliation?.totalApprovedSurcharges ?? 0)}</strong>
                </div>
                <div className="flex justify-between font-bold text-sm text-forest cp-reconcile-total-row">
                  <span>Số tiền cọc thực hoàn lại cho khách (UC5.6):</span>
                  <span className="font-mono text-base">{fmt(detail.reconciliation?.netDifference ?? detail.depositTotal)}</span>
                </div>
              </div>

              <div className="cp-reconcile-done-box">
                <div>✓ <strong>Quyết toán:</strong> Hoàn cọc 100% qua tài khoản ngân hàng của quý khách.</div>
                <div className="cp-reconcile-done-sub">
                  Người xác nhận: <strong>{detail.reconciliation?.confirmedBy || "NV Mai"}</strong> · Đã khóa biên bản hoàn tất đơn.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
