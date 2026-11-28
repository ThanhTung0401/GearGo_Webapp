import { useState } from "react";
import type { useApp } from "../../../App";
import type { ImportReceipt, ImportReceiptAdjustment } from "../../../store";
import { uploadOrReadDataUrl } from "../../../services/api";
import { getErrorMessage } from "../../../utils";
import { useImportAdjustment } from "./useImportAdjustment";

interface Props {
  receipt: ImportReceipt;
  app: ReturnType<typeof useApp>;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * UC7.10 & UC7.10.1: Lập đề nghị xử lý sai lệch phiếu nhập sau chốt.
 */
export default function ImportAdjustmentModal({ receipt, app, onClose, onSuccess }: Props) {
  const vm = useImportAdjustment(receipt, app, onClose, onSuccess);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceNotice, setEvidenceNotice] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] grid place-items-center p-4 bg-slate-900/65 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-[580px] w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-bone,#E5E7EB)] flex justify-between items-center bg-[var(--color-cream,#FAFAF9)]">
          <div>
            <h3 className="m-0 text-lg font-bold text-[var(--color-bark,#1F2937)] font-[family-name:var(--font-display)]">
              Lập đề nghị điều chỉnh sai lệch phiếu nhập (UC7.10)
            </h3>
            <p className="mt-0.5 mb-0 text-xs text-gray-500">
              Liên kết chứng từ gốc: <strong className="font-mono">{receipt.displayCode || receipt.id}</strong> ({receipt.supplierName})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="bg-transparent border-0 text-2xl cursor-pointer text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <form onSubmit={vm.handleSubmit} className="p-5 overflow-y-auto grid gap-3.5 text-xs">
          {vm.submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 font-semibold">
              {vm.submitError}
            </div>
          )}

          {receipt.lines.length > 0 && (
            <label className="font-semibold">
              Dòng sản phẩm liên quan:
              <select
                value={vm.selectedLineId}
                onChange={(e) => vm.setSelectedLineId(e.target.value)}
                className="w-full p-2 rounded-md border border-gray-300 mt-1 bg-white"
              >
                {receipt.lines.map((l, idx) => (
                  <option key={l.id || idx} value={l.id || ""}>
                    {l.productNameSnapshot || l.productId} (SL: {l.quantity})
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-amber-800">
            <strong>Lưu ý:</strong> Phiếu gốc đã nhập kho không bị sửa trực tiếp. Đề nghị sau khi được Quản trị viên duyệt sẽ tạo bản ghi điều chỉnh liên kết và bảo toàn lịch sử ban đầu.
          </div>

          <label className="font-semibold">
            Phân loại sai lệch cần xử lý:
            <select
              value={vm.type}
              onChange={(e) => vm.setType(e.target.value as ImportReceiptAdjustment["type"])}
              className="w-full p-2 rounded-md border border-gray-300 mt-1 bg-white"
            >
              <option value="Giá vốn">Sai lệch đơn giá nhập / Chiết khấu hóa đơn NCC</option>
              <option value="Số lượng">Sai lệch số lượng thiết bị thực tế kiểm tra lại</option>
              <option value="Thông tin chứng từ">Sai thông tin số hóa đơn / ghi chú nhà cung cấp</option>
            </select>
          </label>

          {/* [PN-10] Khi là "Số lượng" bắt buộc chọn hướng để map đúng LoaiDieuChinh BE,
              tránh default ThemThieu (tự động cộng kho) cho mọi lỗi số lượng. */}
          {vm.type === "Số lượng" && (
            <label className="font-semibold">
              Hướng điều chỉnh số lượng:
              <select
                value={vm.quantityDirection}
                onChange={(e) => vm.setQuantityDirection(e.target.value as "ThemThieu" | "LoaiThua")}
                className="w-full p-2 rounded-md border border-gray-300 mt-1 bg-white"
              >
                <option value="ThemThieu">Bổ sung thiết bị khai báo thiếu (cộng kho)</option>
                <option value="LoaiThua">Loại bỏ thiết bị khai báo thừa / trùng (trừ kho)</option>
              </select>
            </label>
          )}

          {vm.type === "Số lượng" && vm.quantityDirection === "LoaiThua" ? (
            <div className="font-semibold">
              Chọn thiết bị khai báo thừa / trùng cần loại bỏ:
              <div className="mt-1.5 max-h-36 overflow-y-auto border border-gray-300 rounded-md p-2 grid gap-1.5 bg-gray-50">
                {vm.lineEquipments.length === 0 ? (
                  <span className="text-gray-500 font-normal">Không có thiết bị khả dụng thuộc dòng nhập này.</span>
                ) : (
                  vm.lineEquipments.map((eq) => {
                    const numId = Number(eq.id);
                    const checked = vm.selectedEquipmentIds.includes(numId);
                    return (
                      <label key={eq.id} className="flex items-center gap-2 font-normal cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => vm.toggleEquipmentId(numId)}
                        />
                        <span className="font-mono font-bold text-forest">{eq.displayCode || eq.id}</span>
                        <span className="text-gray-500">({eq.equipmentStatus})</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold">
                {vm.type === "Số lượng" ? "Số lượng cũ trên phiếu:" : "Giá trị trước điều chỉnh:"}
                <input
                  required
                  placeholder={vm.type === "Số lượng" ? "VD: 1" : "VD: 1.200.000"}
                  value={vm.previousValue}
                  onChange={(e) => vm.setPreviousValue(e.target.value)}
                  className="w-full p-2 rounded-md border border-gray-300 mt-1"
                />
              </label>
              <label className="font-semibold">
                {vm.type === "Số lượng" ? "Số lượng thực tế muốn thành:" : "Giá trị đề nghị sau điều chỉnh:"}
                <input
                  required
                  placeholder={vm.type === "Số lượng" ? "VD: 5 (sẽ tạo thêm 4 chiếc)" : "VD: 1.150.000"}
                  value={vm.newValue}
                  onChange={(e) => vm.setNewValue(e.target.value)}
                  className="w-full p-2 rounded-md border border-gray-300 mt-1"
                />
              </label>
            </div>
          )}

          <label className="font-semibold">
            Lý do sai lệch & Căn cứ điều chỉnh:
            <textarea
              required
              rows={2}
              placeholder="Ghi rõ nguyên nhân phát hiện sai lệch, biên bản kiểm kho hoặc văn bản xác nhận từ NCC..."
              value={vm.reason}
              onChange={(e) => vm.setReason(e.target.value)}
              className="w-full p-2 rounded-md border border-gray-300 mt-1"
            />
          </label>

          <label className="font-semibold">
            Chứng từ đối soát / Số biên bản hoặc ảnh đính kèm:
            <div className="flex gap-2 items-center mt-1">
              <input
                placeholder="VD: Hóa đơn GTGT điều chỉnh số 004812 hoặc tải ảnh chứng từ..."
                value={vm.evidence}
                onChange={(e) => vm.setEvidence(e.target.value)}
                className="flex-1 p-2 rounded-md border border-gray-300"
              />
              <label
                className={`px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-xs font-semibold ${uploadingEvidence ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-gray-100"}`}
              >
                {uploadingEvidence ? "Đang tải..." : "📷 Tải ảnh"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingEvidence}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingEvidence(true);
                    setEvidenceNotice("");
                    try {
                      const url = await uploadOrReadDataUrl(file, Boolean(app.realApi), "inventory");
                      vm.setEvidence(url);
                      setEvidenceNotice("Đã tải ảnh chứng từ lên thành công.");
                    } catch (err) {
                      setEvidenceNotice(getErrorMessage(err, "Không thể tải ảnh chứng từ."));
                    } finally {
                      setUploadingEvidence(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
            {evidenceNotice && <span className="block text-xs font-normal text-gray-500 mt-1">{evidenceNotice}</span>}
          </label>

          <label className="font-semibold">
            Người lập đề nghị:
            <input
              value={vm.createdBy}
              onChange={(e) => vm.setCreatedBy(e.target.value)}
              className="w-full p-2 rounded-md border border-gray-300 mt-1"
            />
          </label>

          <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[var(--color-bone,#E5E7EB)]">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-gray-300 px-3.5 py-1.5 rounded-md cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={vm.submitting}
              className="bg-[var(--color-amber,#D97706)] text-white border-0 px-4 py-1.5 rounded-md font-bold cursor-pointer disabled:opacity-60"
            >
              Gửi đề nghị điều chỉnh (Chờ duyệt)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
