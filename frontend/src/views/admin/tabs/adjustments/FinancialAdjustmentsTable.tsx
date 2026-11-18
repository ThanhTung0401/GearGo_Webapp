import { fmt, type FinancialAdjustment } from "../../../../store";

interface FinancialAdjustmentsTableProps {
  adjustments: FinancialAdjustment[];
}

/**
 * Bảng lịch sử chứng từ điều chỉnh tài chính và bù trừ đã lập.
 */
export function FinancialAdjustmentsTable({ adjustments }: FinancialAdjustmentsTableProps) {
  return (
    <div className="adm-table-wrap">
      <div className="adm-table-scroll">
        <table className="adm-table adm-table--zebra adm-table--md">
          <thead>
            <tr>
              {["Số chứng từ", "Loại điều chỉnh", "Chứng từ liên quan", "Số tiền (đ)", "Lý do bù trừ", "Người lập / Duyệt", "Thời gian", "Trạng thái"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {adjustments.map((a) => (
              <tr key={a.id}>
                <td className="adm-cell-code text-[0.82rem]">
                  {a.id}
                </td>
                <td className="font-semibold text-[0.82rem]">{a.type}</td>
                <td className="adm-cell-mono text-[0.8rem]">
                  {a.orderId || a.importReceiptId || "—"}
                </td>
                <td className="adm-cell-mono text-[0.85rem] font-bold text-[#B45309]">
                  {fmt(a.amount)}
                </td>
                <td className="text-[0.82rem] text-[#374151]">{a.reason}</td>
                <td className="text-[0.8rem]">
                  <div>{a.createdBy}</div>
                  <div className="text-[0.7rem] text-[#15803D]">Duyệt: {a.approvedBy || "Hệ thống"}</div>
                </td>
                <td className="adm-hint-text text-[0.75rem]">{a.createdAt}</td>
                <td>
                  <span className="badge badge-success text-[0.72rem]">{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
