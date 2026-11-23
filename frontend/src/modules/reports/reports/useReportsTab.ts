import { useState, useEffect } from "react";
import type { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { reportApi, type BaoCaoVanHanhBackend } from "../../../services/api/reportApi";
import type { ImportReceipt } from "../../../store";
import type { DrilldownData } from "../ReportsDrilldownModals";

export type ReportSubTab = "operational" | "revenue" | "cashflow" | "inventory";

/**
 * Hook quản lý bộ lọc kỳ báo cáo, đồng bộ 12 nguồn API báo cáo và tính toán
 * số liệu dự phòng (mock) cho 4 trụ cột báo cáo UC10.1 - UC10.3.
 */
export function useReportsTab(app: ReturnType<typeof useApp>) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [reportSubTab, setReportSubTab] = useState<ReportSubTab>("operational");
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

  // State cho Drill-down cấu thành số liệu & xem phiếu nhập kho đối chiếu
  const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<ImportReceipt | null>(null);

  // Kiểm tra ngày hợp lệ (UC10.1.1 & Dòng sự kiện phụ 2.1: Ngày kết thúc trước bắt đầu)
  const isDateInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  // Tải đồng thời 12 API báo cáo bằng allSettled để tránh một API lỗi chặn toàn bộ tab
  useEffect(() => {
    if (!isRealApi || isDateInvalid) return;
    let active = true;
    // Gửi thẳng chuỗi ngày YYYY-MM-DD (không đổi sang UTC ISO gây lùi 1 ngày ở múi giờ VN UTC+7)
    const tuNgay = fromDate || undefined;
    const denNgay = toDate || undefined;
    const maNhaCungCap =
      supplierFilter !== "all" && !Number.isNaN(Number(supplierFilter)) ? Number(supplierFilter) : undefined;

    setLoadingReports(true);
    setReportError("");
    Promise.allSettled([
      reportApi.layBaoCaoVanHanh({ tuNgay, denNgay }),
      reportApi.layHienTrangKho(),
      reportApi.layThongKeBaoTri({ tuNgay, denNgay }),
      reportApi.layDoanhThuHoanTat({ tuNgay, denNgay, soMoiTrang: 200 }),
      reportApi.layPhiHuy({ tuNgay, denNgay, soMoiTrang: 200 }),
      reportApi.layDieuChinhDoanhThu({ tuNgay, denNgay, soMoiTrang: 200 }),
      reportApi.layThuHoan({ tuNgay, denNgay, soMoiTrang: 200 }),
      reportApi.layCocChuaTatToan({ soMoiTrang: 200 }),
      reportApi.layKhoanCanXuLy(),
      reportApi.layNhapHang({ tuNgay, denNgay, maNhaCungCap, soMoiTrang: 200 }),
      reportApi.layDieuChinhNhap({ tuNgay, denNgay, maNhaCungCap, soMoiTrang: 200 }),
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

  // Xuất báo cáo CSV tương ứng sub-tab hiện tại
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
      const tuNgay = fromDate || undefined;
      const denNgay = toDate || undefined;
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

  // Chuẩn hóa chuỗi ngày (hỗ trợ cả dd/MM/yyyy và ISO) để lọc trong kỳ báo cáo
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

  // 1. Chỉ tiêu Vận hành kho (UC10.1)
  const ordersToPickup = app.orders.filter(
    (o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status) && isWithinRange(o.pickupTime)
  );
  const ordersToReturn = app.orders.filter((o) => o.status === "Đang thuê" && isWithinRange(o.returnTime));
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

  // 2. Chỉ tiêu Doanh thu & Dòng tiền (UC10.2, UC10.2.1)
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
  const canceledCount =
    isRealApi && opsReport?.tongQuan
      ? opsReport.tongQuan.tongDonBiHuy
      : createdInPeriod.filter((o) => o.status === "Khách hủy" || o.status === "Cửa hàng hủy").length;
  const expiredCount = createdInPeriod.filter((o) => o.status === "Hết hạn").length;
  const validDenominator = isRealApi && opsReport?.tongQuan ? opsReport.tongQuan.tongDonPhatSinh : createdInPeriod.length - expiredCount;
  const cancellationRate =
    isRealApi && opsReport?.tongQuan
      ? Number(opsReport.tongQuan.tyLeHuyDonPhanTram ?? 0).toFixed(1)
      : validDenominator > 0
      ? ((canceledCount / validDenominator) * 100).toFixed(1)
      : "0.0";

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

  // 3. Nhập kho & Tài sản (UC10.3)
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
  const totalImportAssetValue =
    isRealApi && importReport ? Number(importReport.tongGiaTriHieuLuc ?? importReport.tongGiaTriGoc ?? 0) : mockImportAssetValue;

  return {
    isRealApi, reportSubTab, setReportSubTab, fromDate, setFromDate, toDate, setToDate,
    supplierFilter, setSupplierFilter, loadingReports, reportError, exportStatus, exporting,
    opsReport, stockReport, maintReport, revReport, cancelFeeReport, revAdjReport,
    cashReport, depositReport, pendingItemsReport, importReport, importAdjReport, priceHistoryReport,
    drilldownData, setDrilldownData, viewingReceipt, setViewingReceipt, isDateInvalid,
    handleExportCsv, ordersToPickup, ordersToReturn, overdueOrders, pendingReconcileOrders,
    handedOverOrders, damageRecords, completedOrders, approvedSurcharges, pureRentalRevenue,
    surchargeRevenue, deltaAdjustmentRevenue, totalNetRevenue, completedCountDisplay,
    cancellationFees, currentHeldDeposit, canceledCount, validDenominator, cancellationRate,
    returningCustomersCount, inRangeTransactions, totalCashInflow, totalCashOutflow,
    netCashflow, inRangeImports, totalImportAssetValue,
  };
}
