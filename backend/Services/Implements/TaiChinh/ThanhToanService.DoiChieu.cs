using GearGo.Models.Common;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class ThanhToanService
{
    public async Task<Result<string>> DoiChieuGiaoDichAsync(long maThanhToan, DoiChieuGiaoDichRequest request, long actorId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var tt = await _context.ThanhToans.Include(t => t.ChiTietThanhToans).Include(t => t.DonThue)
                .FirstOrDefaultAsync(t => t.MaThanhToan == maThanhToan);
            if (tt == null) return Result<string>.Loi("GIAO_DICH_NOT_FOUND", "Không tìm thấy giao dịch.");

            var chiTiet = tt.ChiTietThanhToans.FirstOrDefault();
            if (chiTiet == null)
            {
                chiTiet = new ChiTietThanhToan { MaThanhToan = tt.MaThanhToan, MucDich = "ThuBoSung", SoTien = tt.TongSoTien };
                tt.ChiTietThanhToans.Add(chiTiet);
                await _context.SaveChangesAsync();
            }

            var yeuCauHoanCanGui = new List<HoanTien>();
            var err = await ApDungKetLuanDoiChieuAsync(tt, chiTiet, request, actorId, yeuCauHoanCanGui);
            if (err != null) return err;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            if (yeuCauHoanCanGui.Any() && _hoanTienService != null)
                await _hoanTienService.GuiYeuCauDaLapAsync(yeuCauHoanCanGui.Select(h => h.MaHoanTien), actorId);

            return Result<string>.Ok($"Đối chiếu thành công giao dịch #{tt.MaThanhToan} với kết luận '{request.KetLuan}'.");
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<string>.Loi("SYS_ERROR", $"Lỗi hệ thống khi đối chiếu giao dịch: {e.Message}");
        }
    }

    private async Task<Result<string>?> ApDungKetLuanDoiChieuAsync(
        ThanhToan tt, ChiTietThanhToan chiTiet, DoiChieuGiaoDichRequest request, long actorId, List<HoanTien> yeuCauHoanCanGui)
    {
        switch (request.KetLuan)
        {
            case "HopLe_HoanTienThua":
                decimal soTienHoan = request.SoTienHoan ?? tt.TongSoTien;
                if (soTienHoan <= 0) return Result<string>.Loi("SO_TIEN_HOAN_KHONG_HOP_LE", "Số tiền hoàn phải lớn hơn 0.");
                if (_hoanTienService == null) return Result<string>.Loi("SYS_ERROR", "Dịch vụ hoàn tiền chưa được cấu hình.");

                tt.TrangThai = TrangThaiThanhToan.ThanhCong;
                await _context.SaveChangesAsync();
                yeuCauHoanCanGui.AddRange(await _hoanTienService.LapYeuCauHoanAsync(new LapHoanCommand(
                    tt.MaDonThue, LoaiHoanTien.HoanThuThua, $"TT:{chiTiet.MaChiTietThanhToan}",
                    soTienHoan, new[] { chiTiet.MaChiTietThanhToan }, null,
                    $"Đối chiếu xử lý hoàn tiền thừa giao dịch #{tt.MaThanhToan}: {request.GhiChu}"), actorId));

                tt.TrangThaiDoiChieu = "DaDoiChieu";
                tt.GhiChu += $" [Đã đối chiếu admin: Lập lệnh hoàn tiền {soTienHoan:N0} đ. Lý do: {request.GhiChu}]";
                return null;

            case "HopLe_XacNhan":
                tt.TrangThaiDoiChieu = "DaDoiChieu";
                tt.TrangThai = "ThanhCong";
                tt.GhiChu += $" [Đã đối chiếu admin: Xác nhận hợp lệ. Ghi chú: {request.GhiChu}]";
                return null;

            case "TuChoi":
                tt.TrangThaiDoiChieu = "DaDoiChieu";
                tt.TrangThai = "ThatBai";
                tt.GhiChu += $" [Đã đối chiếu admin: Từ chối giao dịch. Lý do: {request.GhiChu}]";
                return null;

            default:
                return Result<string>.Loi("KET_LUAN_KHONG_HOP_LE", "Kết luận đối chiếu không hợp lệ.");
        }
    }
}
