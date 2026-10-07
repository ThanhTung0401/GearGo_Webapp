using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuaHan;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GearGo.Services.Implements;

public class QuaHanService : IQuaHanService
{
    private readonly ApplicationDbContext _context;

    public QuaHanService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<TinhPhiTreDuKienResponse>> TinhPhiTreDuKienAsync(long maChiTietBanGiao, DateTime mocTinh)
    {
        var chiTiet = await _context.ChiTietBanGiaos
            .Include(c => c.PhanCongThietBi)
                .ThenInclude(p => p.ChiTietDon)
                    .ThenInclude(cd => cd.DonThue)
                        .ThenInclude(d => d.ChinhSach)
            .FirstOrDefaultAsync(c => c.MaChiTietBanGiao == maChiTietBanGiao);

        if (chiTiet == null)
            return Result<TinhPhiTreDuKienResponse>.Loi("CHI_TIET_BAN_GIAO_NOT_FOUND", "Không tìm thấy chi tiết bàn giao.");

        var donThue = chiTiet.PhanCongThietBi.ChiTietDon.DonThue;
        var chiTietDon = chiTiet.PhanCongThietBi.ChiTietDon;
        var chinhSach = donThue.ChinhSach;

        // Trích xuất hệ số trễ từ nội dung chính sách (mặc định 1.5)
        decimal heSoTre = 1.5m;
        if (!string.IsNullOrEmpty(chinhSach.NoiDungChinhSach))
        {
            try
            {
                using var doc = JsonDocument.Parse(chinhSach.NoiDungChinhSach);
                if (doc.RootElement.TryGetProperty("heSoTre", out var heSoProp) && heSoProp.ValueKind == JsonValueKind.Number)
                {
                    heSoTre = heSoProp.GetDecimal();
                }
            }
            catch
            {
                // Bỏ qua nếu parse JSON lỗi, dùng mặc định
            }
        }

        // Tính khoảng trễ
        var gioTraDuKien = donThue.GioTraDuKien;
        var khoangTre = mocTinh - gioTraDuKien;

        int soNgayTre = 0;
        decimal soTienTre = 0;

        if (khoangTre.TotalHours > 0)
        {
            // Làm tròn lên theo ngày
            soNgayTre = (int)Math.Ceiling(khoangTre.TotalHours / 24.0);
            soTienTre = soNgayTre * chiTietDon.DonGiaThueMoiNgay * heSoTre;
        }

        return Result<TinhPhiTreDuKienResponse>.Ok(new TinhPhiTreDuKienResponse
        {
            MaChiTietBanGiao = maChiTietBanGiao,
            DonGiaSnapshot = chiTietDon.DonGiaThueMoiNgay,
            HeSo = heSoTre,
            SoNgayTre = soNgayTre,
            SoTien = soTienTre,
            GioTraDuKien = gioTraDuKien,
            MocTinh = mocTinh
        });
    }
}
