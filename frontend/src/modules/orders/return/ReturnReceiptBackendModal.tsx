import { useApp } from "../../../context/AppContext";
import type { NhanTraBackend, ChiTietNhanTraBackend } from "../../../services/api";
import type { Order } from "../../../store";

interface ReturnReceiptBackendModalProps {
  app: ReturnType<typeof useApp>;
  order: Order | null;
  receipt: NhanTraBackend;
  returnBusy: boolean;
  onClose: () => void;
  onStartApproveLost: (phieuId: number, chiTiet: ChiTietNhanTraBackend, defaultBienBan: string, defaultAmount: number) => void;
  onSplitPendingLine: (phieuId: number, chiTietId: number) => Promise<void>;
  onCloseBackendReceipt: (phieuId: number) => Promise<void>;
}

// Modal xem chi tiết Phiếu Nhận Trả từ Backend, hỗ trợ duyệt mất, tách dòng và chốt phiếu
export function ReturnReceiptBackendModal({
  app,
  order,
  receipt,
  returnBusy,
  onClose,
  onStartApproveLost,
  onSplitPendingLine,
  onCloseBackendReceipt,
}: ReturnReceiptBackendModalProps) {
  return (
    <div className="so-modal-overlay">
      <div className="so-modal-card-640">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`so-modal-tag is-pill ${receipt.laLanTraCuoi ? "is-green" : "is-orange"}`}>
              {receipt.laLanTraCuoi ? "LẦN NHẬN TRẢ CUỐI CÙNG" : `PHIẾU NHẬN TRẢ ĐỢT ${receipt.lanTra}`}
            </span>
            <h3 className="so-modal-title">Phiếu Nhận Trả: {receipt.maPhieuHienThi}</h3>
          </div>
          <button onClick={onClose} className="so-modal-close-sm">✕</button>
        </div>

        <div className="so-info-box">
          <div><strong>Đơn thuê:</strong> {order?.displayCode || receipt.maDonThue}</div>
          <div><strong>Thời điểm lập / chốt:</strong> {receipt.thoiDiemChot || receipt.thoiDiemLap}</div>
          <div><strong>Nhân viên nhận:</strong> {receipt.tenNhanVienLucNhan || "Nhân viên kho"}</div>
          <div><strong>Trạng thái:</strong> {receipt.trangThai} · Còn nợ sau phiếu: {receipt.soThietBiConNo} chiếc</div>
          <div><strong>Ghi chú:</strong> {receipt.ghiChu || "Không có"}</div>
        </div>

        <strong className="so-receipt-section-label">Chi tiết thiết bị trong phiếu:</strong>
        <div className="flex flex-col gap-2 mt-2 mb-4">
          {receipt.chiTiet.map((ct) => {
            const isLost = ct.ketLuan === "MatThietBi";
            const lostApproved = Boolean(ct.thoiDiemDuyetMat);
            const canSplit = receipt.trangThai !== "DaChot" && receipt.chiTiet.length > 1;
            return (
              <div key={ct.maChiTietNhanTra} className="so-receipt-item-row">
                <div>
                  <strong className="so-receipt-item-code">{ct.maThietBiHienThi}</strong>{" "}
                  <span className="so-receipt-item-name">{ct.tenSanPham}</span>
                  <div className="so-receipt-item-meta">
                    Kết luận: <strong>{ct.tinhTrangSauThue || ct.ketLuan || "Chưa kết luận"}</strong>
                    {ct.ghiChu ? ` · ${ct.ghiChu}` : ""}
                  </div>
                  {lostApproved && (
                    <div className="so-receipt-item-approved">
                      ✓ Đã duyệt mất bởi {ct.tenNguoiDuyetMat || "Quản trị viên"}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isLost && !lostApproved && (
                    <button
                      disabled={returnBusy}
                      onClick={() => {
                        const prod = app.products.find((p) => p.name === ct.tenSanPham);
                        onStartApproveLost(
                          receipt.maPhieu,
                          ct,
                          ct.bienBanMat || `Biên bản mất thiết bị ${ct.maThietBiHienThi}`,
                          prod?.compensation || 1000000
                        );
                      }}
                      className="so-btn-danger-tiny"
                    >
                      Duyệt mất
                    </button>
                  )}
                  {canSplit && (
                    <button
                      disabled={returnBusy}
                      onClick={() => void onSplitPendingLine(receipt.maPhieu, ct.maChiTietNhanTra)}
                      className="so-btn-outline-split"
                    >
                      Tách chờ xử lý
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          {receipt.trangThai !== "DaChot" && (
            <button
              disabled={returnBusy}
              onClick={() => void onCloseBackendReceipt(receipt.maPhieu)}
              className="so-btn-primary-sm-rounded"
            >
              ✓ Chốt phiếu nhận trả
            </button>
          )}
          <button onClick={() => window.print()} className="so-btn-outline-print-sm">
            In phiếu
          </button>
          <button onClick={onClose} className="so-btn-cancel-bold">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
