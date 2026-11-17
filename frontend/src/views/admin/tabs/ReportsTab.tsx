import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { reportApi, type BaoCaoVanHanhBackend } from "../../../services/api/reportApi";
import { fmt, type ImportReceipt } from "../../../store";
import Icon, { type IconName } from "../../../components/Icon";

import { ReportsDrilldownModals, type DrilldownData } from "./ReportsDrilldownModals";
import { ReportsImportSection } from "./ReportsImportSection";
export function ReportsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [reportSubTab, setReportSubTab] = useState<"operational" | "revenue" | "cashflow" | "inventory">("operational");
  const [fromDate, setFromDate] = useState(() => new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierFilter, setSupplierFilter] = useState("all");

  // State dữ liệu báo cáo thật từ Backend (UC96 - UC99 / UC10.1 - UC10.3)
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportError, setReportError] = useState("");
  const [exportStatus, setExportStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [opsReport, setOpsReport] = useState<BaoCaoVanHanhBackend | null>(null);
  const [stockReport, setStockReport] = useState<any>(null);
  const [maintReport, setMaintReport] = useState<any>(null);
  const [revReport, setRevReport] = useState<any>(null);
  const [cancelFeeReport, setCancelFeeReport] = useState<any>(null);
  const [revAdjReport, setRevAdjReport] = useState<any>(null);
  const [cashReport, setCashReport] = useState<any>(null);
  const [depositReport, setDepositReport] = useState<any>(null);
  const [pendingItemsReport, setPendingItemsReport] = useState<any>(null);
  const [importReport, setImportReport] = useState<any>(null);
  const [importAdjReport, setImportAdjReport] = useState<any>(null);
  const [priceHistoryReport, setPriceHistoryReport] = useState<any>(null);

  // State cho Drill-down cấu thành số liệu (UC10.1 bước 4 & UC10.2 bước 5)
  const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null);

  // State xem chứng từ phiếu nhập kho đối chiếu trực tiếp (UC10.3 bước 6)
  const [viewingReceipt, setViewingReceipt] = useState<ImportReceipt | null>(null);

  // Kiểm tra ngày hợp lệ (UC10.1.1 & Dòng sự kiện phụ 2.1: Ngày kết thúc trước bắt đầu)
  const isDateInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  useEffect(() => {
    if (!isRealApi || isDateInvalid) return;
    let active = true;
    const tuNgay = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined;
    const denNgay = toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined;
    const maNhaCungCap =
      supplierFilter !== "all" && !Number.isNaN(Number(supplierFilter)) ? Number(supplierFilter) : undefined;

    setLoadingReports(true);
    setReportError("");
    Promise.allSettled([
      reportApi.layBaoCaoVanHanh({ tuNgay, denNgay }),
      reportApi.layHienTrangKho(),
      reportApi.layThongKeBaoTri({ tuNgay, denNgay }),
      reportApi.layDoanhThuHoanTat({ tuNgay, denNgay, soMoiTrang: 50 }),
      reportApi.layPhiHuy({ tuNgay, denNgay, soMoiTrang: 50 }),
      reportApi.layDieuChinhDoanhThu({ tuNgay, denNgay, soMoiTrang: 50 }),
      reportApi.layThuHoan({ tuNgay, denNgay, soMoiTrang: 50 }),
      reportApi.layCocChuaTatToan({ soMoiTrang: 50 }),
      reportApi.layKhoanCanXuLy(),
      reportApi.layNhapHang({ tuNgay, denNgay, maNhaCungCap, soMoiTrang: 50 }),
      reportApi.layDieuChinhNhap({ tuNgay, denNgay, maNhaCungCap, soMoiTrang: 50 }),
      reportApi.layLichSuDonGia({ tuNgay, denNgay, maNhaCungCap }),
    ])
      .then((results) => {
        if (!active) return;
        const [ops, stk, mnt, rev, cxl, adj, csh, dep, pnd, imp, impAdj, priceHist] = results;
        if (ops.status === "fulfilled") setOpsReport(ops.value);
        if (stk.status === "fulfilled") setStockReport(stk.value);
        if (mnt.status === "fulfilled") setMaintReport(mnt.value);
        if (rev.status === "fulfilled") setRevReport(rev.value);
        if (cxl.status === "fulfilled") setCancelFeeReport(cxl.value);
        if (adj.status === "fulfilled") setRevAdjReport(adj.value);
        if (csh.status === "fulfilled") setCashReport(csh.value);
        if (dep.status === "fulfilled") setDepositReport(dep.value);
        if (pnd.status === "fulfilled") setPendingItemsReport(pnd.value);
        if (imp.status === "fulfilled") setImportReport(imp.value);
        if (impAdj.status === "fulfilled") setImportAdjReport(impAdj.value);
        if (priceHist.status === "fulfilled") setPriceHistoryReport(priceHist.value);
        const rejectedCount = results.filter((r) => r.status === "rejected").length;
        if (rejectedCount === results.length) {
          setReportError("Không thể tải dữ liệu báo cáo từ máy chủ.");
        }
      })
      .finally(() => {
        if (active) setLoadingReports(false);
      });
    return () => {
      active = false;
    };
  }, [isRealApi, fromDate, toDate, supplierFilter, isDateInvalid]);

  const handleExportCsv = async () => {
    setExportStatus(null);
    if (isDateInvalid) {
      return setExportStatus({ type: "error", text: "Khoảng ngày không hợp lệ, không thể xuất báo cáo." });
    }
    if (!isRealApi) {
      setExportStatus({ type: "success", text: `Chế độ mẫu: hãy bật Real API để xuất tệp CSV thực tế cho tab ${reportSubTab}.` });
      return;
    }
    setExporting(true);
    try {
      const tuNgay = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined;
      const denNgay = toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined;
      const maNhaCungCap =
        supplierFilter !== "all" && !Number.isNaN(Number(supplierFilter)) ? Number(supplierFilter) : undefined;
      if (reportSubTab === "operational") {
        await reportApi.xuatCsvKho({ loaiBaoCao: "HienTrangKho" });
      } else if (reportSubTab === "revenue") {
        await reportApi.xuatCsvTaiChinh({ loaiBaoCao: "DoanhThuHoanTat", tuNgay, denNgay });
      } else if (reportSubTab === "cashflow") {
        await reportApi.xuatCsvTaiChinh({ loaiBaoCao: "ThuHoan", tuNgay, denNgay });
      } else {
        await reportApi.xuatCsvKho({ loaiBaoCao: "NhapHang", tuNgay, denNgay, maNhaCungCap });
      }
      setExportStatus({ type: "success", text: "Đã xuất và tải xuống tệp CSV báo cáo từ máy chủ." });
    } catch (err) {
      setExportStatus({ type: "error", text: err instanceof Error ? err.message : "Xuất CSV báo cáo thất bại." });
    } finally {
      setExporting(false);
    }
  };

  // Hàm chuẩn hóa & kiểm tra ngày nằm trong kỳ báo cáo (UC10.1.1)
  const isWithinRange = (dateStr?: string) => {
    if (!dateStr) return true;
    let d: Date;
    const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      d = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    } else {
      d = new Date(dateStr.replace(" ", "T"));
    }
    if (isNaN(d.getTime())) return true;
    const start = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const end = toDate ? new Date(toDate + "T23:59:59") : null;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  // ── 1. Dữ liệu Báo cáo Vận hành (UC10.1) ──────────────────────────────────
  const ordersToPickup = app.orders.filter(
    (o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status) && isWithinRange(o.pickupTime)
  );
  const ordersToReturn = app.orders.filter(
    (o) => o.status === "Đang thuê" && isWithinRange(o.returnTime)
  );
  const now = new Date();
  const overdueOrders = app.orders.filter((o) => {
    if (o.status !== "Đang thuê") return false;
    const retD = new Date(o.returnTime.replace(" ", "T"));
    return !isNaN(retD.getTime()) && retD < now;
  });
  const pendingReconcileOrders = app.orders.filter((o) => o.status === "Chờ đối soát");
  const handedOverOrders = app.orders.filter((o) => o.handedOverAt && isWithinRange(o.handedOverAt));
  const damageRecords = app.orders.flatMap((o) =>
    (o.returnReceipts || []).flatMap((r) =>
      r.items
        .filter((it) => it.condition !== "Bình thường" && it.condition !== "Cần vệ sinh")
        .map((it) => ({
          ...it,
          orderId: o.id,
          customerName: o.customerName,
          returnedAt: r.returnedAt,
          staffName: r.staffName,
        }))
    )
  );

  // ── 2. Dữ liệu Báo cáo Doanh thu & Dòng tiền (UC10.2, UC10.2.1) ───────────
  const completedOrders = app.orders.filter(
    (o) => o.status === "Hoàn tất" && isWithinRange(o.reconciledAt || o.returnedAt || o.createdAt)
  );
  const mockPureRentalRevenue = completedOrders.reduce((sum, o) => sum + (o.rental - o.discount), 0);
  const approvedSurcharges = app.orders.flatMap((o) =>
    o.surcharges.filter((s) => s.status === "Đã duyệt" && isWithinRange(s.reviewedAt || o.createdAt))
  );
  const mockSurchargeRevenue = approvedSurcharges.reduce((sum, s) => sum + s.amount, 0);
  const mockCancellationFees = app.orders
    .filter((o) => o.status === "Khách hủy" && isWithinRange(o.createdAt))
    .reduce((sum, o) => sum + (o.cancellationFee || 0), 0);
  const mockHeldDeposit = app.orders
    .filter((o) => ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status))
    .reduce((sum, o) => sum + o.depositTotal, 0);

  const pureRentalRevenue = isRealApi && revReport ? Number(revReport.tongDoanhThuThueSauGiam ?? 0) : mockPureRentalRevenue;
  const surchargeRevenue = isRealApi && revReport ? Number(revReport.tongPhuPhiDoiSoatBanDau ?? 0) : mockSurchargeRevenue;
  const deltaAdjustmentRevenue = isRealApi && revAdjReport ? Number(revAdjReport.tongDeltaDoanhThu ?? 0) : 0;
  const totalNetRevenue = isRealApi && revReport
    ? Number(revReport.tongDoanhThuHoanTat ?? (pureRentalRevenue + surchargeRevenue)) + deltaAdjustmentRevenue
    : mockPureRentalRevenue + mockSurchargeRevenue;
  const completedCountDisplay = isRealApi && revReport ? Number(revReport.soDonHoanTat ?? 0) : completedOrders.length;
  const cancellationFees = isRealApi && cancelFeeReport ? Number(cancelFeeReport.tongPhiHuyGiuLai ?? 0) : mockCancellationFees;
  const currentHeldDeposit = isRealApi && depositReport ? Number(depositReport.tongCocChuaTatToan ?? 0) : mockHeldDeposit;

  // Tỷ lệ hủy đơn & Khách quay lại
  const createdInPeriod = app.orders.filter((o) => isWithinRange(o.createdAt));
  const canceledCount = isRealApi && opsReport?.tongQuan ? opsReport.tongQuan.tongDonBiHuy : createdInPeriod.filter((o) => o.status === "Khách hủy" || o.status === "Cửa hàng hủy").length;
  const expiredCount = createdInPeriod.filter((o) => o.status === "Hết hạn").length;
  const validDenominator = isRealApi && opsReport?.tongQuan ? opsReport.tongQuan.tongDonPhatSinh : createdInPeriod.length - expiredCount;
  const cancellationRate = isRealApi && opsReport?.tongQuan
    ? Number(opsReport.tongQuan.tyLeHuyDonPhanTram ?? 0).toFixed(1)
    : validDenominator > 0 ? ((canceledCount / validDenominator) * 100).toFixed(1) : "0.0";

  const customerCompletedCounts: Record<string, number> = {};
  app.orders
    .filter((o) => o.status === "Hoàn tất")
    .forEach((o) => {
      customerCompletedCounts[o.customerPhone] = (customerCompletedCounts[o.customerPhone] || 0) + 1;
    });
  const returningCustomersCount = Object.values(customerCompletedCounts).filter((cnt) => cnt >= 2).length;

  // Dòng tiền thực tế
  const inRangeTransactions = app.orders
    .flatMap((o) => o.transactions.map((t) => ({ ...t, orderId: o.id, customerName: o.customerName })))
    .filter((t) => isWithinRange(t.completedAt || t.createdAt));
  const mockCashInflow = inRangeTransactions
    .filter((t) => (t.type === "Thanh toán ban đầu" || t.type === "Thu thêm") && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const mockCashOutflow = inRangeTransactions
    .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);

  const totalCashInflow = isRealApi && cashReport ? Number(cashReport.tongThuThucTe ?? 0) : mockCashInflow;
  const totalCashOutflow = isRealApi && cashReport ? Number(cashReport.tongHoanThucTe ?? 0) : mockCashOutflow;
  const netCashflow = isRealApi && cashReport ? Number(cashReport.dongTienRong ?? (totalCashInflow - totalCashOutflow)) : totalCashInflow - totalCashOutflow;

  // ── 3. Dữ liệu Báo cáo Nhập kho (UC10.3) ──────────────────────────────────
  const inRangeImports = app.importReceipts.filter(
    (r) =>
      r.status === "Đã nhập kho" &&
      isWithinRange(r.confirmedAt || r.receivedAt || r.createdAt) &&
      (supplierFilter === "all" || r.supplierId === supplierFilter || r.supplierName === supplierFilter)
  );
  const mockImportAssetValue = inRangeImports.reduce(
    (sum, r) => sum + r.lines.reduce((ls, l) => ls + l.quantity * l.unitPrice, 0),
    0
  );
  const totalImportAssetValue = isRealApi && importReport
    ? Number(importReport.tongGiaTriHieuLuc ?? importReport.tongGiaTriGoc ?? 0)
    : mockImportAssetValue;

  return (
    <div>
      {/* Tiêu đề & Bộ chọn kỳ báo cáo (UC10.1, UC10.1.1) */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Báo cáo & Phân tích chuyên sâu (UC10.1 - UC10.3)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Hệ thống 4 báo cáo tách biệt, tuân thủ nghiêm ngặt nguyên tắc kế toán tài chính và hỗ trợ truy vết cấu thành.
          </p>
        </div>

        {/* Bộ lọc khoảng ngày & Xuất CSV */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-bone rounded-lg p-1.5 px-3 text-xs shadow-xs">
            <span style={{ color: "var(--color-forest)", fontWeight: 700 }}>Kỳ báo cáo:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ border: "1px solid var(--color-bone)", borderRadius: 4, padding: "3px 6px", fontSize: "0.78rem" }}
            />
            <span>→</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ border: "1px solid var(--color-bone)", borderRadius: 4, padding: "3px 6px", fontSize: "0.78rem" }}
            />
          </div>
          <button
            type="button"
            disabled={exporting}
            onClick={handleExportCsv}
            className="btn btn-secondary btn-sm"
          >
            <span className="icon-label"><Icon name="chart" size={14} /> {exporting ? "Đang xuất..." : "Xuất CSV"}</span>
          </button>
        </div>
      </div>

      {loadingReports && (
        <div style={{ marginBottom: 12, fontSize: "0.82rem", color: "#6B7280" }}>
          Đang tổng hợp số liệu báo cáo từ máy chủ...
        </div>
      )}
      {reportError && (
        <div role="alert" style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#B91C1C", borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontSize: "0.84rem" }}>
          {reportError}
        </div>
      )}
      {exportStatus && (
        <div role="alert" style={{ background: exportStatus.type === "error" ? "#FEE2E2" : "#DCFCE7", color: exportStatus.type === "error" ? "#B91C1C" : "#15803D", borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontSize: "0.84rem" }}>
          {exportStatus.text}
        </div>
      )}

      {/* Cảnh báo ngày không hợp lệ (Dòng sự kiện phụ 2.1) */}
      {isDateInvalid && (
        <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#B91C1C", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
          <strong>Lỗi kỳ báo cáo:</strong> Ngày kết thúc ({toDate}) không được nhỏ hơn ngày bắt đầu ({fromDate}). Vui lòng điều chỉnh lại bộ lọc để cập nhật dữ liệu.
        </div>
      )}

      {/* Sub-tabs điều hướng 4 báo cáo */}
      <div className="flex gap-2 mb-6 border-b border-bone pb-3 flex-wrap">
        {[
          { key: "operational" as const, label: "1. Vận hành kho (UC10.1)", icon: "tool" as IconName },
          { key: "revenue" as const, label: "2. Doanh thu thuần (UC10.2)", icon: "chart" as IconName },
          { key: "cashflow" as const, label: "3. Dòng tiền thực tế (UC10.2.1)", icon: "wallet" as IconName },
          { key: "inventory" as const, label: "4. Nhập kho & Tài sản (UC10.3)", icon: "package" as IconName },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setReportSubTab(tab.key)}
            style={{
              background: reportSubTab === tab.key ? "var(--color-forest)" : "white",
              color: reportSubTab === tab.key ? "white" : "var(--color-bark)",
              border: `1px solid ${reportSubTab === tab.key ? "var(--color-forest)" : "var(--color-bone)"}`,
              borderRadius: 8,
              padding: "9px 16px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            <span className="icon-label"><Icon name={tab.icon} size={16} /> {tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── BÁO CÁO 1: VẬN HÀNH KHO (UC10.1 & UC10.1.1) ─────────────────────── */}
      {reportSubTab === "operational" && (
        <div>
          {/* Lưới 6 chỉ tiêu vận hành trọng yếu (Click để Drill-down - Bước 4 UC10.1) */}
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div
              onClick={() => setDrilldownData({ title: "Danh sách đơn cần giao trong kỳ", subtitle: `Có ${ordersToPickup.length} đơn có giờ nhận dự kiến trong kỳ ${fromDate} → ${toDate}`, type: "orders", items: ordersToPickup })}
              style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", cursor: "pointer", transition: "transform 0.15s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
              className="hover:border-forest"
            >
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn cần giao trong kỳ</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                {ordersToPickup.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-amber)", marginTop: 4 }}>🔍 Nhấn để xem danh sách</div>
            </div>

            <div
              onClick={() => setDrilldownData({ title: "Danh sách đơn cần nhận trả trong kỳ", subtitle: `Có ${ordersToReturn.length} đơn có hạn trả dự kiến trong kỳ`, type: "orders", items: ordersToReturn })}
              style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
              className="hover:border-forest"
            >
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn cần nhận trả trong kỳ</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "#2563EB", marginTop: 2 }}>
                {ordersToReturn.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-amber)", marginTop: 4 }}>🔍 Nhấn để xem danh sách</div>
            </div>

            <div
              onClick={() => setDrilldownData({ title: "Danh sách đơn quá hạn tại thời điểm tổng hợp", subtitle: `Đơn quá giờ trả dự kiến nhưng chưa trả đủ thiết bị`, type: "orders", items: overdueOrders })}
              style={{ background: overdueOrders.length > 0 ? "#FEF2F2" : "white", borderRadius: 10, padding: 14, border: `1px solid ${overdueOrders.length > 0 ? "#F87171" : "var(--color-bone)"}`, cursor: "pointer" }}
            >
              <div style={{ fontSize: "0.75rem", color: overdueOrders.length > 0 ? "#B91C1C" : "#6B7280", fontWeight: 600 }}>Đơn quá hạn hiện tại</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: overdueOrders.length > 0 ? "#DC2626" : "var(--color-bark)", marginTop: 2 }}>
                {overdueOrders.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: overdueOrders.length > 0 ? "#DC2626" : "#9CA3AF", marginTop: 4 }}>Cần gọi điện xử lý ngay</div>
            </div>

            <div
              onClick={() => setDrilldownData({ title: "Danh sách đơn chờ đối soát cọc", subtitle: `Thiết bị đã nhận trả xong, đang chờ thủ quỹ hoàn/thu cọc`, type: "orders", items: pendingReconcileOrders })}
              style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", cursor: "pointer" }}
              className="hover:border-forest"
            >
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn chờ đối soát cọc</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "#D97706", marginTop: 2 }}>
                {pendingReconcileOrders.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-amber)", marginTop: 4 }}>🔍 Nhấn để xem danh sách</div>
            </div>

            <div
              onClick={() => setDrilldownData({ title: "Danh sách lượt thuê đã bàn giao thành công", subtitle: `Các đơn đã giao thiết bị cho khách trong kỳ`, type: "orders", items: handedOverOrders })}
              style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", cursor: "pointer" }}
              className="hover:border-forest"
            >
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Lượt thuê đã bàn giao</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                {isRealApi && opsReport?.tongQuan ? opsReport.tongQuan.tongDonThanhCong : handedOverOrders.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>
                {isRealApi && opsReport?.tongQuan
                  ? `Quay vòng ${opsReport.tongQuan.tyLeQuayVongThietBi} · TB ${opsReport.tongQuan.soNgayThueTrungBinh} ngày`
                  : "Tổng lượt giao trong kỳ"}
              </div>
            </div>

            <div
              onClick={() => setDrilldownData({ title: "Chi tiết các trường hợp thiết bị hư hỏng/mất mát", subtitle: `Danh sách biên bản nhận trả ghi nhận thiết bị hỏng có kết luận`, type: "damage", items: damageRecords })}
              style={{ background: damageRecords.length > 0 ? "#FFFBEB" : "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", cursor: "pointer" }}
            >
              <div style={{ fontSize: "0.75rem", color: "#92400E", fontWeight: 600 }}>Bảo trì & Hư hỏng kỳ</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "#B45309", marginTop: 2 }}>
                {isRealApi && maintReport ? Number(maintReport.tongSoPhieu ?? 0) : damageRecords.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#B45309", marginTop: 4 }}>
                {isRealApi && maintReport
                  ? `Vệ sinh ${maintReport.soPhieuVeSinh ?? 0} · Sửa ${maintReport.soPhieuSuaChua ?? 0} · Chi phí ${fmt(Number(maintReport.chiPhiDaChot ?? 0))}`
                  : "🔍 Chi tiết từng biên bản"}
              </div>
            </div>
          </div>

          {/* Công suất kho và Top thiết bị */}
          <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 14, fontSize: "1rem" }}>
                Hiệu suất sử dụng thiết bị (Công suất kho)
              </h3>
              {(() => {
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
                    <div className="flex items-end gap-3 mb-4">
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "2.5rem", fontWeight: 800, color: "var(--color-forest)", lineHeight: 1 }}>{rate}%</span>
                      <span style={{ fontSize: "0.85rem", color: "#6B7280" }}>
                        công suất đang thuê ({rentedEquip}/{totalEquip})
                        {useStock && stockReport.tongGiaTriNhap != null ? ` · Giá trị kho ${fmt(Number(stockReport.tongGiaTriNhap))}` : ""}
                      </span>
                    </div>
                    <div style={{ height: 12, background: "#E5E7EB", borderRadius: 6, overflow: "hidden", display: "flex", marginBottom: 16 }}>
                      <div style={{ width: `${totalEquip > 0 ? (rentedEquip / totalEquip) * 100 : 0}%`, background: "#1D4ED8" }} title="Đang thuê" />
                      <div style={{ width: `${totalEquip > 0 ? (availEquip / totalEquip) * 100 : 0}%`, background: "#15803D" }} title="Sẵn sàng" />
                      <div style={{ width: `${totalEquip > 0 ? (maintEquip / totalEquip) * 100 : 0}%`, background: "#F59E0B" }} title="Bảo trì" />
                      <div style={{ width: `${totalEquip > 0 ? (lostEquip / totalEquip) * 100 : 0}%`, background: "#EF4444" }} title="Hỏng/Mất" />
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, 1fr)", fontSize: "0.82rem" }}>
                      <div className="flex items-center gap-2"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#1D4ED8" }} /> Đang thuê: <strong>{rentedEquip}</strong></div>
                      <div className="flex items-center gap-2"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#15803D" }} /> Sẵn sàng: <strong>{availEquip}</strong></div>
                      <div className="flex items-center gap-2"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} /> Đang bảo dưỡng: <strong>{maintEquip}</strong></div>
                      <div className="flex items-center gap-2"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} /> Thất lạc/Ngừng dùng: <strong>{lostEquip}</strong></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 14, fontSize: "1rem" }}>
                {isRealApi && opsReport?.chiSoTheoSanPham?.length ? "Hiệu suất theo sản phẩm trong kỳ (Backend)" : "Top thiết bị có số lượt thuê cao nhất"}
              </h3>
              <div className="flex flex-col gap-2">
                {isRealApi && opsReport?.chiSoTheoSanPham?.length ? (
                  opsReport.chiSoTheoSanPham.slice(0, 5).map((sp, idx) => (
                    <div key={sp.maSanPham} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-parchment)", borderRadius: 8 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-amber)", width: 18 }}>#{idx + 1}</span>
                        <div>
                          <strong style={{ color: "var(--color-forest)" }}>{sp.tenSanPham}</strong>
                          <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>
                            {sp.tenDanhMuc} · {sp.tongSoThietBi} thiết bị · Hỏng {sp.soLuotHongHoc} · Mất {sp.soLuotMat}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-bark)" }}>{sp.soLuotThue} lượt</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--color-forest)" }}>{fmt(sp.tongDoanhThuUocTinh)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  [...app.equipment].sort((a, b) => b.rentCount - a.rentCount).slice(0, 5).map((e, idx) => {
                    const prod = app.products.find((p) => p.id === e.productId);
                    return (
                      <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-parchment)", borderRadius: 8 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-amber)", width: 18 }}>#{idx + 1}</span>
                          <div>
                            <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{e.displayCode ?? e.id}</strong> — {prod?.name}
                            <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{e.condition} · Nhập {e.importDate}</div>
                          </div>
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-bark)" }}>{e.rentCount} lần thuê</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── BÁO CÁO 2: DOANH THU THUẦN (UC10.2 & UC10.2.1) ─────────────────── */}
      {reportSubTab === "revenue" && (
        <div>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 18px", marginBottom: 20, color: "#1E40AF", fontSize: "0.85rem" }}>
            <strong>💡 NGUYÊN TẮC KẾ TOÁN BẤT DI BẤT DỊCH (UC10.2):</strong> Tiền cọc là khoản nợ phải trả lại cho khách sau khi đối soát xong. Tiền cọc <strong>tuyệt đối không được tính vào doanh thu</strong> kinh doanh của GearGo.
          </div>

          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div
              onClick={() => setDrilldownData({ title: "Danh sách đơn thuê hoàn tất cấu thành doanh thu", subtitle: `Các đơn đã thanh toán và quyết toán hoàn tất trong kỳ`, type: "orders", items: completedOrders })}
              style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)", cursor: "pointer" }}
              className="hover:border-forest"
            >
              <div style={{ fontSize: "0.78rem", color: "#6B7280", fontWeight: 600 }}>Doanh thu tiền thuê thuần</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 4 }}>
                {fmt(pureRentalRevenue)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-amber)", marginTop: 4 }}>Từ {completedCountDisplay} đơn hoàn tất trong kỳ 🔍</div>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "#6B7280", fontWeight: 600 }}>Phụ phí & Điều chỉnh đối soát</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "#D97706", marginTop: 4 }}>
                +{fmt(surchargeRevenue + deltaAdjustmentRevenue)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 4 }}>
                Ban đầu {fmt(surchargeRevenue)}{isRealApi && revAdjReport ? ` · Điều chỉnh ${fmt(deltaAdjustmentRevenue)} (${revAdjReport.soPhieuDieuChinh ?? 0} phiếu)` : ` (${approvedSurcharges.length} khoản)`}
              </div>
            </div>

            <div style={{ background: "var(--color-forest)", borderRadius: 12, padding: 18, color: "white" }}>
              <div style={{ fontSize: "0.78rem", opacity: 0.85, fontWeight: 600 }}>TỔNG DOANH THU THUẦN</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>
                {fmt(totalNetRevenue)}
              </div>
              <div style={{ fontSize: "0.72rem", opacity: 0.8, marginTop: 4 }}>Thuê thuần + Phụ phí đối soát ± Điều chỉnh</div>
            </div>
          </div>

          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
                {isRealApi && revReport?.items ? `Chi tiết đơn hoàn tất trong kỳ (${revReport.items.length} đơn)` : "Doanh thu phân bổ theo danh mục sản phẩm trong kỳ"}
              </h3>
              {isRealApi && revReport?.items ? (
                <div className="responsive-table" style={{ overflow: "auto", maxHeight: 300 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                        <th style={{ padding: "8px 10px" }}>Mã đơn</th>
                        <th style={{ padding: "8px 10px" }}>Hoàn tất</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Thuê sau giảm</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Phụ phí</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Tổng doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(revReport.items as any[]).map((it) => (
                        <tr key={it.maDonThue} style={{ borderTop: "1px solid var(--color-bone)" }}>
                          <td style={{ padding: "7px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{it.maDonHienThi || it.maDonThue}</td>
                          <td style={{ padding: "7px 10px", color: "#6B7280" }}>{it.thoiDiemHoanTat ? new Date(it.thoiDiemHoanTat).toLocaleDateString("vi-VN") : "—"}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmt(Number(it.tienThueSauGiam ?? 0))}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: "#D97706" }}>{fmt(Number(it.phuPhiDoiSoatBanDau ?? 0))}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmt(Number(it.tongDoanhThu ?? 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                app.categories.map((c) => {
                  const catProds = app.products.filter((p) => p.category === c.name || p.categoryId === c.id).map((p) => p.id);
                  const catRev = completedOrders.flatMap((o) => o.items).filter((it) => catProds.includes(it.productId)).reduce((s, it) => s + it.pricePerDay * it.qty * it.days, 0);
                  const percent = pureRentalRevenue > 0 ? Math.round((catRev / pureRentalRevenue) * 100) : 0;
                  return (
                    <div key={c.id} style={{ marginBottom: 12 }}>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(catRev)} ({percent}%)</span>
                      </div>
                      <div style={{ height: 8, background: "var(--color-parchment)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "var(--color-forest)", width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
                <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10, fontSize: "0.9rem" }}>
                  Chỉ số chuyển đổi & Chăm sóc khách hàng (UC10.2)
                </h3>
                <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Tỷ lệ hủy đơn (BR22)</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 800, color: "#DC2626", marginTop: 2 }}>
                      {cancellationRate}%
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>{canceledCount} hủy / {validDenominator} đơn phát sinh</div>
                  </div>

                  <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Khách quay lại (≥2 lần)</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                      {returningCustomersCount}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>Khách có ≥2 đơn hoàn tất</div>
                  </div>
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
                <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Thu nhập khác: Phí hủy đơn giữ lại (UC07)</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 700, color: "var(--color-bark)", marginTop: 2 }}>
                    {fmt(cancellationFees)}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>
                    {isRealApi && cancelFeeReport ? `${cancelFeeReport.soDonHuyCoPhi ?? 0} đơn hủy có thu phí` : "Thu từ khách hủy sát giờ hẹn (<48h)"}
                  </div>
                </div>

                <div style={{ background: "#FFFBEB", borderRadius: 8, padding: 12, border: "1px solid #FDE68A" }}>
                  <div style={{ fontSize: "0.75rem", color: "#92400E", fontWeight: 600 }}>Tiền cọc đang tạm giữ trong các đơn mở</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 700, color: "#B45309", marginTop: 2 }}>
                    {fmt(currentHeldDeposit)}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#B45309" }}>
                    {isRealApi && depositReport ? `${depositReport.soDonConGiuCoc ?? 0} đơn còn giữ cọc · Không tính doanh thu` : "Nợ phải hoàn trả khách sau khi đối soát"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── BÁO CÁO 3: DÒNG TIỀN THỰC TẾ (UC10.2.1 CASHFLOW) ────────────────── */}
      {reportSubTab === "cashflow" && (
        <div>
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "#15803D", fontWeight: 700 }}>↑ DÒNG TIỀN VÀO (INFLOW)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "#15803D", marginTop: 4 }}>
                +{fmt(totalCashInflow)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 4 }}>Tiền thuê + Cọc ban đầu + Thu thêm phụ phí</div>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "#DC2626", fontWeight: 700 }}>↓ DÒNG TIỀN RA (OUTFLOW)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "#DC2626", marginTop: 4 }}>
                −{fmt(totalCashOutflow)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 4 }}>Hoàn cọc đối soát + Hoàn tiền hủy đơn</div>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--color-bark)", fontWeight: 700 }}>DÒNG TIỀN RÒNG (NET CASHFLOW)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: netCashflow >= 0 ? "var(--color-forest)" : "#DC2626", marginTop: 4 }}>
                {netCashflow >= 0 ? "+" : ""}{fmt(netCashflow)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 4 }}>Lượng tiền thực tế chênh lệch trong tài khoản</div>
            </div>
          </div>

          {isRealApi && pendingItemsReport && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: "0.82rem", color: "#92400E" }}>
              <strong>Khoản cần xử lý kế toán:</strong>{" "}
              {pendingItemsReport.soKhoanThuCanDoiChieu ?? 0} khoản thu chờ đối chiếu ({fmt(Number(pendingItemsReport.tongTienThuCanDoiChieu ?? 0))}) ·{" "}
              {(pendingItemsReport.hoanDangChoItems ?? []).length} khoản hoàn đang chờ ·{" "}
              {(pendingItemsReport.doiSoatDieuChinhDangXuLyItems ?? []).length} đối soát điều chỉnh ·{" "}
              {(pendingItemsReport.donHoanTatThieuDoiSoatItems ?? []).length} đơn hoàn tất thiếu đối soát.
            </div>
          )}

          <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)", marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, color: "var(--color-bark)", fontSize: "0.95rem", marginBottom: 8 }}>
              Bảng đối chiếu chênh lệch: Doanh thu thuần vs Dòng tiền thực tế (UC10.2 - Bước 6)
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 12 }}>
              Giải thích nguyên nhân chênh lệch giữa Doanh thu ghi nhận trên đơn hoàn tất và Dòng tiền ra vào tài khoản ngân hàng trong kỳ.
            </p>
            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12, fontSize: "0.82rem" }}>
              <div className="flex justify-between py-1 border-b border-bone">
                <span>(A) Tổng doanh thu thuần ghi nhận (Thuê + Phụ phí giữ lại):</span>
                <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(totalNetRevenue)}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-bone">
                <span>(B) Dòng tiền ròng thực tế qua tài khoản (Net Cashflow):</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{fmt(netCashflow)}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-bone" style={{ color: "#B45309" }}>
                <span>(+) Tiền cọc khách hàng đang tạm giữ trong các đơn mở (Chưa hoàn):</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>+{fmt(currentHeldDeposit)}</strong>
              </div>
              <div className="flex justify-between py-1" style={{ color: "#4B5563" }}>
                <span>(+) Khoản thu nhập từ phí hủy đơn:</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>+{fmt(cancellationFees)}</strong>
              </div>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
            <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
              {isRealApi && cashReport
                ? `Chi tiết giao dịch dòng tiền trong kỳ (${(cashReport.giaoDichThus ?? []).length} thu · ${(cashReport.khoanHoans ?? []).length} hoàn)`
                : `Chi tiết giao dịch dòng tiền trong kỳ (${inRangeTransactions.length} giao dịch)`}
            </h3>
            <div className="responsive-table" style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                    {["Mã GD", "Loại giao dịch", "Đơn hàng", "Khách hàng / Lý do", "Số tiền", "Trạng thái", "Ngày hoàn tất"].map((h) => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isRealApi && cashReport ? (
                    [
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
                    ].map((row) => (
                      <tr key={row.key} style={{ borderTop: "1px solid var(--color-bone)", fontSize: "0.8rem" }}>
                        <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{row.code}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 600 }}>{row.type}</td>
                        <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)" }}>{row.orderCode}</td>
                        <td style={{ padding: "9px 12px" }}>{row.note}</td>
                        <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: row.isIn ? "#15803D" : "#DC2626" }}>
                          {row.isIn ? "+" : "−"}{fmt(row.amount)}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>{row.status}</span>
                        </td>
                        <td style={{ padding: "9px 12px", color: "#6B7280" }}>{row.at}</td>
                      </tr>
                    ))
                  ) : (
                    inRangeTransactions.map((t, idx) => (
                      <tr key={`${t.id}-${idx}`} style={{ borderTop: "1px solid var(--color-bone)", fontSize: "0.8rem" }}>
                        <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{t.id}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 600 }}>{t.type}</td>
                        <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)" }}>{t.orderId}</td>
                        <td style={{ padding: "9px 12px" }}>{t.customerName}</td>
                        <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: t.type === "Thanh toán ban đầu" || t.type === "Thu thêm" ? "#15803D" : "#DC2626" }}>
                          {t.type === "Thanh toán ban đầu" || t.type === "Thu thêm" ? "+" : "−"}{fmt(t.amount)}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{ background: t.status === "Thành công" ? "#DCFCE7" : "#FEE2E2", color: t.status === "Thành công" ? "#15803D" : "#DC2626", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ padding: "9px 12px", color: "#6B7280" }}>{t.completedAt || t.createdAt}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── BÁO CÁO 4: NHẬP KHO & TÀI SẢN (UC10.3) ─────────────────────────── */}
      {reportSubTab === "inventory" && (
        <ReportsImportSection
          app={app}
          isRealApi={isRealApi}
          supplierFilter={supplierFilter}
          setSupplierFilter={setSupplierFilter}
          totalImportAssetValue={totalImportAssetValue}
          importReport={importReport}
          importAdjReport={importAdjReport}
          priceHistoryReport={priceHistoryReport}
          inRangeImports={inRangeImports}
          setViewingReceipt={setViewingReceipt}
        />
      )}

      <ReportsDrilldownModals
        drilldownData={drilldownData}
        setDrilldownData={setDrilldownData}
        viewingReceipt={viewingReceipt}
        setViewingReceipt={setViewingReceipt}
      />
    </div>
  );
}

