import { fmt, type ImportReceiptLine } from "../../../store";
import type { LineInspectionState } from "./useGoodsReceiving";

interface Props {
  index: number;
  line: ImportReceiptLine;
  productName: string;
  st: LineInspectionState;
  onUpdate: (index: number, update: Partial<LineInspectionState>) => void;
  onAutoGenerate: (index: number, type: "accepted" | "damaged") => void;
}

export default function GoodsReceivingLineCard({
  index,
  line,
  productName,
  st,
  onUpdate,
  onAutoGenerate,
}: Props) {
  const actualLineTotal = (st.acceptedQty + st.damagedQty) * line.unitPrice;

  return (
    <div className="border border-[var(--color-bone,#E5E7EB)] rounded-xl p-4 bg-white">
      <div className="flex justify-between items-center mb-3">
        <div>
          <strong className="text-sm text-[var(--color-bark,#1F2937)]">{productName}</strong>
          <span className="text-xs text-gray-500 ml-2">
            (Dự kiến: <strong>{line.quantity}</strong> chiếc · Đơn giá: <strong>{fmt(line.unitPrice)}</strong>)
          </span>
        </div>
        <div className="text-xs font-bold text-[var(--color-forest,#15803D)]">
          Thực nhận: {actualLineTotal > 0 ? fmt(actualLineTotal) : "0 ₫"}
        </div>
      </div>

      {/* 3 Khối kiểm định: Đạt / Lỗi / Từ chối */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* KHỐI 1: HÀNG ĐẠT CHUẨN */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
          <div className="flex justify-between items-center mb-1">
            <strong className="text-green-800">🟢 Hàng đạt chuẩn (Sẵn sàng)</strong>
            <button
              type="button"
              onClick={() => onAutoGenerate(index, "accepted")}
              className="bg-white border border-green-300 text-green-700 rounded px-1.5 py-0.5 text-[0.68rem] cursor-pointer font-semibold"
            >
              ⚡ Sinh mã nhanh
            </button>
          </div>
          <label className="block mb-1">
            Số lượng đạt:
            <input
              type="number"
              min="0"
              max={line.quantity}
              value={st.acceptedQty}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                const newCodes = Array.from({ length: val }, (_, i) => st.acceptedCodes[i] || "");
                onUpdate(index, { acceptedQty: val, acceptedCodes: newCodes });
              }}
              className="w-full px-2 py-1 rounded border border-gray-300 mt-0.5 bg-white"
            />
          </label>
          {st.acceptedQty > 0 && (
            <div>
              <span className="text-[0.72rem] text-gray-600">Mã serial ({st.acceptedCodes.length} mã):</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {st.acceptedCodes.map((code, cIdx) => (
                  <input
                    key={cIdx}
                    placeholder={`Mã ${cIdx + 1}`}
                    value={code}
                    onChange={(e) => {
                      const updated = [...st.acceptedCodes];
                      updated[cIdx] = e.target.value;
                      onUpdate(index, { acceptedCodes: updated });
                    }}
                    className="w-[90px] px-1.5 py-0.5 text-[0.72rem] font-mono rounded border border-gray-300 bg-white"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* KHỐI 2: HÀNG LỖI NHẬN XỬ LÝ (UC7.7.2) */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
          <div className="flex justify-between items-center mb-1">
            <strong className="text-yellow-800">🟡 Hàng lỗi nhận sửa (Bảo trì)</strong>
            {st.damagedQty > 0 && (
              <button
                type="button"
                onClick={() => onAutoGenerate(index, "damaged")}
                className="bg-white border border-amber-300 text-amber-700 rounded px-1.5 py-0.5 text-[0.68rem] cursor-pointer font-semibold"
              >
                ⚡ Sinh mã
              </button>
            )}
          </div>
          <label className="block mb-1">
            Số lượng lỗi nhận:
            <input
              type="number"
              min="0"
              max={line.quantity}
              value={st.damagedQty}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                const newCodes = Array.from({ length: val }, (_, i) => st.damagedCodes[i] || "");
                onUpdate(index, { damagedQty: val, damagedCodes: newCodes });
              }}
              className="w-full px-2 py-1 rounded border border-gray-300 mt-0.5 bg-white"
            />
          </label>
          {st.damagedQty > 0 && (
            <div>
              <input
                placeholder="Mô tả lỗi (vd: rách nhẹ, cong chốt)..."
                value={st.damageNotes}
                onChange={(e) => onUpdate(index, { damageNotes: e.target.value })}
                className="w-full px-2 py-1 text-[0.72rem] rounded border border-amber-300 mb-1 bg-white"
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
                      onUpdate(index, { damagedCodes: updated });
                    }}
                    className="w-[90px] px-1.5 py-0.5 text-[0.72rem] font-mono rounded border border-gray-300 bg-white"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* KHỐI 3: HÀNG TỪ CHỐI / TRẢ LẠI NCC */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
          <strong className="text-red-800 block mb-0.5">🔴 Hàng từ chối (Trả về NCC)</strong>
          <label className="block mb-1">
            Số lượng trả lại:
            <input
              type="number"
              min="0"
              max={line.quantity}
              value={st.rejectedQty}
              onChange={(e) => onUpdate(index, { rejectedQty: Math.max(0, Number(e.target.value)) })}
              className="w-full px-2 py-1 rounded border border-gray-300 mt-0.5 bg-white"
            />
          </label>
          {st.rejectedQty > 0 && (
            <input
              placeholder="Lý do từ chối (vd: sai mã, vỡ hoàn toàn)..."
              value={st.rejectionReason}
              onChange={(e) => onUpdate(index, { rejectionReason: e.target.value })}
              className="w-full px-2 py-1 text-[0.72rem] rounded border border-red-300 bg-white"
            />
          )}
          <div className="text-[0.68rem] text-gray-500 mt-1">* Không sinh mã và không tăng kho.</div>
        </div>
      </div>
    </div>
  );
}
