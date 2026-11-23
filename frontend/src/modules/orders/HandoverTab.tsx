import { useApp } from "../../context/AppContext";
import { Order } from "../../store";
import { useHandoverTab } from "./handover/useHandoverTab";
import { HandoverQueueList } from "./handover/HandoverQueueList";
import { HandoverPrepPanel } from "./handover/HandoverPrepPanel";
import { HandoverChecklistPanel } from "./handover/HandoverChecklistPanel";
import { HandoverRecordModal } from "./handover/HandoverRecordModal";

// Tab Chuẩn bị kho & Phân công serial (UC4.1) | Tiếp khách & Bàn giao tại quầy (UC4.2)
export function HandoverTab({
  app,
  selectedOrder,
  setSelectedOrderId,
  hydrateOperationalOrder,
}: {
  app: ReturnType<typeof useApp>;
  selectedOrder: Order | null;
  setSelectedOrderId: (id: string | null) => void;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}) {
  const state = useHandoverTab(app, selectedOrder, setSelectedOrderId, hydrateOperationalOrder);

  return (
    <div>
      {/* Sub-tab chuyển đổi giữa Chuẩn bị kho (UC4.1) và Bàn giao tại quầy (UC4.2) */}
      <div className="flex gap-2 mb-4 border-b border-bone pb-3 items-center flex-wrap">
        <button
          type="button"
          onClick={() => {
            state.setSubTab("prep");
            setSelectedOrderId(null);
          }}
          /* Dùng .is-active để làm nổi bật phân hệ đang chọn (Chuẩn bị kho vs Bàn giao) */
          className={`so-subtab-btn ${state.subTab === "prep" ? "is-active" : ""}`}
        >
          <span>📦 1. Chuẩn bị kho (UC4.1)</span>
          <span className="so-subtab-count is-amber">{state.eligiblePrep.length}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            state.setSubTab("handover");
            setSelectedOrderId(null);
          }}
          className={`so-subtab-btn ${state.subTab === "handover" ? "is-active" : ""}`}
        >
          <span>🤝 2. Tiếp khách & Bàn giao (UC4.2)</span>
          <span className="so-subtab-count is-green">{state.eligibleHandover.length}</span>
        </button>
      </div>

      <div className="so-split-layout">
        {/* Cột trái: Danh sách đơn & quét QR */}
        <HandoverQueueList
          subTab={state.subTab}
          eligiblePrep={state.eligiblePrep}
          eligibleHandover={state.eligibleHandover}
          selectedOrder={selectedOrder}
          qrCodeSearch={state.qrCodeSearch}
          setQrCodeSearch={state.setQrCodeSearch}
          handleQrSearch={state.handleQrSearch}
          onSelectOrder={(orderId) => {
            setSelectedOrderId(orderId);
            state.setShowHandoverModal(false);
          }}
        />

        {/* Cột phải: Luồng chuẩn bị kho hoặc bàn giao tại quầy */}
        <div>
          {state.handoverError && (
            <div role="alert" className="so-alert-error-box">
              {state.handoverError}
            </div>
          )}
          {state.handoverSuccess && (
            <div className="so-alert-success-box">{state.handoverSuccess}</div>
          )}

          {!state.order ? (
            <div className="so-empty-panel">
              <div className="so-empty-icon">{state.subTab === "prep" ? "📦" : "🤝"}</div>
              <p>
                {state.subTab === "prep"
                  ? "Chọn đơn ở danh sách bên trái để phân công mã serial và soạn hàng"
                  : "Chọn đơn hoặc quét mã QR ở bên trái để tiến hành bàn giao đồ tại quầy"}
              </p>
            </div>
          ) : state.subTab === "prep" ? (
            <HandoverPrepPanel
              app={app}
              order={state.order}
              assignments={state.assignments}
              handoverBusy={state.handoverBusy}
              allAssigned={state.allAssigned}
              changingEquip={state.changingEquip}
              setChangingEquip={state.setChangingEquip}
              showShortageModal={state.showShortageModal}
              setShowShortageModal={state.setShowShortageModal}
              shortageNote={state.shortageNote}
              setShortageNote={state.setShortageNote}
              pickEquipment={state.pickEquipment}
              handleStartPreparation={state.handleStartPreparation}
              handleSwapEquipment={state.handleSwapEquipment}
              handleCancelAssignment={state.handleCancelAssignment}
              handleCompletePreparation={state.handleCompletePreparation}
              handleReportShortage={state.handleReportShortage}
              prepState={state.prepState}
            />
          ) : (
            <HandoverChecklistPanel
              app={app}
              order={state.order}
              assignments={state.assignments}
              handoverBusy={state.handoverBusy}
              earlyPickupAccepted={state.earlyPickupAccepted}
              setEarlyPickupAccepted={state.setEarlyPickupAccepted}
              receiverName={state.receiverName}
              setReceiverName={state.setReceiverName}
              receiverPhone={state.receiverPhone}
              setReceiverPhone={state.setReceiverPhone}
              receiverIdCard={state.receiverIdCard}
              setReceiverIdCard={state.setReceiverIdCard}
              isAuthorized={state.isAuthorized}
              setIsAuthorized={state.setIsAuthorized}
              checklist={state.checklist}
              setChecklist={state.setChecklist}
              evidencePhotos={state.evidencePhotos}
              setEvidencePhotos={state.setEvidencePhotos}
              handoverNote={state.handoverNote}
              setHandoverNote={state.setHandoverNote}
              handleCompleteHandover={state.handleCompleteHandover}
            />
          )}

          {/* Modal xem Biên bản bàn giao vừa tạo (BBBG) */}
          {state.showHandoverModal && state.order && (
            <HandoverRecordModal
              app={app}
              order={state.order}
              assignments={state.assignments}
              receiverName={state.receiverName}
              receiverPhone={state.receiverPhone}
              receiverIdCard={state.receiverIdCard}
              isAuthorized={state.isAuthorized}
              /* [HO-08] Cả nút ✕ và "Đóng & Hoàn tất" đều reset selectedOrderId vì đơn đã chuyển sang "Đang thuê". */
              onCloseOnly={() => {
                state.setShowHandoverModal(false);
                setSelectedOrderId(null);
              }}
              onCompleteClose={() => {
                state.setShowHandoverModal(false);
                setSelectedOrderId(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
