using System.Data;
using Microsoft.EntityFrameworkCore;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;

namespace GearGo.Services.Implements;

public class DonThueService : IDonThueService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService _khaDungService;

    public DonThueService(ApplicationDbContext context, IKhaDungService khaDungService)
    {
        _context = context;
        _khaDungService = khaDungService;
    }

    public async Task<Result<DonThueResponse>> TaoDonThueAsync(TaoDonThueRequest request)
    {
        using var transaction = await _context.Database
                .BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            // Check inventory using KhaDungService
            var danhSachSpIds = request.ChiTiet.Select(c => c.MaSanPham).ToList();
            var khaDungData = await _khaDungService.LayKhaDungNhieuAsync(danhSachSpIds, request.GioNhanDuKien, request.GioTraDuKien);
            
            bool duHang = true;
            foreach (var item in request.ChiTiet)
            {
                if (!khaDungData.ContainsKey(item.MaSanPham) || khaDungData[item.MaSanPham] < item.SoLuong)
                {
                    duHang = false;
                    break;
                }
            }

            if (!duHang)
            {
                return Result<DonThueResponse>.Loi(
                    "HET_HANG",
                    "Một số thiết bị trong giỏ hàng đã hết số lượng khả dụng trong thời gian này."
                );
            }

            // Get active policy
            var chinhSach = await _context.ChinhSachs
                .OrderByDescending(c => c.ThoiDiemApDung)
                .FirstOrDefaultAsync(c => c.ThoiDiemApDung <= DateTime.UtcNow);

            var donThueMoi = new DonThue
            {
                MaKhachHang = request.MaKhachHang,
                MaChinhSach = chinhSach?.MaChinhSach ?? 1,
                MaDonHienThi = $"DH{DateTime.UtcNow:yyyyMMddHHmmss}",
                NgayDat = DateTime.UtcNow,
                GioNhanDuKien = request.GioNhanDuKien,
                GioTraDuKien = request.GioTraDuKien,
                HanThanhToan = DateTime.UtcNow.AddMinutes(15), 
                TenNguoiNhan = request.TenNguoiNhan,
                SoDienThoaiNguoiNhan = request.SoDienThoaiNguoiNhan,
                EmailLienHe = request.EmailLienHe,
                TrangThai = TrangThaiDonThue.ChoThanhToan
            };

            _context.DonThues.Add(donThueMoi);
            await _context.SaveChangesAsync();

            // Fetch actual prices
            var sanPhams = await _context.SanPhams
                .Where(s => danhSachSpIds.Contains(s.MaSanPham))
                .ToDictionaryAsync(s => s.MaSanPham);

            foreach (var item in request.ChiTiet)
            {
                var sp = sanPhams.GetValueOrDefault(item.MaSanPham);
                var chiTiet = new ChiTietDonThue
                {
                    MaDonThue = donThueMoi.MaDonThue,
                    MaSanPham = item.MaSanPham,
                    SoLuong = item.SoLuong,
                    DonGiaThueMoiNgay = sp?.GiaThueMoiNgay ?? 0,
                    MucCocMoiThietBi = sp?.MucCocMoiThietBi ?? 0
                };

                _context.ChiTietDonThues.Add(chiTiet);

                var giuCho = new GiuCho
                {
                    ChiTietDonThue = chiTiet,
                    ThoiDiemTao = DateTime.UtcNow,
                    ThoiDiemHetHan = donThueMoi.HanThanhToan ?? DateTime.UtcNow.AddMinutes(15),
                    TrangThai = TrangThaiGiuCho.DangGiu
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

    public async Task<Result<bool>> HuyDonAsync(long maDonThue, string lyDo)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var donThue = await _context.DonThues
                .Include(d => d.ChiTietDonThues)
                .ThenInclude(c => c.GiuCho)
                .FirstOrDefaultAsync(d => d.MaDonThue == maDonThue);

            if (donThue == null)
                return Result<bool>.Loi("NOT_FOUND", "Không tìm thấy đơn.");

            // Chỉ cho phép hủy nếu đơn chưa thanh toán hoặc đang chờ xử lý
            if (donThue.TrangThai != TrangThaiDonThue.ChoThanhToan)
                return Result<bool>.Loi("INVALID_STATE", "Không thể hủy đơn ở trạng thái này.");

            // 1. Cập nhật Đơn
            donThue.TrangThai = TrangThaiDonThue.KhachHuy;
            donThue.ThoiDiemHuy = DateTime.UtcNow;
            donThue.LyDoHuy = lyDo;

            // 2. Nhả hàng
            foreach (var chiTiet in donThue.ChiTietDonThues)
            {
                if (chiTiet.GiuCho != null)
                {
                    chiTiet.GiuCho.TrangThai = TrangThaiGiuCho.DaGiaiPhong;
                    chiTiet.GiuCho.ThoiDiemGiaiPhong = DateTime.UtcNow;
                }
            }

            // 3. Ghi log lịch sử
            _context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = donThue.MaDonThue,
                TrangThaiTruoc = TrangThaiDonThue.ChoThanhToan.ToString(),
                TrangThaiSau = TrangThaiDonThue.KhachHuy.ToString(),
                ThoiDiem = DateTime.UtcNow,
                LyDo = lyDo
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<bool>.Ok(true);
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<bool>.Loi("SYS_ERROR", "Lỗi hủy đơn: " + e.Message);
        }
    }
}
