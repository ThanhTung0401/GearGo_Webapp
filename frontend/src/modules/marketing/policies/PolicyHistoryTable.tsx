import type { PolicyVersion } from "../../../store";

interface PolicyHistoryTableProps {
  policyVersions: PolicyVersion[];
  onSelectSnapshot: (version: PolicyVersion) => void;
}

/**
 * Bảng lịch sử các phiên bản chính sách đã ban hành (UC8.1.1).
 */
export function PolicyHistoryTable({ policyVersions, onSelectSnapshot }: PolicyHistoryTableProps) {
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
            {policyVersions.map((v) => (
              <tr key={v.version}>
                <td className="adm-cell-code">
                  {v.version}
                </td>
                <td className="font-semibold">{v.effectiveDate}</td>
                <td className="adm-hint-text">{v.updatedAt}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
