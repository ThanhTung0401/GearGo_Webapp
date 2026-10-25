import React, { useState } from "react";
import { type useApp } from "../App";
import { fmt, type Supplier } from "../store";

interface Props {
  supplier: Supplier;
  app: ReturnType<typeof useApp>;
  onClose: () => void;
  onOpenReceipt?: (receiptId: string) => void;
}

/**
 * UC7.3 & UC7.4: Hồ sơ chi tiết nhà cung cấp & Thay đổi tình trạng hợp tác
 * - Hiển thị thông tin liên hệ, thuế, địa chỉ.
 * - Thống kê lũy kế: Tổng giá trị hàng thực nhận (chỉ phiếu "Đã nhập kho", loại trừ nháp/hủy), tổng thiết bị chấp nhận, số phiếu.
 * - Danh mục các mặt hàng từng nhập từ NCC này.
 * - Lịch sử chứng từ các phiếu nhập (có thể click để mở xem chi tiết).
 * - Chuyển đổi nhanh tình trạng hợp tác kèm lý do (UC7.4).
 */
export default function SupplierProfileModal({ supplier, app, onClose, onOpenReceipt }: Props) {
  const [activeTab, setActiveTab] = useState<"products" | "receipts">("products");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<"active" | "inactive">(
    supplier.cooperationStatus === "active" ? "inactive" : "active"
  );
  const [statusReason, setStatusReason] = useState("");

  // Lọc tất cả phiếu nhập của NCC này
  const supplierReceipts = app.importReceipts.filter(
    (r) => r.supplierId === supplier.id || r.supplierId === supplier.displayCode
  );

  // Chỉ tính thống kê với phiếu ĐÃ NHẬP KHO (phiếu nháp/hủy không cộng dồn theo quy tắc UC7.3)
  const confirmedReceipts = supplierReceipts.filter((r) => r.status === "Đã nhập kho");

  const totalImportValue = confirmedReceipts.reduce(
    (sum, r) => sum + r.lines.reduce((ls, l) => ls + l.quantity * l.unitPrice, 0),
    0
  );

  const totalEquipmentAccepted = confirmedReceipts.reduce(
    (sum, r) =>
      sum +
      r.lines.reduce((ls, l) => ls + (l.acceptedQty !== undefined ? l.acceptedQty : l.quantity), 0),
    0
  );

  // Tổng hợp các sản phẩm từng nhập từ NCC này
  const importedProductMap = new Map<
    string,
    { productId: string; name: string; totalQty: number; lastUnitPrice: number; lastDate: string }
  >();

  confirmedReceipts.forEach((r) => {
    r.lines.forEach((l) => {
      const prod = app.products.find((p) => p.id === l.productId);
      const existing = importedProductMap.get(l.productId);
      if (existing) {
        existing.totalQty += l.acceptedQty !== undefined ? l.acceptedQty : l.quantity;
        existing.lastUnitPrice = l.unitPrice;
        existing.lastDate = r.confirmedAt || r.createdAt;
      } else {
        importedProductMap.set(l.productId, {
          productId: l.productId,
          name: prod?.name || l.productNameSnapshot || l.productId,
          totalQty: l.acceptedQty !== undefined ? l.acceptedQty : l.quantity,
          lastUnitPrice: l.unitPrice,
          lastDate: r.confirmedAt || r.createdAt,
        });
      }
    });
  });

  const importedProducts = Array.from(importedProductMap.values());

  const handleStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusReason.trim()) {
      alert("Vui lòng nhập lý do thay đổi trạng thái hợp tác (theo quy tắc UC7.4).");
      return;
    }

    const res = app.toggleSupplierStatus(supplier.id, newStatus, statusReason.trim());
    if (res.ok) {
      alert(
        `Đã chuyển trạng thái nhà cung cấp thành: ${newStatus === "active" ? "Đang hợp tác" : "Ngừng hợp tác"}!`
      );
      setShowStatusModal(false);
      setStatusReason("");
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
          maxWidth: 850,
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
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "1.5rem" }}>🏢</span>
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
                  {supplier.name}
                </h3>
                <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#6B7280" }}>
                  ({supplier.displayCode})
                </span>
                <span
                  style={{
                    background: supplier.cooperationStatus === "active" ? "#DCFCE7" : "#FEE2E2",
                    color: supplier.cooperationStatus === "active" ? "#15803D" : "#DC2626",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {supplier.cooperationStatus === "active" ? "Đang hợp tác" : "Ngừng hợp tác"}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#6B7280" }}>
                Hồ sơ đối tác cung ứng, sản phẩm từng nhập và lịch sử chứng từ (UC7.3 & UC7.4)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#9CA3AF" }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "grid", gap: "18px" }}>
          {/* Card Thông tin đối tác & Thao tác trạng thái */}
          <div
            style={{
              border: "1px solid var(--color-bone, #E5E7EB)",
              borderRadius: 12,
              padding: "16px",
              background: "white",
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-bark, #1F2937)", margin: 0 }}>
                📋 Thông tin liên hệ & Pháp lý
              </h4>
              <button
                type="button"
                onClick={() => {
                  setNewStatus(supplier.cooperationStatus === "active" ? "inactive" : "active");
                  setShowStatusModal(true);
                }}
                style={{
                  background: supplier.cooperationStatus === "active" ? "#FEF2F2" : "#F0FDF4",
                  border: `1px solid ${supplier.cooperationStatus === "active" ? "#FCA5A5" : "#86EFAC"}`,
                  color: supplier.cooperationStatus === "active" ? "#DC2626" : "#15803D",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🔄 {supplier.cooperationStatus === "active" ? "Ngừng hợp tác (UC7.4)" : "Kích hoạt lại hợp tác"}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span style={{ color: "#6B7280", display: "block" }}>Người liên hệ:</span>
                <strong>{supplier.contactPerson}</strong>
              </div>
              <div>
                <span style={{ color: "#6B7280", display: "block" }}>Điện thoại:</span>
                <strong>{supplier.phone}</strong>
              </div>
              <div>
                <span style={{ color: "#6B7280", display: "block" }}>Email:</span>
                <strong>{supplier.email || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#6B7280", display: "block" }}>Mã số thuế:</span>
                <strong style={{ fontFamily: "monospace" }}>{supplier.taxCode || "—"}</strong>
              </div>
              <div className="col-span-2">
                <span style={{ color: "#6B7280", display: "block" }}>Địa chỉ:</span>
                <span>{supplier.address || "—"}</span>
              </div>
              <div className="col-span-2">
                <span style={{ color: "#6B7280", display: "block" }}>Ghi chú đối tác:</span>
                <span style={{ fontStyle: "italic" }}>{supplier.note || "—"}</span>
              </div>
            </div>

            {supplier.statusReason && (
              <div
                style={{
                  marginTop: 10,
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: "0.75rem",
                  color: "#991B1B",
                }}
              >
                <strong>Lý do trạng thái:</strong> {supplier.statusReason}
              </div>
            )}
          </div>

          {/* Card Thống kê lũy kế */}
          <div className="grid grid-cols-3 gap-3">
            <div
              style={{
                background: "var(--color-parchment, #F5F1E9)",
                borderRadius: 10,
                padding: "12px 16px",
                border: "1px solid var(--color-bone, #E5E7EB)",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "#6B7280", display: "block" }}>Tổng giá trị nhập chốt</span>
              <strong style={{ fontSize: "1.1rem", color: "var(--color-forest, #15803D)" }}>
                {fmt(totalImportValue)}
              </strong>
              <div style={{ fontSize: "0.68rem", color: "#9CA3AF", marginTop: 2 }}>
                * Chỉ tính phiếu Đã nhập kho
              </div>
            </div>

            <div
              style={{
                background: "var(--color-parchment, #F5F1E9)",
                borderRadius: 10,
                padding: "12px 16px",
                border: "1px solid var(--color-bone, #E5E7EB)",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "#6B7280", display: "block" }}>Thiết bị chấp nhận nhập</span>
              <strong style={{ fontSize: "1.1rem", color: "var(--color-bark, #1F2937)" }}>
                {totalEquipmentAccepted} thiết bị
              </strong>
              <div style={{ fontSize: "0.68rem", color: "#9CA3AF", marginTop: 2 }}>Đã gắn mã barcode / serial</div>
            </div>

            <div
              style={{
                background: "var(--color-parchment, #F5F1E9)",
                borderRadius: 10,
                padding: "12px 16px",
                border: "1px solid var(--color-bone, #E5E7EB)",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "#6B7280", display: "block" }}>Tổng số phiếu nhập</span>
              <strong style={{ fontSize: "1.1rem", color: "var(--color-amber, #D97706)" }}>
                {confirmedReceipts.length} đã chốt / {supplierReceipts.length} tổng
              </strong>
              <div style={{ fontSize: "0.68rem", color: "#9CA3AF", marginTop: 2 }}>Không cộng nháp/hủy vào công nợ</div>
            </div>
          </div>

          {/* Sub-tabs: Sản phẩm từng nhập vs Lịch sử chứng từ */}
          <div>
            <div className="flex gap-2 border-b border-bone pb-2 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                style={{
                  background: activeTab === "products" ? "var(--color-forest, #15803D)" : "white",
                  color: activeTab === "products" ? "white" : "#6B7280",
                  border: "1px solid var(--color-bone, #E5E7EB)",
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📦 Sản phẩm từng nhập ({importedProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("receipts")}
                style={{
                  background: activeTab === "receipts" ? "var(--color-forest, #15803D)" : "white",
                  color: activeTab === "receipts" ? "white" : "#6B7280",
                  border: "1px solid var(--color-bone, #E5E7EB)",
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📋 Lịch sử phiếu nhập ({supplierReceipts.length})
              </button>
            </div>

            {activeTab === "products" ? (
              /* TAB: SẢN PHẨM TỪNG NHẬP TỪ NCC */
              importedProducts.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "#6B7280", fontSize: "0.82rem" }}>
                  Chưa có sản phẩm nào được nhập kho chính thức từ nhà cung cấp này.
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid var(--color-bone, #E5E7EB)", borderRadius: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ background: "var(--color-parchment, #F5F1E9)", fontWeight: 600 }}>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Mã SP</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Tên sản phẩm</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Tổng lượng đã nhận</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Đơn giá nhập gần nhất</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Thời điểm gần nhất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedProducts.map((p) => (
                        <tr key={p.productId} style={{ borderTop: "1px solid var(--color-bone, #E5E7EB)" }}>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700 }}>
                            {p.productId}
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--color-forest, #15803D)" }}>
                            {p.totalQty} chiếc
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(p.lastUnitPrice)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "#6B7280" }}>{p.lastDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* TAB: LỊCH SỬ CÁC PHIẾU NHẬP */
              supplierReceipts.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "#6B7280", fontSize: "0.82rem" }}>
                  Chưa có phiếu nhập nào được ghi nhận cho nhà cung cấp này.
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid var(--color-bone, #E5E7EB)", borderRadius: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ background: "var(--color-parchment, #F5F1E9)", fontWeight: 600 }}>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Mã phiếu</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Ngày tạo</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Người lập</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>Trạng thái</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Tổng giá trị</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierReceipts.map((r) => {
                        const total = r.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
                        return (
                          <tr key={r.id} style={{ borderTop: "1px solid var(--color-bone, #E5E7EB)" }}>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "var(--color-forest, #15803D)" }}>
                              {r.displayCode || r.id}
                            </td>
                            <td style={{ padding: "8px 12px", color: "#6B7280" }}>{r.createdAt}</td>
                            <td style={{ padding: "8px 12px" }}>{r.createdBy}</td>
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <span
                                style={{
                                  background:
                                    r.status === "Đã nhập kho"
                                      ? "#DCFCE7"
                                      : r.status === "Nháp"
                                      ? "#FEF3C7"
                                      : "#F3F4F6",
                                  color:
                                    r.status === "Đã nhập kho"
                                      ? "#15803D"
                                      : r.status === "Nháp"
                                      ? "#B45309"
                                      : "#6B7280",
                                  padding: "2px 8px",
                                  borderRadius: 8,
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                }}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>
                              {fmt(total)}
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              {onOpenReceipt && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenReceipt(r.id);
                                    onClose();
                                  }}
                                  style={{
                                    background: "white",
                                    border: "1px solid var(--color-bone, #E5E7EB)",
                                    borderRadius: 6,
                                    padding: "3px 8px",
                                    fontSize: "0.72rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  Mở phiếu
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 24px",
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
            Đóng hồ sơ
          </button>
        </div>

        {/* Sub-modal: Thay đổi tình trạng hợp tác (UC7.4) */}
        {showStatusModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              zIndex: 10000,
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: 12,
                padding: 20,
                maxWidth: 440,
                width: "100%",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              }}
            >
              <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 8px" }}>
                Thay đổi tình trạng hợp tác (UC7.4)
              </h4>
              <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: "0 0 12px" }}>
                {newStatus === "inactive"
                  ? "Khi ngừng hợp tác, NCC này sẽ không thể dùng để lập phiếu nhập mới hoặc xác nhận nhập hàng. Lịch sử phiếu cũ vẫn được bảo toàn."
                  : "Kích hoạt lại đối tác cung ứng vào danh mục đối tác hoạt động."}
              </p>
              <form onSubmit={handleStatusChange} className="grid gap-3">
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  Trạng thái mới:
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as "active" | "inactive")}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: 6,
                      border: "1px solid #D1D5DB",
                      marginTop: 4,
                      background: "white",
                    }}
                  >
                    <option value="active">Đang hợp tác</option>
                    <option value="inactive">Ngừng hợp tác</option>
                  </select>
                </label>
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  Lý do thay đổi (bắt buộc theo UC7.4):
                  <textarea
                    required
                    rows={2}
                    placeholder="Nhập lý do ngừng hợp tác hoặc kích hoạt lại..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: 6,
                      border: "1px solid #D1D5DB",
                      marginTop: 4,
                      fontSize: "0.8rem",
                    }}
                  />
                </label>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(false)}
                    style={{
                      background: "white",
                      border: "1px solid #D1D5DB",
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: newStatus === "active" ? "var(--color-forest, #15803D)" : "#DC2626",
                      color: "white",
                      border: "none",
                      padding: "6px 16px",
                      borderRadius: 6,
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Xác nhận đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
