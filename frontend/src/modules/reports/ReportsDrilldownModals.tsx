import { fmt, formatDateTimeVi, type ImportReceipt, type Order } from "../../store";
import Icon from "../../components/Icon";
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";

export interface DrilldownData {
  title: string;
  subtitle: string;
  type: "orders" | "equipment" | "damage";
  items: any[];
}

interface ReportsDrilldownModalsProps {
  drilldownData: DrilldownData | null;
  setDrilldownData: (v: DrilldownData | null) => void;
  viewingReceipt: ImportReceipt | null;
  setViewingReceipt: (v: ImportReceipt | null) => void;
}

export function ReportsDrilldownModals({
  drilldownData,
  setDrilldownData,
  viewingReceipt,
  setViewingReceipt,
}: ReportsDrilldownModalsProps) {
  const drillPaging = usePagination(drilldownData?.items ?? [], 8);
  return (
    <>
      {drilldownData && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-dialog is-wide">
            <div className="adm-modal-header-clean">
              <div>
                <h3 className="adm-card-title">
                  {drilldownData.title}
                </h3>
                <div className="adm-hint-text text-[0.75rem]">{drilldownData.subtitle}</div>
              </div>
              <button onClick={() => setDrilldownData(null)} className="adm-btn-ghost">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="adm-modal-body-scroll">
              {drilldownData.items.length === 0 ? (
                <div className="adm-table-empty py-10">
                  Không có bản ghi nào cấu thành chỉ tiêu trong kỳ đã chọn.
                </div>
              ) : drilldownData.type === "orders" ? (
                <div className="adm-table-scroll">
                  <table className="adm-table adm-table--md">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Khách hàng</th>
                        <th>Trạng thái</th>
                        <th>Ngày hẹn lấy</th>
                        <th>Ngày hẹn trả</th>
                        <th>Tiền thuê</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillPaging.pagedItems.map((o: Order) => (
                        <tr key={o.id}>
                          <td className="adm-cell-code">{o.displayCode ?? o.id}</td>
                          <td>{o.customerName} ({o.customerPhone})</td>
                          <td>
                            <span className="adm-pill is-neutral">{o.status}</span>
                          </td>
                          <td className="adm-hint-text whitespace-nowrap">{formatDateTimeVi(o.pickupTime)}</td>
                          <td className="adm-hint-text whitespace-nowrap">{formatDateTimeVi(o.returnTime)}</td>
                          <td className="adm-cell-mono font-bold">{fmt(Math.max(0, o.rental - o.discount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    page={drillPaging.page}
                    totalPages={drillPaging.totalPages}
                    totalItems={drillPaging.totalItems}
                    startIndex={drillPaging.startIndex}
                    endIndex={drillPaging.endIndex}
                    onPageChange={drillPaging.setPage}
                    itemLabel="đơn thuê"
                  />
                </div>
              ) : (
                <div className="adm-table-scroll">
                  <table className="adm-table adm-table--md">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Mã thiết bị</th>
                        <th>Tình trạng khi trả</th>
                        <th>Phụ phí bồi thường</th>
                        <th>Nhân viên kết luận</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillPaging.pagedItems.map((dm: any, i: number) => (
                        <tr key={i}>
                          <td className="adm-cell-code">{dm.orderId}</td>
                          <td className="adm-cell-mono font-bold">{dm.equipmentId}</td>
                          <td className="text-[#DC2626] font-semibold">{dm.condition}</td>
                          <td className="adm-cell-mono font-bold text-[#D97706]">{fmt(dm.surchargeAmount || 0)}</td>
                          <td>{dm.staffName}</td>
                          <td className="adm-hint-text">{dm.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    page={drillPaging.page}
                    totalPages={drillPaging.totalPages}
                    totalItems={drillPaging.totalItems}
                    startIndex={drillPaging.startIndex}
                    endIndex={drillPaging.endIndex}
                    onPageChange={drillPaging.setPage}
                    itemLabel="bản ghi"
                  />
                </div>
              )}
            </div>

            <div className="adm-modal-footer-clean">
              <button onClick={() => setDrilldownData(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {viewingReceipt && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-dialog is-xl max-w-[720px]">
            <div className="adm-modal-header-clean">
              <div>
                <h3 className="adm-card-title">
                  Chứng từ phiếu nhập kho — {viewingReceipt.displayCode ?? viewingReceipt.id}
                </h3>
                <div className="adm-hint-text text-[0.75rem]">Nhà cung cấp: {viewingReceipt.supplierName} · Xác nhận: {formatDateTimeVi(viewingReceipt.confirmedAt || viewingReceipt.createdAt)}</div>
              </div>
              <button onClick={() => setViewingReceipt(null)} className="adm-btn-ghost">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="adm-modal-body-scroll">
              <div className="adm-table-scroll mb-4">
                <table className="adm-table adm-table--md">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th>Thành tiền</th>
                      <th>Mã thiết bị sinh ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingReceipt.lines.map((l, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold">{l.productNameSnapshot || l.productId}</td>
                        <td>{l.quantity}</td>
                        <td className="adm-cell-mono">{fmt(l.unitPrice)}</td>
                        <td className="adm-cell-mono font-bold text-[var(--color-forest)]">{fmt(l.quantity * l.unitPrice)}</td>
                        <td className="adm-cell-mono text-[0.75rem] text-[var(--color-amber)]">
                          {l.equipmentCodes.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="adm-card--soft text-[0.8rem]">
                <div><strong>Người tạo:</strong> {viewingReceipt.createdBy} · <strong>Trạng thái:</strong> {viewingReceipt.status}</div>
                {viewingReceipt.note && <div className="mt-1"><strong>Ghi chú:</strong> {viewingReceipt.note}</div>}
              </div>
            </div>

            <div className="adm-modal-footer-clean">
              <button onClick={() => setViewingReceipt(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
