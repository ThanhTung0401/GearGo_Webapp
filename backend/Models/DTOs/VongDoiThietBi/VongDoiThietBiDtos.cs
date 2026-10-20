namespace GearGo.Models.DTOs.VongDoiThietBi;

public class XemAnhHuongThayDoiRequest
{
    public string LoaiThayDoi { get; set; } = "GiangCap"; // GiangCap | NgungSuDung
    public long? MaSanPhamDich { get; set; }
    public string? LyDo { get; set; }
}

public class DeNghiGiangCapRequest
{
    public long MaSanPhamDich { get; set; }
    public string TinhTrang { get; set; } = string.Empty;
    public string LyDo { get; set; } = string.Empty;
    public string? BangChung { get; set; }
}

public class DeNghiNgungSuDungRequest
{
    public string LyDo { get; set; } = string.Empty;
    public string? BangChung { get; set; }
    public string? KetLuanKiemTra { get; set; }
}

public class HoSoVongDoiResponse
{
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public string TrangThaiSuDung { get; set; } = string.Empty;
    public string? TinhTrang { get; set; }
    public DateTime NgayNhap { get; set; }
    public decimal? GiaNhap { get; set; }
    public long MaChiTietPhieuNhap { get; set; }
    public long MaSanPhamNguon { get; set; }
    public string TenSanPhamNguon { get; set; } = string.Empty;
    public long MaSanPhamHienTai { get; set; }
    public string TenSanPhamHienTai { get; set; } = string.Empty;
    public List<TomTatBaoTriDto> LichSuBaoTri { get; set; } = new();
    public List<TomTatDieuChinhDto> LichSuDieuChinh { get; set; } = new();
    public List<TomTatTinhTrangDto> LichSuTinhTrang { get; set; } = new();
}

public class TomTatBaoTriDto
{
    public long MaPhieuBaoTri { get; set; }
    public string? LoaiXuLy { get; set; }
    public string? MoTaLoi { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public DateTime? NgayBatDau { get; set; }
    public DateTime? NgayHoanThanhThucTe { get; set; }
}

public class TomTatDieuChinhDto
{
    public long MaPhieuDieuChinh { get; set; }
    public string? LoaiDieuChinh { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public string? LyDo { get; set; }
    public DateTime ThoiDiemLap { get; set; }
    public DateTime? ThoiDiemApDung { get; set; }
}

public class TomTatTinhTrangDto
{
    public long MaLichSu { get; set; }
    public string? TrangThaiTruoc { get; set; }
    public string? TrangThaiSau { get; set; }
    public string? TinhTrangTruoc { get; set; }
    public string? TinhTrangSau { get; set; }
    public DateTime ThoiDiem { get; set; }
    public string? LyDo { get; set; }
}

public class AnhHuongThayDoiResponse
{
    public bool CoTheDeNghi { get; set; }
    public bool CoTheApDungHienTai { get; set; }
    public List<long> CamKetCuThe { get; set; } = new();
    public List<string> ThieuSoLuongTheoLich { get; set; } = new();
    public List<string> VuongMac { get; set; } = new();
}

public class DeNghiVongDoiResponse
{
    public long MaPhieuDieuChinh { get; set; }
    public long MaThietBi { get; set; }
    public string LoaiDieuChinh { get; set; } = string.Empty;
    public string TrangThai { get; set; } = string.Empty;
    public string? LyDo { get; set; }
    public DateTime ThoiDiemLap { get; set; }
    public DateTime? ThoiDiemApDung { get; set; }
}
