import React from "react";

interface Props {
  newStatus: "active" | "inactive";
  statusReason: string;
  busy: boolean;
  onChangeStatus: (v: "active" | "inactive") => void;
  onChangeReason: (v: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function SupplierStatusSubModal({
  newStatus,
  statusReason,
  busy,
  onChangeStatus,
  onChangeReason,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[10000] grid place-items-center p-4">
      <div className="bg-white rounded-xl p-5 max-w-[440px] w-full shadow-xl">
        <h4 className="text-base font-bold m-0 mb-2">Thay đổi tình trạng hợp tác (UC7.4)</h4>
        <p className="text-xs text-gray-500 m-0 mb-3">
          {newStatus === "inactive"
            ? "Khi ngừng hợp tác, NCC này sẽ không thể dùng để lập phiếu nhập mới hoặc xác nhận nhập hàng. Lịch sử phiếu cũ vẫn được bảo toàn."
            : "Kích hoạt lại đối tác cung ứng vào danh mục đối tác hoạt động."}
        </p>
        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="text-xs font-semibold">
            Trạng thái mới:
            <select
              value={newStatus}
              onChange={(e) => onChangeStatus(e.target.value as "active" | "inactive")}
              className="w-full p-2 rounded-md border border-gray-300 mt-1 bg-white"
            >
              <option value="active">Đang hợp tác</option>
              <option value="inactive">Ngừng hợp tác</option>
            </select>
          </label>
          <label className="text-xs font-semibold">
            Lý do thay đổi (bắt buộc theo UC7.4):
            <textarea
              required
              rows={2}
              placeholder="Nhập lý do ngừng hợp tác hoặc kích hoạt lại..."
              value={statusReason}
              onChange={(e) => onChangeReason(e.target.value)}
              className="w-full p-2 rounded-md border border-gray-300 mt-1 text-xs"
            />
          </label>
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="bg-white border border-gray-300 px-3 py-1.5 rounded-md text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`text-white border-0 px-4 py-1.5 rounded-md text-xs font-bold cursor-pointer disabled:opacity-60 ${
                newStatus === "active" ? "bg-[var(--color-forest,#15803D)]" : "bg-red-600"
              }`}
            >
              Xác nhận đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
