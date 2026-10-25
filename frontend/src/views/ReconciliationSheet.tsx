import { useState } from "react";
import { useApp } from "../App";
import {
  fmt,
  statusColors,
  type Order,
  type Surcharge,
  type MoneyTransaction,
  type ReturnReceipt,
} from "../store";

interface ReconciliationSheetProps {
  order: Order;
  app: ReturnType<typeof useApp>;
  userRole?: "staff" | "admin";
  onClose?: () => void;
}

/**
 * UC5.4: Đối soát cọc và hoàn tất đơn (Reconciliation & Order Completion)
 * Tác nhân: Nhân viên, Quản trị viên
 * Đầy đủ 7 bước chính + Dòng sự kiện phụ 1.1, 5.1, 5.2
 */
export default function ReconciliationSheet({ order, app, userRole = "staff", onClose }: ReconciliationSheetProps) {
  // Trạng thái cho các modal truy vết chứng từ gốc (Dòng 3)
  const [viewingTx, setViewingTx] = useState<MoneyTransaction | null>(null);
  const [viewingSurcharge, setViewingSurcharge] = useState<Surcharge | null>(null);
  const [viewingReturnReceipt, setViewingReturnReceipt] = useState<ReturnReceipt | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Trạng thái modal UC5.5: Thu tiền bổ sung tại quầy
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectMethod, setCollectMethod] = useState<"cash" | "pos" | "qr">("cash");
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [posTerminalCode, setPosTerminalCode] = useState("POS-T1-01");
  const [posAuthCode, setPosAuthCode] = useState("AUTH-8892");
  const [collectNote, setCollectNote] = useState("");

  // Trạng thái modal UC5.6: Hoàn tiền cọc qua ngân hàng / tiền mặt
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundMethod, setRefundMethod] = useState<"bank" | "cash">("bank");
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankAccount, setBankAccount] = useState("1029384756");
  const [bankHolder, setBankHolder] = useState(order.customerName.toUpperCase());
  const [refundNote, setRefundNote] = useState("");

  // Trạng thái modal UC5.7: Điều chỉnh tài chính sau chốt
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjType, setAdjType] = useState<"Thu bù" | "Hoàn trả" | "Bù trừ chiết khấu">("Hoàn trả");
  const [adjAmount, setAdjAmount] = useState<number>(50000);
  const [adjReason, setAdjReason] = useState("");
  const [adjMessage, setAdjMessage] = useState("");

  // ─── 1. KIỂM TRA TIỀN ĐIỀU KIỆN & DÒNG SỰ KIỆN PHỤ 1.1 ──────────────────────
  // Thiết bị còn nợ (chưa có kết luận trả hoặc mất)
  const debtEquipment = order.assignedEquipment.filter((ae) => !ae.returnedAt);
  // Phụ phí chưa duyệt
  const pendingSurcharges = order.surcharges.filter((s) => s.status === "Chờ duyệt");
  // Phụ phí đang khiếu nại tranh chấp
  const disputedSurcharges = order.surcharges.filter((s) => s.status === "Tranh chấp");
  // Cờ chặn theo Dòng 1.1
  const isBlocked = debtEquipment.length > 0 || pendingSurcharges.length > 0 || disputedSurcharges.length > 0;

  // ─── 2. TÍNH TOÁN CĂN CỨ BẢNG ĐỐI SOÁT (DÒNG 2 & LƯU Ý) ─────────────────────
  // A. Tiền cọc thực thu ban đầu
  const depositCollected = order.depositTotal;

  // B. Các khoản phụ phí bồi thường & quá hạn đã duyệt
  const approvedSurcharges = order.surcharges.filter((s) => s.status === "Đã duyệt");
  const totalApprovedSurcharges = approvedSurcharges.reduce((sum, s) => sum + s.amount, 0);

  // C. Các khoản thu thêm hoặc hoàn cọc đã xử lý trước đó
  const priorRefund = (order.transactions || [])
    .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const priorCollect = (order.transactions || [])
    .filter((t) => t.type === "Thu thêm" && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const priorSettled = priorCollect - priorRefund;

  // D. Số dư chênh lệch còn lại
  const netDifference = depositCollected - totalApprovedSurcharges - priorSettled;
  const isBalanced = netDifference === 0; // Dòng 5.1: chênh lệch = 0
  const refundAmount = Math.max(0, netDifference); // EP5.4-HOAN: số tiền hoàn
  const extraAmount = Math.max(0, -netDifference); // EP5.4-THU: số tiền thu thêm

  const isOrderCompleted = order.status === "Hoàn tất";
  const isConfirmed = order.reconciliation?.status === "confirmed" || isOrderCompleted;

  // Giao dịch thanh toán ban đầu (để truy vết)
  const initialTransaction = (order.transactions || []).find((t) => t.type === "Thanh toán ban đầu");

  return (
    <div style={{ background: "white", borderRadius: 16, border: "1px solid var(--color-bone)", overflow: "hidden", boxShadow: "0 2px 12px rgba(17,35,27,0.04)" }}>
      {/* ─── Header: Tên nghiệp vụ & Trạng thái ────────────────────────────── */}
      <div style={{ background: "var(--color-parchment)", padding: "18px 24px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "0.72rem", background: isOrderCompleted ? "#DCFCE7" : "var(--color-forest)", color: isOrderCompleted ? "#15803D" : "white", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
              UC5.4: ĐỐI SOÁT CỌC & HOÀN TẤT ĐƠN
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Tác nhân: {userRole === "admin" ? "Quản trị viên" : "Nhân viên kho"}</span>
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", color: "var(--color-bark)", margin: "4px 0 2px" }}>
            Bảng Đối Soát Cọc & Quyết Toán: Đơn {order.id}
          </h3>
          <div style={{ fontSize: "0.82rem", color: "#4B5563" }}>
            Khách hàng: <strong>{order.customerName}</strong> ({order.customerPhone}) · Nhận: {order.pickupTime} · Hẹn trả: {order.returnTime}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOrderCompleted ? (
            <div className="locked-seal">
              <span>🔒</span> ĐÃ KHÓA & HOÀN TẤT
            </div>
          ) : (
            <span style={{ background: statusColors[order.status]?.bg || "#F3F4F6", color: statusColors[order.status]?.text || "#374151", padding: "6px 12px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 700 }}>
              {order.status}
            </span>
          )}
          {onClose && (
            <button onClick={onClose} style={{ border: "1px solid var(--color-bone)", background: "white", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
              Đóng
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* ─── Thanh tiến trình 3 bước UC5.4 ─────────────────────────────────── */}
        <div className="reconcile-step-flow">
          <div className={`reconcile-step-item ${isBlocked ? "active" : "completed"}`}>
            <span className="reconcile-step-badge">{isBlocked ? "1" : "✓"}</span>
            <span>1. Kiểm tra thiết bị & Phụ phí</span>
          </div>
          <span style={{ color: "var(--color-bone)" }}>→</span>
          <div className={`reconcile-step-item ${!isBlocked && !isOrderCompleted ? "active" : isOrderCompleted ? "completed" : ""}`}>
            <span className="reconcile-step-badge">{isOrderCompleted ? "✓" : "2"}</span>
            <span>2. Bảng đối soát & Xác nhận</span>
          </div>
          <span style={{ color: "var(--color-bone)" }}>→</span>
          <div className={`reconcile-step-item ${isOrderCompleted ? "active completed" : ""}`}>
            <span className="reconcile-step-badge">{isOrderCompleted ? "✓" : "3"}</span>
            <span>3. Quyết toán tiền & Khóa đối soát</span>
          </div>
        </div>

        {/* ─── DÒNG SỰ KIỆN PHỤ 1.1: CẢNH BÁO CHƯA ĐỦ ĐIỀU KIỆN ──────────────── */}
        {isBlocked ? (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: "1.2rem" }}>⛔</span>
              <strong style={{ color: "#DC2626", fontSize: "0.95rem" }}>
                Chưa cho phép chốt đối soát (Dòng sự kiện phụ 1.1)
              </strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#991B1B", marginBottom: 12 }}>
              Đơn hàng chưa thỏa mãn tiền điều kiện. Hệ thống yêu cầu giải quyết dứt điểm các mục còn tồn đọng sau đây trước khi đối soát:
            </p>

            <div className="flex flex-col gap-2">
              {debtEquipment.length > 0 && (
                <div style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ color: "#B91C1C", fontSize: "0.85rem" }}>
                      Thiết bị chưa nhận trả / chưa có kết luận: {debtEquipment.length} thiết bị
                    </strong>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                      Mã: {debtEquipment.map((d) => d.equipmentId).join(", ")}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", background: "#FEE2E2", color: "#991B1B", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    Cần lập Phiếu nhận trả
                  </span>
                </div>
              )}

              {pendingSurcharges.map((ps) => (
                <div key={ps.id} style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ background: "#FEF3C7", color: "#B45309", padding: "2px 6px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700 }}>Phụ phí chờ duyệt</span>
                      <strong style={{ fontSize: "0.85rem" }}>{ps.type} ({ps.equipmentId})</strong>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#DC2626", fontWeight: 700 }}>+{fmt(ps.amount)}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Lý do: {ps.reason} · Người đề xuất: {ps.createdBy}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => app.approveSurcharge(order.id, ps.id)}
                      style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      ✓ Duyệt phụ phí
                    </button>
                    <button
                      type="button"
                      onClick={() => app.rejectSurcharge(order.id, ps.id)}
                      style={{ background: "white", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: 6, padding: "5px 12px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      ✕ Từ chối
                    </button>
                  </div>
                </div>
              ))}

              {disputedSurcharges.map((ds) => (
                <div key={ds.id} style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ color: "#B45309", fontSize: "0.85rem" }}>Phụ phí đang tranh chấp: {ds.type} ({fmt(ds.amount)})</strong>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Khách hàng phản hồi: {ds.customerResponse || "Chưa đồng thuận mức phí"}</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", background: "#FEF3C7", color: "#B45309", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    Cần thương lượng xong
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.1rem", color: "#16A34A" }}>✓</span>
            <div style={{ fontSize: "0.82rem", color: "#15803D" }}>
              <strong>Đủ điều kiện đối soát (Tiền điều kiện đạt):</strong> 100% thiết bị đã kết luận nhận trả; toàn bộ phụ phí đã được duyệt/xử lý.
            </div>
          </div>
        )}

        {/* ─── DÒNG 2 & LƯU Ý: BẢNG ĐỐI SOÁT CỌC & QUYẾT TOÁN TỔNG HỢP ─────────── */}
        <div className="reconcile-sheet-card">
          <div className="reconcile-sheet-header">
            <div>
              <strong style={{ fontSize: "0.95rem", color: "var(--color-bark)" }}>
                Bảng Kê Quyết Toán Đối Soát Cọc
              </strong>
              <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                Số dư = Nghĩa vụ hợp lệ trừ tiền đã xử lý (Không cộng cọc vào doanh thu)
              </div>
            </div>
            <div className="flex gap-2">
              {isOrderCompleted && (
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "5px 12px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  🖨️ In biên bản A4
                </button>
              )}
            </div>
          </div>

          {/* Dòng 1: Cọc thực thu ban đầu */}
          <div className="reconcile-sheet-row" style={{ background: "#FAFAFA" }}>
            <div>
              <div className="flex items-center gap-2">
                <strong>1. Tiền cọc thực thu ban đầu:</strong>
                {initialTransaction && (
                  <button
                    type="button"
                    onClick={() => setViewingTx(initialTransaction)}
                    className="reconcile-trace-btn"
                    title="Truy về chứng từ thu ban đầu (Dòng 3)"
                  >
                    🔍 Xem GD: {initialTransaction.id}
                  </button>
                )}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                Thanh toán lúc đặt đơn qua Cổng thanh toán / Chuyển khoản
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem", color: "var(--color-forest)" }}>
              +{fmt(depositCollected)}
            </div>
          </div>

          {/* Dòng 2: Chi tiết các khoản phụ phí đã duyệt (Căn cứ điều chỉnh) */}
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #F3F4F6" }}>
            <div className="flex justify-between items-center mb-2">
              <strong style={{ fontSize: "0.86rem", color: "var(--color-bark)" }}>
                2. Các khoản phụ phí đã duyệt (Căn cứ điều chỉnh):
              </strong>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: totalApprovedSurcharges > 0 ? "#DC2626" : "#6B7280" }}>
                −{fmt(totalApprovedSurcharges)}
              </span>
            </div>

            {approvedSurcharges.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: "#9CA3AF", fontStyle: "italic", paddingLeft: 12 }}>
                ✓ Thiết bị hoàn trả đầy đủ, nguyên vẹn — Không phát sinh phụ phí bồi thường hoặc trễ hạn.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5" style={{ paddingLeft: 12 }}>
                {approvedSurcharges.map((s) => {
                  // Tìm phiếu nhận trả liên quan (Dòng 3: Truy về chứng từ gốc)
                  const relatedReceipt = (order.returnReceipts || []).find((r) =>
                    r.items.some((it) => it.equipmentId === s.equipmentId && it.surchargeAmount === s.amount)
                  );

                  return (
                    <div key={s.id} style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{s.type}</span> — Thiết bị: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{s.equipmentId}</span>
                        <span style={{ color: "#6B7280", marginLeft: 6 }}>({s.reason})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {relatedReceipt && (
                          <button
                            type="button"
                            onClick={() => setViewingReturnReceipt(relatedReceipt)}
                            className="reconcile-trace-btn"
                            title="Truy về Phiếu nhận trả (Dòng 3)"
                          >
                            📄 PNT: {relatedReceipt.id}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewingSurcharge(s)}
                          className="reconcile-trace-btn"
                          title="Xem chi tiết phiếu phụ phí"
                        >
                          🔍 Chi tiết phí
                        </button>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626" }}>
                          −{fmt(s.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dòng 3: Các khoản đã thu bổ sung / hoàn trước đó (nếu có) */}
          <div className="reconcile-sheet-row" style={{ background: "#FAFAFA" }}>
            <div>
              <strong>3. Các khoản đã thu thêm / hoàn cọc trước đó:</strong>
              <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                Thu thêm trước đó: {fmt(priorCollect)} · Đã hoàn trước đó: {fmt(priorRefund)}
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.9rem", color: "#4B5563" }}>
              {priorSettled !== 0 ? (priorSettled > 0 ? `+${fmt(priorSettled)}` : `−${fmt(Math.abs(priorSettled))}`) : "0 đ"}
            </div>
          </div>

          {/* Dòng 4: TỔNG KẾT CHÊNH LỆCH ĐỐI SOÁT (Net Settlement Difference) */}
          <div style={{ background: isBalanced ? "#F0FDF4" : netDifference > 0 ? "#F0FDF4" : "#FEF2F2", padding: "16px 20px", borderTop: "2px solid var(--color-bone)" }}>
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#6B7280" }}>
                  Kết luận chênh lệch đối soát:
                </span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: isBalanced ? "#15803D" : netDifference > 0 ? "var(--color-forest)" : "#DC2626", marginTop: 2 }}>
                  {isBalanced
                    ? "✓ Cân bằng tuyệt đối (0 đ) — Không phát sinh nghĩa vụ tiền"
                    : netDifference > 0
                    ? `Cửa hàng phải HOÀN TRẢ CỌC cho khách: +${fmt(refundAmount)}`
                    : `Khách hàng cần THANH TOÁN BỔ SUNG: −${fmt(extraAmount)}`}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 4 }}>
                  Căn cứ tính: Cọc {fmt(depositCollected)} − Phụ phí {fmt(totalApprovedSurcharges)} {priorSettled !== 0 ? `− Đã xử lý ${fmt(priorSettled)}` : ""} = {fmt(Math.abs(netDifference))}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: isBalanced ? "#15803D" : netDifference > 0 ? "var(--color-forest)" : "#DC2626" }}>
                  {fmt(Math.abs(netDifference))}
                </div>
                <span style={{ fontSize: "0.72rem", background: "white", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--color-bone)", fontWeight: 600 }}>
                  {isBalanced ? "Dòng 5.1" : netDifference > 0 ? "EP5.4-HOAN (UC5.6)" : "EP5.4-THU (UC5.5)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── DÒNG 4: XÁC NHẬN BẢNG ĐỐI SOÁT & THỰC HIỆN NGHĨA VỤ TIỀN ────────── */}
        {!isOrderCompleted && (
          <div style={{ background: "var(--color-parchment)", borderRadius: 12, padding: "18px 20px", border: "1px solid var(--color-bone)", marginTop: 16 }}>
            {/* Trạng thái xác nhận bảng đối soát (Bước 4) */}
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <div>
                <strong style={{ fontSize: "0.9rem", color: "var(--color-bark)" }}>
                  Quy trình chốt đối soát & tất toán đơn:
                </strong>
                {order.reconciliation?.confirmedAt ? (
                  <div style={{ fontSize: "0.78rem", color: "#15803D", marginTop: 2 }}>
                    ✓ Đã xác nhận bảng đối soát lúc <strong>{order.reconciliation.confirmedAt}</strong> bởi <strong>{order.reconciliation.confirmedBy}</strong>. (Đang giữ Chờ đối soát để thực hiện tiền)
                  </div>
                ) : (
                  <div style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: 2 }}>
                    Bước 4: Xác nhận căn cứ số liệu trước khi tiến hành giao dịch tiền.
                  </div>
                )}
              </div>

              {!order.reconciliation?.confirmedAt && (
                <button
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    const res = app.confirmReconciliation(order.id);
                    if (!res.ok) alert(res.message);
                  }}
                  style={{
                    background: isBlocked ? "#E5E7EB" : "var(--color-moss)",
                    color: isBlocked ? "#9CA3AF" : "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: isBlocked ? "not-allowed" : "pointer",
                  }}
                >
                  📝 Xác nhận bảng đối soát (Bước 4)
                </button>
              )}
            </div>

            {/* Các nút hành động nghiệp vụ theo Bước 5 */}
            <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-dashed border-gray-300">
              {/* DÒNG SỰ KIỆN PHỤ 5.1: Số tiền chênh lệch bằng 0 -> Chốt hoàn tất trực tiếp */}
              {isBalanced ? (
                <button
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    const res = app.finalizeOrderWithoutPayment(order.id, "Chốt đối soát cân bằng không phát sinh chênh lệch tiền (Dòng 5.1)");
                    if (!res.ok) alert(res.message);
                  }}
                  style={{
                    background: isBlocked ? "#9CA3AF" : "var(--color-forest)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 24px",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: isBlocked ? "not-allowed" : "pointer",
                  }}
                >
                  ✓ Chốt đối soát & Chuyển Hoàn tất đơn (Dòng 5.1: Chênh lệch 0 đ) →
                </button>
              ) : extraAmount > 0 ? (
                /* EP5.4-THU: Gọi UC5.5 Thu thêm tiền */
                <button
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    setCashTendered(extraAmount);
                    setShowCollectModal(true);
                  }}
                  style={{
                    background: isBlocked ? "#9CA3AF" : "#DC2626",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: isBlocked ? "not-allowed" : "pointer",
                  }}
                >
                  💳 Thu thêm tại quầy: {fmt(extraAmount)} (Gọi UC5.5) →
                </button>
              ) : (
                /* EP5.4-HOAN: Gọi UC5.6 Hoàn tiền cọc */
                <button
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    setBankHolder(order.customerName.toUpperCase());
                    setShowRefundModal(true);
                  }}
                  style={{
                    background: isBlocked ? "#9CA3AF" : "var(--color-forest)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: isBlocked ? "not-allowed" : "pointer",
                  }}
                >
                  🏦 Lập lệnh hoàn tiền cọc: {fmt(refundAmount)} (Gọi UC5.6) →
                </button>
              )}

              {/* Dòng sự kiện phụ 5.2: Mô phỏng giao dịch thất bại / chưa hoàn thành */}
              <button
                type="button"
                onClick={() => {
                  app.settleOrder(order.id, false, { note: "Khách chưa đủ tiền / Ngân hàng báo lỗi giao dịch" });
                }}
                style={{
                  background: "white",
                  color: "#B91C1C",
                  border: "1px solid #FECACA",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
                title="Mô phỏng khoản thu bổ sung chưa đủ hoặc giao dịch hoàn tiền thất bại (Dòng 5.2)"
              >
                ⚠️ Mô phỏng GD thất bại (Dòng 5.2)
              </button>
            </div>
          </div>
        )}

        {/* ─── DÒNG 7: XEM KẾT QUẢ CHỐT & KHÓA ĐỐI SOÁT (ĐƠN HOÀN TẤT) ────────── */}
        {isOrderCompleted && (
          <div style={{ background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: 12, padding: "20px 24px", marginTop: 18 }}>
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "1.4rem" }}>🎉</span>
                  <strong style={{ fontSize: "1.15rem", color: "var(--color-forest)" }}>
                    Đơn hàng Đã Khóa Đối Soát & Hoàn Tất Thành Công (Dòng 7)
                  </strong>
                </div>
                <div style={{ fontSize: "0.84rem", color: "#166534", marginTop: 4 }}>
                  Thời điểm khóa: <strong>{order.reconciledAt}</strong> · Người chốt: <strong>{order.reconciliation?.lockedBy || "Nhân viên"}</strong>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: 4 }}>
                  Mọi nghĩa vụ thiết bị và tiền cọc đã được quyết toán triệt để. Dữ liệu đã khóa để phục vụ 4 trụ cột báo cáo tài chính.
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  🖨️ In Biên Bản Đối Soát A4
                </button>
                {userRole === "admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdjAmount(50000);
                      setAdjReason("");
                      setAdjMessage("");
                      setShowAdjustmentModal(true);
                    }}
                    style={{ background: "#FFFBEB", border: "1px solid #FCD34D", color: "#B45309", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    title="Sửa sai tài chính sau khi đã đối soát có liên kết chứng từ gốc (UC5.7)"
                  >
                    📑 Lập điều chỉnh sau chốt (UC5.7)
                  </button>
                )}
              </div>
            </div>

            {/* Lịch sử giao dịch tiền của đơn */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed #86EFAC" }}>
              <strong style={{ fontSize: "0.82rem", color: "#166534" }}>Lịch sử chứng từ tiền liên quan ({order.transactions?.length || 0} giao dịch):</strong>
              <div className="flex flex-col gap-1.5 mt-2">
                {order.transactions?.map((tx) => (
                  <div key={tx.id} style={{ background: "white", border: "1px solid #BBF7D0", borderRadius: 6, padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem" }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{tx.id}</span>
                      <span style={{ fontWeight: 600 }}>{tx.type}</span>
                      <span style={{ color: "#6B7280" }}>({tx.note})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: tx.type === "Hoàn cọc" ? "var(--color-forest)" : tx.type === "Thu thêm" ? "#DC2626" : "inherit" }}>
                        {fmt(tx.amount)}
                      </span>
                      <span style={{ background: tx.status === "Thành công" ? "#DCFCE7" : "#FEE2E2", color: tx.status === "Thành công" ? "#15803D" : "#DC2626", padding: "1px 6px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 700 }}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL UC5.5: THU THÊM TIỀN TẠI QUẦY (TIỀN MẶT, POS, QR) ─────────── */}
      {showCollectModal && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 520, width: "100%", padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  EP5.4-THU → GỌI UC5.5
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Thu Tiền Bổ Sung: Đơn {order.id}
                </h3>
              </div>
              <button type="button" onClick={() => setShowCollectModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, marginBottom: 16, border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: "0.85rem", color: "#4B5563" }}>Số tiền cần thu thêm:</span>
                <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", color: "#DC2626" }}>{fmt(extraAmount)}</strong>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 4 }}>
                Khách hàng: <strong>{order.customerName}</strong> ({order.customerPhone})
              </div>
            </div>

            {/* Chọn kênh thu tiền */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 6 }}>Phương thức thanh toán:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "cash", label: "💵 Tiền mặt" },
                  { key: "pos", label: "💳 Thẻ POS" },
                  { key: "qr", label: "📱 VietQR" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setCollectMethod(m.key as typeof collectMethod)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: 8,
                      border: collectMethod === m.key ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
                      background: collectMethod === m.key ? "#F0FDF4" : "white",
                      fontWeight: collectMethod === m.key ? 700 : 500,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {collectMethod === "cash" && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, border: "1px solid var(--color-bone)", marginBottom: 14 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Số tiền khách đưa (đ):</label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 700, marginBottom: 8 }}
                />
                <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
                  <span style={{ color: "#6B7280" }}>Tiền thối lại cho khách:</span>
                  <strong style={{ fontFamily: "var(--font-mono)", color: cashTendered >= extraAmount ? "var(--color-forest)" : "#DC2626" }}>
                    {cashTendered >= extraAmount ? fmt(cashTendered - extraAmount) : "Chưa đủ tiền (Dòng 5.2)"}
                  </strong>
                </div>
              </div>
            )}

            {collectMethod === "pos" && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, border: "1px solid var(--color-bone)", marginBottom: 14 }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6B7280", display: "block" }}>Mã máy POS:</label>
                    <input
                      value={posTerminalCode}
                      onChange={(e) => setPosTerminalCode(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6B7280", display: "block" }}>Mã chuẩn chi (Auth Code):</label>
                    <input
                      value={posAuthCode}
                      onChange={(e) => setPosAuthCode(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#15803D" }}>✓ Đã kết nối POS tại quầy tiếp tân</div>
              </div>
            )}

            {collectMethod === "qr" && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 14, border: "1px solid var(--color-bone)", marginBottom: 14, textAlign: "center" }}>
                <div style={{ width: 110, height: 110, margin: "0 auto 8px", background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, display: "grid", placeItems: "center", fontSize: "2rem" }}>
                  📱
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-bark)" }}>Quét mã VietQR chuyển khoản nhanh</div>
                <div style={{ fontSize: "0.72rem", color: "#6B7280", fontFamily: "var(--font-mono)" }}>Nội dung: GG {order.id} THUTHEM</div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Ghi chú chứng từ thu:</label>
              <input
                placeholder="Ví dụ: Khách thanh toán phụ phí hỏng thiết bị tại quầy..."
                value={collectNote}
                onChange={(e) => setCollectNote(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCollectModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>
                Hủy
              </button>
              <button
                type="button"
                disabled={collectMethod === "cash" && cashTendered < extraAmount}
                onClick={() => {
                  const methodStr = collectMethod === "cash" ? "Tiền mặt tại quầy" : collectMethod === "pos" ? `Thẻ POS (${posTerminalCode}/${posAuthCode})` : "Quét VietQR";
                  app.settleOrder(order.id, true, {
                    method: methodStr,
                    amount: extraAmount,
                    note: collectNote || `Thu thêm tại quầy qua ${methodStr}`,
                  });
                  setShowCollectModal(false);
                }}
                style={{
                  background: collectMethod === "cash" && cashTendered < extraAmount ? "#9CA3AF" : "var(--color-forest)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: collectMethod === "cash" && cashTendered < extraAmount ? "not-allowed" : "pointer",
                }}
              >
                ✓ Xác nhận đã thu đủ tiền → Khóa & Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL UC5.6: HOÀN TIỀN CỌC (NGÂN HÀNG / TIỀN MẶT) ───────────────── */}
      {showRefundModal && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 520, width: "100%", padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  EP5.4-HOAN → GỌI UC5.6
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Lập Lệnh Hoàn Tiền Cọc: Đơn {order.id}
                </h3>
              </div>
              <button type="button" onClick={() => setShowRefundModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, marginBottom: 16, border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: "0.85rem", color: "#4B5563" }}>Số tiền hoàn cọc cho khách:</span>
                <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", color: "var(--color-forest)" }}>{fmt(refundAmount)}</strong>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 4 }}>
                Khách thụ hưởng: <strong>{order.customerName}</strong> ({order.customerPhone})
              </div>
            </div>

            {/* Kênh hoàn tiền */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 6 }}>Kênh hoàn tiền:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "bank", label: "🏦 Chuyển khoản ngân hàng" },
                  { key: "cash", label: "💵 Tiền mặt tại quầy" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setRefundMethod(m.key as typeof refundMethod)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: 8,
                      border: refundMethod === m.key ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
                      background: refundMethod === m.key ? "#F0FDF4" : "white",
                      fontWeight: refundMethod === m.key ? 700 : 500,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {refundMethod === "bank" && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, border: "1px solid var(--color-bone)", marginBottom: 14 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: "0.75rem", color: "#6B7280", display: "block", marginBottom: 2 }}>Ngân hàng thụ hưởng:</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem", background: "white" }}
                  >
                    {["Vietcombank", "MB Bank", "Techcombank", "ACB", "VPBank", "Vietinbank", "BIDV"].map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6B7280", display: "block", marginBottom: 2 }}>Số tài khoản:</label>
                    <input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6B7280", display: "block", marginBottom: 2 }}>Tên chủ tài khoản:</label>
                    <input
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.85rem", textTransform: "uppercase" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {refundMethod === "cash" && (
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, border: "1px solid var(--color-bone)", marginBottom: 14, fontSize: "0.8rem", color: "#4B5563" }}>
                Khách hàng nhận <strong>{fmt(refundAmount)}</strong> tiền mặt tại quầy và ký vào Phiếu chi hoàn cọc.
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Ghi chú hoàn cọc:</label>
              <input
                placeholder="Ví dụ: Hoàn cọc đơn thuê sau khi đối soát đầy đủ..."
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowRefundModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  const methodStr = refundMethod === "bank" ? `Chuyển khoản ${bankName} (${bankAccount} - ${bankHolder})` : "Tiền mặt tại quầy";
                  app.settleOrder(order.id, true, {
                    method: methodStr,
                    amount: refundAmount,
                    note: refundNote || `Hoàn cọc đơn thuê ${order.id} qua ${methodStr}`,
                  });
                  setShowRefundModal(false);
                }}
                style={{
                  background: "var(--color-forest)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                ✓ Xác nhận hoàn cọc → Khóa & Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ─── MODAL UC5.7: ĐIỀU CHỈNH TÀI CHÍNH SAU CHỐT ────────────────────────── */}
      {showAdjustmentModal && (
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10000, display: "grid", placeItems: "center", padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 540, width: "100%", padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <div className="modal-header flex justify-between items-center mb-4 pb-3 border-b border-bone">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#FEF3C7", color: "#B45309", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC5.7: ĐIỀU CHỈNH TÀI CHÍNH SAU CHỐT
                </span>
                <h3 className="modal-title font-bold text-base text-bark mt-1">
                  Lập hồ sơ sửa sai tài chính cho Đơn {order.id}
                </h3>
              </div>
              <button onClick={() => setShowAdjustmentModal(false)} className="btn btn-ghost btn-sm text-lg" style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: "0.8rem" }}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>Chứng từ gốc: <strong>{order.id} (Đã khóa)</strong></div>
                <div>Khách hàng: <strong>{order.customerName}</strong></div>
                <div>Cọc ban đầu: <strong>{fmt(depositCollected)}</strong></div>
                <div>Phụ phí đã chốt: <strong>{fmt(totalApprovedSurcharges)}</strong></div>
              </div>
              <div style={{ color: "#4B5563", fontSize: "0.75rem", borderTop: "1px dashed var(--color-bone)", paddingTop: 6 }}>
                💡 <em>Quy tắc bất biến: Hệ thống tạo chứng từ điều chỉnh bù trừ mới, KHÔNG ghi đè hoặc xóa số liệu đối soát gốc.</em>
              </div>
            </div>

            {adjMessage ? (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 16, textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: "1.4rem", color: "#16A34A", marginBottom: 6 }}>✓</div>
                <strong style={{ color: "#15803D", fontSize: "0.9rem" }}>{adjMessage}</strong>
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowAdjustmentModal(false)}
                    className="btn btn-primary btn-sm"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!adjReason.trim() || adjAmount <= 0) return;
                  app.saveFinancialAdjustment({
                    orderId: order.id,
                    type: adjType,
                    amount: adjAmount,
                    reason: adjReason,
                    status: "Đã duyệt",
                    createdBy: "Quản trị viên",
                    approvedBy: "Quản trị viên",
                  });
                  setAdjMessage(`Đã lập thành công chứng từ điều chỉnh bù trừ ${fmt(adjAmount)} cho đơn ${order.id}.`);
                }}
                className="flex flex-col gap-3"
              >
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Nghiệp vụ điều chỉnh bù trừ:
                  </label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as typeof adjType)}
                    className="form-select"
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
                  >
                    <option value="Hoàn trả">Hoàn trả thêm cho khách (Phát hiện trừ cọc thừa/đồ tìm thấy)</option>
                    <option value="Thu bù">Thu bù thêm tiền (Phát hiện hư hại phát sinh chưa tính đủ)</option>
                    <option value="Bù trừ chiết khấu">Bù trừ sai sót mã giảm giá/chính sách</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Số tiền chênh lệch cần điều chỉnh (đ): *
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(Number(e.target.value))}
                    required
                    className="form-input"
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.85rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Lý do sai lệch & Căn cứ điều chỉnh: *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="Ví dụ: Khách tìm thấy cọc lều bị sót và đem gửi trả lại vào ngày hôm sau, cửa hàng hoàn lại 50.000đ tiền phụ phí đã trừ..."
                    className="form-textarea"
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.8rem" }}
                  />
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-bone">
                  <button
                    type="button"
                    onClick={() => setShowAdjustmentModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{ background: "#B45309", borderColor: "#B45309", color: "white", fontWeight: 700 }}
                  >
                    Lưu chứng từ điều chỉnh (UC5.7)
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
