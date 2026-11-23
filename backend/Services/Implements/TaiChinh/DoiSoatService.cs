using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DoiSoat;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

/// <summary>
/// Dịch vụ đối soát cọc, hoàn tất đơn thuê và điều chỉnh đối soát (UC15).
/// </summary>
public partial class DoiSoatService : IDoiSoatService
{
    private readonly ApplicationDbContext _context;
    private readonly IThanhToanService _thanhToanService;
    private readonly IHoanTienService _hoanTienService;

    public DoiSoatService(ApplicationDbContext context, IThanhToanService thanhToanService, IHoanTienService hoanTienService)
    {
        _context = context;
        _thanhToanService = thanhToanService;
        _hoanTienService = hoanTienService;
    }

    public async Task<Result<XemTruocDoiSoatResponse>> XemTruocAsync(long donId, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var don = await _context.DonThues.Include(d => d.ChiTietDonThues).FirstOrDefaultAsync(d => d.MaDonThue == donId);
        if (don == null) return Result<XemTruocDoiSoatResponse>.Loi("DON_KHONG_TIM_THAY", "Không tìm thấy đơn thuê.");

        var vuongMac = await ThuThapVuongMacAsync(don);
        var (danhSachNguonCoc, tongCocKhaDung) = await TaiNguonCocKhaDungAsync(donId);
        var danhSachPhuPhiDuyet = await TaiPhuPhiDaDuyetAsync(donId);

        decimal tongPhuPhi = danhSachPhuPhiDuyet.Sum(p => p.SoTien);
        decimal canHoan = Math.Max(0, tongCocKhaDung - tongPhuPhi);
        decimal canThuThem = Math.Max(0, tongPhuPhi - tongCocKhaDung);

        return Result<XemTruocDoiSoatResponse>.Ok(new XemTruocDoiSoatResponse
        {
            MaDonThue = donId, MaDonHienThi = don.MaDonHienThi,
            DuDieuKien = vuongMac.Count == 0, VuongMac = vuongMac,
            TienCocDuocDoiSoat = tongCocKhaDung, TongPhuPhiDuocDuyet = tongPhuPhi,
            SoTienCanHoan = canHoan, SoTienCanThuThem = canThuThem,
            NguonCoc = danhSachNguonCoc, PhuPhi = danhSachPhuPhiDuyet,
            DauVanTayBangTinh = TinhDauVanTay(donId, tongCocKhaDung, tongPhuPhi, canHoan, canThuThem)
        });
    }

    public async Task<Result<DoiSoatResponse>> LapDoiSoatAsync(LapDoiSoatRequest dto, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var don = await _context.DonThues.FirstOrDefaultAsync(d => d.MaDonThue == dto.MaDonThue);
            if (don == null) return Result<DoiSoatResponse>.Loi("DON_KHONG_TIM_THAY", "Không tìm thấy đơn thuê.");

            var existing = await TaiDoiSoatDayDuQuery()
                .FirstOrDefaultAsync(d => d.MaDonThue == dto.MaDonThue && d.LoaiDoiSoat == "BanDau");
            if (existing != null)
                return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(existing));

            var xemTruocRes = await XemTruocAsync(dto.MaDonThue, actorId);
            if (!xemTruocRes.ThanhCong || xemTruocRes.DuLieu == null)
                return Result<DoiSoatResponse>.Loi(xemTruocRes.MaLoi ?? "LOI_XEM_TRUOC", xemTruocRes.ThongDiep ?? "Lỗi khi kiểm tra đối soát.");

            var xemTruoc = xemTruocRes.DuLieu;
            if (!xemTruoc.DuDieuKien)
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_CHUA_DU_DIEU_KIEN",
                    "Đơn thuê chưa đủ điều kiện lập đối soát: " + string.Join("; ", xemTruoc.VuongMac));

            var doiSoatMoi = new DoiSoatTienCoc
            {
                MaDonThue = dto.MaDonThue, LoaiDoiSoat = "BanDau", MaNguoiLap = maNhanVien,
                TienCocDuocDoiSoat = xemTruoc.TienCocDuocDoiSoat, TongPhuPhiDuocDuyet = xemTruoc.TongPhuPhiDuocDuyet,
                SoTienCanHoan = xemTruoc.SoTienCanHoan, SoTienCanThuThem = xemTruoc.SoTienCanThuThem,
                TrangThai = "ChoChot", ThoiDiemLap = DateTime.UtcNow
            };
            _context.DoiSoatTienCocs.Add(doiSoatMoi);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoatMoi));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi lập đối soát: {ex.Message}");
        }
    }

    public async Task<Result<DoiSoatResponse>> XacNhanBangTinhAsync(long id, XacNhanDoiSoatRequest dto, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var doiSoat = await TaiDoiSoatDayDuQuery().FirstOrDefaultAsync(d => d.MaDoiSoat == id);
            if (doiSoat == null) return Result<DoiSoatResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy phiếu đối soát.");
            if (doiSoat.TrangThai == "DaChot")
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_DA_CHOT", "Phiếu đối soát này đã được chốt, không thể xác nhận lại.");

            var xemTruocRes = await XemTruocAsync(doiSoat.MaDonThue, actorId);
            if (!xemTruocRes.ThanhCong || xemTruocRes.DuLieu == null)
                return Result<DoiSoatResponse>.Loi(xemTruocRes.MaLoi ?? "LOI_XEM_TRUOC", xemTruocRes.ThongDiep ?? "Lỗi khi kiểm tra đối soát.");

            var xemTruoc = xemTruocRes.DuLieu;
            if (!xemTruoc.DuDieuKien)
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_CHUA_DU_DIEU_KIEN",
                    "Dữ liệu thay đổi khiến đơn không còn đủ điều kiện: " + string.Join("; ", xemTruoc.VuongMac));

            if (!string.IsNullOrEmpty(dto.DauVanTayBangTinh) && dto.DauVanTayBangTinh != xemTruoc.DauVanTayBangTinh)
                return Result<DoiSoatResponse>.Loi("BANG_TINH_DA_THAY_DOI",
                    "Dữ liệu cọc hoặc phụ phí đã thay đổi kể từ lúc xem trước. Vui lòng tải lại trang để xem số liệu mới.");

            await CoDinhBangTinhAsync(doiSoat, xemTruoc);
            await transaction.CommitAsync();
            return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi xác nhận bảng tính: {ex.Message}");
        }
    }

    private async Task<List<string>> ThuThapVuongMacAsync(Models.Entities.DonThue don)
    {
        var vuongMac = new List<string>();
        if (don.TrangThai != TrangThaiDonThue.ChoDoiSoat && don.TrangThai != TrangThaiDonThue.DaNhanTra)
            vuongMac.Add($"Đơn đang ở trạng thái '{don.TrangThai}', chưa sẵn sàng để đối soát.");

        var ctbgs = await _context.ChiTietBanGiaos.Include(c => c.PhieuBanGiao)
            .Include(c => c.ChiTietNhanTra).ThenInclude(nt => nt!.PhieuNhanTra)
            .Where(c => c.PhieuBanGiao != null && c.PhieuBanGiao.MaDonThue == don.MaDonThue).ToListAsync();

        foreach (var ct in ctbgs)
        {
            if (ct.ChiTietNhanTra == null)
                vuongMac.Add($"Chi tiết bàn giao #{ct.MaChiTietBanGiao} chưa có kết luận nhận trả hoặc kết luận mất.");
            else if (ct.ChiTietNhanTra.PhieuNhanTra == null || ct.ChiTietNhanTra.PhieuNhanTra.TrangThai != TrangThaiPhieuNhanTra.DaChot)
                vuongMac.Add($"Thiết bị #{ct.MaChiTietBanGiao} đang nằm trong phiếu nhận trả chưa chốt (phiếu #{ct.ChiTietNhanTra.MaPhieuNhanTra}).");
        }

        var phuPhis = await _context.PhuPhis.Where(p => p.MaDonThue == don.MaDonThue).ToListAsync();
        foreach (var p in phuPhis)
        {
            if (p.TrangThaiDuyet == "ChoDuyet") vuongMac.Add($"Khoản phụ phí #{p.MaPhuPhi} ({p.LoaiPhi}) vẫn đang chờ duyệt.");
            if (p.TrangThaiTranhChap == "DangTranhChap") vuongMac.Add($"Khoản phụ phí #{p.MaPhuPhi} ({p.LoaiPhi}) đang trong quá trình khiếu nại / tranh chấp.");
        }
        return vuongMac;
    }

    private async Task<(List<NguonCocDto> NguonCoc, decimal TongCoc)> TaiNguonCocKhaDungAsync(long donId)
    {
        var chiTietCoc = await _context.ChiTietThanhToans.Include(ct => ct.ThanhToan)
            .Include(ct => ct.GiaoDichDoiSoat).Include(ct => ct.HoanTiens)
            .Where(ct => ct.ThanhToan.MaDonThue == donId && ct.MucDich == "TienCoc" && ct.ThanhToan.TrangThai == "ThanhCong")
            .ToListAsync();

        // FN5-10: Lấy phiếu đối soát BanDau đang hoạt động của đơn để KHÔNG loại trừ khoản cọc
        // đã gắn GiaoDichDoiSoat của chính phiếu đó (tránh làm tiền cọc tụt về 0đ sau Bước 4).
        var doiSoatBanDauId = await _context.DoiSoatTienCocs
            .Where(d => d.MaDonThue == donId && d.LoaiDoiSoat == "BanDau" && d.TrangThai != "DaHuy")
            .OrderByDescending(d => d.ThoiDiemLap)
            .Select(d => (long?)d.MaDoiSoat)
            .FirstOrDefaultAsync();

        var list = new List<NguonCocDto>();
        decimal tong = 0;
        foreach (var ct in chiTietCoc)
        {
            // Chỉ bỏ qua nếu đã gắn vào phiếu đối soát KHÁC (không phải phiếu BanDau hiện tại của đơn).
            if (ct.GiaoDichDoiSoat != null
                && ct.GiaoDichDoiSoat.MaDoiSoat != 0
                && (doiSoatBanDauId == null || ct.GiaoDichDoiSoat.MaDoiSoat != doiSoatBanDauId.Value))
                continue;
            var conLai = ct.SoTien - ct.HoanTiens.Where(h => h.TrangThai == "ThanhCong").Sum(h => h.SoTien);
            if (conLai <= 0) continue;
            tong += conLai;
            list.Add(new NguonCocDto
            {
                MaChiTietThanhToan = ct.MaChiTietThanhToan, MaThanhToan = ct.MaThanhToan, MaYeuCau = ct.ThanhToan.MaYeuCau,
                SoTien = conLai, PhuongThuc = ct.ThanhToan.PhuongThuc, ThoiDiem = ct.ThanhToan.ThoiDiemThanhCong ?? ct.ThanhToan.ThoiDiemTao
            });
        }
        return (list, tong);
    }

    private Task<List<PhuPhiDoiSoatDto>> TaiPhuPhiDaDuyetAsync(long donId) =>
        _context.PhuPhis.Where(p => p.MaDonThue == donId && p.TrangThaiDuyet == "DaDuyet" && p.TrangThaiTranhChap != "DangTranhChap")
            .Select(p => new PhuPhiDoiSoatDto
            {
                MaPhuPhi = p.MaPhuPhi, MaChiTietBanGiao = p.MaChiTietBanGiao, LoaiPhi = p.LoaiPhi,
                SoTien = p.SoTien, LyDo = p.LyDo, TrangThaiDuyet = p.TrangThaiDuyet, TrangThaiTranhChap = p.TrangThaiTranhChap
            }).ToListAsync();

    private async Task CoDinhBangTinhAsync(DoiSoatTienCoc doiSoat, XemTruocDoiSoatResponse xemTruoc)
    {
        doiSoat.TienCocDuocDoiSoat = xemTruoc.TienCocDuocDoiSoat;
        doiSoat.TongPhuPhiDuocDuyet = xemTruoc.TongPhuPhiDuocDuyet;
        doiSoat.SoTienCanHoan = xemTruoc.SoTienCanHoan;
        doiSoat.SoTienCanThuThem = xemTruoc.SoTienCanThuThem;
        // FN5-10: Khi cố định bảng tính (Bước 4), chuyển trạng thái sang "DaXacNhan"
        // để UI ẩn nút xác nhận và các hành động hoàn/thu/khóa đi tiếp mà không gọi lại XacNhanBangTinh.
        if (doiSoat.TrangThai == "ChoChot") doiSoat.TrangThai = "DaXacNhan";

        var phuPhiIds = xemTruoc.PhuPhi.Select(p => p.MaPhuPhi).ToList();
        foreach (var p in await _context.PhuPhis.Where(p => phuPhiIds.Contains(p.MaPhuPhi)).ToListAsync())
            p.MaDoiSoat = doiSoat.MaDoiSoat;

        var nguonCocIds = xemTruoc.NguonCoc.Select(n => n.MaChiTietThanhToan).ToList();
        foreach (var ct in await _context.ChiTietThanhToans.Include(c => c.GiaoDichDoiSoat).Where(c => nguonCocIds.Contains(c.MaChiTietThanhToan)).ToListAsync())
            if (ct.GiaoDichDoiSoat == null)
                _context.GiaoDichDoiSoats.Add(new GiaoDichDoiSoat { MaDoiSoat = doiSoat.MaDoiSoat, MaChiTietThanhToan = ct.MaChiTietThanhToan });

        doiSoat.BangTinhDoiSoat = JsonSerializer.Serialize(new BangTinhDoiSoatDto
        {
            NguonCocChiTietIds = nguonCocIds, PhuPhiIds = phuPhiIds,
            TienCocSnapshot = xemTruoc.TienCocDuocDoiSoat, TongPhiSnapshot = xemTruoc.TongPhuPhiDuocDuyet,
            CanHoanSnapshot = xemTruoc.SoTienCanHoan, CanThuThemSnapshot = xemTruoc.SoTienCanThuThem,
            DauVanTay = xemTruoc.DauVanTayBangTinh, ThoiDiemXacNhan = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
    }

    private async Task<long> LayMaNhanVienAsync(long maTaiKhoan) =>
        await ActorGuard.LayMaNhanVienAsync(_context, maTaiKhoan)
        ?? throw new KhongCoQuyenException("Không tìm thấy hồ sơ nhân viên tương ứng với tài khoản đăng nhập.");

    private static string TinhDauVanTay(long donId, decimal coc, decimal phi, decimal canHoan, decimal canThu)
    {
        using var md5 = MD5.Create();
        return Convert.ToHexString(md5.ComputeHash(Encoding.UTF8.GetBytes($"{donId}_{coc}_{phi}_{canHoan}_{canThu}")));
    }
}
