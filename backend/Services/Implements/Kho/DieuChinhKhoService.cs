using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DieuChinhKho;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using GearGo.Services.Queries;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Dịch vụ lập, quản lý và duyệt áp dụng điều chỉnh kho.
/// </summary>
public partial class DieuChinhKhoService : IDieuChinhKhoService
{
    private static readonly string[] LoaiDieuChinhHopLe =
    {
        "SaiGiaNhap",
        "KhaiBaoThieuThietBi",
        "KhaiBaoTrungSaiThietBi",
        "KiemKeSaiLech",
        DomainConstants.Lifecycle.Downgrade,
        DomainConstants.Lifecycle.Decommission
    };

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

    public async Task<Result<DieuChinhKhoResponse>> LapPhieuAsync(LapDieuChinhKhoRequest request, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var loi = KiemTraYeuCauLapPhieu(request);
        if (loi != null) return loi;

        var nhanVien = nvCheck.DuLieu!;
        var phieu = new PhieuDieuChinhKho
        {
            LoaiDieuChinh = request.LoaiDieuChinh,
            MaPhieuNhapLienQuan = request.MaPhieuNhapLienQuan,
            LyDo = request.LyDo.Trim(),
            BangChung = request.BangChung != null ? JsonSerializer.Serialize(request.BangChung) : null,
            MaNguoiLap = nhanVien.MaNhanVien,
            TenNguoiLapLucLap = nhanVien.HoTen,
            ThoiDiemLap = DateTime.UtcNow,
            TrangThai = DomainConstants.Status.PendingApproval
        };

        foreach (var dong in request.ChiTiet)
        {
            var snapshot = await TaoSnapshotGiaTriTruocAsync(request, dong);
            if (!snapshot.ThanhCong)
                return Result<DieuChinhKhoResponse>.Loi(snapshot.MaLoi!, snapshot.ThongDiep!);

            phieu.ChiTietDieuChinhKhos.Add(new ChiTietDieuChinhKho
            {
                MaThietBi = dong.MaThietBi,
                MaChiTietPhieuNhap = dong.MaChiTietPhieuNhap,
                GiaTriTruoc = snapshot.DuLieu,
                GiaTriSau = dong.GiaTriDeNghiSau != null ? JsonSerializer.Serialize(dong.GiaTriDeNghiSau) : null,
                GhiChu = dong.GhiChu
            });
        }

        _context.PhieuDieuChinhKhos.Add(phieu);
        await _context.SaveChangesAsync();
        return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
    }

    private static Result<DieuChinhKhoResponse>? KiemTraYeuCauLapPhieu(LapDieuChinhKhoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.LoaiDieuChinh))
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Loại điều chỉnh không được để trống.");
        if (string.IsNullOrWhiteSpace(request.LyDo))
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Lý do điều chỉnh không được để trống.");
        if (request.ChiTiet == null || request.ChiTiet.Count == 0)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EmptyList, "Danh sách chi tiết điều chỉnh không được rỗng.");
        if (!LoaiDieuChinhHopLe.Contains(request.LoaiDieuChinh))
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, $"Loại điều chỉnh '{request.LoaiDieuChinh}' không hợp lệ.");
        if ((request.LoaiDieuChinh == "SaiGiaNhap" || request.LoaiDieuChinh == "KhaiBaoThieuThietBi") && !request.MaPhieuNhapLienQuan.HasValue)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Phải cung cấp mã phiếu nhập liên quan cho loại điều chỉnh này.");
        return null;
    }

    private async Task<Result<string?>> TaoSnapshotGiaTriTruocAsync(
        LapDieuChinhKhoRequest request, DongDieuChinhRequest dong)
    {
        if (request.LoaiDieuChinh is "SaiGiaNhap" or "KhaiBaoThieuThietBi")
        {
            if (!dong.MaChiTietPhieuNhap.HasValue || !request.MaPhieuNhapLienQuan.HasValue)
            {
                string msg = request.LoaiDieuChinh == "SaiGiaNhap"
                    ? "Dòng điều chỉnh sai giá phải gắn mã chi tiết phiếu nhập."
                    : "Bổ sung thiết bị thiếu phải chỉ rõ dòng phiếu nhập gốc.";
                return Result<string?>.Loi(DomainConstants.Errors.InvalidData, msg);
            }

            var maPhieu = request.MaPhieuNhapLienQuan.Value;
            var ctpn = await _context.ChiTietPhieuNhaps.AsNoTracking()
                .FirstOrDefaultAsync(c => c.MaChiTietPhieuNhap == dong.MaChiTietPhieuNhap.Value && c.MaPhieuNhap == maPhieu);
            if (ctpn == null)
                return Result<string?>.Loi(DomainConstants.Errors.MismatchSourceReceipt, "Dòng chi tiết không thuộc phiếu nhập gốc đã chỉ định.");

            if (request.LoaiDieuChinh == "SaiGiaNhap")
            {
                await GiaTriNhapHieuLucQuery.TinhGiaTriHieuLucPhieuNhapAsync(_context, maPhieu);
                return Result<string?>.Ok(JsonSerializer.Serialize(new { donGiaHieuLuc = ctpn.DonGiaNhap }));
            }

            return Result<string?>.Ok(JsonSerializer.Serialize(new { trangThai = "ChuaKhaiBao", maSanPham = ctpn.MaSanPham }));
        }

        if (!dong.MaThietBi.HasValue)
            return Result<string?>.Loi(DomainConstants.Errors.InvalidData, $"Loại điều chỉnh '{request.LoaiDieuChinh}' bắt buộc phải gắn mã thiết bị cụ thể.");

        var tb = await _context.ThietBis.AsNoTracking().FirstOrDefaultAsync(t => t.MaThietBi == dong.MaThietBi.Value);
        if (tb == null)
            return Result<string?>.Loi(DomainConstants.Errors.EquipmentNotFound, $"Không tìm thấy thiết bị #{dong.MaThietBi.Value}.");
        if (tb.TrangThaiSuDung == TrangThaiThietBi.DangThue)
            return Result<string?>.Loi(DomainConstants.Errors.EquipmentNotRecovered, $"Thiết bị #{tb.MaThietBiHienThi} đang cho thuê, không thể lập điều chỉnh.");

        return Result<string?>.Ok(JsonSerializer.Serialize(new
        {
            maSanPhamHienTai = tb.MaSanPhamHienTai,
            trangThaiSuDung = tb.TrangThaiSuDung.ToString(),
            tinhTrang = tb.TinhTrang
        }));
    }

    public async Task<Result<DieuChinhKhoResponse>> CapNhatNhapAsync(long id, LapDieuChinhKhoRequest request, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong) return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var phieu = await _context.PhieuDieuChinhKhos.Include(p => p.ChiTietDieuChinhKhos)
            .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == id);
        if (phieu == null) return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu điều chỉnh.");
        if (phieu.TrangThai != DomainConstants.Status.Draft)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidState, "Chỉ có thể sửa phiếu điều chỉnh khi ở trạng thái Nháp.");

        phieu.LyDo = request.LyDo.Trim();
        phieu.BangChung = request.BangChung != null ? JsonSerializer.Serialize(request.BangChung) : null;
        await _context.SaveChangesAsync();
        return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
    }

    public async Task<Result<DieuChinhKhoResponse>> GuiDuyetAsync(long id, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong) return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var phieu = await _context.PhieuDieuChinhKhos.Include(p => p.ChiTietDieuChinhKhos)
            .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == id);
        if (phieu == null) return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu điều chỉnh.");
        if (phieu.TrangThai == DomainConstants.Status.Applied)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptAlreadyApplied, "Phiếu điều chỉnh đã được áp dụng, không thể gửi duyệt lại.");

        phieu.TrangThai = DomainConstants.Status.PendingApproval;
        await _context.SaveChangesAsync();
        return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
    }

    public async Task<Result<DieuChinhKhoResponse>> TuChoiAsync(long id, TuChoiDieuChinhRequest request, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong) return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var phieu = await _context.PhieuDieuChinhKhos.Include(p => p.ChiTietDieuChinhKhos)
            .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == id);
        if (phieu == null) return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu điều chỉnh.");
        if (phieu.TrangThai == DomainConstants.Status.Applied)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptAlreadyApplied, "Phiếu điều chỉnh đã được áp dụng, không thể từ chối.");

        var nhanVien = nvCheck.DuLieu!;
        phieu.TrangThai = "TuChoi";
        phieu.MaNguoiDuyet = nhanVien.MaNhanVien;
        phieu.TenNguoiDuyetLucDuyet = nhanVien.HoTen;
        phieu.ThoiDiemDuyet = DateTime.UtcNow;
        phieu.LyDo = $"{phieu.LyDo} [Từ chối: {request.LyDo}]";

        await _context.SaveChangesAsync();
        return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
    }

    public async Task<Result<DieuChinhKhoResponse>> LayChiTietAsync(long id, long actorId, bool laAdmin)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong) return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var phieu = await _context.PhieuDieuChinhKhos.AsNoTracking()
            .Include(p => p.ChiTietDieuChinhKhos).ThenInclude(ct => ct.ThietBi)
            .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == id);
        if (phieu == null) return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu điều chỉnh.");

        return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
    }

    public async Task<Result<PagedResult<DieuChinhKhoResponse>>> TimPhieuAsync(
        int trang, int soMoiTrang, string? loaiDieuChinh, string? trangThai, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong) return Result<PagedResult<DieuChinhKhoResponse>>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var query = _context.PhieuDieuChinhKhos.AsNoTracking()
            .Include(p => p.ChiTietDieuChinhKhos).ThenInclude(ct => ct.ThietBi).AsQueryable();
        if (!string.IsNullOrWhiteSpace(loaiDieuChinh)) query = query.Where(p => p.LoaiDieuChinh == loaiDieuChinh);
        if (!string.IsNullOrWhiteSpace(trangThai)) query = query.Where(p => p.TrangThai == trangThai);

        int tongSo = await query.CountAsync();
        int page = Math.Max(1, trang);
        int pageSize = Math.Clamp(soMoiTrang, 1, DomainConstants.Policies.MaxPageSize);

        var items = await query.OrderByDescending(p => p.MaPhieuDieuChinh)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Result<PagedResult<DieuChinhKhoResponse>>.Ok(new PagedResult<DieuChinhKhoResponse>
        {
            Items = items.Select(MapToResponse).ToList(),
            TotalItems = tongSo,
            CurrentPage = page,
            PageSize = pageSize
        });
    }

    public async Task<Result<GiaTriNhapHieuLucResponse>> TinhGiaTriSauDieuChinhAsync(long maPhieuNhap, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong) return Result<GiaTriNhapHieuLucResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

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
            MaPhieuDieuChinh = p.MaPhieuDieuChinh, MaPhieuNhapLienQuan = p.MaPhieuNhapLienQuan,
            LoaiDieuChinh = p.LoaiDieuChinh, LyDo = p.LyDo, BangChung = bangChungList,
            TrangThai = p.TrangThai, MaNguoiLap = p.MaNguoiLap, TenNguoiLapLucLap = p.TenNguoiLapLucLap,
            ThoiDiemLap = p.ThoiDiemLap, MaNguoiDuyet = p.MaNguoiDuyet, TenNguoiDuyetLucDuyet = p.TenNguoiDuyetLucDuyet,
            ThoiDiemDuyet = p.ThoiDiemDuyet, ThoiDiemApDung = p.ThoiDiemApDung,
            ChiTiet = p.ChiTietDieuChinhKhos.Select(ct => new ChiTietDieuChinhKhoDto
            {
                MaChiTietDieuChinh = ct.MaChiTietDieuChinh, MaThietBi = ct.MaThietBi,
                MaThietBiHienThi = ct.ThietBi?.MaThietBiHienThi, MaChiTietPhieuNhap = ct.MaChiTietPhieuNhap,
                GiaTriTruoc = ct.GiaTriTruoc, GiaTriSau = ct.GiaTriSau, GhiChu = ct.GhiChu
            }).ToList()
        };
    }
}
