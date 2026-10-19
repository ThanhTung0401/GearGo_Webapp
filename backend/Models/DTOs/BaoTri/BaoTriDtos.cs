namespace GearGo.Models.DTOs.BaoTri;

public class TimKiemBaoTriRequest
{
    public long? MaThietBi { get; set; }
    public long? MaNguoiXuLy { get; set; }
    public string? TrangThai { get; set; }
    public string? LoaiXuLy { get; set; }
    public DateTime? TuNgay { get; set; }
    public DateTime? DenNgay { get; set; }
    public int Trang { get; set; } = 1;
    public int SoMoiTrang { get; set; } = 20;
}

public class LapBaoTriRequest
{
    public long MaThietBi { get; set; }
    public long? MaDonThue { get; set; }
    public string LoaiXuLy { get; set; } = "SuaChua";
    public string MoTaLoi { get; set; } = string.Empty;
    public string MucDo { get; set; } = "Nhe";
    public DateTime? NgayDuKienHoanThanh { get; set; }
    public string? BangChung { get; set; }
}

public class PhanCongBaoTriRequest
{
    public long MaNguoiXuLy { get; set; }
    public string? LyDo { get; set; }
}

public class CapNhatTienDoRequest
{
    public string? KetQua { get; set; }
    public decimal? ChiPhi { get; set; }
    public string? BangChung { get; set; }
    public DateTime? NgayDuKienHoanThanh { get; set; }
}

public class XacNhanBaoTriRequest
{
    public string KetQuaKiemTra { get; set; } = string.Empty;
    public string? BangChung { get; set; }
    public DateTime? NgayHoanThanhThucTe { get; set; }
    public decimal? ChiPhi { get; set; }
    public string? LyDo { get; set; }
}

public class BaoTriResponse
{
    public long MaPhieuBaoTri { get; set; }
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public string TenSanPham { get; set; } = string.Empty;
    public long? MaDonThue { get; set; }
    public long MaNguoiLap { get; set; }
    public string? TenNguoiLap { get; set; }
    public long? MaNguoiXuLy { get; set; }
    public string? TenNguoiXuLy { get; set; }
    public long? MaNguoiXacNhanHoanThanh { get; set; }
    public string? TenNguoiXacNhanHoanThanh { get; set; }
    public string? LoaiXuLy { get; set; }
    public string? MoTaLoi { get; set; }
    public string? MucDo { get; set; }
    public DateTime? NgayBatDau { get; set; }
    public DateTime? NgayDuKienHoanThanh { get; set; }
    public DateTime? NgayHoanThanhThucTe { get; set; }
    public decimal? ChiPhi { get; set; }
    public string? KetQua { get; set; }
    public string? BangChung { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public List<string> CanhBaoDonSau { get; set; } = new();
}

public class DanhSachBaoTriResponse
{
    public List<BaoTriResponse> Items { get; set; } = new();
    public int TongSo { get; set; }
    public int Trang { get; set; }
    public int SoMoiTrang { get; set; }
}
