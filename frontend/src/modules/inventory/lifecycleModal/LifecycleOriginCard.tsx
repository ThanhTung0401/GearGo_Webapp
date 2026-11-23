import { fmt, type Equipment, type ImportReceipt, type Product, type Supplier } from "../../../store";

interface Props {
  equipment: Equipment;
  currentProduct?: Product;
  originalProduct?: Product;
  supplier?: Supplier | null;
  importReceipt?: ImportReceipt;
}

export default function LifecycleOriginCard({
  equipment,
  currentProduct,
  originalProduct,
  supplier,
  importReceipt,
}: Props) {
  const isTransferred = equipment.productId !== equipment.originalProductId;
  // [VD-01] Hiển thị mã phiếu nhập gốc chính xác, ưu tiên displayCode, fallback về line id, không hardcode dữ liệu giả.
  const importReceiptLabel = importReceipt?.displayCode
    || importReceipt?.id
    || equipment.importReceiptLineId
    || equipment.importReceiptId
    || "Chưa xác định";
  const supplierLabel = supplier?.name || importReceipt?.supplierName || "Chưa rõ NCC";
  const importPriceLabel = equipment.importPrice > 0 ? fmt(equipment.importPrice) : "Bảo mật / 0 ₫";
  // [VD-05] equipment.displayCode là mã serial thật trên Real API; equipment.id là ID số nội bộ.
  const serialLabel = equipment.displayCode || equipment.id;

  return (
    <div className="border border-[var(--color-bone,#E5E7EB)] rounded-xl p-4 bg-white">
      <h4 className="text-sm font-bold text-[var(--color-bark,#1F2937)] mb-3 flex items-center gap-1.5">
        🏷 Hồ sơ nhận diện & Nguồn nhập gốc
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[0.82rem]">
        <div>
          <span className="text-gray-500 block">Sản phẩm hiện tại:</span>
          <strong className="text-[var(--color-bark,#1F2937)]">
            {currentProduct?.name || equipment.productId}
          </strong>
        </div>
        <div>
          <span className="text-gray-500 block">Phiếu nhập gốc (PN):</span>
          <strong className="font-mono text-[var(--color-forest,#15803D)]">
            {importReceiptLabel}
          </strong>
        </div>
        <div>
          <span className="text-gray-500 block">Ngày nhập kho:</span>
          <strong>{equipment.importDate || "—"}</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Giá vốn lúc nhập:</span>
          <strong>{importPriceLabel}</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Nhà cung cấp:</span>
          <strong>{supplierLabel}</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Lượt phục vụ cho thuê:</span>
          <strong className="text-[var(--color-amber,#D97706)]">{equipment.rentCount} lượt</strong>
        </div>
      </div>

      {/* Cảnh báo bảo toàn mã gốc khi điều chuyển (UC6.15) */}
      {isTransferred && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 flex items-center gap-2">
          <span>🔄</span>
          <div>
            <strong>Đã điều chuyển loại sản phẩm (UC6.15):</strong> Nguyên bản nhập là{" "}
            <strong>{originalProduct?.name || equipment.originalProductId}</strong>, đã được giáng cấp / chuyển sang{" "}
            <strong>{currentProduct?.name}</strong>. Mã định danh serial <code>{serialLabel}</code> và phiếu nhập gốc{" "}
            <code>{importReceiptLabel}</code> vẫn được bảo toàn nguyên trạng.
          </div>
        </div>
      )}
    </div>
  );
}
