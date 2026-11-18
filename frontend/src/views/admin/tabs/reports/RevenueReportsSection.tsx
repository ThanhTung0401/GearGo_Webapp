import type { useApp } from "../../../../context/AppContext";
import { fmt, type Order, type Surcharge } from "../../../../store";
import type { DrilldownData } from "../ReportsDrilldownModals";

interface RevenueReportsSectionProps {
  app: ReturnType<typeof useApp>;
  isRealApi: boolean;
  revReport: any;
  revAdjReport: any;
  cancelFeeReport: any;
  depositReport: any;
  completedOrders: Order[];
  approvedSurcharges: Surcharge[];
  pureRentalRevenue: number;
  surchargeRevenue: number;
  deltaAdjustmentRevenue: number;
  totalNetRevenue: number;
  completedCountDisplay: number;
  cancellationRate: string;
  canceledCount: number;
  validDenominator: number;
  returningCustomersCount: number;
  cancellationFees: number;
  currentHeldDeposit: number;
  onDrilldown: (data: DrilldownData) => void;
}

/**
 * Báo cáo 2: Doanh thu thuần (UC10.2 & UC10.2.1), tách biệt tiền cọc khỏi doanh thu.
 */
export function RevenueReportsSection({
  app,
  isRealApi,
  revReport,
  revAdjReport,
  cancelFeeReport,
  depositReport,
  completedOrders,
  approvedSurcharges,
  pureRentalRevenue,
  surchargeRevenue,
  deltaAdjustmentRevenue,
  totalNetRevenue,
  completedCountDisplay,
  cancellationRate,
  canceledCount,
  validDenominator,
  returningCustomersCount,
  cancellationFees,
  currentHeldDeposit,
  onDrilldown,
}: RevenueReportsSectionProps) {
  return (
    <div>
      <div className="adm-alert is-info adm-alert--block mb-5 text-[0.85rem]">
        <strong>💡 NGUYÊN TẮC KẾ TOÁN BẤT DI BẤT DỊCH (UC10.2):</strong> Tiền cọc là khoản nợ phải trả lại cho khách sau khi đối soát xong. Tiền cọc <strong>tuyệt đối không được tính vào doanh thu</strong> kinh doanh của GearGo.
      </div>

      <div className="adm-kpi-3 mb-6">
        <div
          onClick={() =>
            onDrilldown({
              title: "Danh sách đơn thuê hoàn tất cấu thành doanh thu",
              subtitle: `Các đơn đã thanh toán và quyết toán hoàn tất trong kỳ`,
              type: "orders",
              items: completedOrders,
            })
          }
          className="adm-card adm-card--padded-sm cursor-pointer hover:border-forest"
        >
          <div className="adm-hint-text text-[0.78rem] font-semibold">Doanh thu tiền thuê thuần</div>
          <div className="adm-cell-mono text-[1.6rem] font-extrabold text-[var(--color-forest)] mt-1">
            {fmt(pureRentalRevenue)}
          </div>
          <div className="text-[0.72rem] text-[var(--color-amber)] mt-1">Từ {completedCountDisplay} đơn hoàn tất trong kỳ 🔍</div>
        </div>

        <div className="adm-card adm-card--padded-sm">
          <div className="adm-hint-text text-[0.78rem] font-semibold">Phụ phí & Điều chỉnh đối soát</div>
          <div className="adm-cell-mono text-[1.6rem] font-extrabold text-[#D97706] mt-1">
            +{fmt(surchargeRevenue + deltaAdjustmentRevenue)}
          </div>
          <div className="adm-muted-note mt-1">
            Ban đầu {fmt(surchargeRevenue)}
            {isRealApi && revAdjReport
              ? ` · Điều chỉnh ${fmt(deltaAdjustmentRevenue)} (${revAdjReport.soPhieuDieuChinh ?? 0} phiếu)`
              : ` (${approvedSurcharges.length} khoản)`}
          </div>
        </div>

        <div className="adm-report-net-card">
          <div className="text-[0.78rem] opacity-85 font-semibold">TỔNG DOANH THU THUẦN</div>
          <div className="adm-cell-mono text-[1.8rem] font-extrabold mt-1">
            {fmt(totalNetRevenue)}
          </div>
          <div className="text-[0.72rem] opacity-80 mt-1">Thuê thuần + Phụ phí đối soát ± Điều chỉnh</div>
        </div>
      </div>

      <div className="adm-revenue-grid mb-6">
        <div className="adm-card adm-card--padded">
          <h3 className="adm-section-heading mb-3">
            {isRealApi && revReport?.items
              ? `Chi tiết đơn hoàn tất trong kỳ (${revReport.items.length} đơn)`
              : "Doanh thu phân bổ theo danh mục sản phẩm trong kỳ"}
          </h3>
          {isRealApi && revReport?.items ? (
            <div className="responsive-table adm-table-scroll adm-table-scroll--tall">
              <table className="adm-table adm-table--sm">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Hoàn tất</th>
                    <th className="adm-cell-right">Thuê sau giảm</th>
                    <th className="adm-cell-right">Phụ phí</th>
                    <th className="adm-cell-right">Tổng doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {(revReport.items as any[]).map((it) => (
                    <tr key={it.maDonThue}>
                      <td className="adm-cell-code">{it.maDonHienThi || it.maDonThue}</td>
                      <td className="adm-hint-text">
                        {it.thoiDiemHoanTat ? new Date(it.thoiDiemHoanTat).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="adm-cell-right adm-cell-mono">{fmt(Number(it.tienThueSauGiam ?? 0))}</td>
                      <td className="adm-cell-right adm-cell-mono text-[#D97706]">{fmt(Number(it.phuPhiDoiSoatBanDau ?? 0))}</td>
                      <td className="adm-cell-right adm-cell-mono font-bold">{fmt(Number(it.tongDoanhThu ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Tính tỷ trọng doanh thu theo từng danh mục sản phẩm ở chế độ mock
            app.categories.map((c) => {
              const catProds = app.products.filter((p) => p.category === c.name || p.categoryId === c.id).map((p) => p.id);
              const catRev = completedOrders
                .flatMap((o) => o.items)
                .filter((it) => catProds.includes(it.productId))
                .reduce((s, it) => s + it.pricePerDay * it.qty * it.days, 0);
              const percent = pureRentalRevenue > 0 ? Math.round((catRev / pureRentalRevenue) * 100) : 0;
              return (
                <div key={c.id} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold">{c.name}</span>
                    <span className="adm-cell-mono font-bold text-[var(--color-forest)]">{fmt(catRev)} ({percent}%)</span>
                  </div>
                  <div className="adm-progress-track h-2 rounded bg-[var(--color-parchment)]">
                    {/* Chiều rộng thanh tỷ trọng doanh thu danh mục tính động theo phần trăm */}
                    <div className="adm-progress-fill" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="adm-card adm-card--padded-sm">
            <h3 className="adm-section-heading text-[0.9rem] mb-2.5">
              Chỉ số chuyển đổi & Chăm sóc khách hàng (UC10.2)
            </h3>
            <div className="adm-grid-2 gap-2">
              <div className="adm-card--parchment p-2.5">
                <div className="adm-hint-text">Tỷ lệ hủy đơn (BR22)</div>
                <div className="adm-cell-mono text-[1.4rem] font-extrabold text-[#DC2626] mt-0.5">
                  {cancellationRate}%
                </div>
                <div className="adm-muted-note text-[0.68rem]">{canceledCount} hủy / {validDenominator} đơn phát sinh</div>
              </div>

              <div className="adm-card--parchment p-2.5">
                <div className="adm-hint-text">Khách quay lại (≥2 lần)</div>
                <div className="adm-cell-mono text-[1.4rem] font-extrabold text-[var(--color-forest)] mt-0.5">
                  {returningCustomersCount}
                </div>
                <div className="adm-muted-note text-[0.68rem]">Khách có ≥2 đơn hoàn tất</div>
              </div>
            </div>
          </div>

          <div className="adm-card adm-card--padded-sm">
            <div className="adm-card--soft mb-2.5">
              <div className="adm-hint-text text-[0.75rem]">Thu nhập khác: Phí hủy đơn giữ lại (UC07)</div>
              <div className="adm-cell-mono text-[1.2rem] font-bold text-[var(--color-bark)] mt-0.5">
                {fmt(cancellationFees)}
              </div>
              <div className="adm-muted-note text-[0.68rem]">
                {isRealApi && cancelFeeReport ? `${cancelFeeReport.soDonHuyCoPhi ?? 0} đơn hủy có thu phí` : "Thu từ khách hủy sát giờ hẹn (<48h)"}
              </div>
            </div>

            <div className="adm-alert is-warning adm-alert--block mb-0">
              <div className="text-[0.75rem] font-semibold">Tiền cọc đang tạm giữ trong các đơn mở</div>
              <div className="adm-cell-mono text-[1.2rem] font-bold text-[#B45309] mt-0.5">
                {fmt(currentHeldDeposit)}
              </div>
              <div className="text-[0.68rem] text-[#B45309]">
                {isRealApi && depositReport ? `${depositReport.soDonConGiuCoc ?? 0} đơn còn giữ cọc · Không tính doanh thu` : "Nợ phải hoàn trả khách sau khi đối soát"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
