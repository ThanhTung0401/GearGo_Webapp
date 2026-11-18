import type { KiemTraChinhSachBackend } from "../../../../services/api/policyApi";
import { fmt, type PolicyVersion } from "../../../../store";
import Icon from "../../../../components/Icon";
import type { PolicyFieldDiff } from "./usePoliciesTab";

interface PolicyConfirmDiffModalProps {
  diffs: PolicyFieldDiff[];
  changeReason: string;
  onChangeReason: (value: string) => void;
  effectiveDate: string;
  onChangeEffectiveDate: (value: string) => void;
  checkingPolicy: boolean;
  previewCheck: KiemTraChinhSachBackend | null;
  modalError: string;
  policySaving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Modal đối chiếu thay đổi Cũ vs Mới trước khi ban hành phiên bản chính sách (UC8.1.1).
 */
export function PolicyConfirmDiffModal({
  diffs,
  changeReason,
  onChangeReason,
  effectiveDate,
  onChangeEffectiveDate,
  checkingPolicy,
  previewCheck,
  modalError,
  policySaving,
  onConfirm,
  onClose,
}: PolicyConfirmDiffModalProps) {
  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal-dialog is-md p-6 max-w-[580px]">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="adm-pill is-success">
              UC8.1.1: ĐỐI CHIẾU PHIÊN BẢN MỚI
            </span>
            <h3 className="adm-card-title text-[1.25rem] mt-1">
              Xác nhận ban hành chính sách mới
            </h3>
          </div>
          <button type="button" onClick={onClose} className="adm-btn-ghost text-lg">✕</button>
        </div>

        <p className="text-[0.78rem] text-[#4B5563] mb-3">
          Hệ thống đã phát hiện <strong>{diffs.length} thông số</strong> có sự thay đổi so với phiên bản hiện tại:
        </p>

        {/* Bảng diff Cũ vs Mới (bọc adm-table-scroll để cuộn ngang mượt trên mobile 390px) */}
        <div className="adm-diff-box">
          <div className="adm-table-scroll">
            <table className="adm-table adm-table--sm">
              <thead>
                <tr>
                  <th>Thông số</th>
                  <th>Giá trị cũ</th>
                  <th>Giá trị mới</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d) => (
                  <tr key={d.field}>
                    <td className="font-semibold">{d.field}</td>
                    <td className="text-[#9CA3AF] line-through">{d.oldVal}</td>
                    <td className="text-[var(--color-forest)] font-bold">{d.newVal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-3">
          <label className="adm-label--sub">
            Lý do điều chỉnh chính sách * (Bắt buộc theo UC8.1)
          </label>
          <textarea
            placeholder="VD: Cập nhật biểu phí bồi thường phụ kiện và nâng tỷ lệ phạt hủy mùa cao điểm..."
            value={changeReason}
            onChange={(e) => onChangeReason(e.target.value)}
            rows={2}
            className="adm-field adm-field--compact adm-field--no-resize"
          />
        </div>

        <div className="mb-4">
          <label className="adm-label--sub">
            Thời điểm bắt đầu có hiệu lực
          </label>
          <input
            type="datetime-local"
            value={effectiveDate}
            onChange={(e) => onChangeEffectiveDate(e.target.value)}
            className="adm-field adm-field--compact"
          />
          <span className="adm-hint-text text-[0.7rem]">Chính sách mới sẽ chỉ áp dụng cho các đơn đặt thuê phát sinh từ mốc thời gian này (không hồi tố).</span>
        </div>

        {checkingPolicy && (
          <div className="adm-loading-text mb-2.5 text-[0.78rem]">
            Đang kiểm tra hợp lệ phiên bản chính sách với máy chủ...
          </div>
        )}

        {previewCheck && (previewCheck.canhBao?.length ?? 0) > 0 && (
          <div className="adm-alert is-warning adm-alert--compact adm-alert--block">
            <strong>Cảnh báo từ hệ thống:</strong> {previewCheck.canhBao.join(" | ")}
          </div>
        )}

        {modalError && (
          <div role="alert" className="adm-alert adm-alert--compact is-error mb-3">
            <Icon name="alert-circle" size={15} />
            <span>{modalError}</span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={policySaving}
            onClick={onClose}
            className="adm-btn-outline py-2 px-4 text-[0.82rem]"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={policySaving}
            onClick={onConfirm}
            className="adm-btn-primary py-2 px-4.5 font-bold text-[0.82rem]"
          >
            {policySaving ? "Đang ban hành..." : "✓ Ban hành & Lưu phiên bản mới"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PolicySnapshotModalProps {
  snapshot: PolicyVersion;
  onClose: () => void;
}

/**
 * Modal xem chi tiết snapshot các thông số quy tắc của một phiên bản chính sách cũ.
 */
export function PolicySnapshotModal({ snapshot, onClose }: PolicySnapshotModalProps) {
  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal-dialog is-md p-6 max-w-[540px]">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="adm-pill is-parchment adm-cell-mono">
              SNAPSHOT {snapshot.version}
            </span>
            <h3 className="adm-card-title text-[1.2rem] mt-1">
              Chính sách có hiệu lực từ {snapshot.effectiveDate}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="adm-btn-ghost text-lg">✕</button>
        </div>

        <div className="adm-hint-text text-[0.78rem] mb-3">
          Lý do ban hành: <strong>{snapshot.changeReason}</strong> (Cập nhật bởi {snapshot.updatedBy} lúc {snapshot.updatedAt})
        </div>

        <div className="adm-card--parchment text-[0.78rem] flex flex-col gap-1.5 max-h-[260px] overflow-y-auto">
          <div className="flex justify-between"><span>Thời gian giữ chỗ:</span><strong>{snapshot.configSnapshot.holdMinutes} phút</strong></div>
          <div className="flex justify-between"><span>Giờ nhận / trả chuẩn:</span><strong>{snapshot.configSnapshot.standardPickupTime || "08:00"} - {snapshot.configSnapshot.standardReturnTime || "20:00"}</strong></div>
          <div className="flex justify-between"><span>Phí phạt hủy 24-48h:</span><strong>{snapshot.configSnapshot.cancellationTier1FeePercent}%</strong></div>
          <div className="flex justify-between"><span>Phí phạt hủy &lt;24h:</span><strong>{snapshot.configSnapshot.cancellationTier2FeePercent}%</strong></div>
          <div className="flex justify-between"><span>Hệ số phạt trễ hạn:</span><strong>{snapshot.configSnapshot.overdueMultiplier}x/ngày</strong></div>
          <div className="flex justify-between"><span>Tỷ lệ bồi thường hỏng:</span><strong>{snapshot.configSnapshot.damageCompensationPercent}%</strong></div>
          <div className="flex justify-between"><span>Ngưỡng duyệt phụ phí:</span><strong>{fmt(snapshot.configSnapshot.adminApprovalFeeThreshold)}</strong></div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="adm-btn-primary py-2 px-4.5 font-bold text-[0.82rem]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
