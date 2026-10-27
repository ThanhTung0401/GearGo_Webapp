import React, { useState } from "react";
import { type useApp } from "../App";
import { type Equipment, type EquipmentStatus, type StockAdjustmentLine } from "../store";

interface Props {
  app: ReturnType<typeof useApp>;
  onClose: () => void;
  onAuditSubmitted?: (receiptId: string) => void;
}

type AuditItemState = {
  checkResult: "Khớp" | "Đang bảo trì" | "Thất lạc" | "Ngừng sử dụng";
  note: string;
};

/**
 * UC6.10: Kiểm kê kho & lập đề nghị điều chỉnh (Chờ duyệt)
 * - Dòng phụ 2.1: Tách riêng các thiết bị đang được khách thuê để không tính nhầm là mất kho.
 * - Đối chiếu hiện diện thực tế đồ tại kho, phát hiện chênh lệch và gửi phiếu điều chỉnh ở trạng thái "Chờ duyệt" (UC6.10.1).
 */
export default function InventoryAuditModal({ app, onClose, onAuditSubmitted }: Props) {
  const [activeTab, setActiveTab] = useState<"warehouse" | "rented">("warehouse");
  const [searchTerm, setSearchTerm] = useState("");
  const [auditReason, setAuditReason] = useState(`Kiểm kê kho định kỳ ${new Date().toLocaleDateString("vi-VN")}`);
  const [auditStaff, setAuditStaff] = useState("NV Kho Mai");

  // Tách biệt danh sách: Đang cho thuê (vắng mặt hợp lệ) vs Đồ tại kho (phải có mặt)
  const rentedEquipments = app.equipment.filter((e) => e.equipmentStatus === "Đang thuê");
  const warehouseEquipments = app.equipment.filter((e) => e.equipmentStatus !== "Đang thuê");

  // State lưu kết quả kiểm kê từng thiết bị tại kho
  const [auditStates, setAuditStates] = useState<Record<string, AuditItemState>>(() => {
    const initial: Record<string, AuditItemState> = {};
    warehouseEquipments.forEach((e) => {
      initial[e.id] = { checkResult: "Khớp", note: "" };
    });
    return initial;
  });

  const updateItemAudit = (id: string, update: Partial<AuditItemState>) => {
    setAuditStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { checkResult: "Khớp", note: "" }), ...update },
    }));
  };

  // Lọc thiết bị tại kho theo từ khóa
  const filteredWarehouse = warehouseEquipments.filter((e) => {
    const prod = app.products.find((p) => p.id === e.productId);
    const text = `${e.id} ${prod?.name || ""}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  // Đếm các thiết bị có sai lệch so với trạng thái cũ
  const discrepancies = warehouseEquipments.filter((e) => {
    const st = auditStates[e.id];
    return st && st.checkResult !== "Khớp";
  });

  // Xử lý gửi phiếu đề nghị điều chỉnh kho
  const handleSubmitAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (discrepancies.length === 0) {
      alert("Tất cả thiết bị tại kho đều khớp 100%! Không cần tạo phiếu điều chỉnh.");
      onClose();
      return;
    }

    const lines: StockAdjustmentLine[] = discrepancies.map((e) => {
      const st = auditStates[e.id];
      return {
        equipmentId: e.id,
        previousStatus: e.equipmentStatus,
        newStatus: st.checkResult as EquipmentStatus,
        reason: st.note.trim() || `Phát hiện sai lệch lúc kiểm kê (${st.checkResult})`,
      };
    });

    const res = app.createStockAdjustment({
      reason: auditReason.trim(),
      createdBy: auditStaff.trim(),
      lines,
      autoApprove: false, // UC6.10: Mặc định tạo phiếu ở trạng thái "Chờ duyệt"
    });

    if (res.ok) {
      alert(`Đã lập Đề nghị điều chỉnh kho ${res.data.id} ở trạng thái "Chờ duyệt"! Quản trị viên sẽ kiểm tra xung đột lịch thuê trước khi phê duyệt.`);
      if (onAuditSubmitted) {
        onAuditSubmitted(res.data.id);
      }
      onClose();
    } else {
      alert(res.message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          maxWidth: 900,
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--color-bone, #E5E7EB)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--color-cream, #FAFAF9)",
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "1.4rem" }}>📋</span>
              <h3
                style={{
                  fontFamily: "var(--font-display, inherit)",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "var(--color-bark, #1F2937)",
                  margin: 0,
                }}
              >
                Kiểm kê kho & Đối chiếu tài sản (UC6.10)
              </h3>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#6B7280" }}>
              Tách biệt đồ đang cho khách thuê (hợp lệ) và kiểm đếm đồ tại kho thực tế. Đề nghị điều chỉnh sẽ được tạo ở trạng thái <strong>Chờ duyệt</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{ background: "transparent", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#9CA3AF" }}
          >
            ×
          </button>
        </div>

        {/* Tab switcher: Kho vs Đang thuê */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "10px 24px 0",
            borderBottom: "1px solid var(--color-bone, #E5E7EB)",
            background: "white",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("warehouse")}
            style={{
              padding: "8px 16px",
              borderBottom: activeTab === "warehouse" ? "2px solid var(--color-forest, #15803D)" : "2px solid transparent",
              fontWeight: activeTab === "warehouse" ? 700 : 500,
              color: activeTab === "warehouse" ? "var(--color-forest, #15803D)" : "#6B7280",
              background: "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            🏢 Đồ cần có mặt tại kho ({warehouseEquipments.length} thiết bị)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rented")}
            style={{
              padding: "8px 16px",
              borderBottom: activeTab === "rented" ? "2px solid #2563EB" : "2px solid transparent",
              fontWeight: activeTab === "rented" ? 700 : 500,
              color: activeTab === "rented" ? "#2563EB" : "#6B7280",
              background: "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            🚚 Đang cho khách thuê (Hợp lệ vắng kho - {rentedEquipments.length} thiết bị)
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1 }}>
          {activeTab === "rented" ? (
            /* TAB: THIẾT BỊ ĐANG CHO THUÊ (HỢP LỆ VẮNG KHO - DÒNG PHỤ 2.1) */
            <div className="grid gap-3">
              <div
                style={{
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontSize: "0.82rem",
                  color: "#1E40AF",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>ℹ️</span>
                <div>
                  <strong>Dòng phụ 2.1 (Tách đồ đang thuê):</strong> Các thiết bị dưới đây đang trong tay khách hàng theo hợp đồng thuê còn hiệu lực.
                  Hệ thống tự động loại trừ các thiết bị này, <strong>KHÔNG</strong> tính vào danh sách mất mát hay chênh lệch tại kho.
                </div>
              </div>

              {rentedEquipments.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "#6B7280", fontSize: "0.85rem" }}>
                  Hiện tại không có thiết bị nào đang cho khách thuê.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: "var(--color-parchment, #F5F1E9)", fontWeight: 600 }}>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Mã thiết bị</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Sản phẩm</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Đơn hàng đang thuê</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Khách hàng</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Ngày hẹn trả</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>Trạng thái đối chiếu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rentedEquipments.map((e) => {
                        const prod = app.products.find((p) => p.id === e.productId);
                        const ord = app.orders.find(
                          (o) =>
                            o.status === "Đang thuê" &&
                            (o.assignedEquipmentIds?.includes(e.id) || o.items.some((it) => it.equipmentId === e.id))
                        );
                        return (
                          <tr key={e.id} style={{ borderTop: "1px solid var(--color-bone, #E5E7EB)" }}>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#1D4ED8" }}>
                              {e.id}
                            </td>
                            <td style={{ padding: "8px 12px" }}>{prod?.name}</td>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                              {ord?.id || "Đang trong đơn"}
                            </td>
                            <td style={{ padding: "8px 12px" }}>{ord?.customerName || "Khách hàng GearGo"}</td>
                            <td style={{ padding: "8px 12px" }}>{ord?.rentalEndDate || "—"}</td>
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <span
                                style={{
                                  background: "#DCFCE7",
                                  color: "#15803D",
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                }}
                              >
                                ✓ Vắng kho hợp lệ
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* TAB: THIẾT BỊ TẠI KHO (CẦN ĐỐI CHIẾU THỰC TẾ) */
            <div className="grid gap-3">
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="🔍 Quét barcode / mã thiết bị hoặc tên sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: "1px solid var(--color-bone, #E5E7EB)",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: "0.82rem",
                    width: 320,
                  }}
                />
                <div className="flex gap-2 text-xs">
                  <span style={{ background: "#F3F4F6", padding: "4px 8px", borderRadius: 6 }}>
                    Tổng kho: <strong>{warehouseEquipments.length}</strong>
                  </span>
                  <span style={{ background: "#DCFCE7", color: "#15803D", padding: "4px 8px", borderRadius: 6 }}>
                    Khớp: <strong>{warehouseEquipments.length - discrepancies.length}</strong>
                  </span>
                  {discrepancies.length > 0 && (
                    <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "4px 8px", borderRadius: 6 }}>
                      Sai lệch: <strong>{discrepancies.length}</strong> thiết bị
                    </span>
                  )}
                </div>
              </div>

              <div style={{ overflowX: "auto", border: "1px solid var(--color-bone, #E5E7EB)", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-parchment, #F5F1E9)", fontWeight: 600 }}>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Mã thiết bị</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Sản phẩm</th>
                      <th style={{ padding: "8px 10px", textAlign: "center" }}>Trạng thái sổ sách</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Kết quả kiểm đếm thực tế</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Ghi chú sai lệch (nếu có)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWarehouse.map((e) => {
                      const prod = app.products.find((p) => p.id === e.productId);
                      const st = auditStates[e.id] || { checkResult: "Khớp", note: "" };
                      const hasDiscrepancy = st.checkResult !== "Khớp";
                      return (
                        <tr
                          key={e.id}
                          style={{
                            borderTop: "1px solid var(--color-bone, #E5E7EB)",
                            background: hasDiscrepancy ? "#FFFBEB" : "white",
                          }}
                        >
                          <td style={{ padding: "8px 10px", fontFamily: "monospace", fontWeight: 700, color: "var(--color-forest, #15803D)" }}>
                            {e.id}
                          </td>
                          <td style={{ padding: "8px 10px" }}>{prod?.name}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <span
                              style={{
                                background: "#F3F4F6",
                                color: "#374151",
                                padding: "2px 8px",
                                borderRadius: 8,
                                fontSize: "0.72rem",
                                fontWeight: 600,
                              }}
                            >
                              {e.equipmentStatus}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <select
                              value={st.checkResult}
                              onChange={(ev) =>
                                updateItemAudit(e.id, {
                                  checkResult: ev.target.value as AuditItemState["checkResult"],
                                })
                              }
                              style={{
                                border: hasDiscrepancy ? "1px solid #D97706" : "1px solid var(--color-bone, #E5E7EB)",
                                borderRadius: 6,
                                padding: "4px 8px",
                                fontSize: "0.78rem",
                                fontWeight: hasDiscrepancy ? 700 : 500,
                                background: hasDiscrepancy ? "#FEF3C7" : "white",
                                color: hasDiscrepancy ? "#B45309" : "inherit",
                              }}
                            >
                              <option value="Khớp">🟢 Khớp (Có mặt, bình thường)</option>
                              <option value="Đang bảo trì">🟡 Hỏng (Cần đưa bảo trì)</option>
                              <option value="Thất lạc">🔴 Thiếu (Thất lạc kiểm kê)</option>
                              <option value="Ngừng sử dụng">⚫ Hỏng nặng (Ngừng dùng)</option>
                            </select>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <input
                              type="text"
                              placeholder={hasDiscrepancy ? "Nhập nguyên nhân sai lệch..." : "Không có ghi chú"}
                              value={st.note}
                              disabled={!hasDiscrepancy}
                              onChange={(ev) => updateItemAudit(e.id, { note: ev.target.value })}
                              style={{
                                width: "100%",
                                border: "1px solid var(--color-bone, #E5E7EB)",
                                borderRadius: 6,
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                background: hasDiscrepancy ? "white" : "#F9FAFB",
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--color-bone, #E5E7EB)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--color-cream, #FAFAF9)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "0.8rem", color: "#6B7280" }}>Người kiểm kê:</span>
            <input
              type="text"
              value={auditStaff}
              onChange={(e) => setAuditStaff(e.target.value)}
              style={{
                border: "1px solid var(--color-bone, #E5E7EB)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: "0.78rem",
                width: 140,
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "white",
                border: "1px solid var(--color-bone, #E5E7EB)",
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              Hủy
            </button>

            {discrepancies.length > 0 ? (
              <button
                type="button"
                onClick={handleSubmitAudit}
                style={{
                  background: "var(--color-amber, #D97706)",
                  color: "white",
                  border: "none",
                  padding: "7px 18px",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📤 Gửi Đề nghị điều chỉnh kho ({discrepancies.length} thiết bị - Chờ duyệt)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitAudit}
                style={{
                  background: "var(--color-forest, #15803D)",
                  color: "white",
                  border: "none",
                  padding: "7px 18px",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✓ Xác nhận kho khớp 100% (Hoàn tất kiểm kê)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
