import { fmt, type ImportReceipt, type Order } from "../../../store";
import Icon from "../../../components/Icon";

export interface DrilldownData {
  title: string;
  subtitle: string;
  type: "orders" | "equipment" | "damage";
  items: any[];
}

interface ReportsDrilldownModalsProps {
  drilldownData: DrilldownData | null;
  setDrilldownData: (v: DrilldownData | null) => void;
  viewingReceipt: ImportReceipt | null;
  setViewingReceipt: (v: ImportReceipt | null) => void;
}

export function ReportsDrilldownModals({
  drilldownData,
  setDrilldownData,
  viewingReceipt,
  setViewingReceipt,
}: ReportsDrilldownModalsProps) {
  return (
    <>
      {drilldownData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 800, width: "100%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-bark)" }}>
                  {drilldownData.title}
                </h3>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>{drilldownData.subtitle}</div>
              </div>
              <button onClick={() => setDrilldownData(null)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              {drilldownData.items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#6B7280", fontSize: "0.85rem" }}>
                  Không có bản ghi nào cấu thành chỉ tiêu trong kỳ đã chọn.
                </div>
              ) : drilldownData.type === "orders" ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px" }}>Mã đơn</th>
                      <th style={{ padding: "8px 12px" }}>Khách hàng</th>
                      <th style={{ padding: "8px 12px" }}>Trạng thái</th>
                      <th style={{ padding: "8px 12px" }}>Ngày hẹn lấy</th>
                      <th style={{ padding: "8px 12px" }}>Ngày hẹn trả</th>
                      <th style={{ padding: "8px 12px" }}>Tiền thuê</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownData.items.map((o: Order) => (
                      <tr key={o.id} style={{ borderTop: "1px solid var(--color-bone)" }}>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{o.displayCode ?? o.id}</td>
                        <td style={{ padding: "8px 12px" }}>{o.customerName} ({o.customerPhone})</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 4, background: "#F3F4F6", fontWeight: 700 }}>{o.status}</span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "#6B7280" }}>{o.pickupTime}</td>
                        <td style={{ padding: "8px 12px", color: "#6B7280" }}>{o.returnTime}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmt(o.rental - o.discount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px" }}>Mã đơn</th>
                      <th style={{ padding: "8px 12px" }}>Mã thiết bị</th>
                      <th style={{ padding: "8px 12px" }}>Tình trạng khi trả</th>
                      <th style={{ padding: "8px 12px" }}>Phụ phí bồi thường</th>
                      <th style={{ padding: "8px 12px" }}>Nhân viên kết luận</th>
                      <th style={{ padding: "8px 12px" }}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownData.items.map((dm: any, i: number) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--color-bone)" }}>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{dm.orderId}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{dm.equipmentId}</td>
                        <td style={{ padding: "8px 12px", color: "#DC2626", fontWeight: 600 }}>{dm.condition}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#D97706" }}>{fmt(dm.surchargeAmount || 0)}</td>
                        <td style={{ padding: "8px 12px" }}>{dm.staffName}</td>
                        <td style={{ padding: "8px 12px", color: "#6B7280" }}>{dm.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-bone)", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setDrilldownData(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {viewingReceipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 720, width: "100%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-bark)" }}>
                  Chứng từ phiếu nhập kho — {viewingReceipt.displayCode ?? viewingReceipt.id}
                </h3>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Nhà cung cấp: {viewingReceipt.supplierName} · Xác nhận: {viewingReceipt.confirmedAt || viewingReceipt.createdAt}</div>
              </div>
              <button onClick={() => setViewingReceipt(null)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                    <th style={{ padding: "8px 10px" }}>Sản phẩm</th>
                    <th style={{ padding: "8px 10px" }}>Số lượng</th>
                    <th style={{ padding: "8px 10px" }}>Đơn giá</th>
                    <th style={{ padding: "8px 10px" }}>Thành tiền</th>
                    <th style={{ padding: "8px 10px" }}>Mã thiết bị sinh ra</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingReceipt.lines.map((l, idx) => (
                    <tr key={idx} style={{ borderTop: "1px solid var(--color-bone)" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{l.productNameSnapshot || l.productId}</td>
                      <td style={{ padding: "8px 10px" }}>{l.quantity}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{fmt(l.unitPrice)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(l.quantity * l.unitPrice)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-amber)" }}>
                        {l.equipmentCodes.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, fontSize: "0.8rem" }}>
                <div><strong>Người tạo:</strong> {viewingReceipt.createdBy} · <strong>Trạng thái:</strong> {viewingReceipt.status}</div>
                {viewingReceipt.note && <div style={{ marginTop: 4 }}><strong>Ghi chú:</strong> {viewingReceipt.note}</div>}
              </div>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-bone)", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setViewingReceipt(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
