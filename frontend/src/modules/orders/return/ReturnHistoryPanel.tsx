import type { NhanTraBackend } from "../../../services/api";
import { formatBackendEnum, formatDateTimeVi, type Order, type ReturnReceipt } from "../../../store";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";

interface ReturnHistoryPanelProps {
  realApi: boolean;
  order: Order;
  returnReceiptsBackend: NhanTraBackend[];
  returnBusy: boolean;
  onCloseBackendReceipt: (phieuId: number) => Promise<void>;
  onViewBackendReceipt: (rc: NhanTraBackend) => void;
  onViewMockReceipt: (rc: ReturnReceipt) => void;
}

// Danh sách lịch sử các đợt nhận trả đã lập (tự chọn nguồn dữ liệu backend thật hoặc mock, có phân trang)
export function ReturnHistoryPanel({
  realApi,
  order,
  returnReceiptsBackend,
  returnBusy,
  onCloseBackendReceipt,
  onViewBackendReceipt,
  onViewMockReceipt,
}: ReturnHistoryPanelProps) {
  const backendPaging = usePagination(returnReceiptsBackend, 5);
  const mockPaging = usePagination(order.returnReceipts || [], 5);

  if (realApi && returnReceiptsBackend.length > 0) {
    return (
      <div className="so-card-panel-lg">
        <h4 className="so-sub-heading-lg">
          Lịch sử các đợt nhận trả ({returnReceiptsBackend.length} phiếu)
        </h4>
        <div className="flex flex-col gap-2">
          {backendPaging.pagedItems.map((rc) => {
            const isClosed = rc.trangThai === "DaChot";
            const hasUnapprovedLost = !isClosed && rc.chiTiet.some((c) => c.ketLuan === "MatThietBi" && !c.thoiDiemDuyetMat);
            return (
              <div key={rc.maPhieu} className="so-receipt-row">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="so-receipt-code">{rc.maPhieuHienThi}</strong>
                    <span className={`so-badge-tag ${rc.laLanTraCuoi ? "is-green" : "is-orange"}`}>
                      {rc.laLanTraCuoi ? "Lần trả cuối" : `Đợt ${rc.lanTra}`}
                    </span>
                    <span className={`so-badge-tag ${isClosed ? "is-green" : "is-amber"}`}>
                      {formatBackendEnum(rc.trangThai)}
                    </span>
                    {hasUnapprovedLost && (
                      <span className="so-badge-tag is-orange">Cần duyệt mất</span>
                    )}
                  </div>
                  <div className="so-receipt-meta">
                    {formatDateTimeVi(rc.thoiDiemChot || rc.thoiDiemLap)} · {rc.tenNhanVienLucNhan || "Nhân viên kho"} · {rc.chiTiet.length} thiết bị
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
        <Pagination
          page={backendPaging.page}
          totalPages={backendPaging.totalPages}
          totalItems={backendPaging.totalItems}
          startIndex={backendPaging.startIndex}
          endIndex={backendPaging.endIndex}
          onPageChange={backendPaging.setPage}
          itemLabel="phiếu nhận trả"
        />
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
          {mockPaging.pagedItems.map((rc) => (
            <div key={rc.id} className="so-receipt-row">
              <div>
                <div className="flex items-center gap-2">
                  <strong className="so-receipt-code">{rc.id}</strong>
                  <span className={`so-badge-tag ${rc.isFinalReturn ? "is-green" : "is-orange"}`}>
                    {rc.isFinalReturn ? "Lần trả cuối" : `Đợt ${rc.returnRound}`}
                  </span>
                </div>
                <div className="so-receipt-meta-mock">
                  {formatDateTimeVi(rc.returnedAt)} · Người nhận: {rc.staffName} · {rc.items.length} thiết bị
                </div>
              </div>
              <button onClick={() => onViewMockReceipt(rc)} className="so-btn-outline-xs">
                Xem phiếu
              </button>
            </div>
          ))}
        </div>
        <Pagination
          page={mockPaging.page}
          totalPages={mockPaging.totalPages}
          totalItems={mockPaging.totalItems}
          startIndex={mockPaging.startIndex}
          endIndex={mockPaging.endIndex}
          onPageChange={mockPaging.setPage}
          itemLabel="phiếu nhận trả"
        />
      </div>
    );
  }

  return null;
}
