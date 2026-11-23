import { formatBackendEnum, formatDateVi } from "../../../store";
import type { ViewingEquipDetailState } from "./useEquipmentTab";

interface EquipScheduleModalProps {
  viewingEquipDetail: ViewingEquipDetailState;
  onClose: () => void;
}

// UC6.9: Modal xem chi tiết kỹ thuật và lịch phân công / giữ chỗ của thiết bị
export function EquipScheduleModal({ viewingEquipDetail, onClose }: EquipScheduleModalProps) {
  return (
    <div className="so-modal-overlay">
      <div className="so-modal-card-540">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="so-modal-tag is-blue">UC6.9: CHI TIẾT & LỊCH BẬN THIẾT BỊ</span>
            <h3 className="so-modal-title-sm">
              {viewingEquipDetail.detail?.maThietBiHienThi ||
                viewingEquipDetail.equip.displayCode ||
                viewingEquipDetail.equip.id}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="so-modal-close-sm">✕</button>
        </div>
        {viewingEquipDetail.loading ? (
          <div className="so-loading-center">Đang tải chi tiết và lịch bận...</div>
        ) : (
          <div>
            <div className="so-info-box-sm">
              <div>
                Trạng thái:{" "}
                <strong>{formatBackendEnum(viewingEquipDetail.detail?.trangThaiSuDung, viewingEquipDetail.equip.equipmentStatus)}</strong>
              </div>
              <div>
                Tình trạng:{" "}
                <strong>{viewingEquipDetail.detail?.tinhTrang || viewingEquipDetail.equip.condition}</strong>
              </div>
              {viewingEquipDetail.detail?.ngayNhap && (
                <div>
                  Ngày nhập: <strong>{formatDateVi(viewingEquipDetail.detail.ngayNhap)}</strong>
                </div>
              )}
            </div>
            <strong className="so-schedule-heading">
              Lịch phân công / giữ chỗ ({viewingEquipDetail.schedule.length}):
            </strong>
            {viewingEquipDetail.schedule.length === 0 ? (
              <div className="so-schedule-empty">Hiện không có lịch phân công nào.</div>
            ) : (
              <div className="flex flex-col gap-2 so-schedule-list">
                {viewingEquipDetail.schedule.map((sch) => (
                  <div key={sch.maPhanCong} className="so-schedule-item">
                    <span>
                      Đơn <strong>#{sch.maDonThue}</strong> ·{" "}
                      {formatDateVi(sch.tuNgay)} →{" "}
                      {formatDateVi(sch.denNgay)}
                    </span>
                    <span className="so-schedule-status">{formatBackendEnum(sch.trangThai)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
