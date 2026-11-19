import { fmt, type MoneyTransaction } from "../../../store";

interface CashflowReportsSectionProps {
  isRealApi: boolean;
  cashReport: any;
  pendingItemsReport: any;
  totalCashInflow: number;
  totalCashOutflow: number;
  netCashflow: number;
  totalNetRevenue: number;
  currentHeldDeposit: number;
  cancellationFees: number;
  inRangeTransactions: Array<MoneyTransaction & { orderId: string; customerName: string }>;
}

/**
 * Báo cáo 3: Dòng tiền thực tế (UC10.2.1 Cashflow), đối chiếu doanh thu thuần
 * vs dòng tiền ròng và liệt kê chi tiết giao dịch thu/hoàn trong kỳ.
 */
export function CashflowReportsSection({
  isRealApi,
  cashReport,
  pendingItemsReport,
  totalCashInflow,
  totalCashOutflow,
  netCashflow,
  totalNetRevenue,
  currentHeldDeposit,
  cancellationFees,
  inRangeTransactions,
}: CashflowReportsSectionProps) {
  // Hợp nhất danh sách giao dịch thu và khoản hoàn từ máy chủ thành một bảng thống nhất
  const realCashflowRows =
    isRealApi && cashReport
      ? [
          ...(cashReport.giaoDichThus ?? []).map((t: any) => ({
            key: `in-${t.maThanhToan}`,
            code: `TT#${t.maThanhToan}`,
            type: `Thu (${t.phuongThuc || "Chuyển khoản"})`,
            orderCode: t.maDonHienThi || String(t.maDonThue),
            note: t.maYeuCau || "Thanh toán đơn thuê",
            amount: Number(t.tongSoTien ?? 0),
            isIn: true,
            status: t.trangThaiDoiChieu || "Thành công",
            at: t.thoiDiemThanhCong ? new Date(t.thoiDiemThanhCong).toLocaleString("vi-VN") : "—",
          })),
          ...(cashReport.khoanHoans ?? []).map((h: any) => ({
            key: `out-${h.maHoanTien}`,
            code: `HT#${h.maHoanTien}`,
            type: h.loaiHoan || "Hoàn tiền",
            orderCode: h.maDonHienThi || String(h.maDonThue),
            note: h.lyDo || "Hoàn trả khách hàng",
            amount: Number(h.soTien ?? 0),
            isIn: false,
            status: "Thành công",
            at: h.thoiDiemThanhCong ? new Date(h.thoiDiemThanhCong).toLocaleString("vi-VN") : "—",
          })),
        ]
      : null;

  return (
    <div>
      <div className="adm-kpi-3 mb-6">
        <div className="adm-card adm-card--padded-sm">
          <div className="text-[0.78rem] text-[#15803D] font-bold">↑ DÒNG TIỀN VÀO (INFLOW)</div>
          <div className="adm-cell-mono text-[1.6rem] font-extrabold text-[#15803D] mt-1">
            +{fmt(totalCashInflow)}
          </div>
          <div className="adm-hint-text mt-1">Tiền thuê + Cọc ban đầu + Thu thêm phụ phí</div>
        </div>

        <div className="adm-card adm-card--padded-sm">
          <div className="text-[0.78rem] text-[#DC2626] font-bold">↓ DÒNG TIỀN RA (OUTFLOW)</div>
          <div className="adm-cell-mono text-[1.6rem] font-extrabold text-[#DC2626] mt-1">
            −{fmt(totalCashOutflow)}
          </div>
          <div className="adm-hint-text mt-1">Hoàn cọc đối soát + Hoàn tiền hủy đơn</div>
        </div>

        <div className="adm-card adm-card--padded-sm">
          <div className="text-[0.78rem] text-[var(--color-bark)] font-bold">DÒNG TIỀN RÒNG (NET CASHFLOW)</div>
          <div className={`adm-cell-mono text-[1.6rem] font-extrabold mt-1 ${netCashflow >= 0 ? "text-[var(--color-forest)]" : "text-[#DC2626]"}`}>
            {netCashflow >= 0 ? "+" : ""}{fmt(netCashflow)}
          </div>
          <div className="adm-hint-text mt-1">Lượng tiền thực tế chênh lệch trong tài khoản</div>
        </div>
      </div>

      {isRealApi && pendingItemsReport && (
        <div className="adm-alert is-warning adm-alert--block mb-4">
          <strong>Khoản cần xử lý kế toán:</strong>{" "}
          {pendingItemsReport.soKhoanThuCanDoiChieu ?? 0} khoản thu chờ đối chiếu ({fmt(Number(pendingItemsReport.tongTienThuCanDoiChieu ?? 0))}) ·{" "}
          {(pendingItemsReport.hoanDangChoItems ?? []).length} khoản hoàn đang chờ ·{" "}
          {(pendingItemsReport.doiSoatDieuChinhDangXuLyItems ?? []).length} đối soát điều chỉnh ·{" "}
          {(pendingItemsReport.donHoanTatThieuDoiSoatItems ?? []).length} đơn hoàn tất thiếu đối soát.
        </div>
      )}

      <div className="adm-card adm-card--padded-sm mb-5">
        <h3 className="adm-section-heading mb-2">
          Bảng đối chiếu chênh lệch: Doanh thu thuần vs Dòng tiền thực tế (UC10.2 - Bước 6)
        </h3>
        <p className="adm-page-subtitle adm-page-subtitle--sm mb-3">
          Giải thích nguyên nhân chênh lệch giữa Doanh thu ghi nhận trên đơn hoàn tất và Dòng tiền ra vào tài khoản ngân hàng trong kỳ.
        </p>
        <div className="adm-card--parchment text-[0.82rem]">
          <div className="flex justify-between py-1 border-b border-bone gap-2">
            <span>(A) Tổng doanh thu thuần ghi nhận (Thuê + Phụ phí giữ lại):</span>
            <strong className="adm-cell-mono text-[var(--color-forest)]">{fmt(totalNetRevenue)}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-bone gap-2">
            <span>(B) Dòng tiền ròng thực tế qua tài khoản (Net Cashflow):</span>
            <strong className="adm-cell-mono">{fmt(netCashflow)}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-bone gap-2 text-[#B45309]">
            <span>(+) Tiền cọc khách hàng đang tạm giữ trong các đơn mở (Chưa hoàn):</span>
            <strong className="adm-cell-mono">+{fmt(currentHeldDeposit)}</strong>
          </div>
          <div className="flex justify-between py-1 gap-2 text-[#4B5563]">
            <span>(+) Khoản thu nhập từ phí hủy đơn:</span>
            <strong className="adm-cell-mono">+{fmt(cancellationFees)}</strong>
          </div>
        </div>
      </div>

      <div className="adm-card adm-card--padded">
        <h3 className="adm-section-heading mb-3">
          {isRealApi && cashReport
            ? `Chi tiết giao dịch dòng tiền trong kỳ (${(cashReport.giaoDichThus ?? []).length} thu · ${(cashReport.khoanHoans ?? []).length} hoàn)`
            : `Chi tiết giao dịch dòng tiền trong kỳ (${inRangeTransactions.length} giao dịch)`}
        </h3>
        <div className="responsive-table adm-table-scroll">
          <table className="adm-table adm-table--md">
            <thead>
              <tr>
                {["Mã GD", "Loại giao dịch", "Đơn hàng", "Khách hàng / Lý do", "Số tiền", "Trạng thái", "Ngày hoàn tất"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {realCashflowRows ? (
                realCashflowRows.map((row) => (
                  <tr key={row.key}>
                    <td className="adm-cell-code">{row.code}</td>
                    <td className="font-semibold">{row.type}</td>
                    <td className="adm-cell-mono">{row.orderCode}</td>
                    <td>{row.note}</td>
                    <td className={`adm-cell-mono font-bold ${row.isIn ? "text-[#15803D]" : "text-[#DC2626]"}`}>
                      {row.isIn ? "+" : "−"}{fmt(row.amount)}
                    </td>
                    <td>
                      <span className="adm-pill is-success">{row.status}</span>
                    </td>
                    <td className="adm-hint-text">{row.at}</td>
                  </tr>
                ))
              ) : (
                inRangeTransactions.map((t, idx) => {
                  const isInflow = t.type === "Thanh toán ban đầu" || t.type === "Thu thêm";
                  return (
                    <tr key={`${t.id}-${idx}`}>
                      <td className="adm-cell-code">{t.id}</td>
                      <td className="font-semibold">{t.type}</td>
                      <td className="adm-cell-mono">{t.orderId}</td>
                      <td>{t.customerName}</td>
                      <td className={`adm-cell-mono font-bold ${isInflow ? "text-[#15803D]" : "text-[#DC2626]"}`}>
                        {isInflow ? "+" : "−"}{fmt(t.amount)}
                      </td>
                      <td>
                        <span className={`adm-pill ${t.status === "Thành công" ? "is-success" : "is-danger-dark"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="adm-hint-text">{t.completedAt || t.createdAt}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
