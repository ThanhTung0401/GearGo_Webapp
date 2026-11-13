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
        var maDonHienThi = await _context.DonThues.Where(d => d.MaDonThue == maDonThue)
            .Select(d => d.MaDonHienThi).FirstOrDefaultAsync();
        return await TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(
            maDonThue, LoaiSanSangNhan, eventKey,
            "Đơn thuê đã sẵn sàng nhận",
            $"Đơn {maDonHienThi} đã được chuẩn bị xong, bạn có thể đến nhận thiết bị theo lịch hẹn."));
    }

    public async Task<ThongBao> TaoThongBaoSuKienAsync(SuKienThongBaoCommand c)
    {
        if (string.IsNullOrWhiteSpace(c.MaSuKien) || c.MaSuKien.Length > 100)
            throw new SuKienKhongHopLeException("Mã sự kiện thiếu hoặc quá dài (tối đa 100 ký tự).");
        if (string.IsNullOrWhiteSpace(c.LoaiSuKien) || c.LoaiSuKien.Length > 50)
            throw new SuKienKhongHopLeException("Loại sự kiện thiếu hoặc quá dài (tối đa 50 ký tự).");
        if (string.IsNullOrWhiteSpace(c.TieuDe) || c.TieuDe.Length > 255)
            throw new SuKienKhongHopLeException("Tiêu đề thông báo thiếu hoặc quá dài (tối đa 255 ký tự).");

        var don = await _context.DonThues
            .Where(d => d.MaDonThue == c.MaDonThue)
            .Select(d => new { d.MaDonThue, MaTaiKhoan = d.KhachHang.MaTaiKhoan })
            .FirstOrDefaultAsync()
            ?? throw new SuKienKhongHopLeException("Đơn thuê không tồn tại.");
        // Mặc định gửi chủ đơn; người nhận khác (vd. quản trị viên) do service nghiệp vụ chỉ định.
        var maNhan = c.MaTaiKhoanNhan ?? don.MaTaiKhoan;

        // Kiểm tra cả bản ghi vừa thêm (chưa SaveChanges) lẫn database; ERD không có unique ma_su_kien.
        var daCo = _context.ThongBaos.Local.FirstOrDefault(t =>
                       t.MaTaiKhoan == maNhan && t.MaSuKien == c.MaSuKien && t.KenhGui == KenhTrongUngDung)
                   ?? await _context.ThongBaos.FirstOrDefaultAsync(t =>
                       t.MaTaiKhoan == maNhan && t.MaSuKien == c.MaSuKien && t.KenhGui == KenhTrongUngDung);

        if (daCo != null)
        {
            if (daCo.MaDonThue != c.MaDonThue)
                throw new XungDotSuKienException("Mã sự kiện đã dùng cho đơn khác; không ghi đè thông báo cũ.");
            return daCo;
        }

        var tb = new ThongBao
        {
            MaTaiKhoan = maNhan,
            MaDonThue = c.MaDonThue,
            MaSuKien = c.MaSuKien,
            LoaiSuKien = c.LoaiSuKien,
            TieuDe = c.TieuDe,
            NoiDung = c.NoiDung,
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

    public async Task<int> DemChuaDocAsync(long maTaiKhoan)
    {
        return await _context.ThongBaos
            .AsNoTracking()
            .Where(t => t.MaTaiKhoan == maTaiKhoan && t.KenhGui == KenhTrongUngDung && t.ThoiDiemDoc == null)
            .CountAsync();
    }

    public async Task<int> DanhDauTatCaDaDocAsync(long maTaiKhoan)
    {
        return await _context.ThongBaos
            .Where(t => t.MaTaiKhoan == maTaiKhoan && t.KenhGui == KenhTrongUngDung && t.ThoiDiemDoc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ThoiDiemDoc, DateTime.UtcNow));
    }

    public async Task<ThongBao> TaoThongBaoEmailAsync(SuKienThongBaoCommand c)
    {
        if (string.IsNullOrWhiteSpace(c.MaSuKien) || c.MaSuKien.Length > 100)
            throw new SuKienKhongHopLeException("Mã sự kiện thiếu hoặc quá dài (tối đa 100 ký tự).");
        if (string.IsNullOrWhiteSpace(c.LoaiSuKien) || c.LoaiSuKien.Length > 50)
            throw new SuKienKhongHopLeException("Loại sự kiện thiếu hoặc quá dài (tối đa 50 ký tự).");
        if (string.IsNullOrWhiteSpace(c.TieuDe) || c.TieuDe.Length > 255)
            throw new SuKienKhongHopLeException("Tiêu đề thông báo thiếu hoặc quá dài (tối đa 255 ký tự).");

        var don = await _context.DonThues
            .Where(d => d.MaDonThue == c.MaDonThue)
            .Select(d => new { d.MaDonThue, MaTaiKhoan = d.KhachHang.MaTaiKhoan })
            .FirstOrDefaultAsync()
            ?? throw new SuKienKhongHopLeException("Đơn thuê không tồn tại.");

        var maNhan = c.MaTaiKhoanNhan ?? don.MaTaiKhoan;

        var daCo = _context.ThongBaos.Local.FirstOrDefault(t =>
                       t.MaTaiKhoan == maNhan && t.MaSuKien == c.MaSuKien && t.KenhGui == "Email")
                   ?? await _context.ThongBaos.FirstOrDefaultAsync(t =>
                       t.MaTaiKhoan == maNhan && t.MaSuKien == c.MaSuKien && t.KenhGui == "Email");

        if (daCo != null)
        {
            if (daCo.MaDonThue != c.MaDonThue)
                throw new XungDotSuKienException("Mã sự kiện đã dùng cho đơn khác; không ghi đè thông báo cũ.");
            return daCo;
        }

        var tb = new ThongBao
        {
            MaTaiKhoan = maNhan,
            MaDonThue = c.MaDonThue,
            MaSuKien = c.MaSuKien,
            LoaiSuKien = c.LoaiSuKien,
            TieuDe = c.TieuDe,
            NoiDung = c.NoiDung,
            KenhGui = "Email",
            TrangThaiGui = "ChuaGui",
            SoLanThuGui = 0,
            ThoiDiemTao = DateTime.UtcNow
        };
        _context.ThongBaos.Add(tb);
        return tb;
    }

    public async Task<Result<GuiThongBaoAdminResponse>> GuiThongBaoThuCongAsync(GuiThongBaoAdminRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.TieuDe) || request.TieuDe.Trim().Length > 255)
            return Result<GuiThongBaoAdminResponse>.Loi("THONG_BAO_TIEU_DE_KHONG_HOP_LE", "Tiêu đề bắt buộc và tối đa 255 ký tự.");
        if (string.IsNullOrWhiteSpace(request.NoiDung))
            return Result<GuiThongBaoAdminResponse>.Loi("THONG_BAO_NOI_DUNG_TRONG", "Nội dung thông báo không được để trống.");

        List<long> danhSachNguoiNhan;
        if (request.MaTaiKhoanNhan.HasValue)
        {
            var tonTai = await _context.TaiKhoans.AsNoTracking()
                .AnyAsync(t => t.MaTaiKhoan == request.MaTaiKhoanNhan.Value && t.TrangThai == "HoatDong");
            if (!tonTai)
                return Result<GuiThongBaoAdminResponse>.Loi("TAI_KHOAN_NOT_FOUND", "Không tìm thấy tài khoản người nhận đang hoạt động.");
            danhSachNguoiNhan = [request.MaTaiKhoanNhan.Value];
        }
        else
        {
            danhSachNguoiNhan = await _context.TaiKhoans.AsNoTracking()
                .Where(t => t.TrangThai == "HoatDong")
                .Select(t => t.MaTaiKhoan)
                .ToListAsync();
        }

        if (request.MaDonThue.HasValue && !await _context.DonThues.AnyAsync(d => d.MaDonThue == request.MaDonThue.Value))
            return Result<GuiThongBaoAdminResponse>.Loi("DON_THUE_NOT_FOUND", "Đơn thuê gắn kèm không tồn tại.");

        var now = DateTime.UtcNow;
        var eventKey = $"ADMIN_MANUAL:{Guid.NewGuid():N}";
        var loaiSuKien = string.IsNullOrWhiteSpace(request.LoaiSuKien) ? "ThongBaoHeThong" : request.LoaiSuKien.Trim();
        var taoMoi = danhSachNguoiNhan.Select(maNhan => new ThongBao
        {
            MaTaiKhoan = maNhan,
            MaDonThue = request.MaDonThue,
            MaSuKien = eventKey,
            LoaiSuKien = loaiSuKien,
            TieuDe = request.TieuDe.Trim(),
            NoiDung = request.NoiDung.Trim(),
            KenhGui = KenhTrongUngDung,
            TrangThaiGui = "DaGui",
            ThoiDiemTao = now
        }).ToList();

        _context.ThongBaos.AddRange(taoMoi);
        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = actorId,
            HanhDong = "GUI_THONG_BAO_THU_CONG",
            LoaiDoiTuong = "THONG_BAO",
            MaDoiTuong = request.MaTaiKhoanNhan?.ToString() ?? "ALL",
            DuLieuSau = System.Text.Json.JsonSerializer.Serialize(new { TieuDe = request.TieuDe.Trim(), SoNguoiNhan = taoMoi.Count }),
            ThoiDiem = now
        });

        await _context.SaveChangesAsync();
        return Result<GuiThongBaoAdminResponse>.Ok(new GuiThongBaoAdminResponse(taoMoi.Count, taoMoi.Select(x => x.MaThongBao).ToList()));
    }
}

