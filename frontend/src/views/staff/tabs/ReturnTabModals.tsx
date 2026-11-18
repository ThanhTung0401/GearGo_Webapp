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
          <div className="so-modal-overlay">
            <div className="so-modal-card-640">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`so-modal-tag is-pill ${viewingBackendReceipt.laLanTraCuoi ? "is-green" : "is-orange"}`}>
                    {viewingBackendReceipt.laLanTraCuoi ? "LẦN NHẬN TRẢ CUỐI CÙNG" : `PHIẾU NHẬN TRẢ ĐỢT ${viewingBackendReceipt.lanTra}`}
                  </span>
                  <h3 className="so-modal-title">
                    Phiếu Nhận Trả: {viewingBackendReceipt.maPhieuHienThi}
                  </h3>
                </div>
                <button onClick={() => setViewingBackendReceipt(null)} className="so-modal-close-sm">✕</button>
              </div>

              <div className="so-info-box">
                <div><strong>Đơn thuê:</strong> {order?.displayCode || viewingBackendReceipt.maDonThue}</div>
                <div><strong>Thời điểm lập / chốt:</strong> {viewingBackendReceipt.thoiDiemChot || viewingBackendReceipt.thoiDiemLap}</div>
                <div><strong>Nhân viên nhận:</strong> {viewingBackendReceipt.tenNhanVienLucNhan || "Nhân viên kho"}</div>
                <div><strong>Trạng thái:</strong> {viewingBackendReceipt.trangThai} · Còn nợ sau phiếu: {viewingBackendReceipt.soThietBiConNo} chiếc</div>
                <div><strong>Ghi chú:</strong> {viewingBackendReceipt.ghiChu || "Không có"}</div>
              </div>

              <strong className="so-receipt-section-label">Chi tiết thiết bị trong phiếu:</strong>
              <div className="flex flex-col gap-2 mt-2 mb-4">
                {viewingBackendReceipt.chiTiet.map((ct) => {
                  const isLost = ct.ketLuan === "MatThietBi";
                  const lostApproved = Boolean(ct.thoiDiemDuyetMat);
                  const canSplit = viewingBackendReceipt.trangThai !== "DaChot" && viewingBackendReceipt.chiTiet.length > 1;
                  return (
                    <div key={ct.maChiTietNhanTra} className="so-receipt-item-row">
                      <div>
                        <strong className="so-receipt-item-code">
                          {ct.maThietBiHienThi}
                        </strong>{" "}
                        <span className="so-receipt-item-name">{ct.tenSanPham}</span>
                        <div className="so-receipt-item-meta">
                          Kết luận: <strong>{ct.tinhTrangSauThue || ct.ketLuan || "Chưa kết luận"}</strong>
                          {ct.ghiChu ? ` · ${ct.ghiChu}` : ""}
                        </div>
                        {lostApproved && (
                          <div className="so-receipt-item-approved">
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
                            className="so-btn-danger-tiny"
                          >
                            Duyệt mất
                          </button>
                        )}
                        {canSplit && (
                          <button
                            disabled={returnBusy}
                            onClick={() => handleSplitPendingLine(viewingBackendReceipt.maPhieu, ct.maChiTietNhanTra)}
                            className="so-btn-outline-split"
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
                    className="so-btn-primary-sm-rounded"
                  >
                    ✓ Chốt phiếu nhận trả
                  </button>
                )}
                <button onClick={() => window.print()} className="so-btn-outline-print-sm">
                  In phiếu
                </button>
                <button onClick={() => setViewingBackendReceipt(null)} className="so-btn-cancel-bold">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Duyệt kết luận mất thiết bị */}
        {approveLostTarget && (
          <div className="so-modal-overlay is-top">
            <div className="so-modal-card-lost">
              <h3 className="so-modal-title-xs">
                Duyệt kết luận mất: {approveLostTarget.chiTiet.maThietBiHienThi}
              </h3>
              <p className="so-modal-desc-sm">
                Thao tác này ghi nhận thiết bị thất lạc vĩnh viễn và liên kết phụ phí bồi thường vào phiếu nhận trả.
              </p>
              <label className="so-field-label-xs">Biên bản xác nhận mất</label>
              <input
                value={lostBienBan}
                onChange={(e) => setLostBienBan(e.target.value)}
                className="so-input-mb10-sm"
              />
              <label className="so-field-label-xs">Số tiền bồi thường đề nghị (đ)</label>
              <input
                type="number"
                value={lostCompAmount}
                onChange={(e) => setLostCompAmount(Number(e.target.value))}
                className="so-input-mono-mb10"
              />
              <label className="so-field-label-xs">Lý do duyệt</label>
              <textarea
                rows={2}
                value={lostApproveReason}
                onChange={(e) => setLostApproveReason(e.target.value)}
                className="so-textarea-mb14"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setApproveLostTarget(null)} className="so-btn-cancel-sm">
                  Hủy
                </button>
                <button
                  disabled={returnBusy}
                  onClick={handleConfirmApproveLost}
                  className="so-btn-danger-modal-md"
                >
                  {returnBusy ? "Đang duyệt..." : "Xác nhận duyệt mất"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal xem chi tiết Phiếu Nhận Trả PNT-... (Mock mode) */}
        {viewingReceipt && (
          <div className="so-modal-overlay">
            <div className="so-modal-card-580">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`so-modal-tag is-pill ${viewingReceipt.isFinalReturn ? "is-green" : "is-orange"}`}>
                    {viewingReceipt.isFinalReturn ? "LẦN NHẬN TRẢ CUỐI CÙNG" : `PHIẾU NHẬN TRẢ ĐỢT ${viewingReceipt.returnRound}`}
                  </span>
                  <h3 className="so-modal-title">
                    Phiếu Nhận Trả: {viewingReceipt.id}
                  </h3>
                </div>
                <button onClick={() => setViewingReceipt(null)} className="so-modal-close-sm">✕</button>
              </div>

              <div className="so-info-box">
                <div><strong>Mã đơn thuê:</strong> {viewingReceipt.orderId}</div>
                <div><strong>Thời gian nhận:</strong> {viewingReceipt.returnedAt}</div>
                <div><strong>Nhân viên nhận:</strong> {viewingReceipt.staffName}</div>
                <div><strong>Ghi chú:</strong> {viewingReceipt.note || "Không có"}</div>
              </div>

              <strong className="so-receipt-section-label">Chi tiết thiết bị nhận trong đợt này:</strong>
              <div className="flex flex-col gap-2 mt-2 mb-4">
                {viewingReceipt.items.map((it) => (
                  <div key={it.equipmentId} className="so-receipt-item-row-sm">
                    <div>
                      <strong className="so-receipt-item-code">{it.equipmentId}</strong>
                      <div className="so-receipt-item-meta">Tình trạng: <strong>{it.condition}</strong> {it.note ? `(${it.note})` : ""}</div>
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
                          className="so-btn-danger-mock"
                        >
                          Duyệt mất
                        </button>
                      )}
                      {it.surchargeAmount > 0 && (
                        <span className="so-receipt-item-fee">
                          +{fmt(it.surchargeAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => window.print()} className="so-btn-outline-print-sm">
                  In phiếu
                </button>
                <button onClick={() => setViewingReceipt(null)} className="so-btn-primary-md">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nhật ký cuộc gọi & Xử lý quá hạn (UC4.4) */}
        {showContactModal && order && (
          <div className="so-modal-overlay">
            <div className="so-modal-card-620">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="so-modal-tag is-pill is-red">
                    XỬ LÝ ĐƠN QUÁ HẠN (UC4.4)
                  </span>
                  <h3 className="so-modal-title-sm">
                    Nhật ký liên hệ đơn {order.displayCode || order.id}
                  </h3>
                  <div className="so-modal-sub-dark">
                    Khách hàng: <strong>{order.customerName}</strong> {order.customerPhone ? `(${order.customerPhone})` : ""}
                  </div>
                </div>
                <button onClick={() => setShowContactModal(false)} className="so-modal-close-sm">✕</button>
              </div>

              {contactNotice && (
                <div className="so-alert-success-sm">
                  {contactNotice}
                </div>
              )}

              {/* Lịch sử các cuộc gọi trước */}
              <div className="so-field-group-lg">
                <strong className="so-receipt-section-label">
                  Lịch sử các lần liên hệ ({((app.realApi || isRealApiEnabled()) ? contactLogsBackend.length : order.contactLogs?.length) || 0} lần):
                </strong>
                <div className="flex flex-col gap-2 mt-2 so-contact-log-list">
                  {((app.realApi || isRealApiEnabled()) ? contactLogsBackend.length === 0 : (order.contactLogs?.length || 0) === 0) ? (
                    <div className="so-contact-log-empty">
                      Chưa có lịch sử liên hệ nào. Vui lòng ghi lại kết quả cuộc gọi bên dưới.
                    </div>
                  ) : (app.realApi || isRealApiEnabled()) ? (
                    contactLogsBackend.map((log) => (
                      <div key={log.maNhatKyLienHe} className="so-contact-log-card">
                        <div className="flex justify-between items-center mb-1">
                          <span className="so-contact-log-actor">
                            {log.tenNguoiLienHe} · {new Date(log.thoiDiemLienHe).toLocaleString("vi-VN")}
                          </span>
                          <span className="so-contact-log-outcome">
                            {log.ketQua}
                          </span>
                        </div>
                        <div className="so-contact-log-note">{log.noiDung}</div>
                        {log.henTraMoi && (
                          <div className="so-contact-log-expected">
                            Khách hẹn trả mới: <strong>{new Date(log.henTraMoi).toLocaleString("vi-VN")}</strong>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    order.contactLogs?.map((log) => (
                      <div key={log.id} className="so-contact-log-card">
                        <div className="flex justify-between items-center mb-1">
                          <span className="so-contact-log-actor">
                            {log.staffName} · {log.contactedAt}
                          </span>
                          <span className="so-contact-log-outcome">
                            {log.outcome}
                          </span>
                        </div>
                        <div className="so-contact-log-note">{log.note}</div>
                        {log.newExpectedTime && (
                          <div className="so-contact-log-expected">
                            Khách hẹn trả mới: <strong>{log.newExpectedTime}</strong>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Form ghi nhận lần gọi mới */}
              <div className="so-contact-form-box">
                <strong className="so-contact-form-title">
                  + Ghi nhận cuộc gọi mới trong ca trực:
                </strong>
                <div className="so-modal-grid-2-tight">
                  <div>
                    <label className="so-field-label-muted">Kết quả liên hệ *</label>
                    <select
                      value={contactOutcome}
                      onChange={(e) => setContactOutcome(e.target.value as typeof contactOutcome)}
                      className="so-input-contact"
                    >
                      <option value="Hẹn giờ trả mới">Khách hẹn giờ trả mới</option>
                      <option value="Xin gia hạn thêm">Khách xin gia hạn thuê thêm</option>
                      <option value="Không nghe máy">Không nghe máy / Thuê bao</option>
                      <option value="Khách báo mất">Khách báo mất thiết bị</option>
                    </select>
                  </div>
                  <div>
                    <label className="so-field-label-muted">Hạn hẹn mới (nếu có)</label>
                    <input
                      type={(app.realApi || isRealApiEnabled()) ? "datetime-local" : "text"}
                      placeholder="VD: 18:00 ngày mai"
                      value={newExpectedTime}
                      onChange={(e) => setNewExpectedTime(e.target.value)}
                      className="so-input-contact"
                    />
                  </div>
                </div>
                <label className="so-field-label-muted">Ghi chú nội dung cuộc gọi *</label>
                <textarea
                  placeholder="Ghi rõ lý do trễ, cam kết của khách..."
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  rows={2}
                  className="so-textarea-contact"
                />
                <button
                  type="button"
                  disabled={returnBusy}
                  onClick={() => void handleSaveContactLog()}
                  className="so-btn-primary-contact"
                >
                  {returnBusy ? "Đang lưu..." : "Lưu vào lịch sử liên hệ"}
                </button>
              </div>

              <div className="flex justify-end">
                <button onClick={() => setShowContactModal(false)} className="so-btn-cancel-close">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
