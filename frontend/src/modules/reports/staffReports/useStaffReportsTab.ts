import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { reportApi, auditApi, type BaoCaoVanHanhBackend } from "../../../services/api";
import { mapNhatKyToAuditLog, type AuditLogEntryWithRef } from "../../../services/mappers";
import { useHasPerm } from "../../../features/permissions/PermissionsContext";
import { Permissions } from "../../../constants/permissions";

// Hook quản lý state, gọi API báo cáo ca trực & nhật ký thao tác nhân viên (UC10.1 & UC10.4)
export function useStaffReportsTab(app: ReturnType<typeof useApp>) {
  // FN7-01/02: check perm trước khi gọi API để tránh 403 trên console
  const hasPerm = useHasPerm();
  const canXemBaoCao = hasPerm(Permissions.BaoCao_Xem) || hasPerm(Permissions.BaoCaoKho_Xem);
  const canXemKho = hasPerm(Permissions.Kho_Xem);
  const [subTab, setSubTab] = useState<"shift" | "audit">("shift");
  const [searchAudit, setSearchAudit] = useState("");
  const [opsReport, setOpsReport] = useState<BaoCaoVanHanhBackend | null>(null);
  const [stockReport, setStockReport] = useState<Record<string, unknown> | null>(null);
  const [maintReport, setMaintReport] = useState<Record<string, unknown> | null>(null);
  const [auditLogsBackend, setAuditLogsBackend] = useState<AuditLogEntryWithRef[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const now = new Date();

  // Tải đồng thời báo cáo vận hành, hiện trạng kho & thống kê bảo trì (StaffOrAdmin)
  useEffect(() => {
    if (!app.realApi) return;
    let cancelled = false;
    setReportLoading(true);
    setReportError(null);
    // FN7-01: chỉ gọi hiện trạng kho khi có quyền Kho.Xem, báo cáo khi có BaoCao.Xem
    void Promise.all([
      canXemBaoCao ? reportApi.layBaoCaoVanHanh().catch(() => null) : Promise.resolve(null),
      canXemKho ? reportApi.layHienTrangKho().catch(() => null) : Promise.resolve(null),
      canXemBaoCao ? reportApi.layThongKeBaoTri().catch(() => null) : Promise.resolve(null),
    ])
      .then(([ops, stock, maint]) => {
        if (cancelled) return;
        setOpsReport(ops as BaoCaoVanHanhBackend | null);
        setStockReport(stock as Record<string, unknown> | null);
        setMaintReport(maint as Record<string, unknown> | null);
      })
      .catch((err) => {
        if (!cancelled) {
          setReportError(err instanceof Error ? err.message : "Không thể tải báo cáo vận hành ca trực.");
        }
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [app.realApi, canXemBaoCao, canXemKho]);

  // Debounce 250ms tải nhật ký thao tác hệ thống theo từ khóa tìm kiếm (UC100/UC102)
  useEffect(() => {
    // FN7-02: chặn gọi auditApi khi không có quyền BaoCao.Xem (tránh 403)
    if (!app.realApi || subTab !== "audit" || !canXemBaoCao) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void auditApi
        .traCuu({ tuKhoa: searchAudit.trim() || undefined, trang: 1, soMoiTrang: 100 })
        .then((paged) => {
          if (!cancelled) {
            setAuditLogsBackend((paged.items || []).map(mapNhatKyToAuditLog));
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setReportError(err instanceof Error ? err.message : "Không thể tải nhật ký thao tác.");
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [app.realApi, subTab, searchAudit, canXemBaoCao]);

  // 1. Chỉ tiêu vận hành ca trực tính từ danh sách đơn hiện hành
  const todayStr = now.toISOString().slice(0, 10);
  // FN7-02: loại đơn đã huỷ / hết hạn / chờ thanh toán khỏi thống kê hiệu suất ca trực
  const EXCLUDED_FROM_PERF = new Set([
    "Khách hủy",
    "Cửa hàng hủy",
    "Hết hạn",
    "Chờ thanh toán",
  ]);
  const perfOrders = app.orders.filter((o) => !EXCLUDED_FROM_PERF.has(o.status));
  const pickupInShift = perfOrders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status));
  const returnInShift = perfOrders.filter((o) => o.status === "Đang thuê");
  const overdueOrders = perfOrders.filter((o) => app.checkOrderOverdue(o).isOverdue);
  const pendingReconcile = perfOrders.filter((o) => o.status === "Chờ đối soát");
  const handedOverToday = perfOrders.filter((o) => o.handedOverAt && o.handedOverAt.slice(0, 10) === todayStr);

  // Thống kê thiết bị trong kho (ưu tiên tổng quan từ báo cáo máy chủ nếu đã tải)
  const tongQuan = opsReport?.tongQuan;
  const readyEquip =
    typeof stockReport?.sanSang === "number"
      ? (stockReport.sanSang as number)
      : app.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").length;
  const rentingEquip =
    tongQuan?.soThietBiDangChoThue ?? app.equipment.filter((e) => e.equipmentStatus === "Đang thuê").length;
  const maintEquip =
    tongQuan?.soThietBiDangBaoTri ?? app.equipment.filter((e) => e.equipmentStatus === "Đang bảo trì").length;
  const lostEquip =
    tongQuan?.soThietBiThatLac ??
    app.equipment.filter((e) => e.equipmentStatus === "Thất lạc" || e.equipmentStatus === "Ngừng sử dụng").length;

  // 2. Nhật ký thao tác nhân viên (realApi lấy từ backend, mock lọc theo role/từ khóa)
  const staffLogs: AuditLogEntryWithRef[] = app.realApi
    ? auditLogsBackend
    : app.auditLogs.filter((l) => {
        const isStaffRole = l.role === "Nhân viên" || l.actor.includes("Mai") || l.actor.includes("Kho");
        const q = searchAudit.toLowerCase();
        const matchSearch =
          l.actor.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q) ||
          l.detail.toLowerCase().includes(q);
        return isStaffRole && matchSearch;
      });

  return {
    subTab,
    setSubTab,
    searchAudit,
    setSearchAudit,
    opsReport,
    maintReport,
    reportLoading,
    reportError,
    pickupInShift,
    returnInShift,
    overdueOrders,
    pendingReconcile,
    handedOverToday,
    tongQuan,
    readyEquip,
    rentingEquip,
    maintEquip,
    lostEquip,
    staffLogs,
  };
}
