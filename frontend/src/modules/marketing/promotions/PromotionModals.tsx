import { useApp } from "../../../context/AppContext";
import { type Promotion } from "../../../store";
import { FormModal } from "../../inventory/forms/FormModal";
import { PromotionForm } from "../forms/PromotionForm";
import PromotionDetailModal from "../../../components/PromotionDetailModal";

interface PromotionModalsProps {
  app: ReturnType<typeof useApp>;
  action: Promotion | "new" | null;
  setAction: (v: Promotion | "new" | null) => void;
  selectedPromoDetail: Promotion | null;
  setSelectedPromoDetail: (v: Promotion | null) => void;
  stoppingPromo: Promotion | null;
  setStoppingPromo: (v: Promotion | null) => void;
  stopReason: string;
  setStopReason: (v: string) => void;
  stopError: string;
  stopLoading: boolean;
  onPauseSubmit: (e: React.FormEvent) => void;
  onToggleStatus: (p: Promotion) => void;
}

/**
 * Các modal nghiệp vụ quản lý khuyến mãi:
 * tạo/sửa mã giảm (UC8.2, UC8.3), xem đơn áp dụng (UC8.4) và xác nhận tạm dừng (UC8.5).
 */
export function PromotionModals({
  app,
  action,
  setAction,
  selectedPromoDetail,
  setSelectedPromoDetail,
  stoppingPromo,
  setStoppingPromo,
  stopReason,
  setStopReason,
  stopError,
  stopLoading,
  onPauseSubmit,
  onToggleStatus,
}: PromotionModalsProps) {
  return (
    <>
      {/* Modal Form tạo/sửa khuyến mãi (UC8.2 & UC8.3) */}
      {action && (
        <PromotionForm
          app={app}
          promotion={action === "new" ? undefined : action}
          onClose={() => setAction(null)}
        />
      )}

      {/* Modal tra cứu chi tiết và thống kê doanh thu / đơn hàng áp dụng (UC8.4) */}
      {selectedPromoDetail && (() => {
        const livePromo = app.promotions.find((item) => item.id === selectedPromoDetail.id) ?? selectedPromoDetail;
        return (
          <PromotionDetailModal
            promotion={livePromo}
            app={app}
            onClose={() => setSelectedPromoDetail(null)}
            onEdit={() => {
              setAction(livePromo);
              setSelectedPromoDetail(null);
            }}
            onToggleStatus={() => {
              onToggleStatus(livePromo);
            }}
          />
        );
      })()}

      {/* Modal xác nhận lý do tạm dừng chương trình (UC8.5) */}
      {stoppingPromo && (
        <FormModal
          title={`Tạm dừng khuyến mãi: ${stoppingPromo.code}`}
          description="Bắt buộc nhập lý do tạm dừng để ghi nhận Audit Log theo đúng quy tắc UC8.5."
          onClose={() => setStoppingPromo(null)}
        >
          <form onSubmit={onPauseSubmit} className="grid gap-4 mt-4">
            <label className="adm-label">
              Lý do tạm dừng chương trình (Bắt buộc)
              <textarea
                rows={3}
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                placeholder="VD: Hết ngân sách chiến dịch tháng này / Phát hiện gian lận lạm dụng mã / Tạm dừng theo chỉ đạo của ban giám đốc..."
                className="adm-field"
              />
            </label>
            {stopError && (
              <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">
                {stopError}
              </div>
            )}
            <div className="modal-footer mt-2">
              <button
                type="button"
                disabled={stopLoading}
                onClick={() => setStoppingPromo(null)}
                className="btn btn-secondary btn-md"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={stopLoading}
                className="adm-btn-warning-solid"
              >
                {stopLoading ? "Đang xử lý..." : "⏸ Xác nhận tạm dừng (UC8.5)"}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </>
  );
}
