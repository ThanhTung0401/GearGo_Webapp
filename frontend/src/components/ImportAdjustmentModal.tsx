import React, { useState } from "react";
import { type useApp } from "../App";
import { type ImportReceipt, type ImportReceiptAdjustment } from "../store";

interface Props {
  receipt: ImportReceipt;
  app: ReturnType<typeof useApp>;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * UC7.10 & UC7.10.1: Lập đề nghị xử lý sai lệch phiếu nhập sau chốt
 * - Áp dụng khi phát hiện sai lệch trên phiếu đã ở trạng thái "Đã nhập kho".
 * - Không sửa âm thầm phiếu gốc, lập bản ghi điều chỉnh ở trạng thái "Chờ duyệt".
 * - Quản trị viên duyệt sẽ kiểm tra an toàn xung đột lịch thuê tương lai (Dòng phụ 4.1).
 */
export default function ImportAdjustmentModal({ receipt, app, onClose, onSuccess }: Props) {
  const [type, setType] = useState<ImportReceiptAdjustment["type"]>("Giá vốn");
  const [previousValue, setPreviousValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [createdBy, setCreatedBy] = useState("NV Kho Mai");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previousValue.trim() || !newValue.trim()) {
      alert("Vui lòng nhập đầy đủ giá trị trước và sau khi điều chỉnh.");
      return;
    }
    if (!reason.trim()) {
      alert("Vui lòng ghi rõ lý do và căn cứ điều chỉnh (theo quy tắc UC7.10).");
      return;
    }

    const res = app.createImportAdjustment({
      importReceiptId: receipt.id,
      type,
      previousValue: previousValue.trim(),
      newValue: newValue.trim(),
      reason: reason.trim(),
      evidence: evidence.trim() || undefined,
      createdBy: createdBy.trim(),
    });

    if (res.ok) {
      alert(
        `Đã lập đề nghị điều chỉnh ${res.data.id} ở trạng thái "Chờ duyệt"! Quản trị viên sẽ kiểm tra tính hợp lệ và cam kết đơn thuê trước khi phê duyệt.`
      );
      if (onSuccess) onSuccess();
      onClose();
    } else {
      alert(res.message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          maxWidth: 580,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-bone, #E5E7EB)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--color-cream, #FAFAF9)",
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: "var(--font-display, inherit)",
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "var(--color-bark, #1F2937)",
                margin: 0,
              }}
            >
              Lập đề nghị điều chỉnh sai lệch phiếu nhập (UC7.10)
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#6B7280" }}>
              Liên kết chứng từ gốc: <strong style={{ fontFamily: "monospace" }}>{receipt.displayCode || receipt.id}</strong> ({receipt.supplierName})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{ background: "transparent", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#9CA3AF" }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: "18px 20px", overflowY: "auto", display: "grid", gap: 14 }}>
          <div
            style={{
              background: "#FFFBEB",
              border: "1px solid #FCD34D",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: "0.75rem",
              color: "#92400E",
            }}
          >
            <strong>Lưu ý:</strong> Phiếu gốc đã nhập kho không bị sửa trực tiếp. Đề nghị sau khi được Quản trị viên duyệt sẽ tạo bản ghi điều chỉnh liên kết và bảo toàn lịch sử ban đầu.
          </div>

          <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
            Phân loại sai lệch cần xử lý:
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ImportReceiptAdjustment["type"])}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 6,
                border: "1px solid #D1D5DB",
                marginTop: 4,
                background: "white",
              }}
            >
              <option value="Giá vốn">Sai lệch đơn giá nhập / Chiết khấu hóa đơn NCC</option>
              <option value="Số lượng">Sai lệch số lượng thiết bị thực tế kiểm tra lại</option>
              <option value="Thông tin chứng từ">Sai thông tin số hóa đơn / ghi chú nhà cung cấp</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
              Giá trị trước điều chỉnh:
              <input
                required
                placeholder="VD: 1.200.000 ₫ hoặc 5 chiếc"
                value={previousValue}
                onChange={(e) => setPreviousValue(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #D1D5DB",
                  marginTop: 4,
                  fontSize: "0.8rem",
                }}
              />
            </label>

            <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
              Giá trị đề nghị sau điều chỉnh:
              <input
                required
                placeholder="VD: 1.150.000 ₫ hoặc 4 chiếc"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #D1D5DB",
                  marginTop: 4,
                  fontSize: "0.8rem",
                }}
              />
            </label>
          </div>

          <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
            Lý do sai lệch & Căn cứ điều chỉnh:
            <textarea
              required
              rows={2}
              placeholder="Ghi rõ nguyên nhân phát hiện sai lệch, biên bản kiểm kho hoặc văn bản xác nhận từ NCC..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 6,
                border: "1px solid #D1D5DB",
                marginTop: 4,
                fontSize: "0.8rem",
              }}
            />
          </label>

          <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
            Chứng từ đối soát / Số biên bản liên quan:
            <input
              placeholder="VD: Hóa đơn GTGT điều chỉnh số 004812, BB thỏa thuận ngày 22/10..."
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 6,
                border: "1px solid #D1D5DB",
                marginTop: 4,
                fontSize: "0.8rem",
              }}
            />
          </label>

          <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
            Người lập đề nghị:
            <input
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 6,
                border: "1px solid #D1D5DB",
                marginTop: 4,
                fontSize: "0.8rem",
              }}
            />
          </label>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-bone">
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "white",
                border: "1px solid #D1D5DB",
                padding: "7px 14px",
                borderRadius: 6,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={{
                background: "var(--color-amber, #D97706)",
                color: "white",
                border: "none",
                padding: "7px 18px",
                borderRadius: 6,
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Gửi đề nghị điều chỉnh (Chờ duyệt)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
