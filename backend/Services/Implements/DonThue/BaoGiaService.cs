using System.Security.Cryptography;
using System.Text;
using GearGo.Models.DTOs.GioThue;
using GearGo.Services.Interfaces;

namespace GearGo.Services.Implements.DonThue;

public class BaoGiaService : IBaoGiaService
{
    public BaoGiaResponse TinhBaoGia(
        DateTime gioNhan,
        DateTime gioTra,
        List<ChiTietBaoGiaRequest> danhSachDong,
        decimal tongTienDuocGiamTuKhuyenMai)
    {
        var response = new BaoGiaResponse
        {
            SoNgayThue = Math.Max(1, (int)Math.Ceiling((gioTra - gioNhan).TotalHours / 24.0))
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

        var hashData = $"{response.TongTienThueTruocGiam}_{response.TongTienCoc}_{response.TongTienGiam}_{response.SoNgayThue}";
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
