namespace GearGo.Models.DTOs.GioThue;

public class ChiTietBaoGiaRequest
{
    public long MaSanPham { get; set; }
    public int SoLuong { get; set; }
    public decimal DonGiaThueMoiNgay { get; set; }
    public decimal MucCocMoiThietBi { get; set; }
}

public class ChiTietBaoGiaResponse
{
    public long MaSanPham { get; set; }
    public int SoLuong { get; set; }
    public decimal TienThue { get; set; }
    public decimal TienCoc { get; set; }
    public decimal TienGiam { get; set; }
    
    // Cờ dùng cho giỏ hàng để bắt khách xóa dòng ngưng kinh doanh
    public bool CanhBaoNgungKinhDoanh { get; set; }
}

public class BaoGiaResponse
{
    public int SoNgayThue { get; set; }
    public decimal TongTienThueTruocGiam { get; set; }
    public decimal TongTienGiam { get; set; }
    public decimal TongTienCoc { get; set; }
    
    // Tính tổng tiền cần thanh toán ban đầu (gồm cả cọc)
    public decimal TongThanhToan => TongTienThueTruocGiam - TongTienGiam + TongTienCoc;
    
    // Hash chống đổi giá
    public string HashBaoGia { get; set; } = string.Empty;
    
    public List<ChiTietBaoGiaResponse> ChiTiet { get; set; } = new List<ChiTietBaoGiaResponse>();
}