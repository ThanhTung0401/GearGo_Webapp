import type React from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { fmt, Order, ReturnReceipt } from "../../../store";
import {
  type NhanTraBackend,
  type ChiTietNhanTraBackend,
  type NhatKyLienHeQuaHanBackend,
} from "../../../services/api";

interface ReturnTabModalsProps {
  app: ReturnType<typeof useApp>;
  order: Order | null;
  viewingBackendReceipt: NhanTraBackend | null;
  setViewingBackendReceipt: (v: NhanTraBackend | null) => void;
  viewingReceipt: ReturnReceipt | null;
  setViewingReceipt: React.Dispatch<React.SetStateAction<ReturnReceipt | null>>;
  returnBusy: boolean;
  setReturnSuccess: (v: string | null) => void;
  contactNotice: string | null;
  setApproveLostTarget: (v: { phieuId: number; chiTiet: ChiTietNhanTraBackend } | null) => void;
  approveLostTarget: { phieuId: number; chiTiet: ChiTietNhanTraBackend } | null;
  lostApproveReason: string;
  setLostApproveReason: (v: string) => void;
  lostCompAmount: number;
  setLostCompAmount: (v: number) => void;
  lostBienBan: string;
  setLostBienBan: (v: string) => void;
  handleSplitPendingLine: (phieuId: number, chiTietId: number) => Promise<void>;
  handleCloseBackendReceipt: (phieuId: number) => Promise<void>;
  handleConfirmApproveLost: () => Promise<void>;
  showContactModal: boolean;
  setShowContactModal: (v: boolean) => void;
  contactLogsBackend: NhatKyLienHeQuaHanBackend[];
  contactOutcome: "Hẹn giờ trả mới" | "Xin gia hạn thêm" | "Không nghe máy" | "Khách báo mất";
  setContactOutcome: (v: "Hẹn giờ trả mới" | "Xin gia hạn thêm" | "Không nghe máy" | "Khách báo mất") => void;
  newExpectedTime: string;
  setNewExpectedTime: (v: string) => void;
  contactNote: string;
  setContactNote: (v: string) => void;
  handleSaveContactLog: () => Promise<void>;
}

export function ReturnTabModals({
  app,
  order,
  viewingBackendReceipt,
  setViewingBackendReceipt,
  viewingReceipt,
  setViewingReceipt,
  returnBusy,
  setReturnSuccess,
  contactNotice,
  setApproveLostTarget,
  approveLostTarget,
  lostApproveReason,
  setLostApproveReason,
  lostCompAmount,
  setLostCompAmount,
  lostBienBan,
  setLostBienBan,
  handleSplitPendingLine,
  handleCloseBackendReceipt,
  handleConfirmApproveLost,
  showContactModal,
  setShowContactModal,
  contactLogsBackend,
  contactOutcome,
  setContactOutcome,
  newExpectedTime,
  setNewExpectedTime,
  contactNote,
  setContactNote,
  handleSaveContactLog,
}: ReturnTabModalsProps) {
  return (
    <>
        {/* Modal xem chi tiết Phiếu Nhận Trả Backend */}
        {viewingBackendReceipt && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
            <div style={{ background: "white", borderRadius: 16, maxWidth: 640, width: "100%", padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span style={{ fontSize: "0.72rem", background: viewingBackendReceipt.laLanTraCuoi ? "#DCFCE7" : "#FFF7ED", color: viewingBackendReceipt.laLanTraCuoi ? "#15803D" : "#C2410C", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    {viewingBackendReceipt.laLanTraCuoi ? "LẦN NHẬN TRẢ CUỐI CÙNG" : `PHIẾU NHẬN TRẢ ĐỢT ${viewingBackendReceipt.lanTra}`}
                  </span>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--color-bark)", marginTop: 4 }}>
                    Phiếu Nhận Trả: {viewingBackendReceipt.maPhieuHienThi}
                  </h3>
                </div>
                <button onClick={() => setViewingBackendReceipt(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.82rem", marginBottom: 14 }}>
                <div><strong>Đơn thuê:</strong> {order?.displayCode || viewingBackendReceipt.maDonThue}</div>
                <div><strong>Thời điểm lập / chốt:</strong> {viewingBackendReceipt.thoiDiemChot || viewingBackendReceipt.thoiDiemLap}</div>
                <div><strong>Nhân viên nhận:</strong> {viewingBackendReceipt.tenNhanVienLucNhan || "Nhân viên kho"}</div>
                <div><strong>Trạng thái:</strong> {viewingBackendReceipt.trangThai} · Còn nợ sau phiếu: {viewingBackendReceipt.soThietBiConNo} chiếc</div>
                <div><strong>Ghi chú:</strong> {viewingBackendReceipt.ghiChu || "Không có"}</div>
              </div>

              <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>Chi tiết thiết bị trong phiếu:</strong>
              <div className="flex flex-col gap-2 mt-2 mb-4">
                {viewingBackendReceipt.chiTiet.map((ct) => {
                  const isLost = ct.ketLuan === "MatThietBi";
                  const lostApproved = Boolean(ct.thoiDiemDuyetMat);
                  const canSplit = viewingBackendReceipt.trangThai !== "DaChot" && viewingBackendReceipt.chiTiet.length > 1;
                  return (
                    <div key={ct.maChiTietNhanTra} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>
                          {ct.maThietBiHienThi}
                        </strong>{" "}
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{ct.tenSanPham}</span>
                        <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                          Kết luận: <strong>{ct.tinhTrangSauThue || ct.ketLuan || "Chưa kết luận"}</strong>
                          {ct.ghiChu ? ` · ${ct.ghiChu}` : ""}
                        </div>
                        {lostApproved && (
                          <div style={{ fontSize: "0.72rem", color: "#15803D", fontWeight: 600 }}>
                            ✓ Đã duyệt mất bởi {ct.tenNguoiDuyetMat || "Quản trị viên"}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLost && !lostApproved && (
                          <button
                            disabled={returnBusy}
                            onClick={() => {
                              setApproveLostTarget({ phieuId: viewingBackendReceipt.maPhieu, chiTiet: ct });
                              setLostBienBan(ct.bienBanMat || `Biên bản mất thiết bị ${ct.maThietBiHienThi}`);
                              const prod = app.products.find((p) => p.name === ct.tenSanPham);
                              setLostCompAmount(prod?.compensation || 1000000);
                            }}
                            style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Duyệt mất
                          </button>
                        )}
                        {canSplit && (
                          <button
                            disabled={returnBusy}
                            onClick={() => handleSplitPendingLine(viewingBackendReceipt.maPhieu, ct.maChiTietNhanTra)}
                            style={{ background: "white", color: "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            Tách chờ xử lý
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2">
                {viewingBackendReceipt.trangThai !== "DaChot" && (
                  <button
                    disabled={returnBusy}
                    onClick={() => handleCloseBackendReceipt(viewingBackendReceipt.maPhieu)}
                    style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}
                  >
                    ✓ Chốt phiếu nhận trả
                  </button>
                )}
                <button onClick={() => window.print()} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>
                  In phiếu
                </button>
                <button onClick={() => setViewingBackendReceipt(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Duyệt kết luận mất thiết bị */}
        {approveLostTarget && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 10000, display: "grid", placeItems: "center", padding: 20 }}>
            <div style={{ background: "white", borderRadius: 14, maxWidth: 460, width: "100%", padding: 22 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)", marginBottom: 8 }}>
                Duyệt kết luận mất: {approveLostTarget.chiTiet.maThietBiHienThi}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 12 }}>
                Thao tác này ghi nhận thiết bị thất lạc vĩnh viễn và liên kết phụ phí bồi thường vào phiếu nhận trả.
              </p>
              <label style={{ fontSize: "0.76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Biên bản xác nhận mất</label>
              <input
                value={lostBienBan}
                onChange={(e) => setLostBienBan(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.82rem", marginBottom: 10 }}
              />
              <label style={{ fontSize: "0.76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Số tiền bồi thường đề nghị (đ)</label>
              <input
                type="number"
                value={lostCompAmount}
                onChange={(e) => setLostCompAmount(Number(e.target.value))}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.85rem", fontFamily: "var(--font-mono)", marginBottom: 10 }}
              />
              <label style={{ fontSize: "0.76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Lý do duyệt</label>
              <textarea
                rows={2}
                value={lostApproveReason}
                onChange={(e) => setLostApproveReason(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.82rem", marginBottom: 14 }}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setApproveLostTarget(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem" }}>
                  Hủy
                </button>
                <button
                  disabled={returnBusy}
                  onClick={handleConfirmApproveLost}
                  style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
                >
                  {returnBusy ? "Đang duyệt..." : "Xác nhận duyệt mất"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal xem chi tiết Phiếu Nhận Trả PNT-... (Mock mode) */}
        {viewingReceipt && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
            <div style={{ background: "white", borderRadius: 16, maxWidth: 580, width: "100%", padding: 24 }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span style={{ fontSize: "0.72rem", background: viewingReceipt.isFinalReturn ? "#DCFCE7" : "#FFF7ED", color: viewingReceipt.isFinalReturn ? "#15803D" : "#C2410C", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    {viewingReceipt.isFinalReturn ? "LẦN NHẬN TRẢ CUỐI CÙNG" : `PHIẾU NHẬN TRẢ ĐỢT ${viewingReceipt.returnRound}`}
                  </span>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--color-bark)", marginTop: 4 }}>
                    Phiếu Nhận Trả: {viewingReceipt.id}
                  </h3>
                </div>
                <button onClick={() => setViewingReceipt(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.82rem", marginBottom: 14 }}>
                <div><strong>Mã đơn thuê:</strong> {viewingReceipt.orderId}</div>
                <div><strong>Thời gian nhận:</strong> {viewingReceipt.returnedAt}</div>
                <div><strong>Nhân viên nhận:</strong> {viewingReceipt.staffName}</div>
                <div><strong>Ghi chú:</strong> {viewingReceipt.note || "Không có"}</div>
              </div>

              <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>Chi tiết thiết bị nhận trong đợt này:</strong>
              <div className="flex flex-col gap-2 mt-2 mb-4">
                {viewingReceipt.items.map((it) => (
                  <div key={it.equipmentId} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{it.equipmentId}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Tình trạng: <strong>{it.condition}</strong> {it.note ? `(${it.note})` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {it.condition === "Mất thiết bị" && !it.lostApproved && (
                        <button
                          onClick={() => {
                            const res = app.approveLostEquipment(viewingReceipt.orderId, it.equipmentId, "Quản trị viên");
                            if (res.ok) {
                              setReturnSuccess(`Đã duyệt kết luận mất cho thiết bị ${it.equipmentId}.`);
                              setViewingReceipt((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      items: prev.items.map((x) =>
                                        x.equipmentId === it.equipmentId ? { ...x, lostApproved: true } : x
                                      ),
                                    }
                                  : null
                              );
                            }
                          }}
                          style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          Duyệt mất
                        </button>
                      )}
                      {it.surchargeAmount > 0 && (
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626", fontSize: "0.85rem" }}>
                          +{fmt(it.surchargeAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => window.print()} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>
                  In phiếu
                </button>
                <button onClick={() => setViewingReceipt(null)} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nhật ký cuộc gọi & Xử lý quá hạn (UC4.4) */}
        {showContactModal && order && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
            <div style={{ background: "white", borderRadius: 16, maxWidth: 620, width: "100%", padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span style={{ fontSize: "0.72rem", background: "#FEE2E2", color: "#DC2626", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    XỬ LÝ ĐƠN QUÁ HẠN (UC4.4)
                  </span>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                    Nhật ký liên hệ đơn {order.displayCode || order.id}
                  </h3>
                  <div style={{ fontSize: "0.82rem", color: "#4B5563" }}>
                    Khách hàng: <strong>{order.customerName}</strong> {order.customerPhone ? `(${order.customerPhone})` : ""}
                  </div>
                </div>
                <button onClick={() => setShowContactModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>

              {contactNotice && (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.8rem" }}>
                  {contactNotice}
                </div>
              )}

              {/* Lịch sử các cuộc gọi trước */}
              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>
                  Lịch sử các lần liên hệ ({((app.realApi || isRealApiEnabled()) ? contactLogsBackend.length : order.contactLogs?.length) || 0} lần):
                </strong>
                <div className="flex flex-col gap-2 mt-2" style={{ maxHeight: 180, overflowY: "auto" }}>
                  {((app.realApi || isRealApiEnabled()) ? contactLogsBackend.length === 0 : (order.contactLogs?.length || 0) === 0) ? (
                    <div style={{ fontSize: "0.8rem", color: "#9CA3AF", fontStyle: "italic", background: "#F9FAFB", padding: "8px 12px", borderRadius: 6 }}>
                      Chưa có lịch sử liên hệ nào. Vui lòng ghi lại kết quả cuộc gọi bên dưới.
                    </div>
                  ) : (app.realApi || isRealApiEnabled()) ? (
                    contactLogsBackend.map((log) => (
                      <div key={log.maNhatKyLienHe} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px" }}>
                        <div className="flex justify-between items-center mb-1">
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-forest)" }}>
                            {log.tenNguoiLienHe} · {new Date(log.thoiDiemLienHe).toLocaleString("vi-VN")}
                          </span>
                          <span style={{ fontSize: "0.7rem", background: "#FEF3C7", color: "#B45309", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                            {log.ketQua}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#374151" }}>{log.noiDung}</div>
                        {log.henTraMoi && (
                          <div style={{ fontSize: "0.72rem", color: "#1D4ED8", marginTop: 2 }}>
                            Khách hẹn trả mới: <strong>{new Date(log.henTraMoi).toLocaleString("vi-VN")}</strong>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    order.contactLogs?.map((log) => (
                      <div key={log.id} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px" }}>
                        <div className="flex justify-between items-center mb-1">
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-forest)" }}>
                            {log.staffName} · {log.contactedAt}
                          </span>
                          <span style={{ fontSize: "0.7rem", background: "#FEF3C7", color: "#B45309", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                            {log.outcome}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#374151" }}>{log.note}</div>
                        {log.newExpectedTime && (
                          <div style={{ fontSize: "0.72rem", color: "#1D4ED8", marginTop: 2 }}>
                            Khách hẹn trả mới: <strong>{log.newExpectedTime}</strong>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Form ghi nhận lần gọi mới */}
              <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", marginBottom: 16 }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)", display: "block", marginBottom: 8 }}>
                  + Ghi nhận cuộc gọi mới trong ca trực:
                </strong>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Kết quả liên hệ *</label>
                    <select
                      value={contactOutcome}
                      onChange={(e) => setContactOutcome(e.target.value as typeof contactOutcome)}
                      style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 8px", fontSize: "0.82rem", background: "white" }}
                    >
                      <option value="Hẹn giờ trả mới">Khách hẹn giờ trả mới</option>
                      <option value="Xin gia hạn thêm">Khách xin gia hạn thuê thêm</option>
                      <option value="Không nghe máy">Không nghe máy / Thuê bao</option>
                      <option value="Khách báo mất">Khách báo mất thiết bị</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Hạn hẹn mới (nếu có)</label>
                    <input
                      type={(app.realApi || isRealApiEnabled()) ? "datetime-local" : "text"}
                      placeholder="VD: 18:00 ngày mai"
                      value={newExpectedTime}
                      onChange={(e) => setNewExpectedTime(e.target.value)}
                      style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 8px", fontSize: "0.82rem", background: "white" }}
                    />
                  </div>
                </div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Ghi chú nội dung cuộc gọi *</label>
                <textarea
                  placeholder="Ghi rõ lý do trễ, cam kết của khách..."
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  rows={2}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 8px", fontSize: "0.82rem", background: "white", resize: "none" }}
                />
                <button
                  type="button"
                  disabled={returnBusy}
                  onClick={() => void handleSaveContactLog()}
                  style={{ marginTop: 8, background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                >
                  {returnBusy ? "Đang lưu..." : "Lưu vào lịch sử liên hệ"}
                </button>
              </div>

              <div className="flex justify-end">
                <button onClick={() => setShowContactModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
