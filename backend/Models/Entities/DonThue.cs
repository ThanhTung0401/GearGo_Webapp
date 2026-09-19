using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("DON_THUE")]
public class DonThue {
    [Key] [Column("ma_don_thue")] public long MaDonThue { get; set; }
    [Column("ma_khach_hang")] public long MaKhachHang { get; set; }
    [Column("ma_chinh_sach")] public long MaChinhSach { get; set; }
    [Column("ma_tai_khoan_huy")] public long? MaTaiKhoanHuy { get; set; }
    [Column("ngay_dat")] public DateTime NgayDat { get; set; } = DateTime.UtcNow;
    [Column("gio_nhan_du_kien")] public DateTime GioNhanDuKien { get; set; }
    [Column("gio_tra_du_kien")] public DateTime GioTraDuKien { get; set; }
    [Column("han_thanh_toan")] public DateTime? HanThanhToan { get; set; }
    [Column("thong_tin_nguoi_nhan")] public string ThongTinNguoiNhan { get; set; } = null!;
    [Column("khuyen_mai_luc_dat")] public string? KhuyenMaiLucDat { get; set; }
    [Column("tong_tien_thue")] public decimal TongTienThue { get; set; }
    [Column("tien_giam")] public decimal TienGiam { get; set; }
    [Column("tien_coc")] public decimal TienCoc { get; set; }
    [Column("trang_thai")] public GearGo.Models.Enums.TrangThaiDonThue TrangThai { get; set; }
    [ForeignKey(nameof(MaKhachHang))] public KhachHang KhachHang { get; set; } = null!;
    [ForeignKey(nameof(MaChinhSach))] public ChinhSach ChinhSach { get; set; } = null!;
    [ForeignKey(nameof(MaTaiKhoanHuy))] public TaiKhoan? TaiKhoanHuy { get; set; }
    public ICollection<ChiTietDonThue> ChiTietDonThues { get; set; } = new List<ChiTietDonThue>();
}
