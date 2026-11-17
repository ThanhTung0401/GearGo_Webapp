import type { useApp } from "../../../App";
import { fmt, type ImportReceipt } from "../../../store";

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

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Lọc theo Nhà cung cấp:</span>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "6px 12px", fontSize: "0.82rem", background: "white" }}
          >
            <option value="all">Tất cả nhà cung cấp</option>
            {app.suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.displayCode ?? s.id})</option>
            ))}
          </select>
        </div>
        <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: "6px 14px", border: "1px solid var(--color-bone)", fontSize: "0.85rem" }}>
          Tổng giá trị nhập hiệu lực: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(totalImportAssetValue)}</strong>
          {isRealApi && importReport && importReport.tongGiaTriGoc !== importReport.tongGiaTriHieuLuc && (
            <span style={{ fontSize: "0.75rem", color: "#6B7280", marginLeft: 8 }}>(Gốc: {fmt(Number(importReport.tongGiaTriGoc ?? 0))})</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
          <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
            Danh sách chứng từ nhập kho thực tế (UC10.3)
          </h3>
          <p style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 12 }}>
            Chỉ tính các phiếu đã hoàn tất nhập kho theo biên bản kiểm định. Nhấn nút "Mở chứng từ" để đối chiếu vật phẩm.
          </p>
          <div className="responsive-table" style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                  {["Mã phiếu", "Nhà cung cấp", "Ngày xác nhận", "Số dòng", "Tổng giá trị", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isRealApi && importReport?.phieu?.items ? (
                  (importReport.phieu.items as any[]).map((p) => {
                    const matchedReceipt = app.importReceipts.find((r) => r.id === String(p.maPhieuNhap));
                    return (
                      <tr key={p.maPhieuNhap} style={{ borderTop: "1px solid var(--color-bone)", fontSize: "0.8rem" }}>
                        <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{p.maPhieuHienThi || p.maPhieuNhap}</td>
                        <td style={{ padding: "8px 10px" }}>{p.tenNhaCungCapHienTai}</td>
                        <td style={{ padding: "8px 10px", color: "#6B7280" }}>{p.ngayNhapThucTe ? new Date(p.ngayNhapThucTe).toLocaleDateString("vi-VN") : "—"}</td>
                        <td style={{ padding: "8px 10px" }}>{(p.dong ?? []).length} sản phẩm</td>
                        <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(Number(p.tongGiaTriHieuLuc ?? p.tongGiaTriGoc ?? 0))}</td>
                        <td style={{ padding: "8px 10px" }}>
                          {matchedReceipt ? (
                            <button onClick={() => setViewingReceipt(matchedReceipt)} className="btn btn-secondary btn-sm" style={{ padding: "3px 8px", fontSize: "0.72rem" }}>
                              🔍 Mở chứng từ
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>#{p.maPhieuNhap}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  inRangeImports.map((r) => {
                    const totalVal = r.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
                    return (
                      <tr key={r.id} style={{ borderTop: "1px solid var(--color-bone)", fontSize: "0.8rem" }}>
                        <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{r.displayCode ?? r.id}</td>
                        <td style={{ padding: "8px 10px" }}>{r.supplierName}</td>
                        <td style={{ padding: "8px 10px", color: "#6B7280" }}>{r.confirmedAt || r.createdAt}</td>
                        <td style={{ padding: "8px 10px" }}>{r.lines.length} sản phẩm</td>
                        <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(totalVal)}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <button
                            onClick={() => setViewingReceipt(r)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "3px 8px", fontSize: "0.72rem" }}
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
        </div>

        <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
          <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
            Thiết bị khấu hao & Chuyển loại (Giáng cấp)
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 14 }}>
            Danh sách thiết bị đã qua nhiều lần sử dụng và được chuyển sang dòng sản phẩm Tiết kiệm (khấu hao tài sản).
          </p>
          {movedEquips.length === 0 ? (
            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 14, textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>
              Chưa có thiết bị nào được giáng cấp loại.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {movedEquips.map((e) => {
                const curr = app.products.find((p) => p.id === e.productId);
                const orig = app.products.find((p) => p.id === e.originalProductId);
                return (
                  <div key={e.id} style={{ background: "#FFF7ED", border: "1px solid #FFEDD5", borderRadius: 8, padding: "10px 12px" }}>
                    <div className="flex justify-between">
                      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{e.displayCode ?? e.id}</strong>
                      <span style={{ fontSize: "0.72rem", color: "#C2410C", fontWeight: 700 }}>Đã thuê {e.rentCount} lần</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#4B5563", marginTop: 2 }}>
                      Gốc: <strong>{orig?.name}</strong> → Hiện tại: <strong>{curr?.name}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isRealApi && (
        <div className="grid gap-6 mt-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
            <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 8, fontSize: "0.95rem" }}>
              Điều chỉnh phiếu nhập đã áp dụng (UC10.3)
            </h3>
            <p style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 12 }}>
              Tổng phiếu điều chỉnh: <strong>{importAdjReport?.soPhieuDieuChinh ?? 0}</strong> · Chênh lệch SL:{" "}
              <strong>{importAdjReport?.tongDeltaSoLuong ?? 0}</strong> · Chênh lệch giá trị:{" "}
              <strong style={{ fontFamily: "var(--font-mono)" }}>{fmt(Number(importAdjReport?.tongDeltaGiaTri ?? 0))}</strong>
            </p>
            {Array.isArray(importAdjReport?.items?.items) && importAdjReport.items.items.length > 0 ? (
              <div className="responsive-table" style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Phiếu ĐC</th>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Phiếu nhập / Loại</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Δ SL</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Δ Giá trị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(importAdjReport.items.items as any[]).map((item, idx) => (
                      <tr key={item.maPhieuDieuChinh ?? idx} style={{ borderTop: "1px solid var(--color-bone)" }}>
                        <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                          #{item.maPhieuDieuChinh ?? "—"}
                        </td>
                        <td style={{ padding: "6px 8px" }} title={item.lyDo ?? ""}>
                          {item.maPhieuNhapHienThi || `PN #${item.maPhieuNhap ?? "—"}`}
                          {item.loaiDieuChinh ? ` · ${item.loaiDieuChinh}` : ""}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.deltaSoLuong ?? 0}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                          {fmt(Number(item.deltaGiaTri ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12, textAlign: "center", color: "#6B7280", fontSize: "0.8rem" }}>
                Không có điều chỉnh nhập nào trong kỳ.
              </div>
            )}
          </div>

          <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
            <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 8, fontSize: "0.95rem" }}>
              Lịch sử đơn giá nhập theo sản phẩm (UC10.3)
            </h3>
            <p style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 12 }}>
              Đơn giá bình quân hiệu lực, giá thấp nhất và cao nhất theo từng sản phẩm nguồn trong kỳ.
            </p>
            {Array.isArray(priceHistoryReport?.sanPham) && priceHistoryReport.sanPham.length > 0 ? (
              <div className="responsive-table" style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Sản phẩm</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Lần nhập</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>ĐG BQ hiệu lực</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Thấp - Cao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(priceHistoryReport.sanPham as any[]).map((sp) => (
                      <tr key={sp.maSanPhamNguon} style={{ borderTop: "1px solid var(--color-bone)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 600 }}>{sp.tenSanPham}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>{sp.soLanNhap ?? 0}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>
                          {sp.donGiaBinhQuanHieuLuc != null ? fmt(Number(sp.donGiaBinhQuanHieuLuc)) : "—"}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--font-mono)", color: "#6B7280" }}>
                          {sp.donGiaThapNhat != null ? fmt(Number(sp.donGiaThapNhat)) : "—"} – {sp.donGiaCaoNhat != null ? fmt(Number(sp.donGiaCaoNhat)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12, textAlign: "center", color: "#6B7280", fontSize: "0.8rem" }}>
                Chưa có lịch sử biến động đơn giá trong kỳ.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
