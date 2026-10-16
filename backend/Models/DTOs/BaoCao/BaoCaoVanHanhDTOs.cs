namespace GearGo.Models.DTOs.BaoCao;

public record BoLocBaoCaoRequest(
    DateTime? TuNgay,
    DateTime? DenNgay,
    long? MaDanhMuc,
    long? MaSanPham
);

public class TongQuanChiSoVanHanhResponse
{
    public int TongDonPhatSinh { get; set; }
    public int TongDonThanhCong { get; set; }
    public int TongDonBiHuy { get; set; }
    public double TyLeHuyDonPhanTram { get; set; }

    public int TongThietBiTrongKho { get; set; }
    public int SoThietBiDangChoThue { get; set; }
    public int SoThietBiDangBaoTri { get; set; }
    public int SoThietBiThatLac { get; set; }
    public double TyLeHaoMonPhanTram { get; set; }

    public double SoNgayThueTrungBinh { get; set; }
    public double TyLeQuayVongThietBi { get; set; }
}

public class ChiSoSanPhamResponse
{
    public long MaSanPham { get; set; }
    public string TenSanPham { get; set; } = string.Empty;
    public string TenDanhMuc { get; set; } = string.Empty;
    public int TongSoThietBi { get; set; }
    public int SoLuotThue { get; set; }
    public int SoLuotHongHoc { get; set; }
    public int SoLuotMat { get; set; }
    public decimal TongDoanhThuUocTinh { get; set; }
}

public class BaoCaoVanHanhChiTietResponse
{
    public TongQuanChiSoVanHanhResponse TongQuan { get; set; } = new();
    public List<ChiSoSanPhamResponse> ChiSoTheoSanPham { get; set; } = new();
}
