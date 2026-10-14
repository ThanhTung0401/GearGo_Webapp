using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class BaoTriService : IBaoTriService
{
    private readonly ApplicationDbContext _context;

    public BaoTriService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PhieuBaoTri>> TaoPhieuBaoTriToiThieuAsync(
        long maThietBi,
        long? maDonThue,
        long maNhanVienLap,
        string loaiXuLy,
        string moTaLoi,
        string mucDo)
    {
        var thietBi = await _context.ThietBis.FindAsync(maThietBi);
        if (thietBi == null)
            return Result<PhieuBaoTri>.Loi(
                "THIET_BI_NOT_FOUND",
                "Không tìm thấy thiết bị để lập phiếu bảo trì."
            );

        // Kiểm tra xem đã có phiếu bảo trì đang mở (chưa hoàn thành) cho thiết bị này chưa để tránh tạo trùng
        var phieuDangMo = await _context.PhieuBaoTris
            .FirstOrDefaultAsync(p => p.MaThietBi == maThietBi
                                      && (p.TrangThai == "ChoXuLy" || p.TrangThai == "DangXuLy"));

        if (phieuDangMo != null)
            return Result<PhieuBaoTri>.Ok(phieuDangMo);

        var phieuMoi = new PhieuBaoTri
        {
            MaThietBi = maThietBi,
            MaDonThue = maDonThue,
            MaNguoiLap = maNhanVienLap,
            LoaiXuLy = loaiXuLy,
            MoTaLoi = moTaLoi,
            MucDo = mucDo,
            NgayBatDau = DateTime.UtcNow,
            TrangThai = "ChoXuLy"
        };

        thietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;

        _context.PhieuBaoTris.Add(phieuMoi);
        await _context.SaveChangesAsync();

        return Result<PhieuBaoTri>.Ok(phieuMoi);
    }
}
