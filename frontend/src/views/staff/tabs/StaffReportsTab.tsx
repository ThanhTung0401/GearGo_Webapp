import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";

import { reportApi, auditApi, type BaoCaoVanHanhBackend } from "../../../services/api";
import { mapNhatKyToAuditLog, type AuditLogEntryWithRef } from "../../../services/mappers";

import Icon from "../../../components/Icon";

import { type StaffTab } from "../returnMapping";
export function StaffReportsTab({ app, openOrder }: { app: ReturnType<typeof useApp>; openOrder: (id: string, tab: StaffTab) => void }) {
  const [subTab, setSubTab] = useState<"shift" | "audit">("shift");
  const [searchAudit, setSearchAudit] = useState("");
  const [opsReport, setOpsReport] = useState<BaoCaoVanHanhBackend | null>(null);
  const [stockReport, setStockReport] = useState<Record<string, unknown> | null>(null);
  const [maintReport, setMaintReport] = useState<Record<string, unknown> | null>(null);
  const [auditLogsBackend, setAuditLogsBackend] = useState<AuditLogEntryWithRef[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const now = new Date();

  // Tải báo cáo vận hành, hiện trạng kho & thống kê bảo trì (StaffOrAdmin)
  useEffect(() => {
    if (!app.realApi) return;
    let cancelled = false;
    setReportLoading(true);
    setReportError(null);
    void Promise.all([
      reportApi.layBaoCaoVanHanh(),
      reportApi.layHienTrangKho().catch(() => null),
      reportApi.layThongKeBaoTri().catch(() => null),
    ])
      .then(([ops, stock, maint]) => {
        if (cancelled) return;
        setOpsReport(ops);
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
  }, [app.realApi]);

  // Tải nhật ký thao tác hệ thống theo từ khóa tìm kiếm (StaffOrAdmin - UC100/UC102)
  useEffect(() => {
    if (!app.realApi || subTab !== "audit") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void auditApi
        .traCuu({ tuKhoa: searchAudit.trim() || undefined, trang: 1, soMoiTrang: 50 })
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
  }, [app.realApi, subTab, searchAudit]);

  // 1. Chỉ tiêu Vận hành ca trực
  const pickupInShift = app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status));
  const returnInShift = app.orders.filter((o) => o.status === "Đang thuê");
  const overdueOrders = app.orders.filter((o) => {
    if (o.status !== "Đang thuê") return false;
    const retD = new Date(o.returnTime.replace(" ", "T"));
    return !isNaN(retD.getTime()) && retD < now;
  });
  const pendingReconcile = app.orders.filter((o) => o.status === "Chờ đối soát");
  const handedOverToday = app.orders.filter((o) => o.handedOverAt);

  // Thiết bị trong kho (ưu tiên tổng quan từ báo cáo kho/vận hành nếu đã tải)
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
    tongQuan?.soThietBiThatLac ?? app.equipment.filter((e) => e.equipmentStatus === "Thất lạc" || e.equipmentStatus === "Ngừng sử dụng").length;

  // 2. Nhật ký thao tác (realApi lấy trực tiếp từ backend theo quyền StaffOrAdmin)
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

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="so-page-title">
            Báo cáo ca trực & Nhật ký nhân viên (UC10.1 & UC10.4)
          </h2>
          <p className="so-page-subtitle">
            Theo dõi khối lượng giao nhận, thiết bị kho trong ca trực và truy vết nhật ký thao tác phục vụ công việc.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSubTab("shift")}
            className={`so-tab-btn is-compact ${subTab === "shift" ? "is-active" : ""}`}
          >
            <span className="icon-label"><Icon name="tool" size={15} /> Chỉ tiêu ca trực</span>
          </button>
          <button
            onClick={() => setSubTab("audit")}
            className={`so-tab-btn is-compact ${subTab === "audit" ? "is-active" : ""}`}
          >
            <span className="icon-label"><Icon name="clipboard" size={15} /> Nhật ký thao tác ({staffLogs.length})</span>
          </button>
        </div>
      </div>

      {reportError && (
        <div className="so-alert-error">
          {reportError}
        </div>
      )}

      {subTab === "shift" && (
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
                {pickupInShift.length}
              </div>
              <div className="so-mini-kpi-sub">Chờ đóng gói & bàn giao</div>
            </div>

            <div className="so-mini-kpi-card">
              <div className="so-mini-kpi-label">Đơn đang thuê (Chờ nhận trả)</div>
              <div className="so-mini-kpi-val is-blue">
                {returnInShift.length}
              </div>
              <div className="so-mini-kpi-sub">Khách đang sử dụng</div>
            </div>

            {/* Highlight cảnh báo đỏ khi có đơn quá hạn trong ca */}
            <div className={`so-mini-kpi-card ${overdueOrders.length > 0 ? "is-alert" : ""}`}>
              <div className="so-mini-kpi-label">Đơn quá hạn hiện tại</div>
              <div className="so-mini-kpi-val">
                {overdueOrders.length}
              </div>
              <div className="so-mini-kpi-sub">Cần gọi điện giục trả đồ</div>
            </div>

            <div className="so-mini-kpi-card">
              <div className="so-mini-kpi-label">Đơn chờ đối soát hoàn tất</div>
              <div className="so-mini-kpi-val is-amber">
                {pendingReconcile.length}
              </div>
              <div className="so-mini-kpi-sub">Đã nhận trả xong thiết bị</div>
            </div>

            <div className="so-mini-kpi-card">
              <div className="so-mini-kpi-label">
                {tongQuan ? "Tổng đơn thành công (Hệ thống)" : "Lượt đã giao thành công"}
              </div>
              <div className="so-mini-kpi-val is-forest">
                {tongQuan ? tongQuan.tongDonThanhCong : handedOverToday.length}
              </div>
              <div className="so-mini-kpi-sub">
                {tongQuan ? `Tỷ lệ hủy: ${tongQuan.tyLeHuyDonPhanTram}% · Quay vòng: ${tongQuan.tyLeQuayVongThietBi}x` : "Biên bản bàn giao đã ký"}
              </div>
            </div>
          </div>

          {/* Trạng thái thiết bị kho */}
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
                  {opsReport.chiSoTheoSanPham.slice(0, 10).map((sp) => (
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
            </div>
          )}
        </div>
      )}

      {subTab === "audit" && (
        <div>
          {/* Tìm kiếm nhật ký nhân viên */}
          <div className="flex gap-3 mb-4">
            <div className="so-search-wrap">
              <input
                type="text"
                placeholder="Tìm nhật ký thao tác theo hành động, mã đơn, thiết bị..."
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                className="so-search-input"
              />
              <div className="so-search-icon"><Icon name="search" size={16} /></div>
            </div>
          </div>

          <div className="so-table-card responsive-table">
            <table className="so-table so-table-audit">
              <thead>
                <tr>
                  {["Thời gian", "Người thực hiện", "Hành động", "Đối tượng tác động", "Chi tiết nội dung", "Thao tác"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="so-td-empty">
                      Chưa có nhật ký thao tác phù hợp.
                    </td>
                  </tr>
                ) : (
                  staffLogs.map((log) => {
                    const orderMatch =
                      log.targetEntity === "DonThue" ||
                      log.targetId.startsWith("DT-") ||
                      Boolean(log.thamChieuUrl?.includes("/don-thue/"));
                    const orderIdToOpen =
                      log.thamChieuUrl?.match(/\/don-thue\/(\d+)/)?.[1] || log.targetId;
                    return (
                      <tr key={log.id}>
                        <td className="so-td-mono-time">
                          {log.timestamp}
                        </td>
                        <td className="so-td-bold">{log.actor}</td>
                        <td className="so-td-action">{log.action}</td>
                        <td className="so-td-mono-plain">
                          <span className="so-td-muted">{log.targetEntity}:</span> <strong>{log.targetId}</strong>
                        </td>
                        <td className="so-td-detail">{log.detail}</td>
                        <td>
                          {orderMatch && orderIdToOpen && (
                            <button
                              onClick={() => openOrder(orderIdToOpen, "orders")}
                              className="btn btn-secondary btn-sm so-btn-xs"
                            >
                              Xem đơn
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
