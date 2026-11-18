import type { useApp } from "../../../../context/AppContext";
import type { BaoCaoVanHanhBackend } from "../../../../services/api/reportApi";
import { fmt, type Order } from "../../../../store";
import type { DrilldownData } from "../ReportsDrilldownModals";

interface OperationsReportsSectionProps {
  app: ReturnType<typeof useApp>;
  isRealApi: boolean;
  fromDate: string;
  toDate: string;
  opsReport: BaoCaoVanHanhBackend | null;
  stockReport: any;
  maintReport: any;
  ordersToPickup: Order[];
  ordersToReturn: Order[];
  overdueOrders: Order[];
  pendingReconcileOrders: Order[];
  handedOverOrders: Order[];
  damageRecords: any[];
  onDrilldown: (data: DrilldownData) => void;
}

/**
 * Báo cáo 1: Vận hành kho (UC10.1 & UC10.1.1) gồm 6 chỉ tiêu trọng yếu,
 * thanh công suất kho và bảng xếp hạng sản phẩm/thiết bị thuê nhiều nhất.
 */
export function OperationsReportsSection({
  app,
  isRealApi,
  fromDate,
  toDate,
  opsReport,
  stockReport,
  maintReport,
  ordersToPickup,
  ordersToReturn,
  overdueOrders,
  pendingReconcileOrders,
  handedOverOrders,
  damageRecords,
  onDrilldown,
}: OperationsReportsSectionProps) {
  // Tính công suất kho từ dữ liệu máy chủ hoặc danh sách thiết bị cục bộ
  const useStock = isRealApi && stockReport;
  const totalEquip = useStock ? Number(stockReport.tongHoSo ?? 0) : app.equipment.length;
  const rentedEquip = useStock ? Number(stockReport.dangThue ?? 0) : app.equipment.filter((e) => e.equipmentStatus === "Đang thuê").length;
  const availEquip = useStock ? Number(stockReport.sanSang ?? 0) : app.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").length;
  const maintEquip = useStock ? Number(stockReport.dangBaoTri ?? 0) : app.equipment.filter((e) => e.equipmentStatus === "Đang bảo trì").length;
  const lostEquip = useStock
    ? Number(stockReport.thatLac ?? 0) + Number(stockReport.ngungSuDung ?? 0)
    : app.equipment.filter((e) => e.equipmentStatus === "Thất lạc" || e.equipmentStatus === "Ngừng sử dụng").length;
  const rate = totalEquip > 0 ? Math.round((rentedEquip / totalEquip) * 100) : 0;

  return (
    <div>
      {/* Lưới 6 chỉ tiêu vận hành trọng yếu (Click để Drill-down - Bước 4 UC10.1) */}
      <div className="adm-grid-auto-sm mb-6">
        <div
          onClick={() =>
            onDrilldown({
              title: "Danh sách đơn cần giao trong kỳ",
              subtitle: `Có ${ordersToPickup.length} đơn có giờ nhận dự kiến trong kỳ ${fromDate} → ${toDate}`,
              type: "orders",
              items: ordersToPickup,
            })
          }
          className="adm-report-kpi-card hover:border-forest"
        >
          <div className="text-[0.75rem] text-[#6B7280] font-semibold">Đơn cần giao trong kỳ</div>
          <div className="adm-report-kpi-val text-[var(--color-forest)]">
            {ordersToPickup.length}
          </div>
          <div className="text-[0.7rem] text-[var(--color-amber)] mt-1">🔍 Nhấn để xem danh sách</div>
        </div>

        <div
          onClick={() =>
            onDrilldown({
              title: "Danh sách đơn cần nhận trả trong kỳ",
              subtitle: `Có ${ordersToReturn.length} đơn có hạn trả dự kiến trong kỳ`,
              type: "orders",
              items: ordersToReturn,
            })
          }
          className="adm-report-kpi-card hover:border-forest"
        >
          <div className="text-[0.75rem] text-[#6B7280] font-semibold">Đơn cần nhận trả trong kỳ</div>
          <div className="adm-report-kpi-val text-[#2563EB]">
            {ordersToReturn.length}
          </div>
          <div className="text-[0.7rem] text-[var(--color-amber)] mt-1">🔍 Nhấn để xem danh sách</div>
        </div>

        <div
          onClick={() =>
            onDrilldown({
              title: "Danh sách đơn quá hạn tại thời điểm tổng hợp",
              subtitle: `Đơn quá giờ trả dự kiến nhưng chưa trả đủ thiết bị`,
              type: "orders",
              items: overdueOrders,
            })
          }
          className={`adm-report-kpi-card ${overdueOrders.length > 0 ? "is-overdue" : ""}`}
        >
          <div className={`text-[0.75rem] font-semibold ${overdueOrders.length > 0 ? "text-[#B91C1C]" : "text-[#6B7280]"}`}>Đơn quá hạn hiện tại</div>
          <div className={`adm-report-kpi-val ${overdueOrders.length > 0 ? "text-[#DC2626]" : "text-[var(--color-bark)]"}`}>
            {overdueOrders.length}
          </div>
          <div className={`text-[0.7rem] mt-1 ${overdueOrders.length > 0 ? "text-[#DC2626]" : "text-[#9CA3AF]"}`}>Cần gọi điện xử lý ngay</div>
        </div>

        <div
          onClick={() =>
            onDrilldown({
              title: "Danh sách đơn chờ đối soát cọc",
              subtitle: `Thiết bị đã nhận trả xong, đang chờ thủ quỹ hoàn/thu cọc`,
              type: "orders",
              items: pendingReconcileOrders,
            })
          }
          className="adm-report-kpi-card hover:border-forest"
        >
          <div className="text-[0.75rem] text-[#6B7280] font-semibold">Đơn chờ đối soát cọc</div>
          <div className="adm-report-kpi-val text-[#D97706]">
            {pendingReconcileOrders.length}
          </div>
          <div className="text-[0.7rem] text-[var(--color-amber)] mt-1">🔍 Nhấn để xem danh sách</div>
        </div>

        <div
          onClick={() =>
            onDrilldown({
              title: "Danh sách lượt thuê đã bàn giao thành công",
              subtitle: `Các đơn đã giao thiết bị cho khách trong kỳ`,
              type: "orders",
              items: handedOverOrders,
            })
          }
          className="adm-report-kpi-card hover:border-forest"
        >
          <div className="text-[0.75rem] text-[#6B7280] font-semibold">Lượt thuê đã bàn giao</div>
          <div className="adm-report-kpi-val text-[var(--color-forest)]">
            {isRealApi && opsReport?.tongQuan ? opsReport.tongQuan.tongDonThanhCong : handedOverOrders.length}
          </div>
          <div className="text-[0.7rem] text-[#6B7280] mt-1">
            {isRealApi && opsReport?.tongQuan
              ? `Quay vòng ${opsReport.tongQuan.tyLeQuayVongThietBi} · TB ${opsReport.tongQuan.soNgayThueTrungBinh} ngày`
              : "Tổng lượt giao trong kỳ"}
          </div>
        </div>

        <div
          onClick={() =>
            onDrilldown({
              title: "Chi tiết các trường hợp thiết bị hư hỏng/mất mát",
              subtitle: `Danh sách biên bản nhận trả ghi nhận thiết bị hỏng có kết luận`,
              type: "damage",
              items: damageRecords,
            })
          }
          className={`adm-report-kpi-card ${damageRecords.length > 0 ? "is-warn" : ""}`}
        >
          <div className="text-[0.75rem] text-[#92400E] font-semibold">Bảo trì & Hư hỏng kỳ</div>
          <div className="adm-report-kpi-val text-[#B45309]">
            {isRealApi && maintReport ? Number(maintReport.tongSoPhieu ?? 0) : damageRecords.length}
          </div>
          <div className="text-[0.7rem] text-[#B45309] mt-1">
            {isRealApi && maintReport
              ? `Vệ sinh ${maintReport.soPhieuVeSinh ?? 0} · Sửa ${maintReport.soPhieuSuaChua ?? 0} · Chi phí ${fmt(Number(maintReport.chiPhiDaChot ?? 0))}`
              : "🔍 Chi tiết từng biên bản"}
          </div>
        </div>
      </div>

      {/* Công suất kho và Top thiết bị */}
      <div className="adm-grid-2-lg">
        <div className="adm-card adm-card--padded">
          <h3 className="adm-section-heading mb-3.5 text-base">
            Hiệu suất sử dụng thiết bị (Công suất kho)
          </h3>
          <div>
            <div className="flex items-end gap-3 mb-4 flex-wrap">
              <span className="adm-cell-mono text-[2.5rem] font-extrabold text-[var(--color-forest)] leading-none">{rate}%</span>
              <span className="adm-page-subtitle">
                công suất đang thuê ({rentedEquip}/{totalEquip})
                {useStock && stockReport.tongGiaTriNhap != null ? ` · Giá trị kho ${fmt(Number(stockReport.tongGiaTriNhap))}` : ""}
              </span>
            </div>
            <div className="adm-report-bar-track">
              {/* Chiều rộng từng phân đoạn thanh công suất tính động theo tỷ lệ thiết bị */}
              <div className="adm-report-bar-seg--rented" style={{ width: `${totalEquip > 0 ? (rentedEquip / totalEquip) * 100 : 0}%` }} title="Đang thuê" />
              <div className="adm-report-bar-seg--avail" style={{ width: `${totalEquip > 0 ? (availEquip / totalEquip) * 100 : 0}%` }} title="Sẵn sàng" />
              <div className="adm-report-bar-seg--maint" style={{ width: `${totalEquip > 0 ? (maintEquip / totalEquip) * 100 : 0}%` }} title="Bảo trì" />
              <div className="adm-report-bar-seg--lost" style={{ width: `${totalEquip > 0 ? (lostEquip / totalEquip) * 100 : 0}%` }} title="Hỏng/Mất" />
            </div>
            <div className="adm-grid-2 text-[0.82rem] gap-2">
              <div className="flex items-center gap-2"><span className="adm-report-legend-dot adm-report-bar-seg--rented" /> Đang thuê: <strong>{rentedEquip}</strong></div>
              <div className="flex items-center gap-2"><span className="adm-report-legend-dot adm-report-bar-seg--avail" /> Sẵn sàng: <strong>{availEquip}</strong></div>
              <div className="flex items-center gap-2"><span className="adm-report-legend-dot adm-report-bar-seg--maint" /> Đang bảo dưỡng: <strong>{maintEquip}</strong></div>
              <div className="flex items-center gap-2"><span className="adm-report-legend-dot adm-report-bar-seg--lost" /> Thất lạc/Ngừng dùng: <strong>{lostEquip}</strong></div>
            </div>
          </div>
        </div>

        <div className="adm-card adm-card--padded">
          <h3 className="adm-section-heading mb-3.5 text-base">
            {isRealApi && opsReport?.chiSoTheoSanPham?.length ? "Hiệu suất theo sản phẩm trong kỳ (Backend)" : "Top thiết bị có số lượt thuê cao nhất"}
          </h3>
          <div className="flex flex-col gap-2">
            {isRealApi && opsReport?.chiSoTheoSanPham?.length ? (
              opsReport.chiSoTheoSanPham.slice(0, 5).map((sp, idx) => (
                <div key={sp.maSanPham} className="adm-report-rank-row">
                  <div className="flex items-center gap-2">
                    <span className="adm-cell-mono font-bold text-[var(--color-amber)] w-4.5">#{idx + 1}</span>
                    <div>
                      <strong className="text-[var(--color-forest)]">{sp.tenSanPham}</strong>
                      <div className="adm-hint-text">
                        {sp.tenDanhMuc} · {sp.tongSoThietBi} thiết bị · Hỏng {sp.soLuotHongHoc} · Mất {sp.soLuotMat}
                      </div>
                    </div>
                  </div>
                  <div className="adm-cell-right">
                    <div className="adm-cell-mono font-bold text-[var(--color-bark)]">{sp.soLuotThue} lượt</div>
                    <div className="text-[0.72rem] text-[var(--color-forest)]">{fmt(sp.tongDoanhThuUocTinh)}</div>
                  </div>
                </div>
              ))
            ) : (
              [...app.equipment].sort((a, b) => b.rentCount - a.rentCount).slice(0, 5).map((e, idx) => {
                const prod = app.products.find((p) => p.id === e.productId);
                return (
                  <div key={e.id} className="adm-report-rank-row">
                    <div className="flex items-center gap-2">
                      <span className="adm-cell-mono font-bold text-[var(--color-amber)] w-4.5">#{idx + 1}</span>
                      <div>
                        <strong className="adm-cell-mono text-[var(--color-forest)]">{e.displayCode ?? e.id}</strong> — {prod?.name}
                        <div className="adm-hint-text">{e.condition} · Nhập {e.importDate}</div>
                      </div>
                    </div>
                    <span className="adm-cell-mono font-bold text-[var(--color-bark)]">{e.rentCount} lần thuê</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
