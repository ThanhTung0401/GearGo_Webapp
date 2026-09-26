using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using GearGo.Models.DTOs.GioThue;
using GearGo.Services.Interfaces;

namespace GearGo.Services;

public class BaoGiaService : IBaoGiaService
{
    public BaoGiaResponse TinhBaoGia(DateTime gioNhan, DateTime gioTra, List<ChiTietBaoGiaRequest> danhSachDong, decimal tongTienDuocGiamTuKhuyenMai)
    {
        var response = new BaoGiaResponse();

        // 1. Tính số ngày thuê (Tối thiểu 1 ngày, phần lẻ làm tròn lên)
        var hours = (gioTra - gioNhan).TotalHours;
        response.SoNgayThue = Math.Max(1, (int)Math.Ceiling(hours / 24.0));

        decimal tongThue = 0;
        decimal tongCoc = 0;

        // 2. Tính tiền cơ bản cho từng dòng
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
                TienGiam = 0 // Khởi tạo, sẽ phân bổ ở bước 3
            });
        }

        response.TongTienThueTruocGiam = tongThue;
        response.TongTienCoc = tongCoc;

        // 3. Phân bổ giảm giá (Chỉ giảm trên tiền thuê, tối đa bằng tổng tiền thuê)
        response.TongTienGiam = Math.Min(tongTienDuocGiamTuKhuyenMai, tongThue);

        if (response.TongTienGiam > 0 && tongThue > 0)
        {
            decimal tienGiamDaPhanBo = 0;
            for (int i = 0; i < response.ChiTiet.Count; i++)
            {
                var ct = response.ChiTiet[i];
                
                if (i == response.ChiTiet.Count - 1)
                {
                    // Dòng cuối cùng gánh nốt phần lẻ còn lại để đảm bảo không lệch 1 đồng nào
                    ct.TienGiam = response.TongTienGiam - tienGiamDaPhanBo;
                }
                else
                {
                    // Chia theo tỷ trọng giá trị dòng đó so với tổng tiền thuê, làm tròn VNĐ
                    decimal tyTrong = ct.TienThue / tongThue;
                    decimal giamChoDong = Math.Round(response.TongTienGiam * tyTrong, 0);

                    // Đảm bảo không giảm lố tiền thuê của dòng
                    if (giamChoDong > ct.TienThue) giamChoDong = ct.TienThue;

                    ct.TienGiam = giamChoDong;
                    tienGiamDaPhanBo += giamChoDong;
                }
            }
        }

        // 4. Tạo Hash chống đổi giá (Hash SHA256)
        var hashData = $"{response.TongTienThueTruocGiam}_{response.TongTienCoc}_{response.TongTienGiam}_{response.SoNgayThue}";
        using (var sha256 = SHA256.Create())
        {
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(hashData));
            response.HashBaoGia = Convert.ToHexString(bytes);
        }

        return response;
    }
}