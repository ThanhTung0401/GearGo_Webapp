using System.Security.Cryptography;
using System.Text;
using GearGo.Helpers;
using GearGo.Models.DTOs.GioThue;
using GearGo.Services.Interfaces;

namespace GearGo.Services.Implements.DonThue;

public class BaoGiaService : IBaoGiaService
{
    public BaoGiaResponse TinhBaoGia(
        DateTime gioNhan,
        DateTime gioTra,
        List<ChiTietBaoGiaRequest> danhSachDong,
        decimal tongTienDuocGiamTuKhuyenMai,
        string? maKhuyenMai = null)
    {
        var response = new BaoGiaResponse
        {
            SoNgayThue = CalculationHelpers.TinhSoNgayThue(gioNhan, gioTra)
        };

        decimal tongThue = 0, tongCoc = 0;
        foreach (var dong in danhSachDong)
        {
            var tienThueDong = dong.DonGiaThueMoiNgay * dong.SoLuong * response.SoNgayThue;
            var tienCocDong = dong.MucCocMoiThietBi * dong.SoLuong;
            tongThue += tienThueDong;
            tongCoc += tienCocDong;

            response.ChiTiet.Add(new ChiTietBaoGiaResponse
            {
                MaSanPham = dong.MaSanPham,
                SoLuong = dong.SoLuong,
                TienThue = tienThueDong,
                TienCoc = tienCocDong,
                TienGiam = 0
            });
        }

        response.TongTienThueTruocGiam = tongThue;
        response.TongTienCoc = tongCoc;
        response.TongTienGiam = Math.Min(tongTienDuocGiamTuKhuyenMai, tongThue);

        PhanBoTienGiam(response.ChiTiet, response.TongTienGiam, tongThue);

        // Đồng bộ công thức HashBaoGia khớp 100% với DonThueService.HoTro.cs (UC3.2)
        var itemsPart = string.Join("|", danhSachDong.OrderBy(c => c.MaSanPham).Select(c =>
            $"{c.MaSanPham}:{c.SoLuong}:{c.DonGiaThueMoiNgay:F2}:{c.MucCocMoiThietBi:F2}"));
        var hashData = $"{response.SoNgayThue}|{response.TongTienThueTruocGiam:F2}|{response.TongTienGiam:F2}|{response.TongTienCoc:F2}|{maKhuyenMai?.Trim().ToUpperInvariant() ?? ""}|{itemsPart}";
        response.HashBaoGia = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(hashData)));
        return response;
    }

    // Phân bổ tiền giảm theo tỷ trọng tiền thuê từng dòng; dòng cuối gánh phần làm tròn
    private static void PhanBoTienGiam(List<ChiTietBaoGiaResponse> chiTiet, decimal tongGiam, decimal tongThue)
    {
        if (tongGiam <= 0 || tongThue <= 0 || chiTiet.Count == 0) return;

        decimal daPhanBo = 0;
        for (int i = 0; i < chiTiet.Count; i++)
        {
            var ct = chiTiet[i];
            if (i == chiTiet.Count - 1)
            {
                ct.TienGiam = tongGiam - daPhanBo;
                break;
            }

            decimal giamChoDong = Math.Min(ct.TienThue, Math.Round(tongGiam * (ct.TienThue / tongThue), 0));
            ct.TienGiam = giamChoDong;
            daPhanBo += giamChoDong;
        }
    }
}
