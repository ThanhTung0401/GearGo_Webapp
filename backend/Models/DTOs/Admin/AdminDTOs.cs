using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.Admin
{
    // --- DANH MỤC DTOs ---
    public class TaoDanhMucRequest
    {
        [Required] public string TenDanhMuc { get; set; } = string.Empty;
        public long? MaDanhMucCha { get; set; }
        public string? MoTa { get; set; }
        public int ThuTuHienThi { get; set; }
        public string TrangThai { get; set; } = "HienThi";
    }

    public class CapNhatDanhMucRequest : TaoDanhMucRequest { }

    // --- SẢN PHẨM DTOs ---
    public class TaoSanPhamRequest
    {
        [Required] public long MaDanhMuc { get; set; }
        [Required] public string MaSanPhamHienThi { get; set; } = string.Empty;
        [Required] public string TenSanPham { get; set; } = string.Empty;
        public string? ThuongHieu { get; set; }
        public string? MoTa { get; set; }
        
        [Range(0, int.MaxValue, ErrorMessage = "Sức chứa không được âm")]
        public int SucChua { get; set; }
        public string? KichThuoc { get; set; }
        public string? ThongSo { get; set; } // JSON

        [Range(0, double.MaxValue, ErrorMessage = "Giá thuê không được âm")]
        public decimal GiaThueMoiNgay { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Mức cọc không được âm")]
        public decimal MucCocMoiThietBi { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Giá trị bồi thường không được âm")]
        public decimal GiaTriBoiThuong { get; set; }

        public string TrangThaiKinhDoanh { get; set; } = "DangKinhDoanh";
    }

    public class CapNhatSanPhamRequest : TaoSanPhamRequest { }
}