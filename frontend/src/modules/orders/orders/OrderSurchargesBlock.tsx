import { fmt, type Surcharge } from "../../../store";

interface OrderSurchargesBlockProps {
  surcharges: Surcharge[];
  onStartDispute: (surcharge: Surcharge) => void;
}

/**
 * Khối phụ phí & bồi thường phát sinh của đơn thuê kèm nút gửi khiếu nại (UC5.2 & UC5.3).
 */
export function OrderSurchargesBlock({
  surcharges,
  onStartDispute,
}: OrderSurchargesBlockProps) {
  if (!surcharges || surcharges.length === 0) return null;

  return (
    <div className="cp-surcharge-box">
      <div className="flex justify-between items-center mb-2">
        <strong className="cp-surcharge-title">
          ⚠️ Khoản phụ phí phát sinh ({surcharges.length} mục):
        </strong>
        <span className="cp-surcharge-uc-pill">
          UC5.2 / UC5.3
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {surcharges.map((sc) => {
          // Ánh xạ 4 trạng thái hữu hạn của phụ phí sang lớp CSS tương ứng
          const statusBadge =
            sc.status === "Đã duyệt"
              ? { cls: "cp-surcharge-badge--approved", label: "Đã duyệt" }
              : sc.status === "Tranh chấp"
              ? { cls: "cp-surcharge-badge--disputed", label: "Đang khiếu nại" }
              : sc.status === "Từ chối"
              ? { cls: "cp-surcharge-badge--rejected", label: "Đã hủy bỏ" }
              : { cls: "cp-surcharge-badge--pending", label: "Chờ duyệt" };

          return (
            <div key={sc.id} className="cp-surcharge-card">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <strong>{sc.type}</strong> ({sc.equipmentId})
                  <div className="cp-surcharge-reason">{sc.reason}</div>
                </div>
                <div className="text-right">
                  <span className="cp-surcharge-amount">
                    +{fmt(sc.amount)}
                  </span>
                  {sc.originalAmount && sc.originalAmount > sc.amount && (
                    <div className="cp-surcharge-original">
                      {fmt(sc.originalAmount)}
                    </div>
                  )}
                  <div>
                    <span className={`cp-surcharge-badge ${statusBadge.cls}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phản hồi khiếu nại của khách */}
              {sc.customerResponse && (
                <div className="cp-surcharge-response">
                  <strong>Ý kiến của bạn:</strong> "{sc.customerResponse}"
                </div>
              )}

              {/* Kết luận của Quản trị viên */}
              {sc.resolutionNote && (
                <div className="cp-surcharge-resolution">
                  <strong>Quyết định QTV:</strong> {sc.resolutionNote}
                </div>
              )}

              {/* Nút Khiếu nại phụ phí (Dòng 5.1 UC5.2) */}
              {(sc.status === "Chờ duyệt" || sc.status === "Đã duyệt") && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => onStartDispute(sc)}
                    className="cp-surcharge-dispute-btn"
                  >
                    ⚖️ Gửi khiếu nại mức phí này (Dòng phụ 5.1)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
