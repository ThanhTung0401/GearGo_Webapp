import { fmt, formatBackendEnum, formatDateTimeVi } from "../../../store";
import { type GiaoDichCanDoiChieuBackend } from "../../../services/api/paymentApi";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";

interface PendingPaymentsTableProps {
  pendingPayments: GiaoDichCanDoiChieuBackend[];
  payLoading: boolean;
  onSelectReconcile: (item: GiaoDichCanDoiChieuBackend) => void;
}

/**
 * Bảng danh sách giao dịch thanh toán ngoại lệ đang chờ đối chiếu có phân trang (/api/thanh-toan/can-doi-chieu).
 */
export function PendingPaymentsTable({
  pendingPayments,
  payLoading,
  onSelectReconcile,
}: PendingPaymentsTableProps) {
  const paging = usePagination(pendingPayments, 8);
  return (
    <div className="adm-table-wrap bg-[#F8F6F0]">
      <div className="px-4.5 py-3.5 border-b border-[var(--color-bone)] flex justify-between items-center">
        <div>
          <h3 className="adm-section-heading text-base m-0">
            Giao dịch thanh toán cần đối chiếu ngoại lệ ({pendingPayments.length})
          </h3>
          <p className="adm-hint-text text-[0.75rem] mt-0.5 mb-0">
            Xử lý các giao dịch lệch số tiền, trùng thanh toán hoặc cần hoàn tiền thừa qua cổng thanh toán.
          </p>
        </div>
      </div>
      <div className="responsive-table">
        <table className="adm-table adm-table--zebra adm-table--md bg-white">
          <thead>
            <tr>
              {["Mã GD", "Đơn thuê", "Phương thức", "Số tiền", "Lý do cần đối chiếu", "Trạng thái", "Thời điểm", "Thao tác"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payLoading ? (
              <tr>
                <td colSpan={8} className="adm-table-empty">
                  Đang tải danh sách giao dịch cần đối chiếu...
                </td>
              </tr>
            ) : paging.pagedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="adm-table-empty text-[#1B3F2F]">
                  Không có giao dịch thanh toán ngoại lệ nào đang chờ đối chiếu.
                </td>
              </tr>
            ) : (
              paging.pagedItems.map((g) => (
                <tr key={g.maThanhToan}>
                  <td className="adm-cell-code">
                    {g.maYeuCau}
                  </td>
                  <td className="adm-cell-mono">#{g.maDonThue}</td>
                  <td>{g.phuongThuc}</td>
                  <td className="adm-cell-mono font-bold text-[#B45309]">
                    {fmt(g.tongSoTien)}
                  </td>
                  <td className="text-[#374151]">{g.lyDoCanDoiChieu || "Chênh lệch đối soát cổng thanh toán"}</td>
                  <td>
                    <span className="adm-pill is-warning">
                      {formatBackendEnum(g.trangThaiDoiChieu || g.trangThai)}
                    </span>
                  </td>
                  <td className="adm-hint-text text-[0.74rem] whitespace-nowrap">
                    {formatDateTimeVi(g.thoiDiemTao)}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onSelectReconcile(g)}
                      className="adm-btn-amber-sm"
                    >
                      Đối chiếu
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-3 bg-white">
        <Pagination
          page={paging.page}
          totalPages={paging.totalPages}
          totalItems={paging.totalItems}
          startIndex={paging.startIndex}
          endIndex={paging.endIndex}
          onPageChange={paging.setPage}
          itemLabel="giao dịch"
        />
      </div>
    </div>
  );
}
