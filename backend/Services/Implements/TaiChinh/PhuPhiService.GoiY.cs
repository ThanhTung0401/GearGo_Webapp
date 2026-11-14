using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhuPhi;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class PhuPhiService
{
    public async Task<Result<List<GoiYPhuPhiResponse>>> GoiYPhiAsync(long chiTietBanGiaoId, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);

        var chiTiet = await _context.ChiTietBanGiaos
            .Include(c => c.PhanCongThietBi).ThenInclude(p => p.ChiTietDon).ThenInclude(cd => cd.DonThue).ThenInclude(d => d.ChinhSach)
            .Include(c => c.PhanCongThietBi).ThenInclude(p => p.ThietBi)
            .Include(c => c.ChiTietNhanTra)
            .FirstOrDefaultAsync(c => c.MaChiTietBanGiao == chiTietBanGiaoId);

        if (chiTiet == null)
            return Result<List<GoiYPhuPhiResponse>>.Loi("CHI_TIET_BAN_GIAO_NOT_FOUND", "Không tìm thấy chi tiết bàn giao.");

        var danhSachGoiY = new List<GoiYPhuPhiResponse>();
        await ThemGoiYTreHanAsync(chiTietBanGiaoId, danhSachGoiY);
        ThemGoiYNhanTra(chiTietBanGiaoId, chiTiet.PhanCongThietBi.ChiTietDon, chiTiet.ChiTietNhanTra, danhSachGoiY);
        return Result<List<GoiYPhuPhiResponse>>.Ok(danhSachGoiY);
    }

    private async Task ThemGoiYTreHanAsync(long chiTietBanGiaoId, List<GoiYPhuPhiResponse> danhSachGoiY)
    {
        try
        {
            var kq = await _quaHanService.TinhPhiTreDuKienAsync(chiTietBanGiaoId, DateTime.UtcNow);
            if (!kq.ThanhCong || kq.DuLieu == null || kq.DuLieu.SoTien <= 0) return;

            var d = kq.DuLieu;
            danhSachGoiY.Add(new GoiYPhuPhiResponse
            {
                MaChiTietBanGiao = chiTietBanGiaoId, LoaiPhi = "TreHan", SoTienGoiY = d.SoTien,
                LyDo = $"Thiết bị trả trễ {d.SoNgayTre} ngày (hệ số phạt {d.HeSo}x)",
                CanCu = new CanCuTinhPhiDto
                {
                    LoaiPhi = "TreHan", CongThuc = "SoNgayTre * DonGiaSnapshot * HeSoTre",
                    DonGiaSnapshot = d.DonGiaSnapshot, HeSo = d.HeSo, SoNgayTre = d.SoNgayTre,
                    GioTraDuKien = d.GioTraDuKien, ThoiDiemKetThuc = d.MocTinh,
                    GhiChu = "Gợi ý tự động từ thời điểm hiện tại"
                }
            });
        }
        catch { /* Fallback an toàn nếu lỗi tính phí trễ */ }
    }

    private static void ThemGoiYNhanTra(
        long chiTietBanGiaoId, ChiTietDonThue chiTietDon, ChiTietNhanTra? nhanTra, List<GoiYPhuPhiResponse> danhSachGoiY)
    {
        if (nhanTra == null) return;

        if (nhanTra.KetLuan == "Mat" || !string.IsNullOrEmpty(nhanTra.BienBanMat))
        {
            decimal giaTri = chiTietDon.DonGiaThueMoiNgay * 15;
            if (giaTri <= 0) giaTri = 1000000m;
            danhSachGoiY.Add(new GoiYPhuPhiResponse
            {
                MaChiTietBanGiao = chiTietBanGiaoId, LoaiPhi = "MatThietBi", SoTienGoiY = giaTri,
                LyDo = "Biên bản nhận trả ghi nhận thiết bị bị mất / không thể thu hồi.",
                CanCu = new CanCuTinhPhiDto
                {
                    LoaiPhi = "MatThietBi", CongThuc = "GiaTriBoiThuongSnapshot",
                    DonGiaSnapshot = chiTietDon.DonGiaThueMoiNgay,
                    GhiChu = "Cần quản trị viên phê duyệt kết luận mất và mức phí bồi thường."
                }
            });
        }

        if (!string.IsNullOrEmpty(nhanTra.TinhTrangSauThue) &&
            (nhanTra.TinhTrangSauThue.Contains("bẩn", StringComparison.OrdinalIgnoreCase) ||
             nhanTra.TinhTrangSauThue.Contains("vệ sinh", StringComparison.OrdinalIgnoreCase)))
        {
            danhSachGoiY.Add(new GoiYPhuPhiResponse
            {
                MaChiTietBanGiao = chiTietBanGiaoId, LoaiPhi = "VeSinhDacBiet", SoTienGoiY = 100000m,
                LyDo = $"Tình trạng sau thuê: {nhanTra.TinhTrangSauThue}",
                CanCu = new CanCuTinhPhiDto
                {
                    LoaiPhi = "VeSinhDacBiet", CongThuc = "DinhMucVeSinhChuan",
                    GhiChu = "Phí vệ sinh chuyên sâu cho thiết bị bẩn nhiều bùn đất/dầu mỡ."
                }
            });
        }
    }
}
