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
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 500, width: "100%", padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <div className="modal-header flex justify-between items-center mb-3">
              <h3 className="modal-title font-bold text-base" style={{ color: "#B91C1C", margin: 0 }}>
                ⚖️ Khiếu nại phụ phí phát sinh (Dòng 5.1)
              </h3>
              <button onClick={() => setDisputeSurchargeTarget(null)} className="btn btn-ghost btn-sm text-lg" style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
            </div>
            <div className="text-xs text-gray-600 mb-4">
              Nếu bạn không đồng thuận với lý do hoặc mức phí nhân viên cửa hàng lập, bạn có quyền gửi phản hồi. Quản trị viên sẽ đối chiếu biên bản bàn giao, phiếu nhận trả và làm việc lại với bạn.
            </div>

            <div style={{ background: "#FEF2F2", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: "0.8rem", border: "1px solid #FECACA" }}>
              <div>Khoản phí: <strong>{disputeSurchargeTarget.type}</strong></div>
              <div>Thiết bị: <strong>{disputeSurchargeTarget.equipmentId}</strong></div>
              <div>Số tiền yêu cầu: <strong style={{ color: "#DC2626", fontFamily: "var(--font-mono)" }}>{fmt(disputeSurchargeTarget.amount)}</strong></div>
              <div style={{ marginTop: 4, color: "#6B7280" }}>Lý do của nhân viên: <em>"{disputeSurchargeTarget.reason}"</em></div>
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
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                  Lý do bạn không đồng ý với mức phụ phí này: *
                </label>
                <textarea
                  required
                  rows={4}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Ví dụ: Vết trầy xước này đã có từ trước khi nhận đồ, tôi có chụp ảnh lưu lúc kiểm tra tại quầy..."
                  className="form-textarea"
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
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
                  className="btn btn-primary btn-sm"
                  style={{ background: "#B91C1C", borderColor: "#B91C1C", color: "white", fontWeight: 700 }}
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
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 540, width: "100%", padding: 24 }}>
            <div className="modal-header flex justify-between items-center mb-4">
              <h3 className="modal-title font-bold text-base">Biên bản bàn giao thiết bị ({detail.handoverRecord.id})</h3>
              <button onClick={() => setViewingRecord(null)} className="btn btn-ghost btn-sm text-lg" style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
            </div>
            <div className="modal-body text-xs flex flex-col gap-3">
              <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12 }}>
                <div>Thời gian bàn giao: <strong>{detail.handoverRecord.handoverAt}</strong></div>
                <div>Nhân viên giao: <strong>{detail.handoverRecord.staffName}</strong></div>
                <div>Khách nhận: <strong>{detail.handoverRecord.customerName}</strong></div>
              </div>

              <div>
                <strong>Danh sách thiết bị cá thể & phụ kiện:</strong>
                <div className="flex flex-col gap-1.5 mt-2">
                  {detail.handoverRecord.items.map((it) => (
                    <div key={it.equipmentId} style={{ padding: "6px 10px", background: "#F9FAFB", borderRadius: 6, border: "1px solid var(--color-bone)" }}>
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

              <div style={{ padding: 10, background: "#DCFCE7", borderRadius: 8, color: "#15803D", fontWeight: 700 }}>
                ✓ Đã ký xác nhận bàn giao đầy đủ tại quầy
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Phiếu Nhận Trả PNT (UC4.3) */}
      {viewingRecord === "pnt" && detail && detail.returnReceipts && (
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 540, width: "100%", padding: 24 }}>
            <div className="modal-header flex justify-between items-center mb-4">
              <h3 className="modal-title font-bold text-base">Phiếu nhận trả thiết bị (PNT)</h3>
              <button onClick={() => setViewingRecord(null)} className="btn btn-ghost btn-sm text-lg" style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
            </div>
            <div className="modal-body text-xs flex flex-col gap-4">
              {detail.returnReceipts.map((rc, idx) => (
                <div key={rc.id || idx} style={{ border: "1px solid var(--color-bone)", borderRadius: 10, padding: 12, background: "var(--color-cream)" }}>
                  <div className="flex justify-between items-center mb-2">
                    <strong style={{ color: "var(--color-forest)" }}>{rc.id} (Đợt {rc.returnRound})</strong>
                    <span>Thời gian: {rc.returnedAt}</span>
                  </div>
                  <div>Nhân viên tiếp nhận: <strong>{rc.staffName}</strong> · Lần trả cuối: {rc.isFinalReturn ? "Có" : "Không"}</div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {rc.items.map((item, itemIdx) => (
                      <div key={itemIdx} style={{ padding: "6px 10px", background: "white", borderRadius: 6, border: "1px solid var(--color-bone)" }}>
                        Thiết bị: <strong>{item.equipmentId}</strong> · Tình trạng nhận lại: <strong style={{ color: item.condition === "Bình thường" ? "#15803D" : "#DC2626" }}>{item.condition}</strong>
                        {item.surchargeAmount > 0 && <span style={{ color: "#DC2626", marginLeft: 8 }}>(Phụ phí: +{fmt(item.surchargeAmount)})</span>}
                        {item.note && <div style={{ color: "#6B7280", marginTop: 2 }}>Ghi chú: {item.note}</div>}
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
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 520, width: "100%", padding: 24 }}>
            <div className="modal-header flex justify-between items-center mb-4 pb-2 border-b border-bone">
              <div>
                <span style={{ fontSize: "0.72rem", color: "#7E22CE", fontWeight: 700, textTransform: "uppercase" }}>Biên bản quyết toán (UC5.4)</span>
                <h3 className="modal-title font-bold text-base" style={{ margin: "2px 0 0" }}>Bảng đối soát cọc & Hoàn tất đơn</h3>
              </div>
              <button onClick={() => setViewingRecord(null)} className="btn btn-ghost btn-sm text-lg" style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
            </div>

            <div className="modal-body text-xs flex flex-col gap-3">
              <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14 }}>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Tiền cọc thực thu ban đầu:</span>
                  <strong className="font-mono text-sm">{fmt(detail.reconciliation?.depositCollected ?? detail.depositTotal)}</strong>
                </div>
                <div className="flex justify-between py-1 text-red-600">
                  <span>Tổng phụ phí bồi thường / quá hạn đã duyệt:</span>
                  <strong className="font-mono">−{fmt(detail.reconciliation?.totalApprovedSurcharges ?? 0)}</strong>
                </div>
                <div style={{ borderTop: "1px dashed var(--color-bone)", marginTop: 8, paddingTop: 8 }} className="flex justify-between font-bold text-sm text-forest">
                  <span>Số tiền cọc thực hoàn lại cho khách (UC5.6):</span>
                  <span className="font-mono text-base">{fmt(detail.reconciliation?.netDifference ?? detail.depositTotal)}</span>
                </div>
              </div>

              <div style={{ padding: 12, background: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0", color: "#166534" }}>
                <div>✓ <strong>Quyết toán:</strong> Hoàn cọc 100% qua tài khoản ngân hàng của quý khách.</div>
                <div style={{ marginTop: 4, fontSize: "0.72rem", color: "#4B5563" }}>
                  Người xác nhận: <strong>{detail.reconciliation?.confirmedBy || "NV Mai"}</strong> · Đã khóa biên bản hoàn tất đơn.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy Đơn Thuê & Dự Toán Hoàn Tiền (UC3.4) */}
      {cancelling && cancellingOrder && (cancelPreview || localCancellationQuote) && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div className="modal-container max-w-md" style={{ background: "white", borderRadius: 18, maxWidth: 480, width: "100%", padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div className="modal-header flex justify-between items-center mb-3">
              <h2 className="modal-title font-bold text-base text-bark" style={{ margin: 0 }}>
                Xác nhận hủy đơn thuê #{cancellingOrder.displayCode || cancellingOrder.id}? (UC3.4)
              </h2>
              <button onClick={() => setCancelling(null)} className="btn btn-ghost btn-sm" style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </div>

            <div className="modal-body text-xs">
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: 12, marginBottom: 14, color: "#1E40AF" }}>
                <strong>📌 Chính sách hủy đơn tiêu chuẩn (BR22):</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 16, lineHeight: 1.5 }}>
                  <li>Trước &gt;48h: Miễn phí 100% · Hoàn toàn bộ tiền thuê + cọc.</li>
                  <li>24h – 48h: Giữ 30% tiền thuê · Hoàn 70% tiền thuê + 100% cọc.</li>
                  <li>Dưới &lt;24h: Giữ 100% tiền thuê · Hoàn 100% tiền cọc bảo đảm.</li>
                  <li>Chưa thanh toán: Hủy miễn phí ngay lập tức.</li>
                </ul>
              </div>

              {cancelPreviewLoading ? (
                <div style={{ padding: 14, background: "var(--color-parchment)", borderRadius: 10, marginBottom: 14, textAlign: "center" }}>
                  Đang tính toán dự toán hoàn tiền từ máy chủ...
                </div>
              ) : app.realApi && cancelPreview && cancellingOrder.status !== "Chờ thanh toán" ? (
                <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 8, fontSize: "0.82rem" }}>
                    Bảng dự tính hoàn tiền & phí giữ lại ({cancelPreview.nhanhChinhSach}):
                  </div>
                  {!cancelPreview.coTheHuy && cancelPreview.lyDoKhongTheHuy && (
                    <div style={{ color: "#B91C1C", fontWeight: 700, marginBottom: 8 }}>{cancelPreview.lyDoKhongTheHuy}</div>
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
                  <div style={{ borderTop: "1px dashed var(--color-bone)", marginTop: 8, paddingTop: 8 }} className="flex justify-between font-bold text-sm text-forest">
                    <span>Tổng tiền thực tế hoàn trả cho bạn:</span>
                    <span className="font-mono text-base">{fmt(cancelPreview.tongHoan)}</span>
                  </div>
                  {cancelPreview.canhBao && (
                    <div style={{ marginTop: 6, color: "#92400E" }}>{cancelPreview.canhBao}</div>
                  )}
                </div>
              ) : (
                <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 8, fontSize: "0.82rem" }}>
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
                  <div style={{ borderTop: "1px dashed var(--color-bone)", marginTop: 8, paddingTop: 8 }} className="flex justify-between font-bold text-sm text-forest">
                    <span>Tổng tiền thực tế hoàn trả cho bạn:</span>
                    <span className="font-mono text-base">{fmt(localCancellationQuote?.refund ?? 0)}</span>
                  </div>
                </div>
              )}

              {actionError && (
                <div role="alert" style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA", padding: "8px 10px", borderRadius: 8, fontSize: "0.75rem", marginBottom: 10 }}>
                  {actionError}
                </div>
              )}

              <div className="form-group mb-4">
                <label className="form-label" style={{ fontWeight: 700, marginBottom: 4, display: "block" }}>Lý do hủy đơn *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Vui lòng nhập lý do hủy đơn của bạn..."
                  rows={2}
                  className="form-textarea"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
                />
              </div>
            </div>

            <div className="modal-footer flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCancelling(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "8px 16px", borderRadius: 8 }}
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim() || cancelSubmitting || cancelPreviewLoading || (Boolean(cancelPreview) && !cancelPreview?.coTheHuy)}
                onClick={() => void handleConfirmCancel()}
                className="btn btn-danger btn-sm"
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  background: !cancelReason.trim() || cancelSubmitting ? "#D1D5DB" : "#DC2626",
                  color: "white",
                  border: "none",
                  cursor: !cancelReason.trim() || cancelSubmitting ? "not-allowed" : "pointer",
                }}
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
