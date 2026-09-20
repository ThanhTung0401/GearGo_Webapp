namespace GearGo.Models.Entities;

public class LichSuTrangThaiDon
{
    public long MaLichSuDon { get; set; }

    public long MaDonThue { get; set; }
    public long? MaNguoiThucHien { get; set; }

    public string TrangThaiTruoc { get; set; } = string.Empty;
    public string TrangThaiSau { get; set; } = string.Empty;
    public DateTime ThoiDiem { get; set; }
    public string? LyDo { get; set; }

    // -- Navigation Properties --
    public DonThue DonThue { get; set; } = null!;
    public TaiKhoan? NguoiThucHien { get; set; }
}
