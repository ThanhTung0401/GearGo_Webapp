namespace GearGo.Models.DTOs.GioThue
{
    public class GioThueResponse
    {
        public long MaGioThue { get; set; }
        public DateTime? GioNhanDuKien { get; set; }
        public DateTime? GioTraDuKien { get; set; }
        public string? MaKhuyenMaiApDung { get; set; }
        public BaoGiaResponse BaoGia { get; set; } = new BaoGiaResponse();
        
        // Dòng này rất quan trọng để hết báo lỗi đỏ chữ ChiTiet
        public List<ChiTietGioThueResponse> ChiTiet { get; set; } = new List<ChiTietGioThueResponse>();
    }

    // BẮT BUỘC PHẢI CÓ CLASS NÀY Ở DƯỚI
    public class ChiTietGioThueResponse
    {
        public long MaChiTietGio { get; set; }
        public long MaSanPham { get; set; }
        public string TenSanPham { get; set; } = string.Empty;
        public int SoLuong { get; set; }
        public decimal DonGiaThueMoiNgay { get; set; }
        public decimal MucCocMoiThietBi { get; set; }
        public decimal TienThue { get; set; }
        public decimal TienCoc { get; set; }
        public decimal TienGiam { get; set; }
        public bool NgungKinhDoanh { get; set; }
        public int SoLuongKhaDung { get; set; }
    }
}