using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class ThongBaoService : IThongBaoService
{
    public const string KenhTrongUngDung = "TrongUngDung";
    public const string LoaiSanSangNhan = "SanSangNhan";

    private readonly ApplicationDbContext _context;

    public ThongBaoService(ApplicationDbContext context) => _context = context;

    public async Task<ThongBao> TaoThongBaoSanSangNhanAsync(long maDonThue, string eventKey)
    {
        if (string.IsNullOrWhiteSpace(eventKey) || eventKey.Length > 100)
            throw new SuKienKhongHopLeException("Mã sự kiện thiếu hoặc quá dài (tối đa 100 ký tự).");

        var don = await _context.DonThues
            .Where(d => d.MaDonThue == maDonThue)
            .Select(d => new { d.MaDonThue, d.MaDonHienThi, MaTaiKhoan = d.KhachHang.MaTaiKhoan })
            .FirstOrDefaultAsync()
            ?? throw new SuKienKhongHopLeException("Đơn thuê không tồn tại.");

        // Kiểm tra cả bản ghi vừa thêm (chưa SaveChanges) lẫn database; ERD không có unique ma_su_kien.
        var daCo = _context.ThongBaos.Local.FirstOrDefault(t =>
                       t.MaTaiKhoan == don.MaTaiKhoan && t.MaSuKien == eventKey && t.KenhGui == KenhTrongUngDung)
                   ?? await _context.ThongBaos.FirstOrDefaultAsync(t =>
                       t.MaTaiKhoan == don.MaTaiKhoan && t.MaSuKien == eventKey && t.KenhGui == KenhTrongUngDung);

        if (daCo != null)
        {
            if (daCo.MaDonThue != maDonThue)
                throw new XungDotSuKienException("Mã sự kiện đã dùng cho đơn khác; không ghi đè thông báo cũ.");
            return daCo;
        }

        var tb = new ThongBao
        {
            MaTaiKhoan = don.MaTaiKhoan,
            MaDonThue = maDonThue,
            MaSuKien = eventKey,
            LoaiSuKien = LoaiSanSangNhan,
            TieuDe = "Đơn thuê đã sẵn sàng nhận",
            NoiDung = $"Đơn {don.MaDonHienThi} đã được chuẩn bị xong, bạn có thể đến nhận thiết bị theo lịch hẹn.",
            KenhGui = KenhTrongUngDung,
            // Chỉ lưu trong ứng dụng; email/SMS và retry để giai đoạn thông báo sau.
            TrangThaiGui = "ChuaGui",
            ThoiDiemTao = DateTime.UtcNow
        };
        _context.ThongBaos.Add(tb);
        return tb;
    }

    public async Task<PagedResult<ThongBaoResponse>> LayThongBaoCuaToiAsync(TimThongBaoRequest filter, long maTaiKhoan)
    {
        var trang = Math.Max(1, filter.Trang);
        var soMoi = Math.Clamp(filter.SoMoiTrang, 1, 100);

        var q = _context.ThongBaos.AsNoTracking()
            .Where(t => t.MaTaiKhoan == maTaiKhoan && t.KenhGui == KenhTrongUngDung);
        if (filter.ChuaDoc == true) q = q.Where(t => t.ThoiDiemDoc == null);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(t => t.ThoiDiemTao).ThenByDescending(t => t.MaThongBao)
            .Skip((trang - 1) * soMoi).Take(soMoi)
            .Select(t => new ThongBaoResponse(t.MaThongBao, t.MaDonThue, t.TieuDe, t.NoiDung, t.ThoiDiemTao, t.ThoiDiemDoc))
            .ToListAsync();

        return new PagedResult<ThongBaoResponse> { Items = items, TotalItems = total, CurrentPage = trang, PageSize = soMoi };
    }

    public async Task<ThongBaoResponse> DanhDauDaDocAsync(long maThongBao, long maTaiKhoan)
    {
        // UPDATE có điều kiện chủ thông báo + chưa đọc: đã đọc thì giữ lần đọc đầu.
        await _context.ThongBaos
            .Where(t => t.MaThongBao == maThongBao && t.MaTaiKhoan == maTaiKhoan && t.ThoiDiemDoc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ThoiDiemDoc, DateTime.UtcNow));

        return await _context.ThongBaos.AsNoTracking()
                   .Where(t => t.MaThongBao == maThongBao && t.MaTaiKhoan == maTaiKhoan)
                   .Select(t => new ThongBaoResponse(t.MaThongBao, t.MaDonThue, t.TieuDe, t.NoiDung, t.ThoiDiemTao, t.ThoiDiemDoc))
                   .FirstOrDefaultAsync()
               ?? throw new ThongBaoKhongTimThayException();
    }
}
