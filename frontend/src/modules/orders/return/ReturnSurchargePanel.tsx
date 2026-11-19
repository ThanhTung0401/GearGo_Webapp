import { useApp } from "../../../context/AppContext";
import type { Surcharge } from "../../../types";
import { fmt, Order } from "../../../store";
import ReconciliationSheet from "../ReconciliationSheet";

interface ReturnSurchargePanelProps {
  app: ReturnType<typeof useApp>;
  order: Order;
  displaySurcharges: Surcharge[];
  returnBusy: boolean;
  rejectingSurchargeId: string | null;
  setRejectingSurchargeId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  onApproveSurcharge: (s: Surcharge) => Promise<void>;
  onRejectSurcharge: (s: Surcharge) => Promise<void>;
  onAfterReconcileMutation: () => Promise<void>;
}

// Danh sách phụ phí bồi thường/trễ hạn (duyệt/từ chối) và bảng Đối soát cọc sau nhận trả
export function ReturnSurchargePanel({
  app,
  order,
  displaySurcharges,
  returnBusy,
  rejectingSurchargeId,
  setRejectingSurchargeId,
  rejectReason,
  setRejectReason,
  onApproveSurcharge,
  onRejectSurcharge,
  onAfterReconcileMutation,
}: ReturnSurchargePanelProps) {
  return (
    <>
      {/* Danh sách phụ phí đã đề xuất */}
      {displaySurcharges.length > 0 && (
        <div className="so-card-panel-lg">
          <h4 className="so-sub-heading-md">Phụ phí bồi thường & trễ hạn</h4>
          {displaySurcharges.map((s) => {
            /* Ánh xạ trạng thái duyệt phụ phí sang modifier CSS hữu hạn */
            const surchargeMod =
              s.status === "Đã duyệt"
                ? "is-approved"
                : s.status === "Từ chối"
                ? "is-rejected"
                : "is-pending";
            return (
              <div key={s.id} className="so-surcharge-card">
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  <div>
                    <div className="so-surcharge-title">
                      {s.type} — {s.equipmentId}
                    </div>
                    <div className="so-surcharge-reason">{s.reason}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="so-surcharge-amount">+{fmt(s.amount)}</span>
                    <span className={`so-surcharge-status ${surchargeMod}`}>{s.status}</span>
                    {s.status === "Chờ duyệt" && (
                      <>
                        <button
                          disabled={returnBusy}
                          onClick={() => void onApproveSurcharge(s)}
                          className="so-btn-green-xs"
                        >
                          Duyệt
                        </button>
                        {app.realApi && s.backendId && (
                          <button
                            disabled={returnBusy}
                            onClick={() => {
                              setRejectingSurchargeId(s.id);
                              setRejectReason("");
                            }}
                            className="so-btn-danger-outline-xs"
                          >
                            Từ chối
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {rejectingSurchargeId === s.id && (
                  <div className="flex gap-2 items-center mt-2 pt-2 flex-wrap so-reject-row">
                    <input
                      placeholder="Nhập lý do từ chối phụ phí..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="so-reject-input"
                    />
                    <button
                      disabled={returnBusy}
                      onClick={() => void onRejectSurcharge(s)}
                      className="so-btn-danger-xs"
                    >
                      Xác nhận từ chối
                    </button>
                    <button onClick={() => setRejectingSurchargeId(null)} className="so-btn-cancel-xs">
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Chuyển sang Chờ đối soát (mock) hoặc mở bảng đối soát trực tiếp (realApi / Chờ đối soát) */}
      {!app.realApi && order.status === "Đã nhận trả" && (
        <div className="so-ready-reconcile-box">
          <div className="so-ready-reconcile-title">✓ Toàn bộ thiết bị đã nhận trả xong</div>
          <div className="so-ready-reconcile-desc">
            Chuyển đơn sang Chờ đối soát để lập lệnh hoàn cọc hoặc thu thêm.
          </div>
          <button
            onClick={() => app.advanceOrderStatus(order.id, "Chờ đối soát")}
            className="so-btn-blue-md"
          >
            Chuyển sang Chờ đối soát →
          </button>
        </div>
      )}

      {(order.status === "Chờ đối soát" || (app.realApi && order.status === "Đã nhận trả")) && (
        <div className="so-reconcile-wrap">
          <ReconciliationSheet
            order={order}
            app={app}
            userRole={app.currentUser?.role === "admin" ? "admin" : "staff"}
            onAfterMutation={onAfterReconcileMutation}
          />
        </div>
      )}
    </>
  );
}
