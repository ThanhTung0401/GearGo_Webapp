import type React from "react";
import { useApp } from "../../../context/AppContext";
import { fmt, ReturnReceipt } from "../../../store";

interface ReturnReceiptMockModalProps {
  app: ReturnType<typeof useApp>;
  viewingReceipt: ReturnReceipt;
  setViewingReceipt: React.Dispatch<React.SetStateAction<ReturnReceipt | null>>;
  setReturnSuccess: (v: string | null) => void;
}

// Modal xem chi tiết Phiếu Nhận Trả ở chế độ Mock (PNT-...)
export function ReturnReceiptMockModal({
  app,
  viewingReceipt,
  setViewingReceipt,
  setReturnSuccess,
}: ReturnReceiptMockModalProps) {
  return (
    <div className="so-modal-overlay">
      <div className="so-modal-card-580">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`so-modal-tag is-pill ${viewingReceipt.isFinalReturn ? "is-green" : "is-orange"}`}>
              {viewingReceipt.isFinalReturn ? "LẦN NHẬN TRẢ CUỐI CÙNG" : `PHIẾU NHẬN TRẢ ĐỢT ${viewingReceipt.returnRound}`}
            </span>
            <h3 className="so-modal-title">Phiếu Nhận Trả: {viewingReceipt.id}</h3>
          </div>
          <button onClick={() => setViewingReceipt(null)} className="so-modal-close-sm">✕</button>
        </div>

        <div className="so-info-box">
          <div><strong>Mã đơn thuê:</strong> {viewingReceipt.orderId}</div>
          <div><strong>Thời gian nhận:</strong> {viewingReceipt.returnedAt}</div>
          <div><strong>Nhân viên nhận:</strong> {viewingReceipt.staffName}</div>
          <div><strong>Ghi chú:</strong> {viewingReceipt.note || "Không có"}</div>
        </div>

        <strong className="so-receipt-section-label">Chi tiết thiết bị nhận trong đợt này:</strong>
        <div className="flex flex-col gap-2 mt-2 mb-4">
          {viewingReceipt.items.map((it) => (
            <div key={it.equipmentId} className="so-receipt-item-row-sm">
              <div>
                <strong className="so-receipt-item-code">{it.equipmentId}</strong>
                <div className="so-receipt-item-meta">
                  Tình trạng: <strong>{it.condition}</strong> {it.note ? `(${it.note})` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {it.condition === "Mất thiết bị" && !it.lostApproved && (
                  <button
                    onClick={() => {
                      const res = app.approveLostEquipment(viewingReceipt.orderId, it.equipmentId, "Quản trị viên");
                      if (res.ok) {
                        setReturnSuccess(`Đã duyệt kết luận mất cho thiết bị ${it.equipmentId}.`);
                        setViewingReceipt((prev) =>
                          prev
                            ? {
                                ...prev,
                                items: prev.items.map((x) =>
                                  x.equipmentId === it.equipmentId ? { ...x, lostApproved: true } : x
                                ),
                              }
                            : null
                        );
                      }
                    }}
                    className="so-btn-danger-mock"
                  >
                    Duyệt mất
                  </button>
                )}
                {it.surchargeAmount > 0 && (
                  <span className="so-receipt-item-fee">+{fmt(it.surchargeAmount)}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => window.print()} className="so-btn-outline-print-sm">
            In phiếu
          </button>
          <button onClick={() => setViewingReceipt(null)} className="so-btn-primary-md">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
