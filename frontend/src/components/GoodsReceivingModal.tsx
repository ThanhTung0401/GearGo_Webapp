import React, { useState } from "react";
import { type useApp } from "../App";
import { fmt, type ImportReceipt } from "../store";

interface Props {
  receipt: ImportReceipt;
  app: ReturnType<typeof useApp>;
  onClose: () => void;
  onSuccess?: () => void;
}

interface LineInspectionState {
  acceptedQty: number;
  acceptedCodes: string[];
  damagedQty: number;
  damagedCodes: string[];
  damageNotes: string;
  rejectedQty: number;
  rejectionReason: string;
}

/**
 * UC7.7 & UC7.7.2: Biên bản kiểm nhận hàng thực tế & Xử lý hàng lỗi
 * - Nhân viên kiểm đếm số lượng, chất lượng thực nhận tại kho.
 * - Phân loại 3 luồng:
 *   1. Hàng đạt chuẩn -> Tạo mã serial -> Vào kho "Sẵn sàng"
 *   2. Hàng lỗi nhận xử lý (UC7.7.2) -> Tạo mã serial -> Vào kho "Đang bảo trì"
 *   3. Hàng từ chối / sai quy cách -> Trả lại NCC, KHÔNG tạo mã, KHÔNG tăng kho, giảm trừ thanh toán
 * - Quản trị viên chốt xác nhận nhập kho một lần duy nhất (Idempotent - UC7.7.1).
 */
export default function GoodsReceivingModal({ receipt, app, onClose, onSuccess }: Props) {
  const [inspectedBy, setInspectedBy] = useState("NV Kho Mai");
  const [receivingCondition, setReceivingCondition] = useState("Nguyên thùng, bao bì đầy đủ");

  // State kiểm nhận cho từng dòng sản phẩm
  const [lineStates, setLineStates] = useState<Record<number, LineInspectionState>>(() => {
    const initial: Record<number, LineInspectionState> = {};
    receipt.lines.forEach((line, index) => {
      initial[index] = {
        acceptedQty: line.quantity,
        acceptedCodes: line.equipmentCodes?.length === line.quantity ? [...line.equipmentCodes] : Array.from({ length: line.quantity }, () => ""),
        damagedQty: 0,
        damagedCodes: [],
        damageNotes: "",
        rejectedQty: 0,
        rejectionReason: "",
      };
    });
    return initial;
  });

  const updateLineState = (index: number, update: Partial<LineInspectionState>) => {
    setLineStates((prev) => ({
      ...prev,
      [index]: { ...prev[index], ...update },
    }));
  };

  // Helper sinh mã tự động cho các ô còn trống
  const autoGenerateCodes = (index: number, type: "accepted" | "damaged") => {
    const line = receipt.lines[index];
    const prefix = line.productId.replace("P", "").padStart(2, "0");
    const st = lineStates[index];
    const targetQty = type === "accepted" ? st.acceptedQty : st.damagedQty;

    const currentAllCodes = new Set([
      ...app.equipment.map((e) => e.id),
      ...Object.values(lineStates).flatMap((ls) => [...ls.acceptedCodes, ...ls.damagedCodes]).filter(Boolean),
    ]);

    const generated: string[] = [];
    let counter = 1;
    while (generated.length < targetQty) {
      const code = `EQ-${prefix}${counter.toString().padStart(3, "0")}`;
      if (!currentAllCodes.has(code)) {
        generated.push(code);
        currentAllCodes.add(code);
      }
      counter++;
    }

    if (type === "accepted") {
      updateLineState(index, { acceptedCodes: generated });
    } else {
      updateLineState(index, { damagedCodes: generated });
    }
  };

  // Tính tổng tiền thanh toán thực tế (chỉ tính lượng được chấp nhận vào kho)
  const actualTotalAmount = receipt.lines.reduce((sum, line, index) => {
    const st = lineStates[index];
    const acceptedCount = (st?.acceptedQty || 0) + (st?.damagedQty || 0);
    return sum + acceptedCount * line.unitPrice;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Kiểm tra tổng số lượng từng dòng có khớp số lượng dự kiến
    for (let i = 0; i < receipt.lines.length; i++) {
      const line = receipt.lines[i];
      const prod = app.products.find((p) => p.id === line.productId);
      const st = lineStates[i];
      const sum = st.acceptedQty + st.damagedQty + st.rejectedQty;

      if (sum !== line.quantity) {
        alert(
          `Dòng "${prod?.name || line.productId}": Tổng lượng kiểm nhận (${st.acceptedQty} đạt + ${st.damagedQty} lỗi + ${st.rejectedQty} từ chối = ${sum}) không khớp số lượng dự kiến (${line.quantity})!`
        );
        return;
      }

      // Kiểm tra mã hàng đạt
      if (st.acceptedQty > 0) {
        if (st.acceptedCodes.length !== st.acceptedQty || st.acceptedCodes.some((c) => !c.trim())) {
          alert(`Dòng "${prod?.name}": Vui lòng nhập đủ ${st.acceptedQty} mã thiết bị đạt chuẩn.`);
          return;
        }
      }

      // Kiểm tra mã hàng lỗi (UC7.7.2)
      if (st.damagedQty > 0) {
        if (st.damagedCodes.length !== st.damagedQty || st.damagedCodes.some((c) => !c.trim())) {
          alert(`Dòng "${prod?.name}": Vui lòng nhập đủ ${st.damagedQty} mã thiết bị lỗi nhận bảo hành.`);
          return;
        }
        if (!st.damageNotes.trim()) {
          alert(`Dòng "${prod?.name}": Vui lòng ghi rõ mô tả lỗi hư hỏng theo quy định UC7.7.2.`);
          return;
        }
      }

      // Kiểm tra lý do từ chối
      if (st.rejectedQty > 0 && !st.rejectionReason.trim()) {
        alert(`Dòng "${prod?.name}": Vui lòng ghi rõ lý do từ chối trả lại NCC cho ${st.rejectedQty} món.`);
        return;
      }
    }

    // 2. Kiểm tra trùng lặp mã thiết bị
    const allCodes = Object.values(lineStates).flatMap((ls) => [...ls.acceptedCodes, ...ls.damagedCodes].map((c) => c.trim().toUpperCase()));
    if (new Set(allCodes).size !== allCodes.length) {
      alert("Phát hiện mã thiết bị bị trùng lặp trong biên bản kiểm nhận!");
      return;
    }

    const duplicateWithWarehouse = allCodes.find((c) => app.equipment.some((e) => e.id.toUpperCase() === c));
    if (duplicateWithWarehouse) {
      alert(`Mã thiết bị "${duplicateWithWarehouse}" đã tồn tại trong kho GearGo!`);
      return;
    }

    // 3. Tiến hành xác nhận nhập kho với dữ liệu kiểm định
    const inspectionLines = receipt.lines.map((line, index) => {
      const st = lineStates[index];
      return {
        productId: line.productId,
        acceptedCodes: st.acceptedCodes.map((c) => c.trim().toUpperCase()),
        damagedCodes: st.damagedCodes.map((c) => c.trim().toUpperCase()),
        damageNotes: st.damageNotes.trim(),
        rejectedQty: st.rejectedQty,
        rejectionReason: st.rejectionReason.trim(),
      };
    });

    const err = app.confirmImportReceipt(receipt.id, {
      inspectedBy: inspectedBy.trim(),
      lines: inspectionLines,
    });

    if (err) {
      alert(err);
    } else {
      alert(
        `Đã chốt phiếu nhập kho ${receipt.displayCode || receipt.id}! Các thiết bị đạt chuẩn đã sẵn sàng cho thuê, các thiết bị lỗi đã được đưa vào bảo trì theo UC7.7.2.`
      );
      if (onSuccess) onSuccess();
      onClose();
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
          maxWidth: 920,
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--color-bone, #E5E7EB)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--color-cream, #FAFAF9)",
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "1.4rem" }}>📦</span>
              <h3
                style={{
                  fontFamily: "var(--font-display, inherit)",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "var(--color-bark, #1F2937)",
                  margin: 0,
                }}
              >
                Biên bản kiểm nhận & Nghiệm thu nhập kho (UC7.7 & UC7.7.2)
              </h3>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#6B7280" }}>
              Phiếu: <strong style={{ fontFamily: "monospace" }}>{receipt.displayCode || receipt.id}</strong> · Nhà cung cấp:{" "}
              <strong>{receipt.supplierName}</strong>
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
        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1, display: "grid", gap: 16 }}>
          {/* Thông tin biên bản */}
          <div
            style={{
              background: "var(--color-parchment, #F5F1E9)",
              borderRadius: 10,
              padding: "12px 16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              fontSize: "0.8rem",
            }}
          >
            <div>
              <span style={{ color: "#6B7280", display: "block" }}>Nhân viên kiểm nhận:</span>
              <input
                type="text"
                value={inspectedBy}
                onChange={(e) => setInspectedBy(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid var(--color-bone, #E5E7EB)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: "0.8rem",
                  marginTop: 2,
                  background: "white",
                }}
              />
            </div>
            <div>
              <span style={{ color: "#6B7280", display: "block" }}>Tình trạng bao bì giao hàng:</span>
              <input
                type="text"
                value={receivingCondition}
                onChange={(e) => setReceivingCondition(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid var(--color-bone, #E5E7EB)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: "0.8rem",
                  marginTop: 2,
                  background: "white",
                }}
              />
            </div>
            <div>
              <span style={{ color: "#6B7280", display: "block" }}>Tổng tiền dự kiến $\rightarrow$ Thực nhận:</span>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-forest, #15803D)", marginTop: 4 }}>
                {fmt(actualTotalAmount)}
              </div>
            </div>
          </div>

          {/* Hướng dẫn nghiệp vụ */}
          <div
            style={{
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: "0.78rem",
              color: "#1E40AF",
            }}
          >
            <strong>💡 Quy tắc nghiệp vụ kiểm định (UC7.7 & UC7.7.2):</strong>
            <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
              <li><strong>Hàng đạt:</strong> Nhập mã serial $\rightarrow$ Kích hoạt trạng thái <code>Sẵn sàng</code> cho thuê.</li>
              <li><strong>Hàng lỗi (UC7.7.2):</strong> Nhập mã serial $\rightarrow$ Kích hoạt trạng thái <code>Đang bảo trì</code> để xử lý kỹ thuật trước.</li>
              <li><strong>Hàng từ chối:</strong> Ghi rõ lý do trả hàng $\rightarrow$ KHÔNG sinh mã, KHÔNG tăng kho, tự động trừ tiền thanh toán.</li>
            </ul>
          </div>

          {/* Chi tiết từng dòng sản phẩm */}
          <div className="grid gap-4">
            {receipt.lines.map((line, index) => {
              const prod = app.products.find((p) => p.id === line.productId);
              const st = lineStates[index];
              if (!st) return null;

              return (
                <div
                  key={line.id || index}
                  style={{
                    border: "1px solid var(--color-bone, #E5E7EB)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    background: "white",
                  }}
                >
                  {/* Header dòng */}
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <strong style={{ fontSize: "0.95rem", color: "var(--color-bark, #1F2937)" }}>
                        {prod?.name || line.productId}
                      </strong>
                      <span style={{ fontSize: "0.78rem", color: "#6B7280", marginLeft: 8 }}>
                        (Dự kiến: <strong>{line.quantity}</strong> chiếc · Đơn giá: <strong>{fmt(line.unitPrice)}</strong>)
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest, #15803D)" }}>
                      Thực nhận: {(st.acceptedQty + st.damagedQty) * line.unitPrice > 0 ? fmt((st.acceptedQty + st.damagedQty) * line.unitPrice) : "0 ₫"}
                    </div>
                  </div>

                  {/* 3 Khối kiểm định: Đạt / Lỗi / Từ chối */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* KHỐI 1: HÀNG ĐẠT CHUẨN */}
                    <div
                      style={{
                        background: "#F0FDF4",
                        border: "1px solid #BBF7D0",
                        borderRadius: 8,
                        padding: 10,
                        fontSize: "0.78rem",
                      }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <strong style={{ color: "#166534" }}>🟢 Hàng đạt chuẩn (Sẵn sàng)</strong>
                        <button
                          type="button"
                          onClick={() => autoGenerateCodes(index, "accepted")}
                          style={{
                            background: "white",
                            border: "1px solid #86EFAC",
                            color: "#15803D",
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontSize: "0.68rem",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          ⚡ Sinh mã nhanh
                        </button>
                      </div>

                      <label style={{ display: "block", marginBottom: 4 }}>
                        Số lượng đạt:
                        <input
                          type="number"
                          min="0"
                          max={line.quantity}
                          value={st.acceptedQty}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            const newCodes = Array.from({ length: val }, (_, i) => st.acceptedCodes[i] || "");
                            updateLineState(index, { acceptedQty: val, acceptedCodes: newCodes });
                          }}
                          style={{
                            width: "100%",
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #D1D5DB",
                            marginTop: 2,
                            background: "white",
                          }}
                        />
                      </label>

                      {st.acceptedQty > 0 && (
                        <div>
                          <span style={{ fontSize: "0.72rem", color: "#4B5563" }}>Mã serial ({st.acceptedCodes.length} mã):</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {st.acceptedCodes.map((code, cIdx) => (
                              <input
                                key={cIdx}
                                placeholder={`Mã ${cIdx + 1}`}
                                value={code}
                                onChange={(e) => {
                                  const updated = [...st.acceptedCodes];
                                  updated[cIdx] = e.target.value;
                                  updateLineState(index, { acceptedCodes: updated });
                                }}
                                style={{
                                  width: 90,
                                  padding: "3px 6px",
                                  fontSize: "0.72rem",
                                  fontFamily: "monospace",
                                  borderRadius: 4,
                                  border: "1px solid #D1D5DB",
                                  background: "white",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* KHỐI 2: HÀNG LỖI NHẬN XỬ LÝ (UC7.7.2) */}
                    <div
                      style={{
                        background: "#FEFCE8",
                        border: "1px solid #FEF08A",
                        borderRadius: 8,
                        padding: 10,
                        fontSize: "0.78rem",
                      }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <strong style={{ color: "#854D0E" }}>🟡 Hàng lỗi nhận sửa (Bảo trì)</strong>
                        {st.damagedQty > 0 && (
                          <button
                            type="button"
                            onClick={() => autoGenerateCodes(index, "damaged")}
                            style={{
                              background: "white",
                              border: "1px solid #FCD34D",
                              color: "#B45309",
                              borderRadius: 4,
                              padding: "2px 6px",
                              fontSize: "0.68rem",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            ⚡ Sinh mã
                          </button>
                        )}
                      </div>

                      <label style={{ display: "block", marginBottom: 4 }}>
                        Số lượng lỗi nhận:
                        <input
                          type="number"
                          min="0"
                          max={line.quantity}
                          value={st.damagedQty}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            const newCodes = Array.from({ length: val }, (_, i) => st.damagedCodes[i] || "");
                            updateLineState(index, { damagedQty: val, damagedCodes: newCodes });
                          }}
                          style={{
                            width: "100%",
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #D1D5DB",
                            marginTop: 2,
                            background: "white",
                          }}
                        />
                      </label>

                      {st.damagedQty > 0 && (
                        <div>
                          <input
                            placeholder="Mô tả lỗi (vd: rách nhẹ, cong chốt)..."
                            value={st.damageNotes}
                            onChange={(e) => updateLineState(index, { damageNotes: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "4px 8px",
                              fontSize: "0.72rem",
                              borderRadius: 4,
                              border: "1px solid #FCD34D",
                              marginBottom: 4,
                              background: "white",
                            }}
                          />
                          <div className="flex flex-wrap gap-1">
                            {st.damagedCodes.map((code, cIdx) => (
                              <input
                                key={cIdx}
                                placeholder={`Mã ${cIdx + 1}`}
                                value={code}
                                onChange={(e) => {
                                  const updated = [...st.damagedCodes];
                                  updated[cIdx] = e.target.value;
                                  updateLineState(index, { damagedCodes: updated });
                                }}
                                style={{
                                  width: 90,
                                  padding: "3px 6px",
                                  fontSize: "0.72rem",
                                  fontFamily: "monospace",
                                  borderRadius: 4,
                                  border: "1px solid #D1D5DB",
                                  background: "white",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* KHỐI 3: HÀNG TỪ CHỐI / TRẢ LẠI NCC */}
                    <div
                      style={{
                        background: "#FEF2F2",
                        border: "1px solid #FECACA",
                        borderRadius: 8,
                        padding: 10,
                        fontSize: "0.78rem",
                      }}
                    >
                      <strong style={{ color: "#991B1B", display: "block", marginBottom: 2 }}>
                        🔴 Hàng từ chối (Trả về NCC)
                      </strong>
                      <label style={{ display: "block", marginBottom: 4 }}>
                        Số lượng trả lại:
                        <input
                          type="number"
                          min="0"
                          max={line.quantity}
                          value={st.rejectedQty}
                          onChange={(e) => updateLineState(index, { rejectedQty: Math.max(0, Number(e.target.value)) })}
                          style={{
                            width: "100%",
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #D1D5DB",
                            marginTop: 2,
                            background: "white",
                          }}
                        />
                      </label>

                      {st.rejectedQty > 0 && (
                        <input
                          placeholder="Lý do từ chối (vd: sai mã, vỡ hoàn toàn)..."
                          value={st.rejectionReason}
                          onChange={(e) => updateLineState(index, { rejectionReason: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "4px 8px",
                            fontSize: "0.72rem",
                            borderRadius: 4,
                            border: "1px solid #FCA5A5",
                            background: "white",
                          }}
                        />
                      )}
                      <div style={{ fontSize: "0.68rem", color: "#6B7280", marginTop: 4 }}>
                        * Không sinh mã và không tăng kho.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--color-bone, #E5E7EB)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--color-cream, #FAFAF9)",
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
            Tổng thanh toán thực nhận: <span style={{ color: "var(--color-forest, #15803D)" }}>{fmt(actualTotalAmount)}</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "white",
                border: "1px solid var(--color-bone, #E5E7EB)",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                background: "var(--color-forest, #15803D)",
                color: "white",
                border: "none",
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✓ Chốt kiểm nhận & Xác nhận nhập kho (UC7.7)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
