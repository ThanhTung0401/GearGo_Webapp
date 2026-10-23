using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DieuChinhKho;
using GearGo.Models.DTOs.Kho;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using GearGo.Services.Queries;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ lập, quản lý và duyệt áp dụng điều chỉnh kho (W5-T5 - Minh Tú)
/// </summary>
public class DieuChinhKhoService : IDieuChinhKhoService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhoService? _khoService;
    private readonly ILogger<DieuChinhKhoService>? _logger;

    public DieuChinhKhoService(
        ApplicationDbContext context,
        IKhoService? khoService = null,
        ILogger<DieuChinhKhoService>? logger = null)
    {
        _context = context;
        _khoService = khoService;
        _logger = logger;
    }

    /// <summary>
    /// Lập phiếu điều chỉnh kho mới (tự động lưu snapshot trước từ database)
    /// </summary>
    public async Task<Result<DieuChinhKhoResponse>> LapPhieuAsync(LapDieuChinhKhoRequest request, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var nhanVien = nvCheck.DuLieu!;

        if (string.IsNullOrWhiteSpace(request.LoaiDieuChinh))
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Loại điều chỉnh không được để trống.");

        if (string.IsNullOrWhiteSpace(request.LyDo))
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Lý do điều chỉnh không được để trống.");

        if (request.ChiTiet == null || request.ChiTiet.Count == 0)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EmptyList, "Danh sách chi tiết điều chỉnh không được rỗng.");

        // Kiểm tra loại điều chỉnh hợp lệ
        var loaiHopLe = new[]
        {
            "SaiGiaNhap",
            "KhaiBaoThieuThietBi",
            "KhaiBaoTrungSaiThietBi",
            "KiemKeSaiLech",
            DomainConstants.Lifecycle.Downgrade,      // GiangCap
            DomainConstants.Lifecycle.Decommission   // NgungSuDung
        };

        if (!loaiHopLe.Contains(request.LoaiDieuChinh))
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, $"Loại điều chỉnh '{request.LoaiDieuChinh}' không hợp lệ.");

        // Các loại liên quan đến phiếu nhập phải có MaPhieuNhapLienQuan
        if ((request.LoaiDieuChinh == "SaiGiaNhap" || request.LoaiDieuChinh == "KhaiBaoThieuThietBi") && !request.MaPhieuNhapLienQuan.HasValue)
        {
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Phải cung cấp mã phiếu nhập liên quan cho loại điều chỉnh này.");
        }

        // Tạo đối tượng PhieuDieuChinhKho
        var phieu = new PhieuDieuChinhKho
        {
            LoaiDieuChinh = request.LoaiDieuChinh,
            MaPhieuNhapLienQuan = request.MaPhieuNhapLienQuan,
            LyDo = request.LyDo.Trim(),
            BangChung = request.BangChung != null ? JsonSerializer.Serialize(request.BangChung) : null,
            MaNguoiLap = nhanVien.MaNhanVien,
            TenNguoiLapLucLap = nhanVien.HoTen,
            ThoiDiemLap = DateTime.UtcNow,
            TrangThai = DomainConstants.Status.PendingApproval // Mặc định chuyển sang Chờ Duyệt
        };

        // Xử lý từng dòng chi tiết và tự động dựng snapshot GiaTriTruoc từ DB
        foreach (var dong in request.ChiTiet)
        {
            string? giaTriTruoc = null;

            if (request.LoaiDieuChinh == "SaiGiaNhap")
            {
                if (!dong.MaChiTietPhieuNhap.HasValue)
                    return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Dòng điều chỉnh sai giá phải gắn mã chi tiết phiếu nhập.");

                var ctpn = await _context.ChiTietPhieuNhaps
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.MaChiTietPhieuNhap == dong.MaChiTietPhieuNhap.Value && c.MaPhieuNhap == request.MaPhieuNhapLienQuan.Value);

                if (ctpn == null)
                    return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.MismatchSourceReceipt, "Dòng chi tiết không thuộc phiếu nhập gốc đã chỉ định.");

                // Lấy đơn giá hiệu lực gần nhất của dòng này
                var hieuLuc = await GiaTriNhapHieuLucQuery.TinhGiaTriHieuLucPhieuNhapAsync(_context, request.MaPhieuNhapLienQuan.Value);
                giaTriTruoc = JsonSerializer.Serialize(new { donGiaHieuLuc = ctpn.DonGiaNhap });
            }
            else if (request.LoaiDieuChinh == "KhaiBaoThieuThietBi")
            {
                if (!dong.MaChiTietPhieuNhap.HasValue)
                    return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Bổ sung thiết bị thiếu phải chỉ rõ dòng phiếu nhập gốc.");

                var ctpn = await _context.ChiTietPhieuNhaps
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.MaChiTietPhieuNhap == dong.MaChiTietPhieuNhap.Value && c.MaPhieuNhap == request.MaPhieuNhapLienQuan.Value);

                if (ctpn == null)
                    return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.MismatchSourceReceipt, "Dòng chi tiết không thuộc phiếu nhập gốc đã chỉ định.");

                giaTriTruoc = JsonSerializer.Serialize(new { trangThai = "ChuaKhaiBao", maSanPham = ctpn.MaSanPham });
            }
            else
            {
                // Các loại gắn với thiết bị cụ thể
                if (!dong.MaThietBi.HasValue)
                    return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, $"Loại điều chỉnh '{request.LoaiDieuChinh}' bắt buộc phải gắn mã thiết bị cụ thể.");

                var tb = await _context.ThietBis
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.MaThietBi == dong.MaThietBi.Value);

                if (tb == null)
                    return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, $"Không tìm thấy thiết bị #{dong.MaThietBi.Value}.");

                if (tb.TrangThaiSuDung == TrangThaiThietBi.DangThue)
                    return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotRecovered, $"Thiết bị #{tb.MaThietBiHienThi} đang cho thuê, không thể lập điều chỉnh.");

                giaTriTruoc = JsonSerializer.Serialize(new
                {
                    maSanPhamHienTai = tb.MaSanPhamHienTai,
                    trangThaiSuDung = tb.TrangThaiSuDung.ToString(),
                    tinhTrang = tb.TinhTrang
                });
            }

            string? giaTriSau = dong.GiaTriDeNghiSau != null ? JsonSerializer.Serialize(dong.GiaTriDeNghiSau) : null;

            phieu.ChiTietDieuChinhKhos.Add(new ChiTietDieuChinhKho
            {
                MaThietBi = dong.MaThietBi,
                MaChiTietPhieuNhap = dong.MaChiTietPhieuNhap,
                GiaTriTruoc = giaTriTruoc,
                GiaTriSau = giaTriSau,
                GhiChu = dong.GhiChu
            });
        }

        _context.PhieuDieuChinhKhos.Add(phieu);
        await _context.SaveChangesAsync();

        return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
    }

    /// <summary>
    /// Cập nhật thông tin phiếu điều chỉnh khi còn ở trạng thái nháp
    /// </summary>
    public async Task<Result<DieuChinhKhoResponse>> CapNhatNhapAsync(long id, LapDieuChinhKhoRequest request, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var phieu = await _context.PhieuDieuChinhKhos
            .Include(p => p.ChiTietDieuChinhKhos)
            .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == id);

        if (phieu == null)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu điều chỉnh.");

        if (phieu.TrangThai != DomainConstants.Status.Draft)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidState, "Chỉ có thể sửa phiếu điều chỉnh khi ở trạng thái Nháp.");

        phieu.LyDo = request.LyDo.Trim();
        phieu.BangChung = request.BangChung != null ? JsonSerializer.Serialize(request.BangChung) : null;

        await _context.SaveChangesAsync();
        return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
    }

    /// <summary>
    /// Gửi duyệt phiếu điều chỉnh (khóa nội dung, chuyển sang ChoDuyet)
    /// </summary>
    public async Task<Result<DieuChinhKhoResponse>> GuiDuyetAsync(long id, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var phieu = await _context.PhieuDieuChinhKhos
            .Include(p => p.ChiTietDieuChinhKhos)
            .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == id);

        if (phieu == null)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu điều chỉnh.");

        if (phieu.TrangThai == DomainConstants.Status.Applied)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptAlreadyApplied, "Phiếu điều chỉnh đã được áp dụng, không thể gửi duyệt lại.");

        phieu.TrangThai = DomainConstants.Status.PendingApproval;
        await _context.SaveChangesAsync();

        return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
    }

    /// <summary>
    /// Quản trị viên từ chối phiếu điều chỉnh
    /// </summary>
    public async Task<Result<DieuChinhKhoResponse>> TuChoiAsync(long id, TuChoiDieuChinhRequest request, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var nhanVien = nvCheck.DuLieu!;

        var phieu = await _context.PhieuDieuChinhKhos
            .Include(p => p.ChiTietDieuChinhKhos)
            .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == id);

        if (phieu == null)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu điều chỉnh.");

        if (phieu.TrangThai == DomainConstants.Status.Applied)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptAlreadyApplied, "Phiếu điều chỉnh đã được áp dụng, không thể từ chối.");

        phieu.TrangThai = "TuChoi";
        phieu.MaNguoiDuyet = nhanVien.MaNhanVien;
        phieu.TenNguoiDuyetLucDuyet = nhanVien.HoTen;
        phieu.ThoiDiemDuyet = DateTime.UtcNow;
        phieu.LyDo = $"{phieu.LyDo} [Từ chối: {request.LyDo}]";

        await _context.SaveChangesAsync();
        return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
    }

    /// <summary>
    /// Quản trị viên duyệt và áp dụng biến động kho trong một transaction nguyên tử (Serializable)
    /// </summary>
    public async Task<Result<DieuChinhKhoResponse>> DuyetVaApDungAsync(long id, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var nhanVien = nvCheck.DuLieu!;

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _context.PhieuDieuChinhKhos
                .Include(p => p.ChiTietDieuChinhKhos)
                .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == id);

            if (phieu == null)
                return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu điều chỉnh.");

            // Idempotency: Nếu đã áp dụng rồi thì trả về kết quả cũ an toàn (W5-T5-A03)
            if (phieu.TrangThai == DomainConstants.Status.Applied)
            {
                return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
            }

            if (phieu.TrangThai == "TuChoi")
            {
                return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidState, "Phiếu điều chỉnh đã bị từ chối trước đó.");
            }

            // Sắp xếp các dòng để khóa theo thứ tự ID tăng dần chống Deadlock
            var danhSachChiTiet = phieu.ChiTietDieuChinhKhos.OrderBy(ct => ct.MaChiTietDieuChinh).ToList();

            // Thực thi thay đổi theo từng loại điều chỉnh
            foreach (var ct in danhSachChiTiet)
            {
                if (phieu.LoaiDieuChinh == DomainConstants.Lifecycle.Downgrade) // GiangCap
                {
                    if (!ct.MaThietBi.HasValue)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Dòng điều chỉnh thiếu mã thiết bị.");

                    var tb = await _context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBi == ct.MaThietBi.Value);
                    if (tb == null)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị cần giáng cấp.");

                    if (tb.TrangThaiSuDung == TrangThaiThietBi.DangThue)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotRecovered, "Thiết bị đang cho thuê, không thể áp dụng giáng cấp.");

                    // Kiểm tra lại cam kết tại thời điểm duyệt (W5-T5-A07)
                    if (_khoService != null)
                    {
                        var checkAnhHuong = await _khoService.PhanTichAnhHuongAsync(new PhanTichAnhHuongRequest
                        {
                            MaThietBi = tb.MaThietBi,
                            LoaiThayDoi = DomainConstants.Lifecycle.Downgrade
                        }, actorId);

                        if (!checkAnhHuong.ThanhCong || !checkAnhHuong.DuLieu!.CoTheApDungHienTai)
                        {
                            string vuongMac = checkAnhHuong.DuLieu != null ? string.Join("; ", checkAnhHuong.DuLieu.VuongMac.Concat(checkAnhHuong.DuLieu.ThieuSoLuongTheoLich)) : "Vướng cam kết đơn thuê";
                            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.AdjustmentViolatesCommitment, $"Không thể duyệt do phát sinh thiếu cam kết: {vuongMac}");
                        }
                    }

                    // Đổi MaSanPhamHienTai và tình trạng
                    long spMoi = tb.MaSanPhamHienTai;
                    string tinhTrangMoi = tb.TinhTrang ?? "Bình thường";

                    if (!string.IsNullOrWhiteSpace(ct.GiaTriSau))
                    {
                        using var doc = JsonDocument.Parse(ct.GiaTriSau);
                        if (doc.RootElement.TryGetProperty("maSanPhamHienTai", out var spProp) || doc.RootElement.TryGetProperty("MaSanPhamHienTai", out spProp))
                        {
                            spMoi = spProp.GetInt64();
                        }
                        if (doc.RootElement.TryGetProperty("tinhTrang", out var ttProp) || doc.RootElement.TryGetProperty("TinhTrang", out ttProp))
                        {
                            tinhTrangMoi = ttProp.GetString() ?? tinhTrangMoi;
                        }
                    }

                    var spCheck = await _context.SanPhams.AnyAsync(s => s.MaSanPham == spMoi);
                    if (!spCheck)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.TargetProductMismatch, $"Sản phẩm đích #{spMoi} không tồn tại.");

                    var ttCu = tb.TrangThaiSuDung;
                    var tinhTrangCu = tb.TinhTrang;

                    tb.MaSanPhamHienTai = spMoi;
                    tb.TinhTrang = tinhTrangMoi;

                    AuditLogHelper.GhiLichSuThietBi(
                        _context,
                        tb.MaThietBi,
                        actorId,
                        ttCu.ToString(),
                        tb.TrangThaiSuDung.ToString(),
                        tinhTrangCu,
                        tb.TinhTrang,
                        $"Duyệt giáng cấp theo phiếu điều chỉnh #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
                }
                else if (phieu.LoaiDieuChinh == DomainConstants.Lifecycle.Decommission) // NgungSuDung
                {
                    if (!ct.MaThietBi.HasValue)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Dòng điều chỉnh thiếu mã thiết bị.");

                    var tb = await _context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBi == ct.MaThietBi.Value);
                    if (tb == null)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị cần ngừng sử dụng.");

                    if (tb.TrangThaiSuDung == TrangThaiThietBi.DangThue)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotRecovered, "Thiết bị đang cho thuê, không thể ngừng sử dụng.");

                    if (_khoService != null)
                    {
                        var checkAnhHuong = await _khoService.PhanTichAnhHuongAsync(new PhanTichAnhHuongRequest
                        {
                            MaThietBi = tb.MaThietBi,
                            LoaiThayDoi = DomainConstants.Lifecycle.Decommission
                        }, actorId);

                        if (!checkAnhHuong.ThanhCong || !checkAnhHuong.DuLieu!.CoTheApDungHienTai)
                        {
                            string vuongMac = checkAnhHuong.DuLieu != null ? string.Join("; ", checkAnhHuong.DuLieu.VuongMac.Concat(checkAnhHuong.DuLieu.ThieuSoLuongTheoLich)) : "Vướng cam kết đơn thuê";
                            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.AdjustmentViolatesCommitment, $"Không thể duyệt do phát sinh thiếu cam kết: {vuongMac}");
                        }
                    }

                    var ttCu = tb.TrangThaiSuDung;
                    var tinhTrangCu = tb.TinhTrang;

                    tb.TrangThaiSuDung = TrangThaiThietBi.NgungSuDung;

                    AuditLogHelper.GhiLichSuThietBi(
                        _context,
                        tb.MaThietBi,
                        actorId,
                        ttCu.ToString(),
                        tb.TrangThaiSuDung.ToString(),
                        tinhTrangCu,
                        tb.TinhTrang,
                        $"Duyệt ngừng sử dụng theo phiếu điều chỉnh #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
                }
                else if (phieu.LoaiDieuChinh == "KhaiBaoTrungSaiThietBi")
                {
                    if (!ct.MaThietBi.HasValue)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Dòng điều chỉnh thiếu mã thiết bị.");

                    var tb = await _context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBi == ct.MaThietBi.Value);
                    if (tb == null)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị khai báo sai.");

                    if (tb.TrangThaiSuDung == TrangThaiThietBi.DangThue)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotRecovered, "Thiết bị đang cho thuê, không thể loại bỏ khỏi khai thác.");

                    var ttCu = tb.TrangThaiSuDung;
                    var tinhTrangCu = tb.TinhTrang;

                    tb.TrangThaiSuDung = TrangThaiThietBi.NgungSuDung;
                    tb.TinhTrang = "KhaiBaoSai";

                    AuditLogHelper.GhiLichSuThietBi(
                        _context,
                        tb.MaThietBi,
                        actorId,
                        ttCu.ToString(),
                        tb.TrangThaiSuDung.ToString(),
                        tinhTrangCu,
                        tb.TinhTrang,
                        $"Loại bỏ hồ sơ khai báo sai theo phiếu điều chỉnh #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
                }
                else if (phieu.LoaiDieuChinh == "KhaiBaoThieuThietBi")
                {
                    if (!ct.MaChiTietPhieuNhap.HasValue)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Thiếu mã chi tiết phiếu nhập gốc để bổ sung thiết bị.");

                    var ctpn = await _context.ChiTietPhieuNhaps
                        .Include(c => c.SanPham)
                        .FirstOrDefaultAsync(c => c.MaChiTietPhieuNhap == ct.MaChiTietPhieuNhap.Value);

                    if (ctpn == null)
                        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.DetailNotFound, "Không tìm thấy dòng chi tiết phiếu nhập gốc.");

                    // Tạo thiết bị mới bổ sung từ lần nhập cũ (W5-T5-A03)
                    string prefix = ctpn.SanPham?.TenSanPham != null ? ctpn.SanPham.TenSanPham.Split(' ')[0].ToUpper() : "TB";
                    string maHienThi = $"TB-{prefix}-{DateTime.UtcNow:yyyyMMddHHmmssfff}";

                    var tbMoi = new ThietBi
                    {
                        MaChiTietPhieuNhap = ctpn.MaChiTietPhieuNhap,
                        MaSanPhamHienTai = ctpn.MaSanPham,
                        MaThietBiHienThi = maHienThi,
                        GiaNhap = ctpn.DonGiaNhap,
                        TrangThaiSuDung = TrangThaiThietBi.SanSang,
                        TinhTrang = "Mới (Bổ sung từ đợt nhập cũ)"
                    };

                    _context.ThietBis.Add(tbMoi);
                    await _context.SaveChangesAsync();

                    ct.MaThietBi = tbMoi.MaThietBi;

                    AuditLogHelper.GhiLichSuThietBi(
                        _context,
                        tbMoi.MaThietBi,
                        actorId,
                        "KhoiTao",
                        tbMoi.TrangThaiSuDung.ToString(),
                        null,
                        tbMoi.TinhTrang,
                        $"Bổ sung thiết bị thiếu từ phiếu nhập #{ctpn.MaPhieuNhap} theo phiếu điều chỉnh #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
                }
                else if (phieu.LoaiDieuChinh == "KiemKeSaiLech")
                {
                    if (ct.MaThietBi.HasValue)
                    {
                        var tb = await _context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBi == ct.MaThietBi.Value);
                        if (tb != null && !string.IsNullOrWhiteSpace(ct.GiaTriSau))
                        {
                            using var doc = JsonDocument.Parse(ct.GiaTriSau);
                            var ttCu = tb.TrangThaiSuDung;
                            var tinhTrangCu = tb.TinhTrang;

                            if ((doc.RootElement.TryGetProperty("trangThaiSuDung", out var ttProp) || doc.RootElement.TryGetProperty("TrangThaiSuDung", out ttProp)) &&
                                Enum.TryParse<TrangThaiThietBi>(ttProp.GetString(), true, out var newTt))
                            {
                                tb.TrangThaiSuDung = newTt;
                            }

                            if (doc.RootElement.TryGetProperty("tinhTrang", out var condProp) || doc.RootElement.TryGetProperty("TinhTrang", out condProp))
                            {
                                tb.TinhTrang = condProp.GetString() ?? tb.TinhTrang;
                            }

                            AuditLogHelper.GhiLichSuThietBi(
                                _context,
                                tb.MaThietBi,
                                actorId,
                                ttCu.ToString(),
                                tb.TrangThaiSuDung.ToString(),
                                tinhTrangCu,
                                tb.TinhTrang,
                                $"Điều chỉnh sau kiểm kê theo phiếu #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
                        }
                    }
                }
                // Loại "SaiGiaNhap": Không sửa CHI_TIET_PHIEU_NHAP gốc hoặc THIET_BI.gia_nhap; tính qua GiaTriNhapHieuLucQuery
            }

            // Chốt phiếu sang Đã Áp Dụng
            phieu.TrangThai = DomainConstants.Status.Applied;
            phieu.MaNguoiDuyet = nhanVien.MaNhanVien;
            phieu.TenNguoiDuyetLucDuyet = nhanVien.HoTen;
            phieu.ThoiDiemDuyet = DateTime.UtcNow;
            phieu.ThoiDiemApDung = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
        }, _logger, IsolationLevel.Serializable);
    }

    /// <summary>
    /// Xem chi tiết phiếu điều chỉnh kho
    /// </summary>
    public async Task<Result<DieuChinhKhoResponse>> LayChiTietAsync(long id, long actorId, bool laAdmin)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var phieu = await _context.PhieuDieuChinhKhos
            .AsNoTracking()
            .Include(p => p.ChiTietDieuChinhKhos)
                .ThenInclude(ct => ct.ThietBi)
            .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == id);

        if (phieu == null)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu điều chỉnh.");

        return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
    }

    /// <summary>
    /// Danh sách phiếu điều chỉnh kho phân trang
    /// </summary>
    public async Task<Result<PagedResult<DieuChinhKhoResponse>>> TimPhieuAsync(int trang, int soMoiTrang, string? loaiDieuChinh, string? trangThai, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<PagedResult<DieuChinhKhoResponse>>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var query = _context.PhieuDieuChinhKhos
            .AsNoTracking()
            .Include(p => p.ChiTietDieuChinhKhos)
                .ThenInclude(ct => ct.ThietBi)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(loaiDieuChinh))
        {
            query = query.Where(p => p.LoaiDieuChinh == loaiDieuChinh);
        }

        if (!string.IsNullOrWhiteSpace(trangThai))
        {
            query = query.Where(p => p.TrangThai == trangThai);
        }

        int tongSo = await query.CountAsync();
        int page = Math.Max(1, trang);
        int pageSize = Math.Clamp(soMoiTrang, 1, DomainConstants.Policies.MaxPageSize);

        var items = await query
            .OrderByDescending(p => p.MaPhieuDieuChinh)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Result<PagedResult<DieuChinhKhoResponse>>.Ok(new PagedResult<DieuChinhKhoResponse>
        {
            Items = items.Select(MapToResponse).ToList(),
            TotalItems = tongSo,
            CurrentPage = page,
            PageSize = pageSize
        });
    }

    /// <summary>
    /// Tính toán giá trị và số lượng nhập hiệu lực của một phiếu nhập gốc sau chuỗi điều chỉnh
    /// </summary>
    public async Task<Result<GiaTriNhapHieuLucResponse>> TinhGiaTriSauDieuChinhAsync(long maPhieuNhap, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<GiaTriNhapHieuLucResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var res = await GiaTriNhapHieuLucQuery.TinhGiaTriHieuLucPhieuNhapAsync(_context, maPhieuNhap);
        return Result<GiaTriNhapHieuLucResponse>.Ok(res);
    }

    private static DieuChinhKhoResponse MapToResponse(PhieuDieuChinhKho p)
    {
        List<string>? bangChungList = null;
        if (!string.IsNullOrEmpty(p.BangChung))
        {
            try { bangChungList = JsonSerializer.Deserialize<List<string>>(p.BangChung); } catch { }
        }

        return new DieuChinhKhoResponse
        {
            MaPhieuDieuChinh = p.MaPhieuDieuChinh,
            MaPhieuNhapLienQuan = p.MaPhieuNhapLienQuan,
            LoaiDieuChinh = p.LoaiDieuChinh,
            LyDo = p.LyDo,
            BangChung = bangChungList,
            TrangThai = p.TrangThai,
            MaNguoiLap = p.MaNguoiLap,
            TenNguoiLapLucLap = p.TenNguoiLapLucLap,
            ThoiDiemLap = p.ThoiDiemLap,
            MaNguoiDuyet = p.MaNguoiDuyet,
            TenNguoiDuyetLucDuyet = p.TenNguoiDuyetLucDuyet,
            ThoiDiemDuyet = p.ThoiDiemDuyet,
            ThoiDiemApDung = p.ThoiDiemApDung,
            ChiTiet = p.ChiTietDieuChinhKhos.Select(ct => new ChiTietDieuChinhKhoDto
            {
                MaChiTietDieuChinh = ct.MaChiTietDieuChinh,
                MaThietBi = ct.MaThietBi,
                MaThietBiHienThi = ct.ThietBi?.MaThietBiHienThi,
                MaChiTietPhieuNhap = ct.MaChiTietPhieuNhap,
                GiaTriTruoc = ct.GiaTriTruoc,
                GiaTriSau = ct.GiaTriSau,
                GhiChu = ct.GhiChu
            }).ToList()
        };
    }
}
