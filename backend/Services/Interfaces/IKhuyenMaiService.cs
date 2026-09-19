using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GearGo.Models.DTOs.KhuyenMai;
using Microsoft.EntityFrameworkCore.Storage;

namespace GearGo.Services.Interfaces;
public interface IKhuyenMaiService
{
    Task<KhuyenMaiHopLe> KiemTraApDungAsync(string maGiamGia, long maKhachHang, List<long> sanPhamIds, decimal tienThueTruocGiam);
    Task GiuLuotAsync(long maKhuyenMai, long maDonThue, DateTime thoiDiemHetHan);
    Task XacNhanDaSuDungAsync(long maDonThue);
    Task GiaiPhongLuotAsync(long maDonThue);
}
