using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.GioThue
{
    public class ThemVaoGioRequest
    {
        [Required]
        public long MaSanPham { get; set; }
        
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Số lượng phải là số nguyên dương")]
        public int SoLuong { get; set; }
    }

    public class CapNhatSoLuongRequest
    {
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Số lượng phải là số nguyên dương")]
        public int SoLuongMoi { get; set; }
    }

    public class DatThoiGianRequest
    {
        [Required]
        public DateTime GioNhan { get; set; }
        
        [Required]
        public DateTime GioTra { get; set; }
    }

    public class ApKhuyenMaiRequest
    {
        [Required]
        public string MaGiamGia { get; set; } = string.Empty;
    }
}