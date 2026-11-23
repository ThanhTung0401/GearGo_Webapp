using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.VongDoiThietBi;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Quản lý hồ sơ vòng đời thiết bị (giáng cấp, ngừng sử dụng, phân tích cam kết).
/// </summary>
public partial class VongDoiThietBiService : IVongDoiThietBiService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService _khaDungService;
    private readonly ILogger<VongDoiThietBiService> _logger;

    public VongDoiThietBiService(
        ApplicationDbContext context,
        IKhaDungService khaDungService,
        ILogger<VongDoiThietBiService> logger)
    {
        _context = context;
        _khaDungService = khaDungService;
        _logger = logger;
    }

    public async Task<Result<HoSoVongDoiResponse>> LayHoSoVongDoiAsync(long thietBiId, bool laAdmin)
    {
        var thietBi = await _context.ThietBis.AsNoTracking()
            .Include(tb => tb.SanPhamHienTai)
            .Include(tb => tb.ChiTietPhieuNhap).ThenInclude(ct => ct.SanPham)
            .FirstOrDefaultAsync(tb => tb.MaThietBi == thietBiId);
        if (thietBi == null)
            return Result<HoSoVongDoiResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị.");

        var baoTris = await _context.PhieuBaoTris.AsNoTracking()
            .Where(p => p.MaThietBi == thietBiId).OrderByDescending(p => p.MaPhieuBaoTri)
            .Select(p => new TomTatBaoTriDto
            {
                MaPhieuBaoTri = p.MaPhieuBaoTri, LoaiXuLy = p.LoaiXuLy, MoTaLoi = p.MoTaLoi,
                TrangThai = p.TrangThai, NgayBatDau = p.NgayBatDau, NgayHoanThanhThucTe = p.NgayHoanThanhThucTe
            }).ToListAsync();

        var dieuChinhs = await _context.ChiTietDieuChinhKhos.AsNoTracking()
            .Include(ct => ct.PhieuDieuChinhKho)
            .Where(ct => ct.MaThietBi == thietBiId).OrderByDescending(ct => ct.MaPhieuDieuChinh)
            .Select(ct => new TomTatDieuChinhDto
            {
                MaPhieuDieuChinh = ct.MaPhieuDieuChinh, LoaiDieuChinh = ct.PhieuDieuChinhKho.LoaiDieuChinh,
                TrangThai = ct.PhieuDieuChinhKho.TrangThai, LyDo = ct.PhieuDieuChinhKho.LyDo,
                ThoiDiemLap = ct.PhieuDieuChinhKho.ThoiDiemLap, ThoiDiemApDung = ct.PhieuDieuChinhKho.ThoiDiemApDung
            }).ToListAsync();

        var lichSus = await _context.LichSuTinhTrangThietBis.AsNoTracking()
            .Where(ls => ls.MaThietBi == thietBiId).OrderByDescending(ls => ls.ThoiDiem)
            .Select(ls => new TomTatTinhTrangDto
            {
                MaLichSu = ls.MaLichSuThietBi, TrangThaiTruoc = ls.TrangThaiTruoc, TrangThaiSau = ls.TrangThaiSau,
                TinhTrangTruoc = ls.TinhTrangTruoc, TinhTrangSau = ls.TinhTrangSau, ThoiDiem = ls.ThoiDiem, LyDo = ls.LyDo
            }).ToListAsync();

        return Result<HoSoVongDoiResponse>.Ok(new HoSoVongDoiResponse
        {
            MaThietBi = thietBi.MaThietBi, MaThietBiHienThi = thietBi.MaThietBiHienThi,
            TrangThaiSuDung = thietBi.TrangThaiSuDung.ToString(), TinhTrang = thietBi.TinhTrang,
            NgayNhap = thietBi.NgayNhap, GiaNhap = laAdmin ? thietBi.GiaNhap : null,
            MaChiTietPhieuNhap = thietBi.MaChiTietPhieuNhap,
            MaSanPhamNguon = thietBi.ChiTietPhieuNhap?.MaSanPham ?? thietBi.MaSanPhamHienTai,
            TenSanPhamNguon = thietBi.ChiTietPhieuNhap?.SanPham?.TenSanPham ?? "",
            MaSanPhamHienTai = thietBi.MaSanPhamHienTai,
            TenSanPhamHienTai = thietBi.SanPhamHienTai?.TenSanPham ?? "",
            LichSuBaoTri = baoTris, LichSuDieuChinh = dieuChinhs, LichSuTinhTrang = lichSus
        });
    }

    public async Task<Result<AnhHuongThayDoiResponse>> XemAnhHuongThayDoiAsync(long thietBiId, XemAnhHuongThayDoiRequest request)
    {
        var thietBi = await _context.ThietBis.AsNoTracking().FirstOrDefaultAsync(tb => tb.MaThietBi == thietBiId);
        if (thietBi == null)
            return Result<AnhHuongThayDoiResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị.");

        // [VD-04] Kiểm tra cho cả Downgrade lẫn ChuyenSanPham: FE có thể gửi "ChuyenSanPham" khi giá đích ≥ giá hiện tại.
        if (request.LoaiThayDoi == DomainConstants.Lifecycle.Downgrade || request.LoaiThayDoi == "ChuyenSanPham")
        {
            if (!request.MaSanPhamDich.HasValue)
                return Result<AnhHuongThayDoiResponse>.Loi(DomainConstants.Errors.TargetProductMismatch, "Phải chọn sản phẩm đích khi chuyển loại.");

            var spDich = await _context.SanPhams.FirstOrDefaultAsync(s => s.MaSanPham == request.MaSanPhamDich.Value);
            if (spDich == null || spDich.TrangThaiKinhDoanh != TrangThaiKinhDoanh.DangKinhDoanh || spDich.MaSanPham == thietBi.MaSanPhamHienTai)
                return Result<AnhHuongThayDoiResponse>.Loi(DomainConstants.Errors.TargetProductMismatch, "Sản phẩm đích không tồn tại, không đang kinh doanh hoặc trùng sản phẩm hiện tại.");
        }

        return Result<AnhHuongThayDoiResponse>.Ok(await PhanTichCamKetThietBiAsync(thietBi, request.LoaiThayDoi));
    }

    private async Task<AnhHuongThayDoiResponse> PhanTichCamKetThietBiAsync(ThietBi thietBi, string loaiThayDoi)
    {
        var res = new AnhHuongThayDoiResponse { CoTheDeNghi = true, CoTheApDungHienTai = true };
        if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
        {
            res.CoTheDeNghi = false;
            res.CoTheApDungHienTai = false;
            res.VuongMac.Add("Thiết bị đang được khách thuê (chưa thu hồi).");
        }

        if (loaiThayDoi == DomainConstants.Lifecycle.Decommission)
        {
            bool coBaoTriMo = await _context.PhieuBaoTris.AnyAsync(p =>
                p.MaThietBi == thietBi.MaThietBi &&
                (p.TrangThai == DomainConstants.Status.PendingProcessing ||
                 p.TrangThai == DomainConstants.Status.InProgress ||
                 p.TrangThai == DomainConstants.Status.PendingInspection));
            if (coBaoTriMo)
            {
                res.CoTheDeNghi = false;
                res.CoTheApDungHienTai = false;
                res.VuongMac.Add("Thiết bị đang có phiếu bảo trì chưa kết luận, phải kết thúc phiếu bảo trì trước khi ngừng sử dụng.");
            }
        }

        var camKetCuThe = await _context.PhanCongThietBis
            .Include(pc => pc.ChiTietDon).ThenInclude(ct => ct.DonThue)
            .Where(pc => pc.MaThietBi == thietBi.MaThietBi &&
                         pc.TrangThai == DomainConstants.Status.Assigned &&
                         (pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan))
            .Select(pc => pc.ChiTietDon.MaDonThue).Distinct().ToListAsync();

        if (camKetCuThe.Count > 0)
        {
            res.CamKetCuThe.AddRange(camKetCuThe);
            res.CoTheApDungHienTai = false;
            res.VuongMac.Add($"Thiết bị đã được gán cho đơn thuê: {string.Join(", ", camKetCuThe)}");
        }

        if (thietBi.TrangThaiSuDung == TrangThaiThietBi.SanSang)
            await KiemTraCamKetTheoSoLuongAsync(thietBi, res);

        return res;
    }

    private async Task KiemTraCamKetTheoSoLuongAsync(ThietBi thietBi, AnhHuongThayDoiResponse res)
    {
        var donTuongLai = await _context.ChiTietDonThues.Include(ct => ct.DonThue)
            .Where(ct => ct.MaSanPham == thietBi.MaSanPhamHienTai &&
                         (ct.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan ||
                          ct.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                          ct.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                          ct.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan))
            .Select(ct => new { ct.MaDonThue, ct.DonThue.GioNhanDuKien, ct.DonThue.GioTraDuKien })
            .Distinct().ToListAsync();

        foreach (var don in donTuongLai)
        {
            var khaDungMap = await _khaDungService.LayKhaDungNhieuAsync(
                new List<long> { thietBi.MaSanPhamHienTai }, don.GioNhanDuKien, don.GioTraDuKien);
            int khaDungConLai = khaDungMap.TryGetValue(thietBi.MaSanPhamHienTai, out var sl) ? sl : 0;
            // Nếu khả dụng còn lại < 1 nghĩa là đã chạm trần cam kết, bỏ bớt 1 thiết bị sẽ thiếu hàng.
            if (khaDungConLai < 1)
            {
                res.CoTheApDungHienTai = false;
                res.ThieuSoLuongTheoLich.Add(
                    $"Đơn #{don.MaDonThue} ({don.GioNhanDuKien:yyyy-MM-dd} -> {don.GioTraDuKien:yyyy-MM-dd}) sẽ thiếu thiết bị nếu giảm nguồn sản phẩm #{thietBi.MaSanPhamHienTai}.");
            }
        }
    }
}
