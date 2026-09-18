using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.SanPham
{
    public class TimKiemSanPhamRequest
    {
        public string? TuKhoa { get; set; }
        public int? DanhMucId { get; set; }
        public string? ThuongHieu { get; set; }
        public decimal? GiaThueCaoNhat { get; set; }
        public decimal? GiaThueThapNhat { get; set; }
        public DateTime? GioNhan { get; set; }
        public DateTime? GioTra { get; set; }
        public string? SapXepTheo { get; set; } // "GiaTang", "GiaGiam", "MoiNhat"
        
        [Range(1, int.MaxValue)]
        public int Trang { get; set; } = 1;
        
        [Range(1, 100)]
        public int SoMoiTrang { get; set; } = 12;
    }

    public class SanPhamResponse
    {
        public int Id { get; set; }
        public string Ten { get; set; } = null!;
        public string? AnhChinh { get; set; }
        public decimal GiaThueNgay { get; set; }
        public decimal MucCoc { get; set; }
        public string? ThuongHieu { get; set; }
        public int SoLuongKhaDung { get; set; }
    }

    public class SanPhamDetailResponse : SanPhamResponse
    {
        public string Ma { get; set; } = null!;
        public string? MoTa { get; set; }
        public List<string> HinhAnhs { get; set; } = new List<string>();
    }
}