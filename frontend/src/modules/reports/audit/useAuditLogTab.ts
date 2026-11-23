import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { auditApi } from "../../../services/api/auditApi";
import { mapNhatKyToAuditLog, type AuditLogEntryWithRef } from "../../../services/mappers/reviewNotifAuditMapper";

export interface InspectDocState {
  type: "order" | "import" | "equipment" | "generic";
  id: string;
  title: string;
  data?: any;
}

/** Tính khoảng thời gian mặc định 90 ngày gần nhất cho bộ lọc nhật ký. */
function getDefaultAuditDates(): { from: string; to: string } {
  const now = new Date();
  const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return {
    from: past.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

/** Thoát ký tự đặc biệt và chống CSV Formula Injection khi xuất tệp CSV. */
function escapeCsvCell(raw: unknown): string {
  const s = String(raw ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Đối chiếu vai trò thực tế của bản ghi với bộ lọc vai trò đã chọn. */
export function matchAuditRoleValue(entryRole: string, selected: string): boolean {
  if (selected === "all") return true;
  const norm = entryRole.toLowerCase();
  if (selected === "Quản trị viên") return norm.includes("quản trị") || norm.includes("quantrivien") || norm.includes("admin");
  if (selected === "Nhân viên") return norm.includes("nhân viên") || norm.includes("nhanvien") || norm.includes("staff");
  if (selected === "Khách hàng") return norm.includes("khách") || norm.includes("khachhang") || norm.includes("customer");
  return entryRole === selected;
}

/**
 * Hook quản lý tra cứu nhật ký hệ thống (UC10.4), xuất CSV và đối chiếu chứng từ gốc (UC10.4.2).
 */
export function useAuditLogTab(app: ReturnType<typeof useApp>) {
  const realApi = app.realApi || isRealApiEnabled();
  const defaultRange = getDefaultAuditDates();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  // State đồng bộ API nhật ký thật (/api/nhat-ky)
  const [apiLogs, setApiLogs] = useState<AuditLogEntryWithRef[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [exportNotice, setExportNotice] = useState("");

  // State mở xem chứng từ liên quan từ nhật ký (UC10.4.2)
  const [inspectDoc, setInspectDoc] = useState<InspectDocState | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");

  // State xem chi tiết biến động sự kiện (UC10.4 Bước 4)
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEntryWithRef | null>(null);

  const loadAuditLogs = useCallback(
    async (targetPage = page) => {
      if (!realApi) return;
      if (fromDate && toDate && fromDate > toDate) {
        setLogsError("Từ ngày không được lớn hơn đến ngày.");
        return;
      }
      setLogsLoading(true);
      setLogsError("");
      try {
        const res = await auditApi.traCuu({
          tuKhoa: search.trim() || undefined,
          tuNgay: fromDate || undefined,
          denNgay: toDate || undefined,
          trang: targetPage,
          soMoiTrang: 20,
        });
        setApiLogs((res.items ?? []).map(mapNhatKyToAuditLog));
        setTotalLogs(Number(res.totalItems ?? (res.items ?? []).length));
      } catch (err) {
        setLogsError(err instanceof Error ? err.message : "Không thể tải nhật ký thao tác hệ thống từ máy chủ.");
      } finally {
        setLogsLoading(false);
      }
    },
    [realApi, search, fromDate, toDate, page]
  );

  // Debounce 250ms tránh gọi API liên tục khi người dùng gõ từ khóa
  useEffect(() => {
    if (!realApi) return;
    const timer = window.setTimeout(() => {
      void loadAuditLogs(page);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [realApi, page, loadAuditLogs]);

  // Hàm kiểm tra ngày nằm trong khoảng lọc (dành cho dữ liệu mock)
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

  const sourceLogs: AuditLogEntryWithRef[] = realApi ? apiLogs : app.auditLogs;

  const filtered = sourceLogs.filter((l) => {
    const matchSearch =
      realApi ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.targetEntity.toLowerCase().includes(search.toLowerCase()) ||
      l.targetId.toLowerCase().includes(search.toLowerCase()) ||
      l.detail.toLowerCase().includes(search.toLowerCase());
    const matchRole = matchAuditRoleValue(l.role, roleFilter);
    const matchDate = realApi ? true : isWithinRange(l.timestamp);
    return matchSearch && matchRole && matchDate;
  });

  // Xử lý mở chứng từ liên quan theo loại thực thể hoặc URL tham chiếu backend (UC10.4.2)
  const handleOpenRelatedDoc = async (targetEntity: string, targetId: string, logEntry?: AuditLogEntryWithRef) => {
    setDocError("");
    setDocLoading(false);

    // 1. Kiểm tra nếu là Đơn hàng (DT-... hoặc backendId)
    const order = app.orders.find(
      (o) => o.id === targetId || o.displayCode === targetId || String(o.backendId ?? "") === targetId
    );
    if (order && (targetEntity.toLowerCase().includes("order") || targetEntity.toLowerCase().includes("don") || targetId.startsWith("DT-"))) {
      setInspectDoc({
        type: "order",
        id: order.displayCode || order.id,
        title: `Chứng từ đơn thuê — ${order.displayCode || order.id}`,
        data: order,
      });
      return;
    }

    // 2. Kiểm tra nếu là Phiếu nhập kho (PN-...)
    const receipt = app.importReceipts.find((r) => r.id === targetId || r.displayCode === targetId);
    if (receipt && (targetEntity.toLowerCase().includes("import") || targetEntity.toLowerCase().includes("phieunhap") || targetId.startsWith("PN-"))) {
      setInspectDoc({
        type: "import",
        id: receipt.displayCode || receipt.id,
        title: `Chứng từ phiếu nhập kho — ${receipt.displayCode || receipt.id}`,
        data: receipt,
      });
      return;
    }

    // 3. Kiểm tra nếu là Thiết bị (chỉ khớp khi targetEntity đúng loại thiết bị để tránh mở nhầm TAI_KHOAN/DON_THUE trùng ID số)
    const entityLower = (targetEntity || "").toLowerCase();
    const isEquipEntity =
      entityLower.includes("thietbi") ||
      entityLower.includes("thiet_bi") ||
      entityLower.includes("equipment") ||
      targetId.startsWith("TB-");
    const equip = isEquipEntity ? app.equipment.find((e) => e.id === targetId || e.displayCode === targetId) : undefined;
    if (equip) {
      setInspectDoc({
        type: "equipment",
        id: equip.displayCode || equip.id,
        title: `Hồ sơ vòng đời thiết bị — ${equip.displayCode || equip.id}`,
        data: equip,
      });
      return;
    }

    // 4. Nạp chứng từ gốc trực tiếp từ URL tham chiếu backend nếu có
    if (realApi && logEntry?.thamChieuUrl) {
      setInspectDoc({
        type: "generic",
        id: targetId,
        title: `Chứng từ tham chiếu: ${targetEntity} #${targetId}`,
        data: { entity: targetEntity, id: targetId, thamChieuUrl: logEntry.thamChieuUrl, serverDoc: null },
      });
      setDocLoading(true);
      try {
        const doc = await auditApi.xemChungTuThamChieu(logEntry.thamChieuUrl);
        setInspectDoc({
          type: "generic",
          id: targetId,
          title: `Chứng từ tham chiếu: ${targetEntity} #${targetId}`,
          data: { entity: targetEntity, id: targetId, thamChieuUrl: logEntry.thamChieuUrl, serverDoc: doc },
        });
      } catch (err) {
        setDocError(err instanceof Error ? err.message : "Không thể tải dữ liệu chứng từ tham chiếu từ máy chủ.");
      } finally {
        setDocLoading(false);
      }
      return;
    }

    // 5. Mở thông tin tham chiếu chung
    setInspectDoc({
      type: "generic",
      id: targetId,
      title: `Chứng từ tham chiếu: ${targetEntity} #${targetId}`,
      data: { entity: targetEntity, id: targetId },
    });
  };

  // Xuất danh sách bản ghi đang lọc ra tệp CSV kèm BOM UTF-8 hỗ trợ Excel tiếng Việt
  const handleExportCsv = () => {
    const header = ["Thời gian", "Người thực hiện", "Vai trò", "Hành động", "Loại đối tượng", "Mã đối tượng", "Chi tiết"];
    const lines = [
      header.map(escapeCsvCell).join(","),
      ...filtered.map((row) =>
        [row.timestamp, row.actor, row.role, row.action, row.targetEntity, row.targetId, row.detail]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Audit_Logs_Export_${toDate || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportNotice(`Đã xuất ${filtered.length} bản ghi nhật ký ra tệp CSV.`);
    window.setTimeout(() => setExportNotice(""), 4000);
  };

  return {
    realApi,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    totalLogs,
    page,
    setPage,
    logsLoading,
    logsError,
    exportNotice,
    inspectDoc,
    setInspectDoc,
    docLoading,
    docError,
    selectedEvent,
    setSelectedEvent,
    loadAuditLogs,
    filtered,
    handleOpenRelatedDoc,
    handleExportCsv,
  };
}
