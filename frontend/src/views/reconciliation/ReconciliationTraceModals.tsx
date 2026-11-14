import { fmt, statusColors, type MoneyTransaction, type Order, type ReturnReceipt, type Surcharge } from "../../store";

interface Props {
  order: Order;
  viewingTx: MoneyTransaction | null;
  setViewingTx: (v: MoneyTransaction | null) => void;
  viewingReturnReceipt: ReturnReceipt | null;
  setViewingReturnReceipt: (v: ReturnReceipt | null) => void;
  viewingSurcharge: Surcharge | null;
  setViewingSurcharge: (v: Surcharge | null) => void;
  showPrintModal: boolean;
  setShowPrintModal: (v: boolean) => void;
  depositCollected: number;
  totalApprovedSurcharges: number;
  approvedSurcharges: Surcharge[];
  priorSettled: number;
  netDifference: number;
  refundAmount: number;
  extraAmount: number;
  isBalanced: boolean;
  initialTransaction?: MoneyTransaction;
}

export function ReconciliationTraceModals(props: Props) {
  const {
    order, viewingTx, setViewingTx, viewingReturnReceipt, setViewingReturnReceipt,
    viewingSurcharge, setViewingSurcharge, showPrintModal, setShowPrintModal,
    depositCollected, totalApprovedSurcharges: approvedTotal, approvedSurcharges, priorSettled, netDifference,
    refundAmount, extraAmount, isBalanced, initialTransaction,
  } = props;
  return (
    <>
      {/* ─── DÒNG 3: MODAL TRUY VẾT GIAO DỊCH THU CỌC BAN ĐẦU ─────────────────── */}
      {viewingTx && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 480, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "var(--color-forest)", color: "white", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  CHỨNG TỪ THU BAN ĐẦU (DÒNG 3)
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Mã giao dịch: {viewingTx.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingTx(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, fontSize: "0.84rem", display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Loại giao dịch:</span><strong>{viewingTx.type}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Thời gian thực hiện:</span><strong>{viewingTx.createdAt}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Số tiền giao dịch:</span><strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(viewingTx.amount)}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Trạng thái:</span><span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{viewingTx.status}</span></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Nội dung / Ghi chú:</span><span>{viewingTx.note || "Thanh toán thành công"}</span></div>
            </div>

            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setViewingTx(null)} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DÒNG 3: MODAL TRUY VẾT PHIẾU NHẬN TRẢ (PNT) ───────────────────────── */}
      {viewingReturnReceipt && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 580, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span style={{ fontSize: "0.72rem", background: viewingReturnReceipt.isFinalReturn ? "#DCFCE7" : "#FFF7ED", color: viewingReturnReceipt.isFinalReturn ? "#15803D" : "#C2410C", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                  CHỨNG TỪ GỐC: {viewingReturnReceipt.isFinalReturn ? "PHIẾU TRẢ CUỐI CÙNG" : `PHIẾU TRẢ ĐỢT ${viewingReturnReceipt.returnRound}`}
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Phiếu Nhận Trả: {viewingReturnReceipt.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingReturnReceipt(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.82rem", marginBottom: 14 }}>
              <div><strong>Đơn hàng:</strong> {viewingReturnReceipt.orderId} · <strong>Ngày nhận:</strong> {viewingReturnReceipt.returnedAt}</div>
              <div><strong>Nhân viên nghiệm thu:</strong> {viewingReturnReceipt.staffName} · <strong>Ghi chú:</strong> {viewingReturnReceipt.note || "Không có"}</div>
            </div>

            <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>Chi tiết thiết bị trong biên bản:</strong>
            <div className="flex flex-col gap-2 mt-2 mb-4">
              {viewingReturnReceipt.items.map((it) => (
                <div key={it.equipmentId} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{it.equipmentId}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Tình trạng: <strong>{it.condition}</strong> {it.note ? `— ${it.note}` : ""}</div>
                  </div>
                  {it.surchargeAmount > 0 && (
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626", fontSize: "0.85rem" }}>
                      +{fmt(it.surchargeAmount)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => window.print()} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>
                🖨 In phiếu PNT
              </button>
              <button type="button" onClick={() => setViewingReturnReceipt(null)} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DÒNG 3: MODAL TRUY VẾT PHIẾU PHỤ PHÍ ─────────────────────────────── */}
      {viewingSurcharge && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 480, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  CHỨNG TỪ PHỤ PHÍ (DÒNG 3)
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Phiếu Phụ Phí: {viewingSurcharge.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingSurcharge(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, fontSize: "0.84rem", display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Loại phụ phí:</span><strong>{viewingSurcharge.type}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Mã thiết bị:</span><strong style={{ fontFamily: "var(--font-mono)" }}>{viewingSurcharge.equipmentId}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Số tiền phạt/bồi thường:</span><strong style={{ fontFamily: "var(--font-mono)", color: "#DC2626" }}>{fmt(viewingSurcharge.amount)}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Lý do & Tình trạng:</span><span>{viewingSurcharge.reason}</span></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Người đề xuất:</span><strong>{viewingSurcharge.createdBy}</strong></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Trạng thái duyệt:</span><span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{viewingSurcharge.status}</span></div>
            </div>

            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setViewingSurcharge(null)} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DÒNG 7: MODAL IN BIÊN BẢN ĐỐI SOÁT CHUẨN A4 ──────────────────────── */}
      {showPrintModal && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 680, width: "100%", padding: 36, boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
            {/* Header Biên bản in */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid var(--color-forest)", paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-forest)", margin: 0 }}>
                  GEARGO OUTDOOR RENTALS
                </h2>
                <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>Hệ thống cho thuê thiết bị cắm trại & dã ngoại chuyên nghiệp</div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Hotline: 1900-GEARGO · Website: geargo.vn</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-bark)" }}>BIÊN BẢN ĐỐI SOÁT CỌC</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-moss)" }}>BBDS-{order.id}</div>
                <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Ngày lập: {order.reconciledAt || new Date().toLocaleString("vi-VN")}</div>
              </div>
            </div>

            {/* Thông tin đơn và khách hàng */}
            <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 14, fontSize: "0.82rem", marginBottom: 20 }}>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Mã đơn thuê:</strong> {order.id}</div>
                <div><strong>Khách hàng:</strong> {order.customerName}</div>
                <div><strong>Số điện thoại:</strong> {order.customerPhone}</div>
                <div><strong>Kỳ thuê:</strong> {order.pickupTime} → {order.returnTime}</div>
              </div>
            </div>

            {/* Bảng số liệu quyết toán chi tiết */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", marginBottom: 20 }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-bone)" }}>Hạng mục tài chính</th>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-bone)" }}>Căn cứ chứng từ</th>
                  <th style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", textAlign: "right" }}>Số tiền (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)" }}><strong>1. Tiền cọc ban đầu</strong></td>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", color: "#6B7280" }}>{initialTransaction ? initialTransaction.id : "Đã thanh toán"}</td>
                  <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>+{fmt(depositCollected)}</td>
                </tr>
                {approvedSurcharges.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)" }}>
                      2. Phụ phí: {s.type} ({s.equipmentId})
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{s.reason}</div>
                    </td>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", color: "#6B7280" }}>Phiếu duyệt {s.id}</td>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", textAlign: "right", fontFamily: "var(--font-mono)", color: "#DC2626" }}>−{fmt(s.amount)}</td>
                  </tr>
                ))}
                {priorSettled !== 0 && (
                  <tr>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)" }}>3. Khoản đã thu/hoàn trước</td>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", color: "#6B7280" }}>Giao dịch đối soát trước</td>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--color-bone)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {priorSettled > 0 ? `+${fmt(priorSettled)}` : `−${fmt(Math.abs(priorSettled))}`}
                    </td>
                  </tr>
                )}
                <tr style={{ background: "#F0FDF4", fontWeight: 800 }}>
                  <td colSpan={2} style={{ padding: "10px 12px", border: "1px solid var(--color-bone)" }}>
                    SỐ DƯ QUYẾT TOÁN CUỐI CÙNG (
                    {isBalanced ? "CÂN BẰNG 0 Đ" : netDifference > 0 ? "HOÀN TRẢ KHÁCH" : "THU THÊM"}
                    )
                  </td>
                  <td style={{ padding: "10px 12px", border: "1px solid var(--color-bone)", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "1.05rem", color: isBalanced ? "#15803D" : netDifference > 0 ? "var(--color-forest)" : "#DC2626" }}>
                    {fmt(Math.abs(netDifference))}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Chữ ký hai bên */}
            <div className="grid grid-cols-2 gap-8 text-center pt-6" style={{ fontSize: "0.82rem" }}>
              <div>
                <strong>ĐẠI DIỆN KHÁCH HÀNG</strong>
                <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: 60 }} />
                <strong>{order.customerName}</strong>
              </div>
              <div>
                <strong>ĐẠI DIỆN GEARGO</strong>
                <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>(Người chốt đối soát)</div>
                <div style={{ height: 60 }} />
                <strong>{order.reconciliation?.lockedBy || "NV Kho Mai"}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-8 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => window.print()} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>
                🖨 Xác nhận In / Xuất PDF
              </button>
              <button type="button" onClick={() => setShowPrintModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

