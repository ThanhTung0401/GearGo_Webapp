import { fmt, type MaintenanceReceipt, type Order } from "../../../store";
import type { HoSoVongDoiResponse } from "../../../services/api/equipmentApi";

interface Props {
  orderHistory: Order[];
  maintenanceHistory: MaintenanceReceipt[];
  hoSoApi: HoSoVongDoiResponse | null;
}

export default function LifecycleTimelineSections({
  orderHistory,
  maintenanceHistory,
  hoSoApi,
}: Props) {
  return (
    <>
      {/* Card: Lịch sử phục vụ các hợp đồng thuê */}
      <div className="border border-[var(--color-bone,#E5E7EB)] rounded-xl p-4 bg-white">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-bold text-[var(--color-bark,#1F2937)] m-0 flex items-center gap-1.5">
            📋 Lịch sử phục vụ đơn thuê ({orderHistory.length} hợp đồng)
          </h4>
        </div>

        {orderHistory.length === 0 ? (
          <div className="bg-[var(--color-cream,#F9F6F0)] rounded-lg p-4 text-center text-xs text-gray-500">
            Thiết bị mới nhập hoặc chưa được phân bổ vào đơn hàng nào gần đây.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--color-parchment,#F5F1E9)] text-[var(--color-bark,#1F2937)] font-semibold">
                  <th className="p-2 text-left">Mã đơn</th>
                  <th className="p-2 text-left">Khách hàng</th>
                  <th className="p-2 text-left">Thời gian thuê</th>
                  <th className="p-2 text-left">Trạng thái đơn</th>
                  <th className="p-2 text-left">Chứng từ kèm theo</th>
                </tr>
              </thead>
              <tbody>
                {orderHistory.map((o) => (
                  <tr key={o.id} className="border-t border-[var(--color-bone,#E5E7EB)]">
                    <td className="p-2 font-mono font-bold text-[var(--color-forest,#15803D)]">{o.id}</td>
                    <td className="p-2">
                      <div className="font-semibold">{o.customerName}</div>
                      <div className="text-[0.72rem] text-gray-500">{o.customerPhone}</div>
                    </td>
                    <td className="p-2">
                      {o.rentalStartDate} → {o.rentalEndDate}
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[0.72rem] font-semibold ${
                          o.status === "Đang thuê"
                            ? "bg-blue-100 text-blue-700"
                            : o.status === "Hoàn tất"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1 flex-wrap font-mono">
                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">BBBG-{o.id}</span>
                        {o.status === "Hoàn tất" && (
                          <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">PNT-{o.id}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card: Lịch sử bảo trì & sửa chữa */}
      <div className="border border-[var(--color-bone,#E5E7EB)] rounded-xl p-4 bg-white">
        <h4 className="text-sm font-bold text-[var(--color-bark,#1F2937)] mb-3 flex items-center gap-1.5">
          🛠 Lịch sử bảo trì & sửa chữa ({maintenanceHistory.length} đợt)
        </h4>

        {maintenanceHistory.length === 0 ? (
          <div className="bg-[var(--color-cream,#F9F6F0)] rounded-lg p-4 text-center text-xs text-gray-500">
            Thiết bị duy trì chất lượng tốt, chưa từng phải chuyển sang trạng thái bảo trì hoặc sửa chữa.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--color-parchment,#F5F1E9)] text-[var(--color-bark,#1F2937)] font-semibold">
                  <th className="p-2 text-left">Mã phiếu</th>
                  <th className="p-2 text-left">Ngày lập</th>
                  <th className="p-2 text-left">Mô tả sự cố</th>
                  <th className="p-2 text-right">Chi phí</th>
                  <th className="p-2 text-center">Nghiệm thu</th>
                  <th className="p-2 text-left">Ghi chú nghiệm thu</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceHistory.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--color-bone,#E5E7EB)]">
                    <td className="p-2 font-mono font-bold text-[var(--color-forest,#15803D)]">{m.id}</td>
                    <td className="p-2 text-gray-500">{m.createdAt}</td>
                    <td className="p-2 max-w-[200px]">{m.issueDescription}</td>
                    <td className="p-2 text-right font-semibold">{fmt(m.actualCost ?? m.estimatedCost)}</td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[0.72rem] font-semibold ${
                          m.status === "Đã nghiệm thu"
                            ? "bg-green-100 text-green-700"
                            : m.status === "Đang sửa chữa"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="p-2 text-gray-500">{m.outcomeNote || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card: Lịch sử điều chỉnh kho & giáng cấp từ API Backend (UC6.14, UC6.15) */}
      {hoSoApi?.lichSuDieuChinh && hoSoApi.lichSuDieuChinh.length > 0 && (
        <div className="border border-[var(--color-bone,#E5E7EB)] rounded-xl p-4 bg-white">
          <h4 className="text-sm font-bold text-[var(--color-bark,#1F2937)] mb-2.5 flex items-center gap-1.5">
            ⚡ Lịch sử điều chỉnh kho & vòng đời thiết bị ({hoSoApi.lichSuDieuChinh.length} phiếu)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--color-parchment,#F5F1E9)] text-[var(--color-bark)] font-semibold">
                  <th className="p-2 text-left">Mã phiếu</th>
                  <th className="p-2 text-left">Loại điều chỉnh</th>
                  <th className="p-2 text-left">Lý do</th>
                  <th className="p-2 text-left">Thời điểm</th>
                  <th className="p-2 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {hoSoApi.lichSuDieuChinh.map((dc) => {
                  const approved = dc.trangThai === "DaDuyet" || dc.trangThai === "ApDung";
                  return (
                    <tr key={dc.maPhieuDieuChinh} className="border-t border-[var(--color-bone)]">
                      <td className="p-2 font-mono font-bold text-[var(--color-forest)]">
                        PDCK-{dc.maPhieuDieuChinh}
                      </td>
                      <td className="p-2 font-semibold">{dc.loaiDieuChinh}</td>
                      <td className="p-2 text-gray-600">{dc.lyDo || "—"}</td>
                      <td className="p-2 text-gray-500">{dc.thoiDiemLap}</td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[0.72rem] font-bold ${
                            approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {dc.trangThai}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hiển thị giá nhập cho Quản trị viên (UC54 / UC6.9) */}
      {hoSoApi?.giaNhap !== undefined && hoSoApi?.giaNhap !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
          🔒 <strong>Chế độ Quản trị viên:</strong> Giá vốn nhập gốc được bảo mật là{" "}
          <strong>{fmt(hoSoApi.giaNhap)}</strong> (Nhân viên không xem được trường này).
        </div>
      )}
    </>
  );
}
