import type React from "react";
import { useApp } from "../../context/AppContext";
import { Order, ReturnReceipt } from "../../store";
import {
  type NhanTraBackend,
  type ChiTietNhanTraBackend,
  type NhatKyLienHeQuaHanBackend,
} from "../../services/api";
import { ReturnReceiptBackendModal } from "./return/ReturnReceiptBackendModal";
import { ReturnApproveLostModal } from "./return/ReturnApproveLostModal";
import { ReturnReceiptMockModal } from "./return/ReturnReceiptMockModal";
import { ReturnContactModal } from "./return/ReturnContactModal";

export interface ReturnTabModalsProps {
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

// Tập hợp 4 modal của phân hệ Nhận trả & Quá hạn (UC4.3 & UC4.4)
export function ReturnTabModals(props: ReturnTabModalsProps) {
  return (
    <>
      {props.viewingBackendReceipt && (
        <ReturnReceiptBackendModal
          app={props.app}
          order={props.order}
          receipt={props.viewingBackendReceipt}
          returnBusy={props.returnBusy}
          onClose={() => props.setViewingBackendReceipt(null)}
          onStartApproveLost={(phieuId, chiTiet, defaultBienBan, defaultAmount) => {
            props.setApproveLostTarget({ phieuId, chiTiet });
            props.setLostBienBan(defaultBienBan);
            props.setLostCompAmount(defaultAmount);
          }}
          onSplitPendingLine={props.handleSplitPendingLine}
          onCloseBackendReceipt={props.handleCloseBackendReceipt}
        />
      )}

      {props.approveLostTarget && (
        <ReturnApproveLostModal
          approveLostTarget={props.approveLostTarget}
          lostBienBan={props.lostBienBan}
          setLostBienBan={props.setLostBienBan}
          lostCompAmount={props.lostCompAmount}
          setLostCompAmount={props.setLostCompAmount}
          lostApproveReason={props.lostApproveReason}
          setLostApproveReason={props.setLostApproveReason}
          returnBusy={props.returnBusy}
          onClose={() => props.setApproveLostTarget(null)}
          onConfirm={props.handleConfirmApproveLost}
        />
      )}

      {props.viewingReceipt && (
        <ReturnReceiptMockModal
          app={props.app}
          viewingReceipt={props.viewingReceipt}
          setViewingReceipt={props.setViewingReceipt}
          setReturnSuccess={props.setReturnSuccess}
        />
      )}

      {props.showContactModal && props.order && (
        <ReturnContactModal
          app={props.app}
          order={props.order}
          contactNotice={props.contactNotice}
          contactLogsBackend={props.contactLogsBackend}
          contactOutcome={props.contactOutcome}
          setContactOutcome={props.setContactOutcome}
          newExpectedTime={props.newExpectedTime}
          setNewExpectedTime={props.setNewExpectedTime}
          contactNote={props.contactNote}
          setContactNote={props.setContactNote}
          returnBusy={props.returnBusy}
          onSaveContactLog={props.handleSaveContactLog}
          onClose={() => props.setShowContactModal(false)}
        />
      )}
    </>
  );
}
