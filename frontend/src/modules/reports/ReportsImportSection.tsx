import type { useApp } from "../../App";
import { fmt, formatBackendEnum, formatDateVi, type ImportReceipt } from "../../store";
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";

interface ReportsImportSectionProps {
  app: ReturnType<typeof useApp>;
  isRealApi: boolean;
  supplierFilter: string;
  setSupplierFilter: (val: string) => void;
  totalImportAssetValue: number;
  importReport: any;
  importAdjReport: any;
  priceHistoryReport: any;
  inRangeImports: ImportReceipt[];
  setViewingReceipt: (receipt: ImportReceipt) => void;
}

/**
 * Khối Báo cáo nhập hàng, thiết bị giáng cấp và biến động đơn giá (UC10.3).
 */
export function ReportsImportSection({
  app,
  isRealApi,
  supplierFilter,
  setSupplierFilter,
  totalImportAssetValue,
  importReport,
  importAdjReport,
  priceHistoryReport,
  inRangeImports,
  setViewingReceipt,
}: ReportsImportSectionProps) {
  const movedEquips = app.equipment.filter((e) => e.productId !== e.originalProductId);
  const realReceipts = (importReport?.phieu?.items ?? []) as any[];
  const useRealReceipts = Boolean(isRealApi && importReport?.phieu?.items);
  const realReceiptPaging = usePagination(realReceipts, 6);
  const mockReceiptPaging = usePagination(inRangeImports, 6);
  const movedPaging = usePagination(movedEquips, 5);
  const adjItems = (importAdjReport?.items?.items ?? []) as any[];
  const adjPaging = usePagination(adjItems, 6);
  const priceItems = (priceHistoryReport?.sanPham ?? []) as any[];
  const pricePaging = usePagination(priceItems, 6);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.82rem] font-semibold">Lọc theo Nhà cung cấp:</span>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="adm-select adm-select--sm"
          >
            <option value="all">Tất cả nhà cung cấp</option>
            {app.suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.displayCode ?? s.id})</option>
            ))}
          </select>
        </div>
        <div className="adm-card--parchment px-3.5 py-1.5 text-[0.85rem]">
          Tổng giá trị nhập hiệu lực: <strong className="adm-cell-mono text-[var(--color-forest)]">{fmt(totalImportAssetValue)}</strong>
          {isRealApi && importReport && importReport.tongGiaTriGoc !== importReport.tongGiaTriHieuLuc && (
            <span className="adm-hint-text text-[0.75rem] ml-2">(Gốc: {fmt(Number(importReport.tongGiaTriGoc ?? 0))})</span>
          )}
        </div>
      </div>

      <div className="adm-import-grid mb-6">
        <div className="adm-card adm-card--padded">
          <h3 className="adm-section-heading mb-3">
            Danh sách chứng từ nhập kho thực tế (UC10.3)
          </h3>
          <p className="adm-hint-text text-[0.78rem] mb-3">
            Chỉ tính các phiếu đã hoàn tất nhập kho theo biên bản kiểm định. Nhấn nút "Mở chứng từ" để đối chiếu vật phẩm.
          </p>
          <div className="responsive-table adm-table-scroll">
            <table className="adm-table adm-table--md">
              <thead>
                <tr>
                  {["Mã phiếu", "Nhà cung cấp", "Ngày xác nhận", "Số dòng", "Tổng giá trị", "Thao tác"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {useRealReceipts ? (
                  realReceiptPaging.pagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-xs text-gray-500">
                        Không có chứng từ nhập kho nào trong kỳ.
                      </td>
                    </tr>
                  ) : (
                    realReceiptPaging.pagedItems.map((p) => {
                      // [REP-04]: nếu phiếu không nằm trong 50 phiếu đầu của app.importReceipts, dựng
                      // trực tiếp ImportReceipt từ p/p.dong để nút "🔍 Mở chứng từ" luôn hoạt động.
                      const matchedReceipt =
                        app.importReceipts.find((r) => r.id === String(p.maPhieuNhap)) ??
                        ({
                          id: String(p.maPhieuNhap),
                          displayCode: p.maPhieuHienThi || String(p.maPhieuNhap),
                          supplierId: "",
                          supplierName: p.tenNhaCungCapHienTai ?? "",
                          receivedAt: p.ngayNhapThucTe ?? "",
                          status: "Đã nhập kho",
                          totalValue: Number(p.tongGiaTriHieuLuc ?? p.tongGiaTriGoc ?? 0),
                          lines: (p.dong ?? []).map((d: any) => ({
                            productId: String(d.maSanPhamNguon ?? d.maSanPham ?? ""),
                            productName: d.tenSanPhamLucNhap ?? d.tenSanPham ?? "",
                            quantity: Number(d.soLuongHieuLuc ?? d.soLuongGoc ?? 0),
                            unitPrice: Number(d.donGiaGoc ?? 0),
                          })),
                        } as any);
                      return (
                        <tr key={p.maPhieuNhap}>
                          <td className="adm-cell-code">{p.maPhieuHienThi || p.maPhieuNhap}</td>
                          <td>{p.tenNhaCungCapHienTai}</td>
                          <td className="adm-hint-text whitespace-nowrap">{formatDateVi(p.ngayNhapThucTe)}</td>
                          <td>{(p.dong ?? []).length} sản phẩm</td>
                          <td className="adm-cell-mono font-bold text-[var(--color-forest)]">{fmt(Number(p.tongGiaTriHieuLuc ?? p.tongGiaTriGoc ?? 0))}</td>
                          <td>
                            <button onClick={() => setViewingReceipt(matchedReceipt)} className="btn btn-secondary btn-sm adm-btn-xs">
                              🔍 Mở chứng từ
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )
                ) : mockReceiptPaging.pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-xs text-gray-500">
                      Không có chứng từ nhập kho nào trong kỳ.
                    </td>
                  </tr>
                ) : (
                  mockReceiptPaging.pagedItems.map((r) => {
                    const totalVal = r.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
                    return (
                      <tr key={r.id}>
                        <td className="adm-cell-code">{r.displayCode ?? r.id}</td>
                        <td>{r.supplierName}</td>
                        <td className="adm-hint-text whitespace-nowrap">{formatDateVi(r.confirmedAt || r.createdAt)}</td>
                        <td>{r.lines.length} sản phẩm</td>
                        <td className="adm-cell-mono font-bold text-[var(--color-forest)]">{fmt(totalVal)}</td>
                        <td>
                          <button
                            onClick={() => setViewingReceipt(r)}
                            className="btn btn-secondary btn-sm adm-btn-xs"
                          >
                            🔍 Mở chứng từ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={useRealReceipts ? realReceiptPaging.page : mockReceiptPaging.page}
            totalPages={useRealReceipts ? realReceiptPaging.totalPages : mockReceiptPaging.totalPages}
            totalItems={useRealReceipts ? realReceiptPaging.totalItems : mockReceiptPaging.totalItems}
            startIndex={useRealReceipts ? realReceiptPaging.startIndex : mockReceiptPaging.startIndex}
            endIndex={useRealReceipts ? realReceiptPaging.endIndex : mockReceiptPaging.endIndex}
            onPageChange={useRealReceipts ? realReceiptPaging.setPage : mockReceiptPaging.setPage}
            itemLabel="phiếu nhập"
          />
        </div>

        <div className="adm-card adm-card--padded">
          <h3 className="adm-section-heading mb-3">
            Thiết bị khấu hao & Chuyển loại (Giáng cấp)
          </h3>
          <p className="adm-hint-text text-[0.8rem] mb-3.5">
            Danh sách thiết bị đã qua nhiều lần sử dụng và được chuyển sang dòng sản phẩm Tiết kiệm (khấu hao tài sản).
          </p>
          {movedEquips.length === 0 ? (
            <div className="adm-card--parchment text-center text-[#6B7280] text-[0.85rem] p-3.5">
              Chưa có thiết bị nào được giáng cấp loại.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {movedPaging.pagedItems.map((e) => {
                  const curr = app.products.find((p) => p.id === e.productId);
                  const orig = app.products.find((p) => p.id === e.originalProductId);
                  return (
                    <div key={e.id} className="adm-report-depreciation-card">
                      <div className="flex justify-between">
                        <strong className="adm-cell-mono text-[var(--color-forest)]">{e.displayCode ?? e.id}</strong>
                        <span className="text-[0.72rem] text-[#C2410C] font-bold">Đã thuê {e.rentCount} lần</span>
                      </div>
                      <div className="text-[0.78rem] text-[#4B5563] mt-0.5">
                        Gốc: <strong>{orig?.name}</strong> → Hiện tại: <strong>{curr?.name}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination
                page={movedPaging.page}
                totalPages={movedPaging.totalPages}
                totalItems={movedPaging.totalItems}
                startIndex={movedPaging.startIndex}
                endIndex={movedPaging.endIndex}
                onPageChange={movedPaging.setPage}
                itemLabel="thiết bị"
              />
            </>
          )}
        </div>
      </div>

      {isRealApi && (
        <div className="adm-grid-2-lg mt-6">
          <div className="adm-card adm-card--padded">
            <h3 className="adm-section-heading mb-2">
              Điều chỉnh phiếu nhập đã áp dụng (UC10.3)
            </h3>
            <p className="adm-hint-text text-[0.78rem] mb-3">
              Tổng phiếu điều chỉnh: <strong>{importAdjReport?.soPhieuDieuChinh ?? 0}</strong> · Chênh lệch SL:{" "}
              <strong>{importAdjReport?.tongDeltaSoLuong ?? 0}</strong> · Chênh lệch giá trị:{" "}
              <strong className="adm-cell-mono">{fmt(Number(importAdjReport?.tongDeltaGiaTri ?? 0))}</strong>
            </p>
            {adjItems.length > 0 ? (
              <>
                <div className="responsive-table adm-table-scroll">
                  <table className="adm-table adm-table--sm">
                    <thead>
                      <tr>
                        <th>Phiếu ĐC</th>
                        <th>Phiếu nhập / Loại</th>
                        <th className="adm-cell-right">Δ SL</th>
                        <th className="adm-cell-right">Δ Giá trị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjPaging.pagedItems.map((item, idx) => (
                        <tr key={item.maPhieuDieuChinh ?? idx}>
                          <td className="adm-cell-mono font-bold">
                            #{item.maPhieuDieuChinh ?? "—"}
                          </td>
                          <td title={item.lyDo ?? ""}>
                            {item.maPhieuNhapHienThi || `PN #${item.maPhieuNhap ?? "—"}`}
                            {item.loaiDieuChinh ? ` · ${formatBackendEnum(item.loaiDieuChinh)}` : ""}
                          </td>
                          <td className="adm-cell-right">{item.deltaSoLuong ?? 0}</td>
                          <td className="adm-cell-right adm-cell-mono">
                            {fmt(Number(item.deltaGiaTri ?? 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={adjPaging.page}
                  totalPages={adjPaging.totalPages}
                  totalItems={adjPaging.totalItems}
                  startIndex={adjPaging.startIndex}
                  endIndex={adjPaging.endIndex}
                  onPageChange={adjPaging.setPage}
                  itemLabel="điều chỉnh"
                />
              </>
            ) : (
              <div className="adm-card--parchment text-center text-[#6B7280] text-[0.8rem]">
                Không có điều chỉnh nhập nào trong kỳ.
              </div>
            )}
          </div>

          <div className="adm-card adm-card--padded">
            <h3 className="adm-section-heading mb-2">
              Lịch sử đơn giá nhập theo sản phẩm (UC10.3)
            </h3>
            <p className="adm-hint-text text-[0.78rem] mb-3">
              Đơn giá bình quân hiệu lực, giá thấp nhất và cao nhất theo từng sản phẩm nguồn trong kỳ.
            </p>
            {priceItems.length > 0 ? (
              <>
                <div className="responsive-table adm-table-scroll">
                  <table className="adm-table adm-table--sm">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th className="adm-cell-right">Lần nhập</th>
                        <th className="adm-cell-right">ĐG BQ hiệu lực</th>
                        <th className="adm-cell-right">Thấp - Cao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricePaging.pagedItems.map((sp) => (
                        <tr key={sp.maSanPhamNguon}>
                          <td className="font-semibold">{sp.tenSanPham}</td>
                          <td className="adm-cell-right">{sp.soLanNhap ?? 0}</td>
                          <td className="adm-cell-right adm-cell-mono font-bold text-[var(--color-forest)]">
                            {sp.donGiaBinhQuanHieuLuc != null ? fmt(Number(sp.donGiaBinhQuanHieuLuc)) : "—"}
                          </td>
                          <td className="adm-cell-right adm-cell-mono adm-hint-text">
                            {sp.donGiaThapNhat != null ? fmt(Number(sp.donGiaThapNhat)) : "—"} – {sp.donGiaCaoNhat != null ? fmt(Number(sp.donGiaCaoNhat)) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={pricePaging.page}
                  totalPages={pricePaging.totalPages}
                  totalItems={pricePaging.totalItems}
                  startIndex={pricePaging.startIndex}
                  endIndex={pricePaging.endIndex}
                  onPageChange={pricePaging.setPage}
                  itemLabel="sản phẩm"
                />
              </>
            ) : (
              <div className="adm-card--parchment text-center text-[#6B7280] text-[0.8rem]">
                Chưa có lịch sử biến động đơn giá trong kỳ.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
