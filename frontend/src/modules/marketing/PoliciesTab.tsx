import type { useApp } from "../../context/AppContext";
import { usePoliciesTab } from "./policies/usePoliciesTab";
import { PolicyCurrentForm } from "./policies/PolicyCurrentForm";
import { PolicyHistoryTable } from "./policies/PolicyHistoryTable";
import { PolicyConfirmDiffModal, PolicySnapshotModal } from "./policies/PolicyModals";

/**
 * Tab Cấu hình chính sách thuê & hủy có phiên bản (UC8.1 & UC8.1.1).
 */
export function PoliciesTab({ app }: { app: ReturnType<typeof useApp> }) {
  const policy = usePoliciesTab(app);

  return (
    <div className="adm-section-max">
      {/* Header & SubTabs */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="adm-page-title adm-page-title--compact">
              Cấu hình chính sách thuê & hủy (UC8.1)
            </h2>
            <span className="adm-version-pill">
              {policy.currentVer}
            </span>
          </div>
          <p className="adm-page-subtitle adm-page-subtitle--compact">
            Thiết lập quy tắc kinh doanh có phiên bản. Thay đổi chỉ áp dụng cho đơn mới, giữ nguyên chính sách trên các đơn cũ (không tính hồi tố).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => policy.setSubTab("current")}
            className={`adm-tab-btn ${policy.subTab === "current" ? "is-active" : ""}`}
          >
            ⚙️ Cấu hình hiện hành
          </button>
          <button
            type="button"
            onClick={() => policy.setSubTab("history")}
            className={`adm-tab-btn ${policy.subTab === "history" ? "is-active" : ""}`}
          >
            📜 Lịch sử phiên bản ({app.policyVersions.length})
          </button>
        </div>
      </div>

      {policy.message && (
        <div className={`adm-alert font-semibold ${policy.message.type === "success" ? "is-success" : "is-error-solid"}`}>
          {policy.message.text}
        </div>
      )}

      {policy.subTab === "current" && (
        <PolicyCurrentForm
          form={policy.form}
          currentPolicy={app.policies}
          currentVer={policy.currentVer}
          onChangeForm={policy.setForm}
          onUpdateAccessoryFee={policy.updateAccessoryFee}
          onSubmitReview={policy.handleOpenReview}
        />
      )}

      {policy.subTab === "history" && (
        <PolicyHistoryTable
          policyVersions={app.policyVersions}
          onSelectSnapshot={policy.setSelectedSnapshot}
        />
      )}

      {policy.showConfirmModal && (
        <PolicyConfirmDiffModal
          diffs={policy.getChangedFields()}
          changeReason={policy.changeReason}
          onChangeReason={policy.setChangeReason}
          effectiveDate={policy.effectiveDate}
          onChangeEffectiveDate={policy.setEffectiveDate}
          checkingPolicy={policy.checkingPolicy}
          previewCheck={policy.previewCheck}
          modalError={policy.modalError}
          policySaving={policy.policySaving}
          onConfirm={() => void policy.handleConfirmSave()}
          onClose={() => {
            policy.setShowConfirmModal(false);
            policy.setModalError("");
          }}
        />
      )}

      {policy.selectedSnapshot && (
        <PolicySnapshotModal
          snapshot={policy.selectedSnapshot}
          onClose={() => policy.setSelectedSnapshot(null)}
        />
      )}
    </div>
  );
}
