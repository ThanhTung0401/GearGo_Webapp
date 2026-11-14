import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import {
  equipmentApi,
  orderApi,
  handoverApi,
  returnApi,
  surchargeApi,
  reportApi,
  auditApi,
  type ChuanBiResponseBackend,
  type PhieuBanGiaoBackend,
  type NhanTraBackend,
  type ChiTietNhanTraBackend,
  type ThietBiConNoBackend,
  type QuaHanChiTietBackend,
  type BaoCaoVanHanhBackend,
  type XemTruocHuyBackend,
  type DonQuaHanBackend,
  type NhatKyLienHeQuaHanBackend,
  type ThietBiBackend,
  type PhanCongLichThietBiBackend,
} from "../../../services/api";
import { mapDonVanHanhChiTietToOrder, mapPhuPhiToSurcharge, mapNhatKyToAuditLog, type AuditLogEntryWithRef } from "../../../services/mappers";
import type { Surcharge } from "../../../types";
import {
  fmt,
  statusColors,
  Order,
  ReturnReceipt,
  ReturnReceiptItem,
  MaintenanceReceipt,
  Equipment,
  ImportReceipt,
  Supplier,
} from "../../../store";
import Icon from "../../../components/Icon";
import ReconciliationSheet from "../../ReconciliationSheet";
import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../components/InventoryAuditModal";
import SupplierProfileModal from "../../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../../components/GoodsReceivingModal";
import { mapReturnCondToBackend, mapReturnCondToSurchargeType, type StaffTab } from "../returnMapping";
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
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Báo cáo ca trực & Nhật ký nhân viên (UC10.1 & UC10.4)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Theo dõi khối lượng giao nhận, thiết bị kho trong ca trực và truy vết nhật ký thao tác phục vụ công việc.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSubTab("shift")}
            style={{
              background: subTab === "shift" ? "var(--color-forest)" : "white",
              color: subTab === "shift" ? "white" : "var(--color-bark)",
              border: `1px solid ${subTab === "shift" ? "var(--color-forest)" : "var(--color-bone)"}`,
              borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer"
            }}
          >
            <span className="icon-label"><Icon name="tool" size={15} /> Chỉ tiêu ca trực</span>
          </button>
          <button
            onClick={() => setSubTab("audit")}
            style={{
              background: subTab === "audit" ? "var(--color-forest)" : "white",
              color: subTab === "audit" ? "white" : "var(--color-bark)",
              border: `1px solid ${subTab === "audit" ? "var(--color-forest)" : "var(--color-bone)"}`,
              borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer"
            }}
          >
            <span className="icon-label"><Icon name="clipboard" size={15} /> Nhật ký thao tác ({staffLogs.length})</span>
          </button>
        </div>
      </div>

      {reportError && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 600 }}>
          {reportError}
        </div>
      )}

      {subTab === "shift" && (
        <div>
          {reportLoading && (
            <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 10 }}>
              Đang tải số liệu báo cáo vận hành từ máy chủ...
            </div>
          )}

          {/* Lưới chỉ tiêu vận hành ca trực */}
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn cần chuẩn bị & giao</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                {pickupInShift.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>Chờ đóng gói & bàn giao</div>
            </div>

            <div style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn đang thuê (Chờ nhận trả)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "#2563EB", marginTop: 2 }}>
                {returnInShift.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>Khách đang sử dụng</div>
            </div>

            <div style={{ background: overdueOrders.length > 0 ? "#FEF2F2" : "white", borderRadius: 10, padding: 14, border: `1px solid ${overdueOrders.length > 0 ? "#F87171" : "var(--color-bone)"}` }}>
              <div style={{ fontSize: "0.75rem", color: overdueOrders.length > 0 ? "#B91C1C" : "#6B7280", fontWeight: 600 }}>Đơn quá hạn hiện tại</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: overdueOrders.length > 0 ? "#DC2626" : "var(--color-bark)", marginTop: 2 }}>
                {overdueOrders.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: overdueOrders.length > 0 ? "#DC2626" : "#6B7280", marginTop: 4 }}>Cần gọi điện giục trả đồ</div>
            </div>

            <div style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn chờ đối soát hoàn tất</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "#D97706", marginTop: 2 }}>
                {pendingReconcile.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>Đã nhận trả xong thiết bị</div>
            </div>

            <div style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>
                {tongQuan ? "Tổng đơn thành công (Hệ thống)" : "Lượt đã giao thành công"}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                {tongQuan ? tongQuan.tongDonThanhCong : handedOverToday.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>
                {tongQuan ? `Tỷ lệ hủy: ${tongQuan.tyLeHuyDonPhanTram}% · Quay vòng: ${tongQuan.tyLeQuayVongThietBi}x` : "Biên bản bàn giao đã ký"}
              </div>
            </div>
          </div>

          {/* Trạng thái thiết bị kho */}
          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
                Tình trạng khả dụng thiết bị kho hiện tại
              </h3>
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#166534" }}>Sẵn sàng cho thuê</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", color: "#15803D" }}>{readyEquip}</strong>
                  <div style={{ fontSize: "0.7rem", color: "#166534" }}>Đã vệ sinh, kiểm tra đầy đủ</div>
                </div>
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#1E40AF" }}>Đang cho khách thuê</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", color: "#1D4ED8" }}>{rentingEquip}</strong>
                  <div style={{ fontSize: "0.7rem", color: "#1E40AF" }}>Theo các đơn đang hiệu lực</div>
                </div>
                <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#92400E" }}>Đang bảo trì / Sửa chữa</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", color: "#D97706" }}>{maintEquip}</strong>
                  <div style={{ fontSize: "0.7rem", color: "#92400E" }}>
                    {typeof maintReport?.soPhieuDangMo === "number"
                      ? `${maintReport.soPhieuDangMo} phiếu bảo trì đang mở`
                      : "Cần kỹ thuật kiểm tra"}
                  </div>
                </div>
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#991B1B" }}>Thất lạc / Mất mát</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", color: "#DC2626" }}>{lostEquip}</strong>
                  <div style={{ fontSize: "0.7rem", color: "#991B1B" }}>
                    {tongQuan ? `Tỷ lệ hao mòn: ${tongQuan.tyLeHaoMonPhanTram}%` : "Đã lập biên bản bồi thường"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10, fontSize: "0.95rem" }}>
                Quy định phân quyền vận hành (BR01 & UC10.1)
              </h3>
              <div style={{ fontSize: "0.82rem", color: "#4B5563", lineHeight: 1.6 }}>
                <p style={{ marginBottom: 8 }}>
                  • <strong>Phạm vi dữ liệu:</strong> Nhân viên kho và CSKH được phân quyền theo dõi tình trạng đơn thuê, điều phối giao nhận và kiểm soát thiết bị tại kho.
                </p>
                <p style={{ marginBottom: 8 }}>
                  • <strong>Bảo mật tài chính:</strong> Các số liệu dòng tiền ròng và giá vốn nhập kho được bảo vệ thuộc thẩm quyền Quản trị viên.
                </p>
                <p>
                  • <strong>Thao tác nhanh:</strong> Chuyển sang tab "Chuẩn bị & Bàn giao" hoặc "Nhận trả & Phụ phí" để xử lý trực tiếp đơn hàng tương ứng.
                </p>
              </div>
            </div>
          </div>

          {opsReport && opsReport.chiSoTheoSanPham.length > 0 && (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "auto" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-bone)", fontWeight: 700, fontSize: "0.9rem", color: "var(--color-bark)" }}>
                Hiệu suất xoay vòng thiết bị theo sản phẩm
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                    {["Sản phẩm", "Danh mục", "Tổng TB", "Lượt thuê", "Hỏng hóc", "Thất lạc"].map((h) => (
                      <th key={h} style={{ padding: "9px 12px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {opsReport.chiSoTheoSanPham.slice(0, 10).map((sp) => (
                    <tr key={sp.maSanPham} style={{ borderTop: "1px solid var(--color-bone)" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 600 }}>{sp.tenSanPham}</td>
                      <td style={{ padding: "9px 12px", color: "#6B7280" }}>{sp.tenDanhMuc}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)" }}>{sp.tongSoThietBi}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{sp.soLuotThue}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", color: sp.soLuotHongHoc > 0 ? "#D97706" : "#6B7280" }}>{sp.soLuotHongHoc}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", color: sp.soLuotMat > 0 ? "#DC2626" : "#6B7280" }}>{sp.soLuotMat}</td>
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
            <div style={{ position: "relative", minWidth: 280, flex: 1 }}>
              <input
                type="text"
                placeholder="Tìm nhật ký thao tác theo hành động, mã đơn, thiết bị..."
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: "0.85rem", background: "white" }}
              />
              <div style={{ position: "absolute", left: 10, top: 9, color: "#9CA3AF" }}><Icon name="search" size={16} /></div>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                  {["Thời gian", "Người thực hiện", "Hành động", "Đối tượng tác động", "Chi tiết nội dung", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "30px 0", textAlign: "center", color: "#6B7280" }}>
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
                      <tr key={log.id} style={{ borderTop: "1px solid var(--color-bone)" }}>
                        <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#6B7280" }}>
                          {log.timestamp}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>{log.actor}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--color-forest)" }}>{log.action}</td>
                        <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)" }}>
                          <span style={{ color: "#6B7280" }}>{log.targetEntity}:</span> <strong>{log.targetId}</strong>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#374151" }}>{log.detail}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {orderMatch && orderIdToOpen && (
                            <button
                              onClick={() => openOrder(orderIdToOpen, "orders")}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "2px 8px", fontSize: "0.72rem" }}
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
