import React from "react";
import { type useApp } from "../App";
import { fmt, type Equipment } from "../store";

interface Props {
  equipment: Equipment;
  app: ReturnType<typeof useApp>;
  onClose: () => void;
}

/**
 * UC6.9: Tra cứu thiết bị và Lịch sử sử dụng / Sổ đời thiết bị (Equipment Lifecycle)
 * Tập hợp hồ sơ nguồn gốc nhập kho, quá trình phục vụ đơn thuê, lịch sử bảo dưỡng và chuyển loại.
 */
export default function EquipmentLifecycleModal({ equipment, app, onClose }: Props) {
  const currentProduct = app.products.find((p) => p.id === equipment.productId);
  const originalProduct = app.products.find((p) => p.id === equipment.originalProductId);
  const importReceipt = app.importReceipts.find((r) => r.id === equipment.importReceiptId);
  const supplier = importReceipt ? app.suppliers.find((s) => s.id === importReceipt.supplierId) : null;

  // Lọc lịch sử các đơn hàng đã phục vụ thiết bị này
  const orderHistory = app.orders.filter((o) => {
    const hasAssigned = o.assignedEquipmentIds && o.assignedEquipmentIds.includes(equipment.id);
    const hasItem = o.items.some((it) => it.equipmentId === equipment.id);
    return hasAssigned || hasItem;
  });

  // Lọc lịch sử bảo dưỡng & sửa chữa
  const maintenanceHistory = app.maintenanceReceipts.filter((m) => m.equipmentId === equipment.id);

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    "Sẵn sàng": { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC" },
    "Đang thuê": { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD" },
    "Đang bảo trì": { bg: "#FEF3C7", text: "#B45309", border: "#FCD34D" },
    "Thất lạc": { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" },
    "Ngừng sử dụng": { bg: "#F3F4F6", text: "#6B7280", border: "#D1D5DB" },
  };

  const st = statusColors[equipment.equipmentStatus] || { bg: "#F3F4F6", text: "#374151", border: "#E5E7EB" };

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
          maxWidth: 780,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--color-bone, #E5E7EB)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--color-cream, #FAFAF9)",
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "1.5rem" }}>🔍</span>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  style={{
                    fontFamily: "var(--font-display, inherit)",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--color-bark, #1F2937)",
                    margin: 0,
                  }}
                >
                  Sổ đời thiết bị: {equipment.id}
                </h3>
                <span
                  style={{
                    background: st.bg,
                    color: st.text,
                    border: `1px solid ${st.border}`,
                    padding: "2px 10px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {equipment.equipmentStatus}
                </span>
                <span
                  style={{
                    background: "#F3F4F6",
                    color: "#4B5563",
                    padding: "2px 8px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                  }}
                >
                  Tình trạng: {equipment.condition}
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "#6B7280" }}>
                Hồ sơ lý lịch nguồn gốc nhập kho, vòng đời phục vụ đơn thuê và biến động bảo trì cá thể (UC6.9)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              lineHeight: 1,
              cursor: "pointer",
              color: "#9CA3AF",
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "grid", gap: "20px" }}>
          {/* Card: Thông tin hồ sơ & Nguồn gốc nhập kho */}
          <div
            style={{
              border: "1px solid var(--color-bone, #E5E7EB)",
              borderRadius: 12,
              padding: "16px",
              background: "white",
            }}
          >
            <h4
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "var(--color-bark, #1F2937)",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              🏷 Hồ sơ nhận diện & Nguồn nhập gốc
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3" style={{ fontSize: "0.82rem" }}>
              <div>
                <span style={{ color: "#6B7280", display: "block" }}>Sản phẩm hiện tại:</span>
                <strong style={{ color: "var(--color-bark, #1F2937)" }}>{currentProduct?.name || equipment.productId}</strong>
              </div>
              <div>
                <span style={{ color: "#6B7280", display: "block" }}>Phiếu nhập gốc (PN):</span>
                <strong style={{ fontFamily: "monospace", color: "var(--color-forest, #15803D)" }}>
                  {equipment.importReceiptId}
                </strong>
              </div>
              <div>
                <span style={{ color: "#6B7280", display: "block" }}>Ngày nhập kho:</span>
                <strong>{equipment.importDate}</strong>
              </div>
              <div>
                <span style={{ color: "#6B7280", display: "block" }}>Giá vốn lúc nhập:</span>
                <strong>{equipment.importPrice ? fmt(equipment.importPrice) : "1.200.000 ₫"}</strong>
              </div>
              <div>
                <span style={{ color: "#6B7280", display: "block" }}>Nhà cung cấp:</span>
                <strong>{supplier?.name || "Công ty CP Thiết Bị Dã Ngoại"}</strong>
              </div>
              <div>
                <span style={{ color: "#6B7280", display: "block" }}>Lượt phục vụ cho thuê:</span>
                <strong style={{ color: "var(--color-amber, #D97706)" }}>{equipment.rentCount} lượt</strong>
              </div>
            </div>

            {/* Cảnh báo bảo toàn mã gốc khi điều chuyển (UC6.15) */}
            {equipment.productId !== equipment.originalProductId && (
              <div
                style={{
                  marginTop: 12,
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: "0.78rem",
                  color: "#1E40AF",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🔄</span>
                <div>
                  <strong>Đã điều chuyển loại sản phẩm (UC6.15):</strong> Nguyên bản nhập là{" "}
                  <strong>{originalProduct?.name || equipment.originalProductId}</strong>, đã được giáng cấp / chuyển sang{" "}
                  <strong>{currentProduct?.name}</strong>. Mã định danh serial <code>{equipment.id}</code> và phiếu nhập gốc{" "}
                  <code>{equipment.importReceiptId}</code> vẫn được bảo toàn nguyên trạng.
                </div>
              </div>
            )}
          </div>

          {/* Card: Lịch sử phục vụ các hợp đồng thuê */}
          <div
            style={{
              border: "1px solid var(--color-bone, #E5E7EB)",
              borderRadius: 12,
              padding: "16px",
              background: "white",
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <h4
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "var(--color-bark, #1F2937)",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                📋 Lịch sử phục vụ đơn thuê ({orderHistory.length} hợp đồng)
              </h4>
            </div>

            {orderHistory.length === 0 ? (
              <div
                style={{
                  background: "var(--color-cream, #F9F6F0)",
                  borderRadius: 8,
                  padding: "18px",
                  textAlign: "center",
                  fontSize: "0.82rem",
                  color: "#6B7280",
                }}
              >
                Thiết bị mới nhập hoặc chưa được phân bổ vào đơn hàng nào gần đây.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr
                      style={{
                        background: "var(--color-parchment, #F5F1E9)",
                        color: "var(--color-bark, #1F2937)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Mã đơn</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Khách hàng</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Thời gian thuê</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Trạng thái đơn</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Chứng từ kèm theo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderHistory.map((o) => (
                      <tr key={o.id} style={{ borderTop: "1px solid var(--color-bone, #E5E7EB)" }}>
                        <td
                          style={{
                            padding: "8px 10px",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "var(--color-forest, #15803D)",
                          }}
                        >
                          {o.id}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ fontWeight: 600 }}>{o.customerName}</div>
                          <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{o.customerPhone}</div>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {o.rentalStartDate} → {o.rentalEndDate}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span
                            style={{
                              background:
                                o.status === "Đang thuê"
                                  ? "#DBEAFE"
                                  : o.status === "Hoàn tất"
                                  ? "#DCFCE7"
                                  : "#F3F4F6",
                              color:
                                o.status === "Đang thuê"
                                  ? "#1D4ED8"
                                  : o.status === "Hoàn tất"
                                  ? "#15803D"
                                  : "#374151",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                            }}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: "0.75rem" }}>
                          <div className="flex gap-1 flex-wrap">
                            <span
                              style={{
                                background: "#FEF3C7",
                                color: "#B45309",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontFamily: "monospace",
                              }}
                            >
                              BBBG-{o.id}
                            </span>
                            {o.status === "Hoàn tất" && (
                              <span
                                style={{
                                  background: "#DCFCE7",
                                  color: "#15803D",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontFamily: "monospace",
                                }}
                              >
                                PNT-{o.id}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card: Lịch sử bảo trì & sửa chữa */}
          <div
            style={{
              border: "1px solid var(--color-bone, #E5E7EB)",
              borderRadius: 12,
              padding: "16px",
              background: "white",
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <h4
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "var(--color-bark, #1F2937)",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                🛠 Lịch sử bảo trì & sửa chữa ({maintenanceHistory.length} đợt)
              </h4>
            </div>

            {maintenanceHistory.length === 0 ? (
              <div
                style={{
                  background: "var(--color-cream, #F9F6F0)",
                  borderRadius: 8,
                  padding: "18px",
                  textAlign: "center",
                  fontSize: "0.82rem",
                  color: "#6B7280",
                }}
              >
                Thiết bị duy trì chất lượng tốt, chưa từng phải chuyển sang trạng thái bảo trì hoặc sửa chữa.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr
                      style={{
                        background: "var(--color-parchment, #F5F1E9)",
                        color: "var(--color-bark, #1F2937)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Mã phiếu</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Ngày lập</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Mô tả sự cố</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Chi phí</th>
                      <th style={{ padding: "8px 10px", textAlign: "center" }}>Nghiệm thu</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Ghi chú nghiệm thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceHistory.map((m) => (
                      <tr key={m.id} style={{ borderTop: "1px solid var(--color-bone, #E5E7EB)" }}>
                        <td
                          style={{
                            padding: "8px 10px",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "var(--color-forest, #15803D)",
                          }}
                        >
                          {m.id}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#6B7280" }}>{m.createdAt}</td>
                        <td style={{ padding: "8px 10px", maxWidth: 200 }}>{m.issueDescription}</td>
                        <td
                          style={{
                            padding: "8px 10px",
                            textAlign: "right",
                            fontWeight: 600,
                            color: "var(--color-bark, #1F2937)",
                          }}
                        >
                          {fmt(m.actualCost ?? m.estimatedCost)}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <span
                            style={{
                              background:
                                m.status === "Đã nghiệm thu"
                                  ? "#DCFCE7"
                                  : m.status === "Đang sửa chữa"
                                  ? "#FEF3C7"
                                  : "#F3F4F6",
                              color:
                                m.status === "Đã nghiệm thu"
                                  ? "#15803D"
                                  : m.status === "Đang sửa chữa"
                                  ? "#B45309"
                                  : "#6B7280",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                            }}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: "0.75rem", color: "#6B7280" }}>
                          {m.outcomeNote || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--color-bone, #E5E7EB)",
            display: "flex",
            justifyContent: "flex-end",
            background: "var(--color-cream, #FAFAF9)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "white",
              border: "1px solid var(--color-bone, #E5E7EB)",
              padding: "7px 18px",
              borderRadius: 8,
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Đóng sổ đời
          </button>
        </div>
      </div>
    </div>
  );
}
