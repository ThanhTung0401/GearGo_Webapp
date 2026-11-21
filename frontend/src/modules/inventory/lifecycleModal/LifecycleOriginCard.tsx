import { fmt, type Equipment, type Product, type Supplier } from "../../../store";

interface Props {
  equipment: Equipment;
  currentProduct?: Product;
  originalProduct?: Product;
  supplier?: Supplier | null;
}

export default function LifecycleOriginCard({
  equipment,
  currentProduct,
  originalProduct,
  supplier,
}: Props) {
  const isTransferred = equipment.productId !== equipment.originalProductId;

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
            {equipment.importReceiptId}
          </strong>
        </div>
        <div>
          <span className="text-gray-500 block">Ngày nhập kho:</span>
          <strong>{equipment.importDate}</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Giá vốn lúc nhập:</span>
          <strong>{equipment.importPrice ? fmt(equipment.importPrice) : "1.200.000 ₫"}</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Nhà cung cấp:</span>
          <strong>{supplier?.name || "Công ty CP Thiết Bị Dã Ngoại"}</strong>
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
            <strong>{currentProduct?.name}</strong>. Mã định danh serial <code>{equipment.id}</code> và phiếu nhập gốc{" "}
            <code>{equipment.importReceiptId}</code> vẫn được bảo toàn nguyên trạng.
          </div>
        </div>
      )}
    </div>
  );
}
