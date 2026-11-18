import type { ApproveLostTarget } from "./returnTypes";

interface ReturnApproveLostModalProps {
  approveLostTarget: ApproveLostTarget;
  lostBienBan: string;
  setLostBienBan: (v: string) => void;
  lostCompAmount: number;
  setLostCompAmount: (v: number) => void;
  lostApproveReason: string;
  setLostApproveReason: (v: string) => void;
  returnBusy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Modal duyệt kết luận mất thiết bị và liên kết phụ phí bồi thường (yêu cầu quyền QTV)
export function ReturnApproveLostModal({
  approveLostTarget,
  lostBienBan,
  setLostBienBan,
  lostCompAmount,
  setLostCompAmount,
  lostApproveReason,
  setLostApproveReason,
  returnBusy,
  onClose,
  onConfirm,
}: ReturnApproveLostModalProps) {
  return (
    <div className="so-modal-overlay is-top">
      <div className="so-modal-card-lost">
        <h3 className="so-modal-title-xs">
          Duyệt kết luận mất: {approveLostTarget.chiTiet.maThietBiHienThi}
        </h3>
        <p className="so-modal-desc-sm">
          Thao tác này ghi nhận thiết bị thất lạc vĩnh viễn và liên kết phụ phí bồi thường vào phiếu nhận trả.
        </p>
        <label className="so-field-label-xs">Biên bản xác nhận mất</label>
        <input
          value={lostBienBan}
          onChange={(e) => setLostBienBan(e.target.value)}
          className="so-input-mb10-sm"
        />
        <label className="so-field-label-xs">Số tiền bồi thường đề nghị (đ)</label>
        <input
          type="number"
          value={lostCompAmount}
          onChange={(e) => setLostCompAmount(Number(e.target.value))}
          className="so-input-mono-mb10"
        />
        <label className="so-field-label-xs">Lý do duyệt</label>
        <textarea
          rows={2}
          value={lostApproveReason}
          onChange={(e) => setLostApproveReason(e.target.value)}
          className="so-textarea-mb14"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="so-btn-cancel-sm">Hủy</button>
          <button
            disabled={returnBusy}
            onClick={() => void onConfirm()}
            className="so-btn-danger-modal-md"
          >
            {returnBusy ? "Đang duyệt..." : "Xác nhận duyệt mất"}
          </button>
        </div>
      </div>
    </div>
  );
}
