using GearGo.Exceptions;
using GearGo.Models.DTOs.KhuyenMai;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.KhuyenMai;

public partial class KhuyenMaiService
{
    public List<PhanBoDongResult> PhanBoGiamGia(List<DongBaoGiaItem> lines, decimal tongGiam)
        => PhanBoGiamGia(lines, tongGiam, null, PhamViApDung.TatCa);

    // Phân bổ phần nguyên (Floor) theo tỷ trọng, sau đó dồn phần dư từng đồng theo MaSanPham tăng dần
    private List<PhanBoDongResult> PhanBoGiamGia(
        List<DongBaoGiaItem> lines, decimal tongGiam, HashSet<long>? spHopLeIds, PhamViApDung phamVi)
    {
        var results = lines.Select(l => new PhanBoDongResult
        {
            MaSanPham = l.MaSanPham,
            TienThueTruocGiam = l.TienThueTruocGiam,
            TienGiam = 0,
            DuDieuKien = phamVi == PhamViApDung.TatCa || (spHopLeIds != null && spHopLeIds.Contains(l.MaSanPham))
        }).ToList();

        var eligibleLines = results.Where(r => r.DuDieuKien && r.TienThueTruocGiam > 0).ToList();
        decimal totalEligibleRent = eligibleLines.Sum(r => r.TienThueTruocGiam);
        if (tongGiam <= 0 || totalEligibleRent <= 0) return results;

        tongGiam = Math.Min(tongGiam, totalEligibleRent);
        decimal daPhanBo = 0;
        foreach (var line in eligibleLines)
        {
            decimal giamDong = Math.Min(line.TienThueTruocGiam, Math.Floor(tongGiam * (line.TienThueTruocGiam / totalEligibleRent)));
            line.TienGiam = giamDong;
            daPhanBo += giamDong;
        }

        DonPhanDu(eligibleLines, tongGiam - daPhanBo);
        return results;
    }

    private static void DonPhanDu(List<PhanBoDongResult> eligibleLines, decimal phanDu)
    {
        if (phanDu <= 0) return;
        var sortedLines = eligibleLines.OrderBy(l => l.MaSanPham).ToList();
        while (phanDu > 0)
        {
            bool daCong = false;
            foreach (var line in sortedLines)
            {
                if (phanDu <= 0) break;
                if (line.TienGiam >= line.TienThueTruocGiam) continue;
                line.TienGiam += 1;
                phanDu -= 1;
                daCong = true;
            }
            if (!daCong) break;
        }
    }

    public async Task GiuLuotAsync(long maKhuyenMai, long maDonThue, DateTime thoiDiemHetHan)
    {
        await GiuLuotV2Async(new GiuLuotCommand
        {
            MaKhuyenMai = maKhuyenMai,
            MaDonThue = maDonThue,
            ThoiDiemHetHan = thoiDiemHetHan,
            SoTienGiamSnapshot = 0
        });
    }

    public async Task<KetQuaLuotResponse> GiuLuotV2Async(GiuLuotCommand command)
    {
        var now = DateTime.UtcNow;
        // Khóa dòng KHUYEN_MAI bằng SQL Server UPDLOCK/ROWLOCK nếu dùng SQL Server
        try
        {
            if (_context.Database.IsSqlServer())
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT ma_khuyen_mai FROM KHUYEN_MAI WITH (UPDLOCK, ROWLOCK) WHERE ma_khuyen_mai = {0}",
                    command.MaKhuyenMai);
        }
        catch { /* Bỏ qua nếu provider InMemory không hỗ trợ hint */ }

        var km = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == command.MaKhuyenMai)
            ?? throw new KhuyenMaiKhongHopLeException("Mã giảm giá không tồn tại.");

        if (km.TrangThai == TrangThaiKhuyenMai.HetHan)
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá đã hết hạn.");

        var daDung = await _context.LuotSuDungKhuyenMais.CountAsync(l => l.MaKhuyenMai == km.MaKhuyenMai && l.TrangThai == "DaSuDung");
        var dangGiuConHan = await _context.LuotSuDungKhuyenMais.CountAsync(l => l.MaKhuyenMai == km.MaKhuyenMai && l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now);

        if (km.GioiHanTongLuot.HasValue && (daDung + dangGiuConHan) >= km.GioiHanTongLuot.Value)
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá đã hết lượt sử dụng.") { Data = { ["MaLoi"] = "MA_HET_LUOT" } };

        if (command.MaKhachHang > 0 && km.GioiHanMoiKhach.HasValue)
        {
            var luotKhach = await _context.LuotSuDungKhuyenMais.Include(l => l.DonThue)
                .CountAsync(l => l.MaKhuyenMai == km.MaKhuyenMai && l.DonThue.MaKhachHang == command.MaKhachHang &&
                                 (l.TrangThai == "DaSuDung" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now)));
            if (luotKhach >= km.GioiHanMoiKhach.Value)
                throw new KhuyenMaiKhongHopLeException("Bạn đã hết lượt sử dụng mã giảm giá này.") { Data = { ["MaLoi"] = "KHACH_HET_LUOT_MA" } };
        }

        var luot = new LuotSuDungKhuyenMai
        {
            MaKhuyenMai = command.MaKhuyenMai, MaDonThue = command.MaDonThue,
            ThoiDiemGiuLuot = now, ThoiDiemHetHan = command.ThoiDiemHetHan, TrangThai = "DangGiu"
        };
        _context.LuotSuDungKhuyenMais.Add(luot);
        await _context.SaveChangesAsync();

        return new KetQuaLuotResponse
        {
            MaLuotSuDung = luot.MaLuotSuDung, MaKhuyenMai = luot.MaKhuyenMai, MaDonThue = luot.MaDonThue,
            TrangThai = luot.TrangThai, ThoiDiemHetHan = luot.ThoiDiemHetHan, SoTienGiamSnapshot = command.SoTienGiamSnapshot
        };
    }

    public async Task XacNhanDaSuDungAsync(long maDonThue)
    {
        var now = DateTime.UtcNow;
        var luot = await _context.LuotSuDungKhuyenMais.Include(l => l.DonThue).FirstOrDefaultAsync(l => l.MaDonThue == maDonThue);
        if (luot == null || luot.TrangThai == "DaSuDung") return;
        if (luot.TrangThai == "DaGiaiPhong")
            throw new KhuyenMaiKhongHopLeException("Lượt khuyến mãi đã bị giải phóng, không thể xác nhận.");
        if (now > luot.ThoiDiemHetHan)
            throw new KhuyenMaiKhongHopLeException("Lượt giữ khuyến mãi đã hết hạn.");

        luot.TrangThai = "DaSuDung";
        luot.ThoiDiemSuDung = now;
        await _context.SaveChangesAsync();
    }

    public async Task GiaiPhongLuotAsync(long maDonThue, string? lyDo = null)
    {
        var luot = await _context.LuotSuDungKhuyenMais.Include(l => l.DonThue).FirstOrDefaultAsync(l => l.MaDonThue == maDonThue);
        if (luot == null || luot.TrangThai != "DangGiu") return;

        luot.TrangThai = "DaGiaiPhong";
        luot.ThoiDiemGiaiPhong = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }
}
