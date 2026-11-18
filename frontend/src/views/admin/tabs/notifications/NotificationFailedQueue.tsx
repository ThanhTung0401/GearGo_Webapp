import Icon from "../../../../components/Icon";
import { type ThongBaoGuiLoiBackend } from "../../../../services/api/notificationApi";

interface NotificationFailedQueueProps {
  realApi: boolean;
  failedItems: ThongBaoGuiLoiBackend[];
  failedTotal: number;
  failedPage: number;
  failedLoading: boolean;
  failedError: string;
  failedSuccess: string;
  retryTarget: ThongBaoGuiLoiBackend | null;
  setRetryTarget: (target: ThongBaoGuiLoiBackend | null) => void;
  retryReason: string;
  setRetryReason: (reason: string) => void;
  retryingId: number | null;
  onLoadFailedQueue: (page: number) => void;
  onConfirmRetry: () => void;
}

/**
 * Bảng hàng chờ thông báo gửi lỗi & modal kích hoạt thử lại thủ công (UC9.5).
 */
export function NotificationFailedQueue({
  realApi,
  failedItems,
  failedTotal,
  failedPage,
  failedLoading,
  failedError,
  failedSuccess,
  retryTarget,
  setRetryTarget,
  retryReason,
  setRetryReason,
  retryingId,
  onLoadFailedQueue,
  onConfirmRetry,
}: NotificationFailedQueueProps) {
  return (
    <>
      <div className="adm-notif-queue-box">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-3">
          <div>
            <h3 className="adm-card-title text-[1.15rem] flex items-center gap-2 flex-wrap">
              <span className="text-[#E07A43] inline-flex"><Icon name="alert-circle" size={18} /></span>
              <span>Hàng chờ gửi lỗi &amp; Thử lại (UC9.5)</span>
              <span className={`adm-pill adm-pill--round adm-cell-mono ${failedTotal > 0 ? "is-danger-dark" : "is-neutral"}`}>
                {failedTotal} bản ghi lỗi
              </span>
            </h3>
            <p className="adm-hint-text text-[0.8rem] m-0">
              Theo dõi các thông báo/email gửi thất bại từ hàng chờ nền và kích hoạt thử lại thủ công theo dõi số lần thử.
            </p>
          </div>
          {realApi && (
            <button
              type="button"
              disabled={failedLoading}
              onClick={() => onLoadFailedQueue(failedPage)}
              className="btn btn-secondary btn-sm"
            >
              <span className="icon-label">
                <Icon name="refresh" size={14} />
                {failedLoading ? "Đang tải..." : "Tải lại hàng chờ"}
              </span>
            </button>
          )}
        </div>

        {failedError && (
          <div role="alert" className="adm-alert adm-alert--compact is-error mb-3">
            <Icon name="alert-circle" size={15} />
            <span>{failedError}</span>
          </div>
        )}

        {failedSuccess && (
          <div role="status" className="adm-alert adm-alert--compact is-success mb-3">
            <Icon name="check" size={15} />
            <span>{failedSuccess}</span>
          </div>
        )}

        {!realApi ? (
          <div className="adm-card--parchment text-[0.8rem] text-[#4B5563]">
            Hàng chờ gửi lỗi kết nối trực tiếp tới máy chủ (/api/v1/admin/thong-bao/gui-loi). Vui lòng bật chế độ API thật để theo dõi và thử lại.
          </div>
        ) : (
          <div className="adm-table-wrap">
            <div className="responsive-table">
              <table className="adm-table adm-table--zebra adm-table--md">
                <thead>
                  <tr>
                    {["Mã TB", "Tài khoản / Đơn", "Tiêu đề & Nội dung", "Trạng thái / Lần thử", "Lỗi gần nhất", "Thời điểm tạo", "Thao tác"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {failedLoading ? (
                    <tr>
                      <td colSpan={7} className="adm-table-empty">
                        Đang tải hàng chờ thông báo gửi lỗi...
                      </td>
                    </tr>
                  ) : failedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="adm-table-empty text-[#1B3F2F]">
                        Không có thông báo nào đang lỗi trong hàng chờ gửi.
                      </td>
                    </tr>
                  ) : (
                    failedItems.map((item) => (
                      <tr key={item.maThongBao}>
                        <td className="adm-cell-code">
                          #{item.maThongBao}
                        </td>
                        <td className="adm-cell-mono text-[0.76rem]">
                          <div>TK #{item.maTaiKhoan}</div>
                          {item.maDonThue && <div className="adm-hint-text">Đơn #{item.maDonThue}</div>}
                        </td>
                        <td className="max-w-[260px]">
                          <div className="font-bold text-[#11231B]">{item.tieuDe}</div>
                          <div className="text-[0.74rem] text-[#4B5563] mt-0.5">{item.noiDung}</div>
                        </td>
                        <td>
                          <span className="adm-pill is-danger-dark">
                            {item.trangThaiGui}
                          </span>
                          <div className="adm-hint-text mt-1">
                            Đã thử: <strong>{item.soLanThuGui}</strong> lần
                          </div>
                        </td>
                        <td className="text-[0.75rem] text-[#991B1B] max-w-[220px]">
                          {item.loiGuiGanNhat || "Lỗi kết nối cổng gửi"}
                        </td>
                        <td className="adm-cell-mono adm-hint-text text-[0.74rem] whitespace-nowrap">
                          {new Date(item.thoiDiemTao).toLocaleString("vi-VN")}
                        </td>
                        <td>
                          <button
                            type="button"
                            disabled={retryingId === item.maThongBao}
                            onClick={() => {
                              setRetryTarget(item);
                              setRetryReason("Thử gửi lại thông báo qua hàng chờ thủ công");
                            }}
                            className="adm-btn-amber-sm"
                          >
                            <Icon name="refresh" size={13} />
                            Thử lại
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {failedTotal > 10 && (
              <div className="adm-table-pagination">
                <span>Trang {failedPage} · Tổng {failedTotal} bản ghi</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={failedPage <= 1 || failedLoading}
                    onClick={() => onLoadFailedQueue(failedPage - 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={failedPage * 10 >= failedTotal || failedLoading}
                    onClick={() => onLoadFailedQueue(failedPage + 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal xác nhận thử lại gửi thông báo lỗi (UC9.5) */}
      {retryTarget && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-sm max-w-[460px]">
            <div className="modal-header">
              <h3 className="modal-title">Thử lại gửi thông báo #{retryTarget.maThongBao}</h3>
              <button type="button" onClick={() => setRetryTarget(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body flex flex-col gap-3">
              <div className="adm-card--cream text-[0.8rem] p-2.5">
                <div className="font-bold text-[#11231B]">{retryTarget.tieuDe}</div>
                <div className="text-[#4B5563] mt-1">{retryTarget.noiDung}</div>
                {retryTarget.loiGuiGanNhat && (
                  <div className="text-[#B91C1C] text-[0.74rem] mt-1.5">
                    Lỗi gần nhất: {retryTarget.loiGuiGanNhat}
                  </div>
                )}
              </div>
              <div>
                <label className="adm-label--sub">
                  Lý do / ghi chú thử lại (lưu nhật ký UC9.5)
                </label>
                <textarea
                  rows={2}
                  value={retryReason}
                  onChange={(e) => setRetryReason(e.target.value)}
                  placeholder="VD: Đã kiểm tra cấu hình SMTP, kích hoạt gửi lại..."
                  className="adm-field adm-field--compact"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={retryingId !== null}
                  onClick={() => setRetryTarget(null)}
                  className="btn btn-secondary btn-md adm-btn-flex"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={retryingId !== null}
                  onClick={onConfirmRetry}
                  className="btn btn-primary btn-md adm-btn-flex"
                >
                  {retryingId === retryTarget.maThongBao ? "Đang gửi lại..." : "Xác nhận thử lại"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
