using System.Text.Json;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhuPhi;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class PhuPhiService
{
    public async Task<Result<PhuPhiResponse>> TaoTranhChapAsync(long id, TranhChapRequest dto, long actorId)
    {
        await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        var maKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, actorId);

        var phuPhi = await _context.PhuPhis.Include(p => p.DonThue).FirstOrDefaultAsync(p => p.MaPhuPhi == id);
        if (phuPhi == null) return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí.");
        if (phuPhi.DonThue.MaKhachHang != maKhachHang)
            return Result<PhuPhiResponse>.Loi("KHONG_CO_QUYEN", "Khách hàng không sở hữu đơn thuê chứa khoản phụ phí này.");
        if (phuPhi.TrangThaiDuyet != "DaDuyet")
            return Result<PhuPhiResponse>.Loi("TRANG_THAI_KHONG_HOP_LE", "Chỉ có thể khiếu nại phụ phí đã được duyệt chính thức.");
        if (phuPhi.TrangThaiTranhChap == "DangTranhChap")
            return Result<PhuPhiResponse>.Loi("PHI_DANG_TRANH_CHAP", "Phụ phí này đang trong quá trình giải quyết tranh chấp.");

        phuPhi.TrangThaiTranhChap = "DangTranhChap";
        phuPhi.LyDo = $"{phuPhi.LyDo} [Khách khiếu nại: {dto.NoiDung}]";
        if (dto.DanhSachAnh != null && dto.DanhSachAnh.Any())
            phuPhi.BangChung = JsonSerializer.Serialize(dto.DanhSachAnh);

        await _context.SaveChangesAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhi));
    }

    public async Task<Result<PhuPhiResponse>> GiaiQuyetTranhChapAsync(long id, GiaiQuyetTranhChapRequest dto, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        if (tk.VaiTro != "QuanTriVien")
            return Result<PhuPhiResponse>.Loi("KHONG_CO_QUYEN", "Chỉ Quản trị viên mới có quyền giải quyết tranh chấp phụ phí.");

        var phuPhi = await _context.PhuPhis.FirstOrDefaultAsync(p => p.MaPhuPhi == id);
        if (phuPhi == null) return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí.");
        if (phuPhi.TrangThaiTranhChap != "DangTranhChap")
            return Result<PhuPhiResponse>.Loi("TRANG_THAI_KHONG_HOP_LE", "Phụ phí không ở trạng thái đang tranh chấp.");

        phuPhi.TrangThaiTranhChap = "DaGiaiQuyet";
        phuPhi.KetQuaGiaiQuyet = $"{dto.KetQua}: {dto.LyDo}";

        if (dto.KetQua == "HuyPhi")
            phuPhi.TrangThaiDuyet = "TuChoi";
        else if (dto.KetQua == "DieuChinh" && dto.SoTienDeXuatSauXuLy.HasValue && phuPhi.MaDoiSoat == null)
            phuPhi.SoTien = dto.SoTienDeXuatSauXuLy.Value;

        await _context.SaveChangesAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhi));
    }

    private static PhuPhiResponse ChuyenSangPhuPhiResponse(PhuPhi entity)
    {
        CanCuTinhPhiDto? canCu = TryDeserialize<CanCuTinhPhiDto>(entity.CanCuTinhPhi);
        List<string>? bangChung = TryDeserialize<List<string>>(entity.BangChung);

        return new PhuPhiResponse
        {
            MaPhuPhi = entity.MaPhuPhi, MaDonThue = entity.MaDonThue, MaChiTietBanGiao = entity.MaChiTietBanGiao,
            MaNguoiLap = entity.MaNguoiLap, TenNguoiLap = entity.NguoiLap?.HoTen,
            MaNguoiDuyet = entity.MaNguoiDuyet, TenNguoiDuyet = entity.NguoiDuyet?.HoTen,
            MaPhuPhiGoc = entity.MaPhuPhiGoc, MaDoiSoat = entity.MaDoiSoat, LoaiPhi = entity.LoaiPhi,
            SoTien = entity.SoTien, LyDo = entity.LyDo, CanCuTinhPhi = canCu, BangChung = bangChung,
            ThoiDiemLap = entity.ThoiDiemLap, ThoiDiemDuyet = entity.ThoiDiemDuyet,
            TrangThaiDuyet = entity.TrangThaiDuyet, TrangThaiTranhChap = entity.TrangThaiTranhChap,
            KetQuaGiaiQuyet = entity.KetQuaGiaiQuyet, DaKhoaDoiSoat = entity.MaDoiSoat != null
        };
    }

    private static T? TryDeserialize<T>(string? json) where T : class
    {
        if (string.IsNullOrEmpty(json)) return null;
        try { return JsonSerializer.Deserialize<T>(json); }
        catch { return null; }
    }
}
