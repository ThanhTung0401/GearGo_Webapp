import { formatDateTimeVi, formatDateVi, type PolicyVersion } from "../../../store";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";

interface PolicyHistoryTableProps {
  policyVersions: PolicyVersion[];
  onSelectSnapshot: (version: PolicyVersion) => void;
}

/**
 * Bảng lịch sử các phiên bản chính sách đã ban hành có phân trang (UC8.1.1).
 */
export function PolicyHistoryTable({ policyVersions, onSelectSnapshot }: PolicyHistoryTableProps) {
  const paging = usePagination(policyVersions, 6);
  return (
    <div className="adm-table-wrap">
      <div className="px-5 py-4 border-b border-[var(--color-bone)]">
        <h3 className="adm-section-heading mb-1 text-base">
          Lịch sử các phiên bản chính sách đã ban hành ({policyVersions.length})
        </h3>
        <p className="adm-hint-text text-[0.75rem] m-0">
          Mỗi phiên bản lưu giữ toàn bộ snapshot quy tắc kinh doanh tại thời điểm ban hành. Đơn thuê phát sinh thời điểm nào giữ nguyên căn cứ tính của phiên bản đó.
        </p>
      </div>
      <div className="responsive-table">
        <table className="adm-table adm-table--zebra adm-table--md">
          <thead>
            <tr>
              {["Phiên bản", "Ngày hiệu lực", "Ngày cập nhật", "Người ban hành", "Lý do ban hành / Nội dung thay đổi", "Thao tác"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paging.pagedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-gray-500">
                  Chưa có phiên bản chính sách nào được ban hành.
                </td>
              </tr>
            ) : (
              paging.pagedItems.map((v, idx) => (
                <tr key={`${v.version}-${idx}`}>
                  <td className="adm-cell-code">
                    {v.version}
                  </td>
                  <td className="font-semibold whitespace-nowrap">{formatDateVi(v.effectiveDate)}</td>
                  <td className="adm-hint-text whitespace-nowrap">{formatDateTimeVi(v.updatedAt)}</td>
                  <td>{v.updatedBy}</td>
                  <td className="text-[#374151]">{v.changeReason}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onSelectSnapshot(v)}
                      className="adm-btn-forest-outline"
                    >
                      👁 Xem snapshot
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-3">
        <Pagination
          page={paging.page}
          totalPages={paging.totalPages}
          totalItems={paging.totalItems}
          startIndex={paging.startIndex}
          endIndex={paging.endIndex}
          onPageChange={paging.setPage}
          itemLabel="phiên bản"
        />
      </div>
    </div>
  );
}
