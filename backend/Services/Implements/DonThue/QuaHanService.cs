using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuaHan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.DonThue;

/// <summary>
/// Dịch vụ quản lý đơn thuê quá hạn, tính phí trễ dự kiến và phân tích đơn tương lai bị ảnh hưởng.
/// </summary>
public partial class QuaHanService : IQuaHanService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService _khaDungService;
    private readonly IThongBaoService _thongBaoService;
    private readonly ILogger<QuaHanService> _logger;

    public QuaHanService(
        ApplicationDbContext context,
        IKhaDungService khaDungService,
        IThongBaoService thongBaoService,
        ILogger<QuaHanService> logger)
    {
        _context = context;
        _khaDungService = khaDungService;
        _thongBaoService = thongBaoService;
        _logger = logger;
    }

    public async Task<Result<TinhPhiTreDuKienResponse>> TinhPhiTreDuKienAsync(long maChiTietBanGiao, DateTime mocTinh)
    {
        var chiTiet = await _context.ChiTietBanGiaos
            .Include(c => c.PhanCongThietBi).ThenInclude(p => p.ChiTietDon)
                .ThenInclude(cd => cd.DonThue).ThenInclude(d => d.ChinhSach)
            .FirstOrDefaultAsync(c => c.MaChiTietBanGiao == maChiTietBanGiao);
        if (chiTiet == null)
            return Result<TinhPhiTreDuKienResponse>.Loi("CHI_TIET_BAN_GIAO_NOT_FOUND", "Không tìm thấy chi tiết bàn giao.");

        var donThue = chiTiet.PhanCongThietBi.ChiTietDon.DonThue;
        var chiTietDon = chiTiet.PhanCongThietBi.ChiTietDon;
        decimal heSoTre = DocHeSoTreTuChinhSach(donThue.ChinhSach?.NoiDungChinhSach);

        var khoangTre = mocTinh - donThue.GioTraDuKien;
        int soNgayTre = khoangTre.TotalHours > 0 ? (int)Math.Ceiling(khoangTre.TotalHours / 24.0) : 0;
        decimal soTienTre = soNgayTre > 0 ? soNgayTre * chiTietDon.DonGiaThueMoiNgay * heSoTre : 0;

        return Result<TinhPhiTreDuKienResponse>.Ok(new TinhPhiTreDuKienResponse
        {
            MaChiTietBanGiao = maChiTietBanGiao, DonGiaSnapshot = chiTietDon.DonGiaThueMoiNgay,
            HeSo = heSoTre, SoNgayTre = soNgayTre, SoTien = soTienTre,
            GioTraDuKien = donThue.GioTraDuKien, MocTinh = mocTinh
        });
    }

    public async Task<Result<PagedResult<DonQuaHanResponse>>> LayDonQuaHanAsync(LocQuaHanRequest filter, long actorId)
    {
        var mocTinh = filter.DenThoiDiem ?? DateTime.UtcNow;
        var query = _context.DonThues
            .Include(d => d.KhachHang).ThenInclude(kh => kh.TaiKhoan)
            .Include(d => d.ChiTietDonThues)
            .Where(d => d.TrangThai == TrangThaiDonThue.DangThue && d.GioTraDuKien < mocTinh);

        if (filter.MaDon.HasValue) query = query.Where(d => d.MaDonThue == filter.MaDon.Value);
        if (filter.MaSanPham.HasValue) query = query.Where(d => d.ChiTietDonThues.Any(cd => cd.MaSanPham == filter.MaSanPham.Value));

        var donList = await query.ToListAsync();
        var donQuaHanList = new List<DonQuaHanResponse>();
        foreach (var don in donList)
        {
            var item = await TaoItemDonQuaHanAsync(don, mocTinh);
            if (item != null) donQuaHanList.Add(item);
        }

        return Result<PagedResult<DonQuaHanResponse>>.Ok(new PagedResult<DonQuaHanResponse>
        {
            Items = donQuaHanList.Skip((filter.Trang - 1) * filter.SoMoiTrang).Take(filter.SoMoiTrang).ToList(),
            TotalItems = donQuaHanList.Count,
            CurrentPage = filter.Trang,
            PageSize = filter.SoMoiTrang
        });
    }

    public async Task<Result<QuaHanChiTietResponse>> LayChiTietQuaHanAsync(long donId, long actorId)
    {
        var don = await _context.DonThues.Include(d => d.ChiTietDonThues)
            .FirstOrDefaultAsync(d => d.MaDonThue == donId);
        if (don == null) return Result<QuaHanChiTietResponse>.Loi("DON_NOT_FOUND", "Không tìm thấy đơn thuê.");

        var mocNow = DateTime.UtcNow;
        var chiTietBanGiaos = await _context.ChiTietBanGiaos
            .Include(ctb => ctb.PhieuBanGiao)
            .Include(ctb => ctb.PhanCongThietBi).ThenInclude(pc => pc.ThietBi).ThenInclude(tb => tb.SanPhamHienTai)
            .Include(ctb => ctb.PhanCongThietBi).ThenInclude(pc => pc.ChiTietDon)
            .Where(ctb => ctb.PhieuBanGiao.MaDonThue == donId && ctb.PhieuBanGiao.TrangThai == "DaGiao")
            .ToListAsync();
        if (!chiTietBanGiaos.Any())
            return Result<QuaHanChiTietResponse>.Loi("DON_CHUA_BAN_GIAO", "Đơn chưa có phiếu bàn giao hợp lệ để lập chi tiết quá hạn.");

        var nhanTras = await _context.ChiTietNhanTras.Include(nt => nt.PhieuNhanTra)
            .Where(nt => nt.PhieuNhanTra.MaDonThue == donId && nt.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot)
            .ToListAsync();

        var danhSachThietBi = new List<ThietBiQuaHanItem>();
        decimal tongPhiTreDuKien = 0;
        int soDaTra = 0;

        foreach (var ctb in chiTietBanGiaos)
        {
            var nt = nhanTras.FirstOrDefault(x => x.MaChiTietBanGiao == ctb.MaChiTietBanGiao);
            var (item, daKetLuan) = await TaoThietBiQuaHanItemAsync(ctb, nt, mocNow);
            if (daKetLuan) soDaTra++;
            tongPhiTreDuKien += item.PhiTreDuKien;
            danhSachThietBi.Add(item);
        }

        return Result<QuaHanChiTietResponse>.Ok(new QuaHanChiTietResponse
        {
            MaDonThue = donId, GioTraDuKien = don.GioTraDuKien, MocTinhNow = mocNow,
            LaTraMotPhan = soDaTra > 0 && soDaTra < chiTietBanGiaos.Count,
            DanhSachThietBi = danhSachThietBi, TongPhiTreDuKien = tongPhiTreDuKien
        });
    }

    private async Task<DonQuaHanResponse?> TaoItemDonQuaHanAsync(Models.Entities.DonThue don, DateTime mocTinh)
    {
        var banGiaoList = await _context.ChiTietBanGiaos.Include(ctb => ctb.PhieuBanGiao)
            .Where(ctb => ctb.PhieuBanGiao.MaDonThue == don.MaDonThue && ctb.PhieuBanGiao.TrangThai == "DaGiao")
            .ToListAsync();
        if (!banGiaoList.Any()) return null;

        var banGiaoIds = banGiaoList.Select(ctb => ctb.MaChiTietBanGiao).ToList();
        var settledCtbIds = await _context.ChiTietNhanTras
            .Where(ct => ct.PhieuNhanTra.MaDonThue == don.MaDonThue && ct.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot &&
                         (ct.ThoiDiemTraThucTe != null || ct.KetLuan == "MatThietBi" || ct.ThoiDiemDuyetMat != null))
            .Select(ct => ct.MaChiTietBanGiao).Distinct().ToListAsync();

        var unreturnedIds = banGiaoIds.Except(settledCtbIds).ToList();
        if (!unreturnedIds.Any()) return null;

        int soNgayTreMax = 0;
        decimal tongPhiTreDuKien = 0;
        foreach (var ctbId in unreturnedIds)
        {
            var tinhPhi = await TinhPhiTreDuKienAsync(ctbId, mocTinh);
            if (tinhPhi.ThanhCong && tinhPhi.DuLieu != null)
            {
                tongPhiTreDuKien += tinhPhi.DuLieu.SoTien;
                if (tinhPhi.DuLieu.SoNgayTre > soNgayTreMax) soNgayTreMax = tinhPhi.DuLieu.SoNgayTre;
            }
        }

        return new DonQuaHanResponse
        {
            MaDonThue = don.MaDonThue,
            MaDonHienThi = !string.IsNullOrWhiteSpace(don.MaDonHienThi) ? don.MaDonHienThi : $"DH-{don.MaDonThue:D6}",
            TenKhachHang = don.KhachHang?.HoTen ?? "Khách hàng",
            SoDienThoai = don.KhachHang?.TaiKhoan?.SoDienThoai ?? "",
            GioNhanThucTe = banGiaoList.FirstOrDefault()?.PhieuBanGiao?.ThoiDiemGiaoThucTe,
            GioTraDuKien = don.GioTraDuKien, SoThietBiChuaTra = unreturnedIds.Count,
            TongSoThietBi = banGiaoIds.Count, SoNgayTreMax = soNgayTreMax,
            TongPhiTreDuKien = tongPhiTreDuKien, LaTraMotPhan = settledCtbIds.Any() && unreturnedIds.Any()
        };
    }

    private async Task<(ThietBiQuaHanItem Item, bool DaKetLuan)> TaoThietBiQuaHanItemAsync(
        ChiTietBanGiao ctb, ChiTietNhanTra? nt, DateTime mocNow)
    {
        string trangThai = "ChuaTra";
        DateTime mocDung = mocNow;
        DateTime? gioTraThucTe = null, gioDuyetMat = null;
        bool daKetLuan = false;

        if (nt?.KetLuan == "MatThietBi" && nt.ThoiDiemDuyetMat.HasValue)
        {
            trangThai = "DaBaoMat";
            gioDuyetMat = mocDung = nt.ThoiDiemDuyetMat.Value;
            daKetLuan = true;
        }
        else if (nt?.ThoiDiemTraThucTe.HasValue == true)
        {
            trangThai = "DaTra";
            gioTraThucTe = mocDung = nt.ThoiDiemTraThucTe.Value;
            daKetLuan = true;
        }

        var tinhPhi = await TinhPhiTreDuKienAsync(ctb.MaChiTietBanGiao, mocDung);
        var tb = ctb.PhanCongThietBi.ThietBi;
        var cd = ctb.PhanCongThietBi.ChiTietDon;

        var item = new ThietBiQuaHanItem
        {
            MaChiTietBanGiao = ctb.MaChiTietBanGiao, MaThietBi = tb.MaThietBi,
            MaThietBiHienThi = tb.MaThietBiHienThi, MaSanPham = tb.MaSanPhamHienTai,
            TenSanPham = tb.SanPhamHienTai.TenSanPham, GioTraThucTe = gioTraThucTe,
            GioDuyetMat = gioDuyetMat, TrangThai = trangThai,
            SoNgayTre = tinhPhi.ThanhCong && tinhPhi.DuLieu != null ? tinhPhi.DuLieu.SoNgayTre : 0,
            DonGiaSnapshot = tinhPhi.ThanhCong && tinhPhi.DuLieu != null ? tinhPhi.DuLieu.DonGiaSnapshot : cd.DonGiaThueMoiNgay,
            HeSo = tinhPhi.ThanhCong && tinhPhi.DuLieu != null ? tinhPhi.DuLieu.HeSo : 1.5m,
            PhiTreDuKien = tinhPhi.ThanhCong && tinhPhi.DuLieu != null ? tinhPhi.DuLieu.SoTien : 0
        };
        return (item, daKetLuan);
    }

    private static decimal DocHeSoTreTuChinhSach(string? noiDungChinhSach)
    {
        if (string.IsNullOrEmpty(noiDungChinhSach)) return 1.5m;
        try
        {
            using var doc = JsonDocument.Parse(noiDungChinhSach);
            if (doc.RootElement.TryGetProperty("heSoTre", out var heSoProp) && heSoProp.ValueKind == JsonValueKind.Number)
                return heSoProp.GetDecimal();
        }
        catch { /* Dùng hệ số mặc định 1.5 nếu JSON không hợp lệ */ }
        return 1.5m;
    }
}
