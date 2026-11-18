import { useApp } from "../../App";
import { fmt, type Order, type Surcharge } from "../../store";
import { surchargeApi, type XemTruocHuyBackend } from "../../services/api";

interface MyOrdersModalsProps {
  app: ReturnType<typeof useApp>;
  detail: Order | undefined;
  disputeSurchargeTarget: Surcharge | null;
  setDisputeSurchargeTarget: (v: Surcharge | null) => void;
  disputeReason: string;
  setDisputeReason: (v: string) => void;
  disputeSubmitting: boolean;
  setDisputeSubmitting: (v: boolean) => void;
  actionError: string;
  setActionError: (v: string) => void;
  refreshOrderById: (id: string | number) => Promise<void>;
  viewingRecord: "bbbg" | "pnt" | "reconciliation" | null;
  setViewingRecord: (v: "bbbg" | "pnt" | "reconciliation" | null) => void;
  cancelling: string | null;
  setCancelling: (v: string | null) => void;
  cancellingOrder: Order | null | undefined;
  cancelPreview: XemTruocHuyBackend | null;
  localCancellationQuote: ReturnType<ReturnType<typeof useApp>["getCancellationQuote"]> | null;
  cancelPreviewLoading: boolean;
  cancelReason: string;
  setCancelReason: (v: string) => void;
  cancelSubmitting: boolean;
  handleConfirmCancel: () => Promise<void>;
}

export function MyOrdersModals({
  app,
  detail,
  disputeSurchargeTarget,
  setDisputeSurchargeTarget,
  disputeReason,
  setDisputeReason,
  disputeSubmitting,
  setDisputeSubmitting,
  actionError,
  setActionError,
  refreshOrderById,
  viewingRecord,
  setViewingRecord,
  cancelling,
  setCancelling,
  cancellingOrder,
  cancelPreview,
  localCancellationQuote,
  cancelPreviewLoading,
  cancelReason,
  setCancelReason,
  cancelSubmitting,
  handleConfirmCancel,
}: MyOrdersModalsProps) {
  return (
    <>
      {/* Modal Khiếu nại phụ phí (UC5.2 Dòng sự kiện phụ 5.1) */}
      {disputeSurchargeTarget && detail && (
        <div role="dialog" aria-modal="true" className="modal-overlay cp-modal-overlay cp-modal-overlay--dim">
          <div className="modal-container cp-modal-box cp-modal-box--500">
            <div className="modal-header flex justify-between items-center mb-3">
              <h3 className="modal-title font-bold text-base cp-dispute-title">
                ⚖️ Khiếu nại phụ phí phát sinh (Dòng 5.1)
              </h3>
              <button onClick={() => setDisputeSurchargeTarget(null)} className="btn btn-ghost btn-sm text-lg cp-modal-close">×</button>
            </div>
            <div className="text-xs text-gray-600 mb-4">
              Nếu bạn không đồng thuận với lý do hoặc mức phí nhân viên cửa hàng lập, bạn có quyền gửi phản hồi. Quản trị viên sẽ đối chiếu biên bản bàn giao, phiếu nhận trả và làm việc lại với bạn.
            </div>

            <div className="cp-dispute-summary">
              <div>Khoản phí: <strong>{disputeSurchargeTarget.type}</strong></div>
              <div>Thiết bị: <strong>{disputeSurchargeTarget.equipmentId}</strong></div>
              <div>Số tiền yêu cầu: <strong className="cp-dispute-amount">{fmt(disputeSurchargeTarget.amount)}</strong></div>
              <div className="cp-dispute-staff-reason">Lý do của nhân viên: <em>"{disputeSurchargeTarget.reason}"</em></div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!disputeReason.trim()) return;
                if (!app.realApi) {
                  app.disputeSurcharge(detail.id, disputeSurchargeTarget.id, disputeReason);
                  setDisputeSurchargeTarget(null);
                  setDisputeReason("");
                  return;
                }
                setDisputeSubmitting(true);
                setActionError("");
                try {
                  await surchargeApi.taoTranhChap(
                    Number(disputeSurchargeTarget.backendId ?? disputeSurchargeTarget.id),
                    disputeReason.trim()
                  );
                  await refreshOrderById(detail.id);
                  setDisputeSurchargeTarget(null);
                  setDisputeReason("");
                } catch (err) {
                  setActionError(err instanceof Error ? err.message : "Không thể gửi khiếu nại phụ phí.");
                } finally {
                  setDisputeSubmitting(false);
                }
              }}
              className="flex flex-col gap-3"
            >
              {actionError && (
                <div role="alert" className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  {actionError}
                </div>
              )}
              <div className="form-group">
                <label className="form-label cp-dispute-label">
                  Lý do bạn không đồng ý với mức phụ phí này: *
                </label>
                <textarea
                  required
                  rows={4}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Ví dụ: Vết trầy xước này đã có từ trước khi nhận đồ, tôi có chụp ảnh lưu lúc kiểm tra tại quầy..."
                  className="form-textarea cp-dispute-textarea"
                />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setDisputeSurchargeTarget(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={disputeSubmitting}
                  className="btn btn-primary btn-sm cp-dispute-submit-btn"
                >
                  {disputeSubmitting ? "Đang gửi khiếu nại..." : "Gửi khiếu nại (Chuyển Quản trị viên)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem BBBG (UC4.2) */}
      {viewingRecord === "bbbg" && detail && detail.handoverRecord && (
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
      {viewingRecord === "pnt" && detail && detail.returnReceipts && (
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
      {viewingRecord === "reconciliation" && detail && (
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

      {/* Modal Hủy Đơn Thuê & Dự Toán Hoàn Tiền (UC3.4) */}
      {cancelling && cancellingOrder && (cancelPreview || localCancellationQuote) && (
        <div className="modal-overlay cp-modal-overlay cp-modal-overlay--dim">
          <div className="modal-container max-w-md cp-modal-box cp-modal-box--md">
            <div className="modal-header flex justify-between items-center mb-3">
              <h2 className="modal-title font-bold text-base text-bark cp-cancel-title">
                Xác nhận hủy đơn thuê #{cancellingOrder.displayCode || cancellingOrder.id}? (UC3.4)
              </h2>
              <button onClick={() => setCancelling(null)} className="btn btn-ghost btn-sm cp-modal-close cp-modal-close--lg">✕</button>
            </div>

            <div className="modal-body text-xs">
              <div className="cp-cancel-policy-box">
                <strong>📌 Chính sách hủy đơn tiêu chuẩn (BR22):</strong>
                <ul className="cp-cancel-policy-list">
                  <li>Trước &gt;48h: Miễn phí 100% · Hoàn toàn bộ tiền thuê + cọc.</li>
                  <li>24h – 48h: Giữ 30% tiền thuê · Hoàn 70% tiền thuê + 100% cọc.</li>
                  <li>Dưới &lt;24h: Giữ 100% tiền thuê · Hoàn 100% tiền cọc bảo đảm.</li>
                  <li>Chưa thanh toán: Hủy miễn phí ngay lập tức.</li>
                </ul>
              </div>

              {cancelPreviewLoading ? (
                <div className="cp-cancel-loading">
                  Đang tính toán dự toán hoàn tiền từ máy chủ...
                </div>
              ) : app.realApi && cancelPreview && cancellingOrder.status !== "Chờ thanh toán" ? (
                <div className="cp-cancel-quote-box">
                  <div className="cp-cancel-quote-heading">
                    Bảng dự tính hoàn tiền & phí giữ lại ({cancelPreview.nhanhChinhSach}):
                  </div>
                  {!cancelPreview.coTheHuy && cancelPreview.lyDoKhongTheHuy && (
                    <div className="cp-cancel-blocked">{cancelPreview.lyDoKhongTheHuy}</div>
                  )}
                  <div className="flex justify-between py-1 text-gray-600">
                    <span>Tiền thuê đã thu:</span>
                    <span className="font-mono">{fmt(cancelPreview.tienThueDaThu)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-red-600">
                    <span>Phí hủy giữ lại ({Math.round((cancelPreview.tyLeGiuLai ?? 0) * 100)}%):</span>
                    <strong className="font-mono">−{fmt(cancelPreview.tienThueGiuLai)}</strong>
                  </div>
                  <div className="flex justify-between py-1 text-gray-600">
                    <span>Tiền thuê được hoàn:</span>
                    <span className="font-mono">{fmt(cancelPreview.tienThueHoan)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-600">
                    <span>Tiền cọc hoàn trả 100%:</span>
                    <span className="font-mono">{fmt(cancelPreview.tienCocHoan)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-forest cp-cancel-quote-total">
                    <span>Tổng tiền thực tế hoàn trả cho bạn:</span>
                    <span className="font-mono text-base">{fmt(cancelPreview.tongHoan)}</span>
                  </div>
                  {cancelPreview.canhBao && (
                    <div className="cp-cancel-warning">{cancelPreview.canhBao}</div>
                  )}
                </div>
              ) : (
                <div className="cp-cancel-quote-box">
                  <div className="cp-cancel-quote-heading">
                    Bảng dự tính hoàn tiền & phí giữ lại:
                  </div>
                  <div className="flex justify-between py-1 text-gray-600">
                    <span>Tiền thuê ban đầu:</span>
                    <span className="font-mono">{fmt(cancellingOrder.rental - cancellingOrder.discount)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-red-600">
                    <span>Phí hủy giữ lại (theo quy chế):</span>
                    <strong className="font-mono">−{fmt(localCancellationQuote?.fee ?? 0)}</strong>
                  </div>
                  <div className="flex justify-between py-1 text-gray-600">
                    <span>Tiền thuê được hoàn:</span>
                    <span className="font-mono">{fmt(Math.max(0, cancellingOrder.rental - cancellingOrder.discount - (localCancellationQuote?.fee ?? 0)))}</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-600">
                    <span>Tiền cọc hoàn trả 100%:</span>
                    <span className="font-mono">{fmt(cancellingOrder.depositTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-forest cp-cancel-quote-total">
                    <span>Tổng tiền thực tế hoàn trả cho bạn:</span>
                    <span className="font-mono text-base">{fmt(localCancellationQuote?.refund ?? 0)}</span>
                  </div>
                </div>
              )}

              {actionError && (
                <div role="alert" className="cp-alert-error cp-alert-error--sm">
                  {actionError}
                </div>
              )}

              <div className="form-group mb-4">
                <label className="form-label cp-cancel-reason-label">Lý do hủy đơn *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Vui lòng nhập lý do hủy đơn của bạn..."
                  rows={2}
                  className="form-textarea cp-cancel-reason-textarea"
                />
              </div>
            </div>

            <div className="modal-footer flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCancelling(null)}
                className="btn btn-secondary btn-sm cp-btn-cancel-close"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim() || cancelSubmitting || cancelPreviewLoading || (Boolean(cancelPreview) && !cancelPreview?.coTheHuy)}
                onClick={() => void handleConfirmCancel()}
                className="btn btn-danger btn-sm cp-btn-cancel-submit"
              >
                {cancelSubmitting ? "Đang xử lý hủy..." : "Xác nhận hủy đơn thuê"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
