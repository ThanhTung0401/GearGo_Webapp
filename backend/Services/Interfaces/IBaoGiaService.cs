using System;
using System.Collections.Generic;
using GearGo.Models.DTOs.GioThue;

namespace GearGo.Services.Interfaces;

public interface IBaoGiaService
{
    BaoGiaResponse TinhBaoGia(DateTime gioNhan, DateTime gioTra, List<ChiTietBaoGiaRequest> danhSachDong, decimal tongTienDuocGiamTuKhuyenMai);
}