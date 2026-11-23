import type { BaoCaoVanHanhBackend } from "../../../services/api";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";

interface ShiftMetricsSectionProps {
  reportLoading: boolean;
  pickupCount: number;
  returnCount: number;
  overdueCount: number;
  pendingReconcileCount: number;
  handedOverCount: number;
  tongQuan: BaoCaoVanHanhBackend["tongQuan"] | undefined;
  readyEquip: number;
  rentingEquip: number;
  maintEquip: number;
  lostEquip: number;
  maintReport: Record<string, unknown> | null;
  opsReport: BaoCaoVanHanhBackend | null;
}

// Khu vực hiển thị chỉ tiêu ca trực, trạng thái kho và hiệu suất xoay vòng thiết bị (UC10.1)
export function ShiftMetricsSection({
  reportLoading,
  pickupCount,
  returnCount,
  overdueCount,
  pendingReconcileCount,
  handedOverCount,
  tongQuan,
  readyEquip,
  rentingEquip,
  maintEquip,
  lostEquip,
  maintReport,
  opsReport,
}: ShiftMetricsSectionProps) {
  const productMetricsPaging = usePagination(opsReport?.chiSoTheoSanPham ?? [], 8);
  return (
    <div>
      {reportLoading && (
        <div className="so-loading-note">
          Đang tải số liệu báo cáo vận hành từ máy chủ...
        </div>
      )}

      {/* Lưới chỉ tiêu vận hành ca trực */}
      <div className="grid gap-3 mb-6 so-mini-kpi-grid">
        <div className="so-mini-kpi-card">
          <div className="so-mini-kpi-label">Đơn cần chuẩn bị & giao</div>
          <div className="so-mini-kpi-val is-forest">
            {pickupCount}
          </div>
          <div className="so-mini-kpi-sub">Chờ đóng gói & bàn giao</div>
        </div>

        <div className="so-mini-kpi-card">
          <div className="so-mini-kpi-label">Đơn đang thuê (Chờ nhận trả)</div>
          <div className="so-mini-kpi-val is-blue">
            {returnCount}
          </div>
          <div className="so-mini-kpi-sub">Khách đang sử dụng</div>
        </div>

        {/* Highlight cảnh báo đỏ khi có đơn quá hạn trong ca */}
        <div className={`so-mini-kpi-card ${overdueCount > 0 ? "is-alert" : ""}`}>
          <div className="so-mini-kpi-label">Đơn quá hạn hiện tại</div>
          <div className="so-mini-kpi-val">
            {overdueCount}
          </div>
          <div className="so-mini-kpi-sub">Cần gọi điện giục trả đồ</div>
        </div>

        <div className="so-mini-kpi-card">
          <div className="so-mini-kpi-label">Đơn chờ đối soát hoàn tất</div>
          <div className="so-mini-kpi-val is-amber">
            {pendingReconcileCount}
          </div>
          <div className="so-mini-kpi-sub">Đã nhận trả xong thiết bị</div>
        </div>

        <div className="so-mini-kpi-card">
          <div className="so-mini-kpi-label">
            {tongQuan ? "Tổng đơn thành công (Hệ thống)" : "Lượt đã giao thành công"}
          </div>
          <div className="so-mini-kpi-val is-forest">
            {tongQuan ? tongQuan.tongDonThanhCong : handedOverCount}
          </div>
          <div className="so-mini-kpi-sub">
            {tongQuan
              ? `Tỷ lệ hủy: ${tongQuan.tyLeHuyDonPhanTram}% · Quay vòng: ${tongQuan.tyLeQuayVongThietBi}x`
              : "Biên bản bàn giao đã ký"}
          </div>
        </div>
      </div>

      {/* Trạng thái thiết bị kho & quy định phân quyền */}
      <div className="grid gap-6 mb-6 so-report-split-grid">
        <div className="so-card">
          <h3 className="so-card-title">
            Tình trạng khả dụng thiết bị kho hiện tại
          </h3>
          <div className="grid gap-3 so-equip-status-grid">
            <div className="so-stat-box is-green">
              <div className="so-stat-box-label">Sẵn sàng cho thuê</div>
              <strong className="so-stat-box-val">{readyEquip}</strong>
              <div className="so-stat-box-sub">Đã vệ sinh, kiểm tra đầy đủ</div>
            </div>
            <div className="so-stat-box is-blue">
              <div className="so-stat-box-label">Đang cho khách thuê</div>
              <strong className="so-stat-box-val">{rentingEquip}</strong>
              <div className="so-stat-box-sub">Theo các đơn đang hiệu lực</div>
            </div>
            <div className="so-stat-box is-amber">
              <div className="so-stat-box-label">Đang bảo trì / Sửa chữa</div>
              <strong className="so-stat-box-val">{maintEquip}</strong>
              <div className="so-stat-box-sub">
                {typeof maintReport?.soPhieuDangMo === "number"
                  ? `${maintReport.soPhieuDangMo} phiếu bảo trì đang mở`
                  : "Cần kỹ thuật kiểm tra"}
              </div>
            </div>
            <div className="so-stat-box is-red">
              <div className="so-stat-box-label">Thất lạc / Mất mát</div>
              <strong className="so-stat-box-val">{lostEquip}</strong>
              <div className="so-stat-box-sub">
                {tongQuan ? `Tỷ lệ hao mòn: ${tongQuan.tyLeHaoMonPhanTram}%` : "Đã lập biên bản bồi thường"}
              </div>
            </div>
          </div>
        </div>

        <div className="so-card">
          <h3 className="so-card-title-sm">
            Quy định phân quyền vận hành (BR01 & UC10.1)
          </h3>
          <div className="so-policy-copy">
            <p>
              • <strong>Phạm vi dữ liệu:</strong> Nhân viên kho và CSKH được phân quyền theo dõi tình trạng đơn thuê, điều phối giao nhận và kiểm soát thiết bị tại kho.
            </p>
            <p>
              • <strong>Bảo mật tài chính:</strong> Các số liệu dòng tiền ròng và giá vốn nhập kho được bảo vệ thuộc thẩm quyền Quản trị viên.
            </p>
            <p>
              • <strong>Thao tác nhanh:</strong> Chuyển sang tab "Chuẩn bị & Bàn giao" hoặc "Nhận trả & Phụ phí" để xử lý trực tiếp đơn hàng tương ứng.
            </p>
          </div>
        </div>
      </div>

      {/* Bảng hiệu suất xoay vòng thiết bị theo sản phẩm */}
      {opsReport && opsReport.chiSoTheoSanPham.length > 0 && (
        <div className="so-table-card responsive-table">
          <div className="so-table-section-head">
            Hiệu suất xoay vòng thiết bị theo sản phẩm
          </div>
          <table className="so-table">
            <thead>
              <tr>
                {["Sản phẩm", "Danh mục", "Tổng TB", "Lượt thuê", "Hỏng hóc", "Thất lạc"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productMetricsPaging.pagedItems.map((sp) => (
                <tr key={sp.maSanPham}>
                  <td className="so-td-semibold">{sp.tenSanPham}</td>
                  <td className="so-td-muted">{sp.tenDanhMuc}</td>
                  <td className="so-td-mono-plain">{sp.tongSoThietBi}</td>
                  <td className="so-td-mono-lg">{sp.soLuotThue}</td>
                  <td className={`so-td-warn ${sp.soLuotHongHoc > 0 ? "is-warn" : ""}`}>{sp.soLuotHongHoc}</td>
                  <td className={`so-td-danger ${sp.soLuotMat > 0 ? "is-danger" : ""}`}>{sp.soLuotMat}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-3">
            <Pagination
              page={productMetricsPaging.page}
              totalPages={productMetricsPaging.totalPages}
              totalItems={productMetricsPaging.totalItems}
              startIndex={productMetricsPaging.startIndex}
              endIndex={productMetricsPaging.endIndex}
              onPageChange={productMetricsPaging.setPage}
              itemLabel="sản phẩm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
