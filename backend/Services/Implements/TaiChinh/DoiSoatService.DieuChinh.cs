using System.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DoiSoat;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class DoiSoatService
{
    public async Task<Result<DoiSoatResponse>> LapDoiSoatDieuChinhAsync(long doiSoatGocId, DieuChinhDoiSoatRequest dto, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        if (tk.VaiTro != "QuanTriVien")
            return Result<DoiSoatResponse>.Loi("KHONG_CO_QUYEN", "Chỉ quản trị viên mới được quyền lập đối soát điều chỉnh.");

        var maNhanVien = await LayMaNhanVienAsync(actorId);
        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var doiSoatGoc = await _context.DoiSoatTienCocs.Include(d => d.DonThue)
                .Include(d => d.GiaoDichDoiSoats).Include(d => d.HoanTiens)
                .FirstOrDefaultAsync(d => d.MaDoiSoat == doiSoatGocId);

            if (doiSoatGoc == null) return Result<DoiSoatResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy phiếu đối soát gốc.");
            if (doiSoatGoc.TrangThai != "DaChot")
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_CHUA_CHOT", "Chỉ có thể lập điều chỉnh cho phiếu đối soát đã chốt hoàn tất.");

            var phuPhis = (dto.DanhSachMaPhuPhiDieuChinh != null && dto.DanhSachMaPhuPhiDieuChinh.Count > 0)
                ? await _context.PhuPhis
                    .Where(p => dto.DanhSachMaPhuPhiDieuChinh.Contains(p.MaPhuPhi) && p.MaDonThue == doiSoatGoc.MaDonThue
                             && p.MaPhuPhiGoc != null && p.TrangThaiDuyet == "DaDuyet").ToListAsync()
                : new List<PhuPhi>();

            decimal chenhLech;
            if (phuPhis.Any())
            {
                chenhLech = phuPhis.Sum(p => p.SoTien);
            }
            else if (dto.SoTienDieuChinhCoDau.HasValue && dto.SoTienDieuChinhCoDau.Value != 0)
            {
                // [ADJ-02]: không có PhuPhi điều chỉnh gốc → lập trực tiếp DoiSoatTienCoc điều chỉnh
                // dựa trên số tiền có dấu do nhân viên nhập (dương=thu bù, âm=hoàn trả).
                chenhLech = dto.SoTienDieuChinhCoDau.Value;
            }
            else
            {
                return Result<DoiSoatResponse>.Loi("KHONG_CO_PHI_DIEU_CHINH", "Không tìm thấy khoản phụ phí điều chỉnh hợp lệ đã được phê duyệt.");
            }
            var dieuChinh = new DoiSoatTienCoc
            {
                MaDonThue = doiSoatGoc.MaDonThue, MaDoiSoatGoc = doiSoatGoc.MaDoiSoat, LoaiDoiSoat = "DieuChinh",
                MaNguoiLap = maNhanVien, TienCocDuocDoiSoat = 0, TongPhuPhiDuocDuyet = chenhLech,
                SoTienCanHoan = chenhLech < 0 ? -chenhLech : 0, SoTienCanThuThem = chenhLech > 0 ? chenhLech : 0,
                TrangThai = "ChoChot", ThoiDiemLap = DateTime.UtcNow, LyDoDieuChinh = dto.LyDo
            };
            _context.DoiSoatTienCocs.Add(dieuChinh);
            await _context.SaveChangesAsync();

            foreach (var p in phuPhis) p.MaDoiSoat = dieuChinh.MaDoiSoat;
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(dieuChinh));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi lập đối soát điều chỉnh: {ex.Message}");
        }
    }

    public async Task<Result<DoiSoatResponse>> LayTheoDonAsync(long donId, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        var don = await _context.DonThues.FirstOrDefaultAsync(d => d.MaDonThue == donId);
        if (don == null) return Result<DoiSoatResponse>.Loi("DON_KHONG_TIM_THAY", "Không tìm thấy đơn thuê.");

        if (tk.VaiTro == "KhachHang" && don.MaKhachHang != await ActorGuard.LayMaKhachHangAsync(_context, actorId))
            return Result<DoiSoatResponse>.Loi("KHONG_CO_QUYEN", "Khách hàng chỉ được xem đối soát của đơn mình.");

        var doiSoat = await TaiDoiSoatDayDuQuery().Where(d => d.MaDonThue == donId)
            .OrderByDescending(d => d.ThoiDiemLap).FirstOrDefaultAsync();
        return doiSoat == null
            ? Result<DoiSoatResponse>.Loi("CHUA_CO_DOI_SOAT", "Đơn thuê chưa có phiếu đối soát nào.")
            : Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));
    }

    public async Task<Result<DoiSoatResponse>> LayTheoIdAsync(long id, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        var doiSoat = await TaiDoiSoatDayDuQuery().FirstOrDefaultAsync(d => d.MaDoiSoat == id);
        if (doiSoat == null) return Result<DoiSoatResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy phiếu đối soát.");

        if (tk.VaiTro == "KhachHang" && doiSoat.DonThue.MaKhachHang != await ActorGuard.LayMaKhachHangAsync(_context, actorId))
            return Result<DoiSoatResponse>.Loi("KHONG_CO_QUYEN", "Khách hàng chỉ được xem đối soát của đơn mình.");

        return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));
    }

    public async Task<Result<List<DoiSoatResponse>>> LayDanhSachDieuChinhAsync(long actorId)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId);
        var list = await TaiDoiSoatDayDuQuery()
            .Where(d => d.LoaiDoiSoat == "DieuChinh")
            .OrderByDescending(d => d.ThoiDiemLap)
            .Take(100)
            .ToListAsync();
        var results = new List<DoiSoatResponse>(list.Count);
        foreach (var item in list) results.Add(await ChuyenSangResponseAsync(item));
        return Result<List<DoiSoatResponse>>.Ok(results);
    }
}
