namespace GearGo.Models.DTOs.KhuyenMai;

/// <summary>
/// Đại diện cho 1 dòng sản phẩm trong giỏ hoặc đơn thuê phục vụ tính toán khuyến mãi (W6-T3)
/// </summary>
public class DongBaoGiaItem
{
    public long MaSanPham { get; set; }
    public long? MaDanhMuc { get; set; }
    public int SoLuong { get; set; }
    public decimal DonGiaThueMoiNgay { get; set; }
    public int SoNgay { get; set; }

    /// <summary>
    /// Tiền thuê trước giảm của riêng dòng này
    /// </summary>
    public decimal TienThueTruocGiam => DonGiaThueMoiNgay * SoLuong * SoNgay;

    /// <summary>
    /// Tiền cọc của dòng này (để kiểm tra đảm bảo không bao giờ giảm cọc)
    /// </summary>
    public decimal TienCocDong { get; set; }
}

/// <summary>
/// Kết quả phân bổ tiền giảm giá xuống từng dòng đơn thuê (W6-T3)
/// </summary>
public class PhanBoDongResult
{
    public long MaSanPham { get; set; }
    public decimal TienThueTruocGiam { get; set; }
    public decimal TienGiam { get; set; }
    public decimal TienThueSauGiam => TienThueTruocGiam - TienGiam;
    public bool DuDieuKien { get; set; }
}
