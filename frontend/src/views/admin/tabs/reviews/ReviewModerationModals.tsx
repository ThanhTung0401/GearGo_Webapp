import Icon from "../../../../components/Icon";
import { fmt, type Order, type Review } from "../../../../store";

interface ReviewModerationModalsProps {
  orderBasisReview: Review | null;
  orderBasisDetail: Order | null | undefined;
  onCloseOrderBasis: () => void;
  replyModalReview: Review | null;
  replyText: string;
  setReplyText: (v: string) => void;
  replyError: string;
  onCloseReply: () => void;
  onConfirmReply: () => void;
  hideModalReview: Review | null;
  hideReason: string;
  setHideReason: (v: string) => void;
  hideError: string;
  onCloseHide: () => void;
  onConfirmHide: () => void;
  actionBusy: boolean;
}

/**
 * Các modal kiểm duyệt đánh giá: xem căn cứ đơn thuê (UC9.2.1),
 * phản hồi chính thức của cửa hàng và ẩn đánh giá vi phạm (UC9.2).
 */
export function ReviewModerationModals({
  orderBasisReview,
  orderBasisDetail,
  onCloseOrderBasis,
  replyModalReview,
  replyText,
  setReplyText,
  replyError,
  onCloseReply,
  onConfirmReply,
  hideModalReview,
  hideReason,
  setHideReason,
  hideError,
  onCloseHide,
  onConfirmHide,
  actionBusy,
}: ReviewModerationModalsProps) {
  return (
    <>
      {/* Modal Căn cứ đơn thuê (UC9.2.1) */}
      {orderBasisReview && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-560">
            <div className="modal-header">
              <h3 className="modal-title">Căn cứ đơn thuê thực tế (UC9.2.1)</h3>
              <button onClick={onCloseOrderBasis} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <div className="adm-card--slate mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="adm-cell-title">Đơn thuê #{orderBasisReview.orderId}</span>
                  <span className="badge badge-success">{orderBasisDetail?.status || "Hoàn tất"}</span>
                </div>
                <div className="adm-grid-2 text-[0.78rem] text-[#475569] gap-1.5">
                  <div>Khách thuê: <strong>{orderBasisReview.customerName}</strong></div>
                  <div>Mã khách hàng: <strong>{orderBasisReview.customerId}</strong></div>
                  <div>Sản phẩm đánh giá: <strong>{orderBasisReview.productName}</strong></div>
                  <div>Ngày đặt: <strong>{orderBasisDetail?.createdAt || "Chuyến đi gần nhất"}</strong></div>
                </div>
              </div>

              {orderBasisDetail && (
                <div className="mb-3">
                  <div className="adm-label--sub mb-1.5">Danh sách thiết bị trong đơn:</div>
                  <div className="adm-table-wrap rounded-lg">
                    {orderBasisDetail.items.map((it, idx) => (
                      <div key={idx} className={`flex justify-between py-2 px-3 text-[0.78rem] ${idx < orderBasisDetail.items.length - 1 ? "border-b border-[#E2E8F0]" : ""}`}>
                        <span>{it.productName} (x{it.qty})</span>
                        <span className="text-[#64748B]">{it.days} ngày · {fmt((it.price ?? it.pricePerDay) * it.qty * it.days)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-[0.8rem] font-bold">
                    <span>Tổng tiền thanh toán đơn:</span>
                    <span className="text-[var(--color-forest)]">{fmt(orderBasisDetail.total)}</span>
                  </div>
                </div>
              )}

              <div className="adm-alert is-warning adm-alert--block mb-0 text-[0.75rem]">
                ✓ Đơn thuê đã được nghiệm thu và hoàn tất bàn giao / trả đồ đầy đủ. Đánh giá của khách hàng đủ điều kiện hiển thị công khai.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={onCloseOrderBasis} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Phản hồi chính thức từ GearGo (UC9.2) */}
      {replyModalReview && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-md">
            <div className="modal-header">
              <h3 className="modal-title">Phản hồi chính thức từ GearGo (UC9.2)</h3>
              <button onClick={onCloseReply} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {replyError && (
                <div role="alert" className="adm-alert adm-alert--compact is-error">
                  <Icon name="alert-circle" size={15} />
                  <span>{replyError}</span>
                </div>
              )}
              <div className="adm-card--slate mb-3 text-[0.8rem]">
                <div className="font-bold text-[var(--color-bark)]">{replyModalReview.customerName} đánh giá {replyModalReview.rating} sao:</div>
                <div className="italic text-[#475569] mt-0.5">"{replyModalReview.comment}"</div>
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Nội dung phản hồi từ Cửa hàng / Admin</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="GearGo trân trọng cảm ơn quý khách đã phản hồi..."
                  className="form-textarea text-[0.85rem]"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                disabled={actionBusy}
                onClick={onCloseReply}
                className="btn btn-secondary btn-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={onConfirmReply}
                className="btn btn-primary btn-sm"
                disabled={actionBusy || !replyText.trim()}
              >
                {actionBusy ? "Đang lưu..." : "Lưu và phát hành phản hồi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ẩn đánh giá vi phạm */}
      {hideModalReview && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-sm">
            <div className="modal-header">
              <h3 className="modal-title">Ẩn đánh giá vi phạm</h3>
              <button onClick={onCloseHide} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {hideError && (
                <div role="alert" className="adm-alert adm-alert--compact is-error">
                  <Icon name="alert-circle" size={15} />
                  <span>{hideError}</span>
                </div>
              )}
              <div className="adm-alert is-error adm-alert--block text-[0.75rem] mb-3">
                <strong>LƯU Ý NGHIỆP VỤ BẮT BUỘC:</strong> Điểm đánh giá 1-2 sao tự nó KHÔNG phải lý do vi phạm. Chỉ được ẩn khi nhận xét có từ ngữ thô tục, quảng cáo spam hoặc hình ảnh phản cảm.
              </div>
              <p className="text-[0.82rem] text-[#4B5563] mb-2">
                Chọn căn cứ vi phạm chuẩn:
              </p>
              <select
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                className="adm-field adm-field--compact mb-3"
              >
                <option value="Vi phạm ngôn từ / Thô tục">Vi phạm ngôn từ / Xúc phạm thô tục</option>
                <option value="Chứa liên kết quảng cáo spam">Chứa liên kết quảng cáo spam</option>
                <option value="Hình ảnh phản cảm, không liên quan dã ngoại">Hình ảnh phản cảm, không liên quan dã ngoại</option>
                <option value="Tiết lộ thông tin cá nhân trái phép">Tiết lộ thông tin cá nhân trái phép</option>
                <option value="Thông tin hoàn toàn sai sự thật">Thông tin hoàn toàn sai sự thật (đã xác minh đối chiếu)</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={onCloseHide}
                  className="btn btn-secondary btn-md adm-btn-flex"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={onConfirmHide}
                  className="btn btn-md adm-btn-flex adm-btn-danger-solid"
                >
                  {actionBusy ? "Đang xử lý..." : "Xác nhận ẩn"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
