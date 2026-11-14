using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuaHan;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

public partial class QuaHanService
{
    public async Task<Result<List<NhatKyLienHeQuaHanResponse>>> LayNhatKyLienHeAsync(long donId, long actorId)
    {
        var don = await _context.DonThues.AsNoTracking().FirstOrDefaultAsync(d => d.MaDonThue == donId);
        if (don == null) return Result<List<NhatKyLienHeQuaHanResponse>>.Loi("DON_NOT_FOUND", "Không tìm thấy đơn thuê.");

        var logs = await _context.NhatKyLienHeQuaHans.AsNoTracking()
            .Include(n => n.NguoiLienHe).ThenInclude(t => t.NhanVien)
            .Where(n => n.MaDonThue == donId)
            .OrderByDescending(n => n.ThoiDiemLienHe)
            .Select(n => new NhatKyLienHeQuaHanResponse
            {
                MaNhatKyLienHe = n.MaNhatKyLienHe,
                MaDonThue = n.MaDonThue,
                MaTaiKhoan = n.MaTaiKhoan,
                TenNguoiLienHe = n.NguoiLienHe.NhanVien != null
                    ? (n.NguoiLienHe.NhanVien.HoTen ?? n.NguoiLienHe.Email ?? string.Empty)
                    : (n.NguoiLienHe.Email ?? string.Empty),
                KenhLienHe = n.KenhLienHe,
                KetQua = n.KetQua,
                NoiDung = n.NoiDung,
                HenTraMoi = n.HenTraMoi,
                ThoiDiemLienHe = n.ThoiDiemLienHe
            }).ToListAsync();

        return Result<List<NhatKyLienHeQuaHanResponse>>.Ok(logs);
    }

    public async Task<Result<NhatKyLienHeQuaHanResponse>> GhiNhatKyLienHeAsync(
        long donId, TaoNhatKyLienHeQuaHanRequest request, long actorId)
    {
        var don = await _context.DonThues.FirstOrDefaultAsync(d => d.MaDonThue == donId);
        if (don == null) return Result<NhatKyLienHeQuaHanResponse>.Loi("DON_NOT_FOUND", "Không tìm thấy đơn thuê.");
        if (string.IsNullOrWhiteSpace(request.NoiDung))
            return Result<NhatKyLienHeQuaHanResponse>.Loi("DU_LIEU_KHONG_HOP_LE", "Nội dung liên hệ không được để trống.");

        var taiKhoan = await _context.TaiKhoans.Include(t => t.NhanVien)
            .FirstOrDefaultAsync(t => t.MaTaiKhoan == actorId);
        if (taiKhoan == null)
            return Result<NhatKyLienHeQuaHanResponse>.Loi("KHONG_CO_QUYEN", "Không xác định được tài khoản thực hiện.");

        var entity = new NhatKyLienHeQuaHan
        {
            MaDonThue = donId,
            MaTaiKhoan = actorId,
            KenhLienHe = string.IsNullOrWhiteSpace(request.KenhLienHe) ? "GoiDien" : request.KenhLienHe.Trim(),
            KetQua = string.IsNullOrWhiteSpace(request.KetQua) ? "DaLienHe" : request.KetQua.Trim(),
            NoiDung = request.NoiDung.Trim(),
            HenTraMoi = request.HenTraMoi,
            ThoiDiemLienHe = DateTime.UtcNow
        };

        _context.NhatKyLienHeQuaHans.Add(entity);
        await _context.SaveChangesAsync();

        return Result<NhatKyLienHeQuaHanResponse>.Ok(new NhatKyLienHeQuaHanResponse
        {
            MaNhatKyLienHe = entity.MaNhatKyLienHe,
            MaDonThue = entity.MaDonThue,
            MaTaiKhoan = entity.MaTaiKhoan,
            TenNguoiLienHe = taiKhoan.NhanVien?.HoTen ?? taiKhoan.Email ?? string.Empty,
            KenhLienHe = entity.KenhLienHe,
            KetQua = entity.KetQua,
            NoiDung = entity.NoiDung,
            HenTraMoi = entity.HenTraMoi,
            ThoiDiemLienHe = entity.ThoiDiemLienHe
        });
    }
}
