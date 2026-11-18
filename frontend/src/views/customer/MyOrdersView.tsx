import { useState } from "react";
import { useApp } from "../../App";
import { fmt, statusColors } from "../../store";

import { orderApi, paymentApi, type DonChiTietBackend, type PhieuBanGiaoKhachBackend, type XemTruocHuyBackend } from "../../services/api";
import { mapDonChiTietToOrder } from "../../services/mappers";

import { MyOrdersModals } from "./MyOrdersModals";
export function MyOrdersView() {
  const app = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelPreview, setCancelPreview] = useState<XemTruocHuyBackend | null>(null);
  const [cancelPreviewLoading, setCancelPreviewLoading] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [statusTab, setStatusTab] = useState<string>("Tất cả");
  const [viewingRecord, setViewingRecord] = useState<"bbbg" | "pnt" | "reconciliation" | null>(null);
  // UC5.2 Dòng 5.1: Khiếu nại phụ phí
  const [disputeSurchargeTarget, setDisputeSurchargeTarget] = useState<import("../../store").Surcharge | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // UC3.3 & UC5.5: Dữ liệu bàn giao, chính sách gắn với đơn & thu bổ sung đối soát
  const [rawOrderDetail, setRawOrderDetail] = useState<DonChiTietBackend | null>(null);
  const [orderHandovers, setOrderHandovers] = useState<PhieuBanGiaoKhachBackend[]>([]);
  const [orderPolicy, setOrderPolicy] = useState<Record<string, unknown> | null>(null);
  const [extraPayBusy, setExtraPayBusy] = useState(false);
  const [extraPayStatus, setExtraPayStatus] = useState<{ maYeuCau?: string; paymentUrl?: string | null; message: string } | null>(null);

  // Tab lọc đầy đủ trạng thái theo quy trình vòng đời đơn (UC3.3)
  const statusOptions = ["Tất cả", "Chờ thanh toán", "Đã xác nhận", "Đang thuê", "Hoàn tất", "Hết hạn", "Đã hủy"];

  const myOrders = app.orders.filter((o) => {
    if (statusTab === "Tất cả") return true;
    if (statusTab === "Đã hủy") return o.status === "Khách hủy" || o.status === "Cửa hàng hủy";
    return o.status === statusTab;
  });

  const detail = app.orders.find((o) => o.id === selected);
  const localCancellationQuote = cancelling ? app.getCancellationQuote(cancelling) : null;
  const cancellingOrder = cancelling ? app.orders.find((o) => o.id === cancelling) : null;

  const refreshOrderById = async (orderId: string | number) => {
    const numericId = Number(orderId);
    const dto = await orderApi.layChiTietDon(numericId);
    setRawOrderDetail(dto);
    app.upsertOrder?.(
      mapDonChiTietToOrder(dto, {
        customerId: app.currentUser?.id,
        customerName: app.currentUser?.name,
      })
    );
    // Tải song song biên bản bàn giao (UC3.3) và chính sách áp dụng tại thời điểm đặt đơn
    const [bgRes, csRes] = await Promise.allSettled([
      orderApi.layBanGiaoDon(numericId),
      orderApi.layChinhSachDon(numericId),
    ]);
    if (bgRes.status === "fulfilled") {
      setOrderHandovers(bgRes.value ?? []);
    } else {
      setOrderHandovers([]);
    }
    if (csRes.status === "fulfilled" && csRes.value && typeof csRes.value === "object") {
      setOrderPolicy(csRes.value as Record<string, unknown>);
    } else {
      setOrderPolicy(null);
    }
  };

  // Khi bấm vào 1 đơn ở realApi, tải full chi tiết chứng từ (BBBG, PNT, phụ phí, đối soát)
  const handleSelectOrder = async (orderId: string) => {
    if (selected === orderId) {
      setSelected(null);
      return;
    }
    setSelected(orderId);
    setActionError("");
    if (app.realApi) {
      setLoadingDetail(true);
      try {
        await refreshOrderById(orderId);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Không thể tải chi tiết đơn thuê.");
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  // Mở modal hủy và lấy báo giá hoàn tiền từ backend (UC3.4)
  const handleOpenCancel = async (orderId: string) => {
    setCancelling(orderId);
    setCancelReason("");
    setActionError("");
    setCancelPreview(null);
    if (!app.realApi) return;

    const target = app.orders.find((o) => o.id === orderId);
    if (target?.status === "Chờ thanh toán") return;

    setCancelPreviewLoading(true);
    try {
      const preview = await orderApi.xemTruocHuy(Number(orderId));
      setCancelPreview(preview);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể kiểm tra chính sách hủy đơn.");
    } finally {
      setCancelPreviewLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelling || !cancelReason.trim()) return;
    if (!app.realApi) {
      app.cancelOrder(cancelling, cancelReason);
      setCancelling(null);
      return;
    }
    setCancelSubmitting(true);
    setActionError("");
    try {
      if (cancellingOrder?.status === "Chờ thanh toán") {
        await orderApi.huyDonChuaThanhToan(Number(cancelling), cancelReason.trim());
      } else {
        await orderApi.khachHuyDon(Number(cancelling), {
          lyDo: cancelReason.trim(),
          xacNhanChiPhi: true,
          dauVanTayXemTruoc: cancelPreview?.dauVanTay ?? undefined,
        });
      }
      await refreshOrderById(cancelling);
      void app.refreshCatalog?.();
      setCancelling(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể hủy đơn thuê.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <div className="customer-container cp-container cp-container--1100">
      <div className="customer-page-header cp-page-header">
        <h1 className="customer-page-title">Đơn thuê của tôi (UC3.3)</h1>
        <p className="text-sm text-gray-500">
          Theo dõi tiến độ đơn, thời gian giữ chỗ 15 phút, tra cứu biên bản bàn giao BBBG, phiếu nhận trả PNT và bảng đối soát cọc.
        </p>
      </div>

      {/* Tabs lọc trạng thái đơn hàng (UC3.3) */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusOptions.map((st) => {
          const count = st === "Tất cả"
            ? app.orders.length
            : st === "Đã hủy"
            ? app.orders.filter((o) => o.status === "Khách hủy" || o.status === "Cửa hàng hủy").length
            : app.orders.filter((o) => o.status === st).length;
          return (
            <button
              key={st}
              onClick={() => setStatusTab(st)}
              className={`cp-status-tab ${statusTab === st ? "is-active" : ""}`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Bố cục tách 2 cột khi đã chọn 1 đơn để xem chi tiết */}
      <div className={`responsive-detail-grid grid gap-6 cp-orders-grid ${detail ? "has-detail" : ""}`}>
        {/* Cột danh sách các đơn */}
        <div className="flex flex-col gap-3">
          {myOrders.length === 0 ? (
            <div className="card-panel text-center py-12 text-gray-500 text-sm cp-card cp-card--empty">
              Không có đơn thuê nào ở trạng thái "{statusTab}".
            </div>
          ) : (
            myOrders.map((o) => {
              const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
              const isSelected = selected === o.id;

              return (
                <div
                  key={o.id}
                  onClick={() => void handleSelectOrder(o.id)}
                  className={`order-card cursor-pointer cp-order-card ${isSelected ? "is-selected" : ""}`}
                >
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-moss font-bold">{o.displayCode || o.id}</span>
                        <span className="cp-order-created">· Tạo lúc: {o.createdAt}</span>
                      </div>
                      <div className="font-bold text-bark my-1 text-sm">
                        {o.items.length > 0 ? o.items.map((i) => `${i.productName} ×${i.qty}`).join(", ") : `Đơn thuê ${o.displayCode || o.id}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        📅 Lịch nhận - trả: <strong>{o.pickupTime}</strong> → <strong>{o.returnTime}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        style={{ background: sc.bg, color: sc.text }}
                        className="badge mb-1 cp-order-status-badge"
                      >
                        {o.status}
                      </span>
                      <div className="font-mono font-bold text-forest text-sm">
                        {fmt(o.rental - o.discount + o.depositTotal)}
                      </div>

                      {/* Nút hành động nhanh cho đơn Chờ thanh toán */}
                      {o.status === "Chờ thanh toán" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            app.setNewOrderId(o.id);
                            app.setPage("order-confirmed");
                          }}
                          className="cp-order-pay-now-btn"
                        >
                          💳 Tiếp tục thanh toán (15p) →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panel Chi tiết đơn thuê (UC3.3) */}
        {detail && (
          <div className="card-panel self-start sticky top-24 cp-card cp-card--elevated cp-sticky-panel--header-offset">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-bone">
              <div>
                <div className="font-mono text-xs text-moss font-bold">{detail.displayCode || detail.id}</div>
                <h3 className="font-display font-bold text-base text-bark cp-order-detail-title">
                  Chi tiết đơn thuê & Chứng từ {loadingDetail ? "(Đang tải...)" : ""}
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="btn btn-ghost btn-sm text-gray-400 cp-order-detail-close"
              >
                ✕
              </button>
            </div>
            {actionError && !cancelling && !disputeSurchargeTarget && (
              <div role="alert" className="cp-alert-error cp-alert-error--sm">
                {actionError}
              </div>
            )}

            {/* Bảng kê thiết bị trong đơn */}
            <div className="cp-order-items-section">
              <div className="cp-order-items-heading">
                📦 Danh sách thiết bị ({detail.items.length} món):
              </div>
              <div className="cp-order-items-box">
                {detail.items.map((item, idx) => (
                  <div key={idx} className="cp-order-item-line">
                    <span>{item.productName} <strong>× {item.qty}</strong></span>
                    <span className="cp-order-item-price">{fmt(item.pricePerDay * item.qty * item.days)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bảng kê chi phí */}
            <div className="flex flex-col gap-2 mb-4 text-xs">
              {[
                ["Khách hàng nhận", detail.customerName],
                ["SĐT liên hệ", detail.customerPhone],
                ["Thời gian nhận đồ", detail.pickupTime],
                ["Thời gian trả đồ", detail.returnTime],
                ["Tiền thuê thiết bị", fmt(detail.rental)],
                ["Giảm giá ưu đãi", detail.discount > 0 ? `−${fmt(detail.discount)}` : "—"],
                ["Tiền cọc bảo đảm (Hoàn trả)", fmt(detail.depositTotal)],
                ["Tổng ban đầu", fmt(detail.rental - detail.discount + detail.depositTotal)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-dashed border-bone">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-semibold text-bark">{v}</span>
                </div>
              ))}
            </div>

            {/* UC5.2 & UC5.3: Khối phụ phí & bồi thường phát sinh */}
            {detail.surcharges && detail.surcharges.length > 0 && (
              <div className="cp-surcharge-box">
                <div className="flex justify-between items-center mb-2">
                  <strong className="cp-surcharge-title">
                    ⚠️ Khoản phụ phí phát sinh ({detail.surcharges.length} mục):
                  </strong>
                  <span className="cp-surcharge-uc-pill">
                    UC5.2 / UC5.3
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {detail.surcharges.map((sc) => {
                    // Ánh xạ 4 trạng thái hữu hạn của phụ phí sang lớp CSS tương ứng
                    const statusBadge =
                      sc.status === "Đã duyệt"
                        ? { cls: "cp-surcharge-badge--approved", label: "Đã duyệt" }
                        : sc.status === "Tranh chấp"
                        ? { cls: "cp-surcharge-badge--disputed", label: "Đang khiếu nại" }
                        : sc.status === "Từ chối"
                        ? { cls: "cp-surcharge-badge--rejected", label: "Đã hủy bỏ" }
                        : { cls: "cp-surcharge-badge--pending", label: "Chờ duyệt" };

                    return (
                      <div key={sc.id} className="cp-surcharge-card">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <strong>{sc.type}</strong> ({sc.equipmentId})
                            <div className="cp-surcharge-reason">{sc.reason}</div>
                          </div>
                          <div className="text-right">
                            <span className="cp-surcharge-amount">
                              +{fmt(sc.amount)}
                            </span>
                            {sc.originalAmount && sc.originalAmount > sc.amount && (
                              <div className="cp-surcharge-original">
                                {fmt(sc.originalAmount)}
                              </div>
                            )}
                            <div>
                              <span className={`cp-surcharge-badge ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Phản hồi khiếu nại của khách */}
                        {sc.customerResponse && (
                          <div className="cp-surcharge-response">
                            <strong>Ý kiến của bạn:</strong> "{sc.customerResponse}"
                          </div>
                        )}

                        {/* Kết luận của Quản trị viên */}
                        {sc.resolutionNote && (
                          <div className="cp-surcharge-resolution">
                            <strong>Quyết định QTV:</strong> {sc.resolutionNote}
                          </div>
                        )}

                        {/* Nút Khiếu nại phụ phí (Dòng 5.1 UC5.2) */}
                        {(sc.status === "Chờ duyệt" || sc.status === "Đã duyệt") && (
                          <div className="mt-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setDisputeSurchargeTarget(sc);
                                setDisputeReason("");
                              }}
                              className="cp-surcharge-dispute-btn"
                            >
                              ⚖️ Gửi khiếu nại mức phí này (Dòng phụ 5.1)
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Các nút xem chứng từ liên quan (BBBG - UC4.2, PNT - UC4.3, Đối soát - UC5.4) */}
            <div className="flex flex-col gap-2 mb-4">
              {detail.status === "Chờ thanh toán" && (
                <button
                  type="button"
                  onClick={() => {
                    app.setNewOrderId(detail.id);
                    app.setPage("order-confirmed");
                  }}
                  className="cp-doc-btn cp-doc-btn--pay"
                >
                  💳 Mở cổng VietQR thanh toán ngay (Thời hạn 15 phút) →
                </button>
              )}

              {detail.handoverRecord && (
                <button
                  onClick={() => setViewingRecord("bbbg")}
                  className="cp-doc-btn cp-doc-btn--bbbg"
                >
                  📋 Xem Biên bản bàn giao (BBBG - UC4.2)
                </button>
              )}

              {detail.returnReceipts && detail.returnReceipts.length > 0 && (
                <button
                  onClick={() => setViewingRecord("pnt")}
                  className="cp-doc-btn cp-doc-btn--pnt"
                >
                  📦 Xem Phiếu nhận trả ({detail.returnReceipts.length} đợt - UC4.3)
                </button>
              )}

              {/* Nút xem Bảng đối soát cọc và hoàn tất đơn (UC5.4) */}
              {(detail.reconciliation || detail.status === "Hoàn tất") && (
                <button
                  onClick={() => setViewingRecord("reconciliation")}
                  className="cp-doc-btn cp-doc-btn--reconcile"
                >
                  📑 Xem Bảng đối soát cọc & Hoàn tất đơn (UC5.4)
                </button>
              )}

              {/* UC5.5: Thanh toán khoản thu bổ sung khi đối soát phát sinh soTienCanThuThem > 0 */}
              {(() => {
                const latestDs = rawOrderDetail?.taiChinh?.doiSoat?.[0];
                const daThuBoSung = Number(rawOrderDetail?.taiChinh?.thu?.thuBoSungDaThu ?? 0);
                const canThuThem = Number(latestDs?.soTienCanThuThem ?? 0);
                const conPhaiThu = Math.max(0, canThuThem - daThuBoSung);
                if (!latestDs || conPhaiThu <= 0) return null;

                return (
                  <div className="cp-extra-pay-box">
                    <div className="cp-extra-pay-title">
                      💳 Cần thanh toán bổ sung sau đối soát: {fmt(conPhaiThu)}
                    </div>
                    <button
                      type="button"
                      disabled={extraPayBusy}
                      onClick={async () => {
                        setExtraPayBusy(true);
                        setActionError("");
                        try {
                          const yeuCau = await paymentApi.taoThuBoSung(latestDs.maDoiSoat, "VNPAY");
                          if (yeuCau.paymentUrl) {
                            window.open(yeuCau.paymentUrl, "_blank");
                          }
                          setExtraPayStatus({
                            maYeuCau: yeuCau.maYeuCau,
                            paymentUrl: yeuCau.paymentUrl,
                            message: yeuCau.paymentUrl
                              ? `Đã tạo yêu cầu thu bổ sung (${yeuCau.maYeuCau}). Vui lòng hoàn tất trên cổng thanh toán.`
                              : `Đã ghi nhận yêu cầu thu bổ sung (${yeuCau.maYeuCau}) - Trạng thái: ${yeuCau.trangThai}.`,
                          });
                          await refreshOrderById(detail.id);
                        } catch (err) {
                          setActionError(err instanceof Error ? err.message : "Không thể tạo giao dịch thu bổ sung.");
                        } finally {
                          setExtraPayBusy(false);
                        }
                      }}
                      className={`cp-extra-pay-btn ${extraPayBusy ? "is-busy" : ""}`}
                    >
                      {extraPayBusy ? "Đang khởi tạo giao dịch..." : `Thanh toán khoản thu bổ sung (${fmt(conPhaiThu)}) →`}
                    </button>
                    {extraPayStatus && (
                      <div className="cp-extra-pay-status">
                        <div>{extraPayStatus.message}</div>
                        {extraPayStatus.maYeuCau && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const st = await paymentApi.layTrangThaiGiaoDich(extraPayStatus.maYeuCau!);
                                setExtraPayStatus((prev) =>
                                  prev ? { ...prev, message: `Trạng thái giao dịch ${st.maYeuCau}: ${st.trangThai}` } : prev
                                );
                                await refreshOrderById(detail.id);
                              } catch {
                                /* bỏ qua lỗi kiểm tra tạm thời */
                              }
                            }}
                            className="cp-extra-pay-check-btn"
                          >
                            🔄 Kiểm tra trạng thái giao dịch
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Nút tắt viết đánh giá sản phẩm (UC9.1) */}
              {detail.status === "Hoàn tất" && (
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("geargo_profile_section", "reviews");
                    setSelected(null);
                    app.setPage("profile");
                  }}
                  className="cp-doc-btn cp-doc-btn--review"
                >
                  ⭐ Viết đánh giá trải nghiệm sản phẩm (UC9.1) →
                </button>
              )}
            </div>

            {/* UC3.3: Thông tin bàn giao & Chính sách áp dụng tại thời điểm đặt */}
            {app.realApi && (orderHandovers.length > 0 || orderPolicy) && (
              <div className="cp-order-meta-stack">
                {orderHandovers.length > 0 && (
                  <div className="cp-order-handover-box">
                    <div className="cp-order-handover-title">
                      🤝 Biên bản bàn giao từ cửa hàng ({orderHandovers.length} phiếu)
                    </div>
                    {orderHandovers.map((bg) => (
                      <div key={bg.maPhieuBanGiao} className="cp-order-handover-entry">
                        <div className="cp-order-handover-row">
                          <span>Trạng thái: <strong>{bg.trangThai}</strong></span>
                          {bg.thoiDiemGiaoThucTe && (
                            <span>{new Date(bg.thoiDiemGiaoThucTe).toLocaleString("vi-VN")}</span>
                          )}
                        </div>
                        {bg.chiTiet?.length > 0 && (
                          <div className="cp-order-handover-items">
                            {bg.chiTiet.map((ct) => (
                              <div key={ct.maChiTietBanGiao} className="cp-order-handover-item">
                                • {ct.tenSanPham} ({ct.maThietBiHienThi}) — {ct.tinhTrangTruocThue || "Đạt chuẩn"}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {orderPolicy && (
                  <div className="cp-order-policy-box">
                    <div className="cp-order-policy-title">
                      📜 Chính sách áp dụng: {String(orderPolicy.tenChinhSach || "Chính sách thuê GearGo")}
                      {orderPolicy.phienBan ? ` (v${String(orderPolicy.phienBan)})` : ""}
                    </div>
                    <div className="cp-order-policy-desc">
                      {Boolean((orderPolicy.noiDung as Record<string, unknown> | undefined)?.thoiGianGiuChoPhut) && (
                        <span>
                          Giữ chỗ: {String((orderPolicy.noiDung as Record<string, unknown>).thoiGianGiuChoPhut)} phút ·{" "}
                        </span>
                      )}
                      {Boolean((orderPolicy.noiDung as Record<string, unknown> | undefined)?.heSoTre) && (
                        <span>
                          Hệ số trễ: ×{String((orderPolicy.noiDung as Record<string, unknown>).heSoTre)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lịch sử trạng thái */}
            <div className="mb-4">
              <div className="text-xs font-bold text-bark mb-2">Lịch sử tiến trình đơn</div>
              <div className="cp-order-history-scroll">
                {detail.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="badge badge-neutral text-xs cp-order-history-badge">{h.status}</span>
                    <span className="text-gray-400 text-xs">{h.at} · {h.by}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nút Hủy đơn cho mọi trạng thái trước bàn giao (UC3.4) */}
            {["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(detail.status) && (
              <button
                onClick={() => void handleOpenCancel(detail.id)}
                className="btn btn-danger btn-sm btn-full cp-btn-order-cancel"
              >
                Yêu cầu hủy đơn thuê (UC3.4)
              </button>
            )}

            {detail.status === "Hoàn tất" && (
              <button
                onClick={() => {
                  app.setPage("profile");
                }}
                className="btn btn-primary btn-sm btn-full cp-btn-order-review"
              >
                ⭐ Viết đánh giá trải nghiệm (UC9.1)
              </button>
            )}
          </div>
        )}
      </div>

      <MyOrdersModals
        app={app}
        detail={detail}
        disputeSurchargeTarget={disputeSurchargeTarget}
        setDisputeSurchargeTarget={setDisputeSurchargeTarget}
        disputeReason={disputeReason}
        setDisputeReason={setDisputeReason}
        disputeSubmitting={disputeSubmitting}
        setDisputeSubmitting={setDisputeSubmitting}
        actionError={actionError}
        setActionError={setActionError}
        refreshOrderById={refreshOrderById}
        viewingRecord={viewingRecord}
        setViewingRecord={setViewingRecord}
        cancelling={cancelling}
        setCancelling={setCancelling}
        cancellingOrder={cancellingOrder}
        cancelPreview={cancelPreview}
        localCancellationQuote={localCancellationQuote}
        cancelPreviewLoading={cancelPreviewLoading}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        cancelSubmitting={cancelSubmitting}
        handleConfirmCancel={handleConfirmCancel}
      />
    </div>
  );
}

// ─── AI Advisor (Tư vấn bộ đồ thông minh & Combo mẫu - UC2.4, UC2.4.1, UC2.4.2) ───
