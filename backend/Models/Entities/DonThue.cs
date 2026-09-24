using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using GearGo.Models.Enums;

namespace GearGo.Models.Entities;

[Table("DON_THUE")]
public class DonThue
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("ma_khach_hang")]
    public long MaKhachHang { get; set; }

    [Column("ma_chinh_sach")]
    public long MaChinhSach { get; set; }

    [Column("ma_nguoi_huy")]
    public long? MaNguoiHuy { get; set; }

    [Column("ma_don_hien_thi")]
    [MaxLength(50)]
    public string MaDonHienThi { get; set; } = string.Empty;

    [Column("ngay_dat")]
    public DateTime NgayDat { get; set; } = DateTime.UtcNow;

    [Column("gio_nhan_du_kien")]
    public DateTime GioNhanDuKien { get; set; }

    [Column("gio_tra_du_kien")]
    public DateTime GioTraDuKien { get; set; }

    [Column("han_thanh_toan")]
    public DateTime? HanThanhToan { get; set; }

    [Column("ten_nguoi_nhan")]
    [MaxLength(255)]
    public string? TenNguoiNhan { get; set; }

    [Column("so_dien_thoai_nguoi_nhan")]
    [MaxLength(20)]
    public string? SoDienThoaiNguoiNhan { get; set; }

    [Column("email_lien_he")]
    [MaxLength(255)]
    public string? EmailLienHe { get; set; }

    [Column("tong_tien_thue_truoc_giam", TypeName = "decimal(18,2)")]
    public decimal TongTienThueTruocGiam { get; set; }

    [Column("tong_tien_giam", TypeName = "decimal(18,2)")]
    public decimal TongTienGiam { get; set; }

    [Column("tong_tien_coc", TypeName = "decimal(18,2)")]
    public decimal TongTienCoc { get; set; }

    [Column("khuyen_mai_luc_dat", TypeName = "nvarchar(max)")]
    public string? KhuyenMaiLucDat { get; set; }

    [Column("trang_thai")]
    public TrangThaiDonThue TrangThai { get; set; }

    [Column("thoi_diem_huy")]
    public DateTime? ThoiDiemHuy { get; set; }

    [Column("ly_do_huy")]
    public string? LyDoHuy { get; set; }

    [Column("tien_thue_giu_lai_khi_huy", TypeName = "decimal(18,2)")]
    public decimal TienThueGiuLaiKhiHuy { get; set; }

    [Column("thoi_diem_hoan_tat")]
    public DateTime? ThoiDiemHoanTat { get; set; }

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // ─── NAVIGATION PROPERTIES ───
    [ForeignKey(nameof(MaKhachHang))]
    public KhachHang KhachHang { get; set; } = null!;

    [ForeignKey(nameof(MaChinhSach))]
    public ChinhSach ChinhSach { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiHuy))]
    public TaiKhoan? NguoiHuy { get; set; }

    // @OneToOne
    public LuotSuDungKhuyenMai? LuotSuDungKhuyenMai { get; set; }

    // @OneToMany
    public ICollection<ChiTietDonThue> ChiTietDonThues { get; set; } = new List<ChiTietDonThue>();

    // @OneToMany: Một đơn thuê có thể có nhiều phiếu nhận trả (trả nhiều lần)
    public ICollection<PhieuNhanTra> PhieuNhanTras { get; set; } = new List<PhieuNhanTra>();

    // @OneToOne: Một đơn thuê có 1 phiếu bàn giao
    public PhieuBanGiao? PhieuBanGiao { get; set; }
}
