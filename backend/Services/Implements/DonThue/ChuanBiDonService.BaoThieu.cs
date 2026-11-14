using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Exceptions;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ChuanBiDon;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

public partial class ChuanBiDonService
{
    public async Task<Result<BaoThieuThietBiResponse>> BaoThieuThietBiAsync(
        long donId, BaoThieuThietBiRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.LyDo))
            throw new DuLieuKhongHopLeException("DU_LIEU_KHONG_HOP_LE", "Lý do báo thiếu thiết bị là bắt buộc.");

        var nhanVien = await LayNhanVienAsync(maTaiKhoan, ct);
        var don = await _db.DonThues.Include(d => d.ChiTietDonThues)
            .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
            ?? throw new KhongTimThayException($"Không tìm thấy đơn thuê #{donId}.");

        if (don.TrangThai is not (TrangThaiDonThue.DaXacNhan or TrangThaiDonThue.DangChuanBi or TrangThaiDonThue.SanSangNhan))
            throw new TrangThaiKhongHopLeException(
                $"Chỉ có thể báo thiếu thiết bị khi đơn ở trạng thái DaXacNhan, DangChuanBi hoặc SanSangNhan. Hiện tại: {don.TrangThai}.");

        if (request.DongDonId.HasValue && !don.ChiTietDonThues.Any(c => c.MaChiTietDon == request.DongDonId.Value))
            throw new KhongTimThayException($"Dòng đặt #{request.DongDonId.Value} không thuộc đơn #{donId}.");

        var now = DateTime.UtcNow;
        _lichSuService.GhiNhatKyThaoTac(new GhiNhatKyCommand(
            maTaiKhoan, "BaoThieuThietBi", "DonThue", donId.ToString(), null,
            new { request.DongDonId, request.SoLuongThieu, request.LyDo, request.GhiChu, MaNhanVien = nhanVien.MaNhanVien },
            request.LyDo));

        var adminIds = await _db.TaiKhoans
            .Where(t => t.VaiTro == "QuanTriVien" && t.TrangThai == "HoatDong")
            .Select(t => t.MaTaiKhoan).ToListAsync(ct);

        var suKienKey = $"BAO_THIEU:{donId}:{now.Ticks}";
        foreach (var adminId in adminIds)
        {
            await _thongBaoService.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(
                donId, "BaoThieuThietBi", suKienKey,
                $"Cảnh báo thiếu thiết bị - Đơn #{don.MaDonHienThi}",
                $"Nhân viên {nhanVien.HoTen} báo thiếu thiết bị cho đơn #{don.MaDonHienThi}. Lý do: {request.LyDo}",
                adminId));
        }

        await _db.SaveChangesAsync(ct);
        return Result<BaoThieuThietBiResponse>.Ok(new BaoThieuThietBiResponse
        {
            MaDonThue = don.MaDonThue, MaDonHienThi = don.MaDonHienThi, TrangThaiDon = don.TrangThai.ToString(),
            DongDonId = request.DongDonId, SoLuongThieu = request.SoLuongThieu, LyDo = request.LyDo.Trim(),
            GhiChu = request.GhiChu, ThoiDiemBao = now, SoThongBaoDaGui = adminIds.Count
        });
    }
}
