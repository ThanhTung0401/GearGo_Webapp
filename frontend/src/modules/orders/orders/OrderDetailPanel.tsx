import { fmt, type Order, type Surcharge } from "../../../store";
import type { DonChiTietBackend, PhieuBanGiaoKhachBackend } from "../../../services/api";
import type { ExtraPayStatus, ViewingRecordType } from "./useMyOrders";
import { OrderSurchargesBlock } from "./OrderSurchargesBlock";

interface OrderDetailPanelProps {
  detail: Order;
  realApi: boolean;
  loadingDetail: boolean;
  actionError: string;
  showInlineError: boolean;
  rawOrderDetail: DonChiTietBackend | null;
  orderHandovers: PhieuBanGiaoKhachBackend[];
  orderPolicy: Record<string, unknown> | null;
  extraPayBusy: boolean;
  extraPayStatus: ExtraPayStatus | null;
  onClose: () => void;
  onStartDispute: (surcharge: Surcharge) => void;
  onPayNow: (orderId: string) => void;
  onViewRecord: (record: ViewingRecordType) => void;
  onExtraPay: (maDoiSoat: number, orderId: string) => Promise<void>;
  onCheckExtraPayStatus: (maYeuCau: string, orderId: string) => Promise<void>;
  onGoToReviewQuick: () => void;
  onGoToProfile: () => void;
  onOpenCancel: (orderId: string) => Promise<void>;
}

/**
 * Panel chi tiết đơn thuê & chứng từ sticky (UC3.3, UC4.2, UC4.3, UC5.2, UC5.4, UC5.5).
 */
export function OrderDetailPanel({
  detail,
  realApi,
  loadingDetail,
  actionError,
  showInlineError,
  rawOrderDetail,
  orderHandovers,
  orderPolicy,
  extraPayBusy,
  extraPayStatus,
  onClose,
  onStartDispute,
  onPayNow,
  onViewRecord,
  onExtraPay,
  onCheckExtraPayStatus,
  onGoToReviewQuick,
  onGoToProfile,
  onOpenCancel,
}: OrderDetailPanelProps) {
  // Tính số tiền cần thu bổ sung sau đối soát (UC5.5)
  const latestDs = rawOrderDetail?.taiChinh?.doiSoat?.[0];
  const daThuBoSung = Number(rawOrderDetail?.taiChinh?.thu?.thuBoSungDaThu ?? 0);
  const canThuThem = Number(latestDs?.soTienCanThuThem ?? 0);
  const conPhaiThu = Math.max(0, canThuThem - daThuBoSung);
  const policyContent = orderPolicy?.noiDung as Record<string, unknown> | undefined;

  return (
    <div className="card-panel self-start sticky top-24 cp-card cp-card--elevated cp-sticky-panel--header-offset">
      <div className="flex justify-between items-start mb-4 pb-3 border-b border-bone">
        <div>
          <div className="font-mono text-xs text-moss font-bold">{detail.displayCode || detail.id}</div>
          <h3 className="font-display font-bold text-base text-bark cp-order-detail-title">
            Chi tiết đơn thuê & Chứng từ {loadingDetail ? "(Đang tải...)" : ""}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm text-gray-400 cp-order-detail-close"
        >
          ✕
        </button>
      </div>
      {showInlineError && actionError && (
        <div role="alert" className="cp-alert-error cp-alert-error--sm">
          {actionError}
        </div>
      )}

      {/* Bảng kê thiết bị trong đơn */}
      <div className="cp-order-items-section">
        <div className="cp-order-items-heading">
          📦 Danh sách thiết bị ({detail.items.length} món):
        </div>
        <div className="cp-order-items-box">
          {detail.items.map((item, idx) => (
            <div key={idx} className="cp-order-item-line">
              <span>{item.productName} <strong>× {item.qty}</strong></span>
              <span className="cp-order-item-price">{fmt(item.pricePerDay * item.qty * item.days)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bảng kê chi phí */}
      <div className="flex flex-col gap-2 mb-4 text-xs">
        {[
          ["Khách hàng nhận", detail.customerName],
          ["SĐT liên hệ", detail.customerPhone],
          ["Thời gian nhận đồ", detail.pickupTime],
          ["Thời gian trả đồ", detail.returnTime],
          ["Tiền thuê thiết bị", fmt(detail.rental)],
          ["Giảm giá ưu đãi", detail.discount > 0 ? `−${fmt(detail.discount)}` : "—"],
          ["Tiền cọc bảo đảm (Hoàn trả)", fmt(detail.depositTotal)],
          ["Tổng ban đầu", fmt(detail.rental - detail.discount + detail.depositTotal)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between py-1 border-b border-dashed border-bone">
            <span className="text-gray-500">{k}</span>
            <span className="font-semibold text-bark">{v}</span>
          </div>
        ))}
      </div>

      {/* UC5.2 & UC5.3: Khối phụ phí & bồi thường phát sinh */}
      {detail.surcharges && detail.surcharges.length > 0 && (
        <OrderSurchargesBlock
          surcharges={detail.surcharges}
          onStartDispute={onStartDispute}
        />
      )}

      {/* Các nút xem chứng từ liên quan (BBBG - UC4.2, PNT - UC4.3, Đối soát - UC5.4) */}
      <div className="flex flex-col gap-2 mb-4">
        {detail.status === "Chờ thanh toán" && (
          <button
            type="button"
            onClick={() => onPayNow(detail.id)}
            className="cp-doc-btn cp-doc-btn--pay"
          >
            💳 Mở cổng VietQR thanh toán ngay (Thời hạn 15 phút) →
          </button>
        )}

        {detail.handoverRecord && (
          <button
            onClick={() => onViewRecord("bbbg")}
            className="cp-doc-btn cp-doc-btn--bbbg"
          >
            📋 Xem Biên bản bàn giao (BBBG - UC4.2)
          </button>
        )}

        {detail.returnReceipts && detail.returnReceipts.length > 0 && (
          <button
            onClick={() => onViewRecord("pnt")}
            className="cp-doc-btn cp-doc-btn--pnt"
          >
            📦 Xem Phiếu nhận trả ({detail.returnReceipts.length} đợt - UC4.3)
          </button>
        )}

        {/* Nút xem Bảng đối soát cọc và hoàn tất đơn (UC5.4) */}
        {(detail.reconciliation || detail.status === "Hoàn tất") && (
          <button
            onClick={() => onViewRecord("reconciliation")}
            className="cp-doc-btn cp-doc-btn--reconcile"
          >
            📑 Xem Bảng đối soát cọc & Hoàn tất đơn (UC5.4)
          </button>
        )}

        {/* UC5.5: Thanh toán khoản thu bổ sung khi đối soát phát sinh soTienCanThuThem > 0 */}
        {latestDs && conPhaiThu > 0 && (
          <div className="cp-extra-pay-box">
            <div className="cp-extra-pay-title">
              💳 Cần thanh toán bổ sung sau đối soát: {fmt(conPhaiThu)}
            </div>
            <button
              type="button"
              disabled={extraPayBusy}
              onClick={() => void onExtraPay(latestDs.maDoiSoat, detail.id)}
              className={`cp-extra-pay-btn ${extraPayBusy ? "is-busy" : ""}`}
            >
              {extraPayBusy ? "Đang khởi tạo giao dịch..." : `Thanh toán khoản thu bổ sung (${fmt(conPhaiThu)}) →`}
            </button>
            {extraPayStatus && (
              <div className="cp-extra-pay-status">
                <div>{extraPayStatus.message}</div>
                {extraPayStatus.maYeuCau && (
                  <button
                    type="button"
                    onClick={() => void onCheckExtraPayStatus(extraPayStatus.maYeuCau!, detail.id)}
                    className="cp-extra-pay-check-btn"
                  >
                    🔄 Kiểm tra trạng thái giao dịch
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nút tắt viết đánh giá sản phẩm (UC9.1) */}
        {detail.status === "Hoàn tất" && (
          <button
            type="button"
            onClick={onGoToReviewQuick}
            className="cp-doc-btn cp-doc-btn--review"
          >
            ⭐ Viết đánh giá trải nghiệm sản phẩm (UC9.1) →
          </button>
        )}
      </div>

      {/* UC3.3: Thông tin bàn giao & Chính sách áp dụng tại thời điểm đặt */}
      {realApi && (orderHandovers.length > 0 || orderPolicy) && (
        <div className="cp-order-meta-stack">
          {orderHandovers.length > 0 && (
            <div className="cp-order-handover-box">
              <div className="cp-order-handover-title">
                🤝 Biên bản bàn giao từ cửa hàng ({orderHandovers.length} phiếu)
              </div>
              {orderHandovers.map((bg) => (
                <div key={bg.maPhieuBanGiao} className="cp-order-handover-entry">
                  <div className="cp-order-handover-row">
                    <span>Trạng thái: <strong>{bg.trangThai}</strong></span>
                    {bg.thoiDiemGiaoThucTe && (
                      <span>{new Date(bg.thoiDiemGiaoThucTe).toLocaleString("vi-VN")}</span>
                    )}
                  </div>
                  {bg.chiTiet?.length > 0 && (
                    <div className="cp-order-handover-items">
                      {bg.chiTiet.map((ct) => (
                        <div key={ct.maChiTietBanGiao} className="cp-order-handover-item">
                          • {ct.tenSanPham} ({ct.maThietBiHienThi}) — {ct.tinhTrangTruocThue || "Đạt chuẩn"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {orderPolicy && (
            <div className="cp-order-policy-box">
              <div className="cp-order-policy-title">
                📜 Chính sách áp dụng: {String(orderPolicy.tenChinhSach || "Chính sách thuê GearGo")}
                {orderPolicy.phienBan ? ` (v${String(orderPolicy.phienBan)})` : ""}
              </div>
              <div className="cp-order-policy-desc">
                {Boolean(policyContent?.thoiGianGiuChoPhut) && (
                  <span>
                    Giữ chỗ: {String(policyContent?.thoiGianGiuChoPhut)} phút ·{" "}
                  </span>
                )}
                {Boolean(policyContent?.heSoTre) && (
                  <span>
                    Hệ số trễ: ×{String(policyContent?.heSoTre)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lịch sử trạng thái */}
      <div className="mb-4">
        <div className="text-xs font-bold text-bark mb-2">Lịch sử tiến trình đơn</div>
        <div className="cp-order-history-scroll">
          {detail.statusHistory.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="badge badge-neutral text-xs cp-order-history-badge">{h.status}</span>
              <span className="text-gray-400 text-xs">{h.at} · {h.by}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nút Hủy đơn cho mọi trạng thái trước bàn giao (UC3.4) */}
      {["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(detail.status) && (
        <button
          onClick={() => void onOpenCancel(detail.id)}
          className="btn btn-danger btn-sm btn-full cp-btn-order-cancel"
        >
          Yêu cầu hủy đơn thuê (UC3.4)
        </button>
      )}

      {detail.status === "Hoàn tất" && (
        <button
          onClick={onGoToProfile}
          className="btn btn-primary btn-sm btn-full cp-btn-order-review"
        >
          ⭐ Viết đánh giá trải nghiệm (UC9.1)
        </button>
      )}
    </div>
  );
}
