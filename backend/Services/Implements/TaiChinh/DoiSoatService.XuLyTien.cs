using System.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DoiSoat;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class DoiSoatService
{
    public async Task<Result<DoiSoatResponse>> YeuCauXuLyTienAsync(long id, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);
        var yeuCauHoanCanGui = new List<HoanTien>();
        DoiSoatTienCoc daXuLy;

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var doiSoat = await _context.DoiSoatTienCocs
                .Include(d => d.DonThue)
                .Include(d => d.GiaoDichDoiSoats).ThenInclude(g => g.ChiTietThanhToan).ThenInclude(ct => ct.ThanhToan)
                .Include(d => d.HoanTiens)
                .FirstOrDefaultAsync(d => d.MaDoiSoat == id);

            if (doiSoat == null) return Result<DoiSoatResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy phiếu đối soát.");
            if (doiSoat.TrangThai == "DaChot")
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_DA_CHOT", "Phiếu đối soát đã chốt, không thể phát lệnh xử lý tiền mới.");

            var err = await PhatLenhTheoNghiaVuAsync(doiSoat, actorId, yeuCauHoanCanGui);
            if (err != null) return err;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            daXuLy = doiSoat;
        }
        catch (NghiepVuException ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi(ex.MaLoi, ex.Message, ex.ChiTiet);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi yêu cầu xử lý tiền: {ex.Message}");
        }

        // Sau commit mới gửi gateway; lỗi gateway được HoanTienService ghi ChuaRoKetQua, không làm hỏng đối soát.
        await _hoanTienService.GuiYeuCauDaLapAsync(yeuCauHoanCanGui.Select(h => h.MaHoanTien), maNhanVien);
        foreach (var h in daXuLy.HoanTiens) await _context.Entry(h).ReloadAsync();
        return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(daXuLy));
    }

    public async Task<Result<DoiSoatResponse>> ChotDoiSoatAsync(long id, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);
        var nv = await _context.NhanViens.Include(n => n.TaiKhoan).FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien);

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var doiSoat = await TaiDoiSoatDayDuQuery().FirstOrDefaultAsync(d => d.MaDoiSoat == id);
            if (doiSoat == null) return Result<DoiSoatResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy phiếu đối soát.");
            if (doiSoat.TrangThai == "DaChot") return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));

            var err = await KiemTraDieuKienChotAsync(doiSoat);
            if (err != null) return err;

            doiSoat.TrangThai = "DaChot";
            doiSoat.ThoiDiemChot = DateTime.UtcNow;
            doiSoat.MaNguoiChot = maNhanVien;
            doiSoat.TenNguoiChotLucDoiSoat = nv?.HoTen ?? "Nhân viên vận hành";

            var trangThaiTruoc = doiSoat.DonThue.TrangThai.ToString();
            doiSoat.DonThue.TrangThai = TrangThaiDonThue.HoanTat;
            doiSoat.DonThue.ThoiDiemHoanTat = DateTime.UtcNow;

            _context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = doiSoat.MaDonThue, MaNguoiThucHien = actorId,
                TrangThaiTruoc = trangThaiTruoc, TrangThaiSau = TrangThaiDonThue.HoanTat.ToString(),
                ThoiDiem = DateTime.UtcNow,
                LyDo = $"Đối soát hoàn tất: cọc đối soát {doiSoat.TienCocDuocDoiSoat:N0}đ, phụ phí {doiSoat.TongPhuPhiDuocDuyet:N0}đ"
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi chốt đối soát: {ex.Message}");
        }
    }

    private async Task<Result<DoiSoatResponse>?> PhatLenhTheoNghiaVuAsync(
        DoiSoatTienCoc doiSoat, long actorId, List<HoanTien> yeuCauHoanCanGui)
    {
        if (doiSoat.SoTienCanThuThem > 0)
        {
            var res = await _thanhToanService.TaoThuBoSungAsync(
                new TaoThuBoSungRequest { MaDoiSoat = doiSoat.MaDoiSoat, PhuongThucDuocHoTro = "VNPAY" }, actorId);
            if (!res.ThanhCong && res.MaLoi != "THU_THEM_DANG_CHO")
                return Result<DoiSoatResponse>.Loi(res.MaLoi ?? "LOI_THU_THEM", res.ThongDiep ?? "Lỗi khi tạo yêu cầu thu bổ sung.");
            doiSoat.TrangThai = "DangXuLyTien";
            return null;
        }

        if (doiSoat.SoTienCanHoan > 0)
        {
            var nguonCoc = doiSoat.GiaoDichDoiSoats.Select(g => g.ChiTietThanhToan)
                .Where(ct => ct != null && ct.MucDich == MucDichThanhToan.TienCoc).Select(ct => ct.MaChiTietThanhToan).ToList();
            if (!nguonCoc.Any() && doiSoat.MaDoiSoatGoc != null)
                nguonCoc = await _context.GiaoDichDoiSoats
                    .Where(g => g.MaDoiSoat == doiSoat.MaDoiSoatGoc.Value && g.ChiTietThanhToan.MucDich == MucDichThanhToan.TienCoc)
                    .Select(g => g.MaChiTietThanhToan).ToListAsync();

            yeuCauHoanCanGui.AddRange(await _hoanTienService.LapYeuCauHoanAsync(new LapHoanCommand(
                doiSoat.MaDonThue, LoaiHoanTien.HoanCocDoiSoat, $"DS:{doiSoat.MaDoiSoat}", doiSoat.SoTienCanHoan,
                nguonCoc, doiSoat.MaDoiSoat, $"Hoàn tiền cọc sau đối soát đơn #{doiSoat.MaDonThue}"), actorId));
            doiSoat.TrangThai = "DangXuLyTien";
            return null;
        }

        doiSoat.TrangThai = "ChoChot";
        return null;
    }

    private async Task<Result<DoiSoatResponse>?> KiemTraDieuKienChotAsync(DoiSoatTienCoc doiSoat)
    {
        if (doiSoat.SoTienCanHoan > 0)
        {
            var daHoan = doiSoat.HoanTiens.Where(h => h.TrangThai == "ThanhCong").Sum(h => h.SoTien);
            if (daHoan < doiSoat.SoTienCanHoan)
            {
                var conPending = doiSoat.HoanTiens.Any(h => TrangThaiHoanTien.GiuHanMuc.Contains(h.TrangThai));
                return Result<DoiSoatResponse>.Loi("GIAO_DICH_CHUA_RO_KET_QUA",
                    $"Tiền hoàn chưa được thực hiện thành công đủ. Đã hoàn: {daHoan:N0}đ / Cần hoàn: {doiSoat.SoTienCanHoan:N0}đ. {(conPending ? "Có lệnh hoàn đang chờ xử lý." : "")}");
            }
        }

        if (doiSoat.SoTienCanThuThem > 0)
        {
            var daThu = doiSoat.GiaoDichDoiSoats.Select(g => g.ChiTietThanhToan)
                .Where(ct => ct.MucDich == "ThuBoSung" && ct.ThanhToan.TrangThai == "ThanhCong").Sum(ct => ct.SoTien);
            if (daThu < doiSoat.SoTienCanThuThem)
            {
                var thanhToanTc = await _context.ThanhToans.Include(t => t.ChiTietThanhToans)
                    .Where(t => t.MaDonThue == doiSoat.MaDonThue && t.TrangThai == "ThanhCong"
                             && t.GhiChu != null && t.GhiChu.Contains(doiSoat.MaDoiSoat.ToString()))
                    .SelectMany(t => t.ChiTietThanhToans).Where(ct => ct.MucDich == "ThuBoSung").SumAsync(ct => ct.SoTien);
                if (thanhToanTc < doiSoat.SoTienCanThuThem)
                    return Result<DoiSoatResponse>.Loi("GIAO_DICH_CHUA_RO_KET_QUA",
                        $"Tiền thu thêm chưa được thanh toán đủ. Đã thu: {Math.Max(daThu, thanhToanTc):N0}đ / Cần thu thêm: {doiSoat.SoTienCanThuThem:N0}đ.");
            }
        }

        if (await _context.PhuPhis.AnyAsync(p => p.MaDonThue == doiSoat.MaDonThue && p.TrangThaiTranhChap == "DangTranhChap"))
            return Result<DoiSoatResponse>.Loi("PHI_DANG_TRANH_CHAP", "Không thể chốt đối soát khi đơn thuê còn phụ phí đang có tranh chấp chưa giải quyết.");

        return null;
    }
}
