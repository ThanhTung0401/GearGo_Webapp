using System;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhieuNhap;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Dịch vụ quản lý phiếu nhập nháp và tra cứu phiếu nhập kho.
/// </summary>
public partial class PhieuNhapService : IPhieuNhapService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PhieuNhapService> _logger;

    private static readonly Expression<Func<PhieuNhapHang, PhieuNhapResponse>> MapPhieuNhapExpression = p => new PhieuNhapResponse
    {
        MaPhieuNhap = p.MaPhieuNhap,
        MaPhieuHienThi = p.MaPhieuHienThi,
        MaNhaCungCap = p.MaNhaCungCap,
        TenNhaCungCap = p.NhaCungCap.TenNhaCungCap,
        MaNguoiLap = p.MaNguoiLap,
        TenNguoiLap = p.TenNguoiLapLucNhap ?? p.NguoiLap.HoTen,
        MaNguoiXacNhan = p.MaNguoiXacNhan,
        TenNguoiXacNhan = p.TenNguoiXacNhanLucNhap ?? (p.NguoiXacNhan != null ? p.NguoiXacNhan.HoTen : null),
        NgayLap = p.NgayLap,
        NgayNhapDuKien = p.NgayNhapDuKien,
        NgayNhapThucTe = p.NgayNhapThucTe,
        NgayXacNhan = p.NgayXacNhan,
        SoChungTuNhaCungCap = p.SoChungTuNhaCungCap,
        TongTien = p.TongTien,
        TrangThai = p.TrangThai,
        LyDoHuy = p.LyDoHuy,
        GhiChu = p.GhiChu,
        CoTheSua = p.TrangThai == TrangThaiPhieuNhap.Nhap,
        ChiTietPhieuNhaps = p.ChiTietPhieuNhaps.Select(ctPn => new ChiTietPhieuNhapResponse
        {
            MaChiTietPhieuNhap = ctPn.MaChiTietPhieuNhap,
            MaPhieuNhap = ctPn.MaPhieuNhap,
            MaSanPham = ctPn.MaSanPham,
            TenSanPham = ctPn.SanPham.TenSanPham,
            SoLuong = ctPn.SoLuong,
            DonGiaNhap = ctPn.DonGiaNhap,
            TinhTrangKhiNhap = ctPn.TinhTrangKhiNhap ?? "",
            GhiChu = ctPn.GhiChu
        }).ToList()
    };

    public PhieuNhapService(ApplicationDbContext context, ILogger<PhieuNhapService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResult<PhieuNhapResponse>> TimKiemAsync(
        string? tuKhoa,
        long? maNhaCungCap,
        TrangThaiPhieuNhap? trangThai,
        DateTime? tuNgay,
        DateTime? denNgay,
        int trang = 1,
        int soMoiTrang = 20,
        CancellationToken ct = default)
    {
        trang = Math.Max(1, trang);
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = _context.PhieuNhapHangs.AsNoTracking().AsQueryable();
        if (maNhaCungCap.HasValue) query = query.Where(x => x.MaNhaCungCap == maNhaCungCap.Value);
        if (trangThai.HasValue) query = query.Where(x => x.TrangThai == trangThai.Value);
        if (tuNgay.HasValue) query = query.Where(x => x.NgayLap >= tuNgay.Value);
        if (denNgay.HasValue) query = query.Where(x => x.NgayLap <= denNgay.Value);

        if (!string.IsNullOrWhiteSpace(tuKhoa))
        {
            var keyword = tuKhoa.Trim();
            query = query.Where(x =>
                x.MaPhieuHienThi.Contains(keyword) ||
                (x.SoChungTuNhaCungCap != null && x.SoChungTuNhaCungCap.Contains(keyword)) ||
                x.NhaCungCap.TenNhaCungCap.Contains(keyword) ||
                (x.TenNguoiLapLucNhap != null && x.TenNguoiLapLucNhap.Contains(keyword)));
        }

        var totalItems = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(x => x.NgayLap)
            .ThenByDescending(x => x.MaPhieuNhap)
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .Select(MapPhieuNhapExpression)
            .ToListAsync(ct);

        return new PagedResult<PhieuNhapResponse>
        {
            Items = items,
            TotalItems = totalItems,
            CurrentPage = trang,
            PageSize = soMoiTrang
        };
    }

    public async Task<PhieuNhapResponse> LayChiTietAsync(long id, CancellationToken ct = default)
    {
        var phieu = await _context.PhieuNhapHangs.AsNoTracking()
            .Where(x => x.MaPhieuNhap == id)
            .Select(MapPhieuNhapExpression)
            .FirstOrDefaultAsync(ct);

        if (phieu == null)
            throw new KhongTimThayException($"Không tìm thấy phiếu nhập với mã #{id}.");

        return phieu;
    }
}
