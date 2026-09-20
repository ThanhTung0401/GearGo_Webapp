using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("PHIEU_NHAP_HANG")]
public class PhieuNhapHang {
    [Key] [Column("ma_phieu_nhap")] public long MaPhieuNhap { get; set; }
    [Column("ma_nha_cung_cap")] public long MaNhaCungCap { get; set; }
    [Column("ma_nguoi_lap")] public long MaNguoiLap { get; set; }
    [Column("ma_nguoi_xac_nhan")] public long? MaNguoiXacNhan { get; set; }
    [Column("ma_phieu_hien_thi")] [MaxLength(50)] public string MaPhieuHienThi { get; set; } = null!;
    [Column("so_chung_tu_nha_cung_cap")] [MaxLength(100)] public string? SoChungTuNhaCungCap { get; set; }
    [Column("ngay_lap")] public DateTime NgayLap { get; set; } = DateTime.UtcNow;
    [Column("ngay_nhap_du_kien")] public DateTime? NgayNhapDuKien { get; set; }
    [Column("ngay_nhap_thuc_te")] public DateTime? NgayNhapThucTe { get; set; }
    [Column("ngay_xac_nhan")] public DateTime? NgayXacNhan { get; set; }
    [Column("tong_tien")] public decimal TongTien { get; set; }
    [Column("thong_tin_nha_cung_cap_luc_nhap")] public string? ThongTinNhaCungCapLucNhap { get; set; }
    [Column("ten_nguoi_lap_luc_nhap")] [MaxLength(255)] public string? TenNguoiLapLucNhap { get; set; }
    [Column("ten_nguoi_xac_nhan_luc_nhap")] [MaxLength(255)] public string? TenNguoiXacNhanLucNhap { get; set; }
    [Column("trang_thai")] public GearGo.Models.Enums.TrangThaiPhieuNhap TrangThai { get; set; }
    [Column("ly_do_huy")] public string? LyDoHuy { get; set; }
    [Column("ghi_chu")] public string? GhiChu { get; set; }
    
    [ForeignKey(nameof(MaNhaCungCap))] public NhaCungCap NhaCungCap { get; set; } = null!;
    [ForeignKey(nameof(MaNguoiLap))] public NhanVien NguoiLap { get; set; } = null!;
    [ForeignKey(nameof(MaNguoiXacNhan))] public NhanVien? NguoiXacNhan { get; set; }
    public ICollection<ChiTietPhieuNhap> ChiTietPhieuNhaps { get; set; } = new List<ChiTietPhieuNhap>();
}
