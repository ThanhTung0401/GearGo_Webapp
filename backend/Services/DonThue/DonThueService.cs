using System.Data;
using Microsoft.EntityFrameworkCore;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs;
using GearGo.Models.Entities;

namespace GearGo.Services.DonThue;

public class DonThueService : IDonThueService
{
    private readonly ApplicationDbContext _context;

    public DonThueService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<DonThueResponse>> TaoDonThueAsync(TaoDonThueRequest request)
    {
        using var transaction = await _context.Database
                .BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            // TODO
            bool duHang = true;

            if (!duHang)
            {
                return Result<DonThueResponse>.Loi(
                    "HET_HANG",
                    "Một số thiết bị trong giỏ hàng đã hết số lượng khả dụng trong thời gian này."
                );
            }

            var donThueMoi = new Models.Entities.DonThue
            {
                MaKhachHang = request.MaKhachHang,
                MaChinhSach = 1, // TODO
                MaDonHienThi = $"DH{DateTime.UtcNow:yyyyMMddHHmmss}",
                NgayDat = DateTime.UtcNow,
                GioNhanDuKien = request.GioNhanDuKien,
                GioTraDuKien = request.GioTraDuKien,
                HanThanhToan = DateTime.UtcNow.AddMinutes(15), // TODO
                TenNguoiNhan = request.TenNguoiNhan,
                SoDienThoaiNguoiNhan = request.SoDienThoaiNguoiNhan,
                EmailLienHe = request.EmailLienHe,
                TrangThai = Models.Enums.TrangThaiDonThue.ChoThanhToan
            };

            _context.DonThues.Add(donThueMoi);
            await _context.SaveChangesAsync();

            foreach (var item in request.ChiTiet)
            {
                var chiTiet = new ChiTietDonThue
                {
                    MaDonThue = donThueMoi.MaDonThue,
                    MaSanPham = item.MaSanPham,
                    SoLuong = item.SoLuong,
                    // TODO
                    DonGiaThueMoiNgay = 50000,
                    MucCocMoiThietBi = 200000
                };

                _context.ChiTietDonThues.Add(chiTiet);

                var giuCho = new GiuCho
                {
                    ChiTietDonThue = chiTiet,
                    ThoiDiemTao = DateTime.UtcNow,
                    ThoiDiemHetHan = donThueMoi.HanThanhToan ?? DateTime.UtcNow.AddMinutes(15),
                    TrangThai = Models.Enums.TrangThaiGiuCho.DangGiu
                };

                _context.GiuChos.Add(giuCho);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var response = new DonThueResponse(
                donThueMoi.MaDonThue,
                donThueMoi.MaDonHienThi,
                0,
                0,
                donThueMoi.TrangThai.ToString(),
                donThueMoi.HanThanhToan ?? DateTime.UtcNow.AddMinutes(15)
            );

            return Result<DonThueResponse>.Ok(response);
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();

            return Result<DonThueResponse>.Loi(
                "LOI_HE_THONG",
                $"Đã xảy ra lỗi khi tạo đơn: {e.Message}"
            );
        }

    }
}
