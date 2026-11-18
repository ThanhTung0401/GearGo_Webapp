import type { NhanTraBackend } from "../../../../services/api";
import type { Order, ReturnReceipt } from "../../../../store";

interface ReturnHistoryPanelProps {
  realApi: boolean;
  order: Order;
  returnReceiptsBackend: NhanTraBackend[];
  returnBusy: boolean;
  onCloseBackendReceipt: (phieuId: number) => Promise<void>;
  onViewBackendReceipt: (rc: NhanTraBackend) => void;
  onViewMockReceipt: (rc: ReturnReceipt) => void;
}

// Danh sách lịch sử các đợt nhận trả đã lập (tự chọn nguồn dữ liệu backend thật hoặc mock)
export function ReturnHistoryPanel({
  realApi,
  order,
  returnReceiptsBackend,
  returnBusy,
  onCloseBackendReceipt,
  onViewBackendReceipt,
  onViewMockReceipt,
}: ReturnHistoryPanelProps) {
  if (realApi && returnReceiptsBackend.length > 0) {
    return (
      <div className="so-card-panel-lg">
        <h4 className="so-sub-heading-lg">
          Lịch sử các đợt nhận trả ({returnReceiptsBackend.length} phiếu)
        </h4>
        <div className="flex flex-col gap-2">
          {returnReceiptsBackend.map((rc) => {
            const isClosed = rc.trangThai === "DaChot";
            return (
              <div key={rc.maPhieu} className="so-receipt-row">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="so-receipt-code">{rc.maPhieuHienThi}</strong>
                    <span className={`so-badge-tag ${rc.laLanTraCuoi ? "is-green" : "is-orange"}`}>
                      {rc.laLanTraCuoi ? "Lần trả cuối" : `Đợt ${rc.lanTra}`}
                    </span>
                    <span className={`so-badge-tag ${isClosed ? "is-green" : "is-amber"}`}>
                      {isClosed ? "Đã chốt" : rc.trangThai}
                    </span>
                  </div>
                  <div className="so-receipt-meta">
                    {rc.thoiDiemChot || rc.thoiDiemLap} · {rc.tenNhanVienLucNhan || "Nhân viên kho"} · {rc.chiTiet.length} thiết bị
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isClosed && (
                    <button
                      disabled={returnBusy}
                      onClick={() => void onCloseBackendReceipt(rc.maPhieu)}
                      className="so-btn-primary-xs"
                    >
                      Chốt phiếu
                    </button>
                  )}
                  <button onClick={() => onViewBackendReceipt(rc)} className="so-btn-outline-xs">
                    Xem phiếu
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!realApi && (order.returnReceipts?.length || 0) > 0) {
    return (
      <div className="so-card-panel-lg">
        <h4 className="so-sub-heading-lg">
          Lịch sử các đợt nhận trả ({order.returnReceipts?.length} phiếu)
        </h4>
        <div className="flex flex-col gap-2">
          {order.returnReceipts?.map((rc) => (
            <div key={rc.id} className="so-receipt-row">
              <div>
                <div className="flex items-center gap-2">
                  <strong className="so-receipt-code">{rc.id}</strong>
                  <span className={`so-badge-tag ${rc.isFinalReturn ? "is-green" : "is-orange"}`}>
                    {rc.isFinalReturn ? "Lần trả cuối" : `Đợt ${rc.returnRound}`}
                  </span>
                </div>
                <div className="so-receipt-meta-mock">
                  {rc.returnedAt} · Người nhận: {rc.staffName} · {rc.items.length} thiết bị
                </div>
              </div>
              <button onClick={() => onViewMockReceipt(rc)} className="so-btn-outline-xs">
                Xem phiếu
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
