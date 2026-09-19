using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("KHUYEN_MAI")]
public class KhuyenMai {
    [Key] [Column("ma_khuyen_mai")] public long MaKhuyenMai { get; set; }
    [Column("ma_giam_gia")] [MaxLength(50)] public string MaGiamGia { get; set; } = null!;
    [Column("loai_giam")] public GearGo.Models.Enums.LoaiKhuyenMai LoaiGiam { get; set; }
    [Column("gia_tri_giam")] public decimal GiaTriGiam { get; set; }
    [Column("muc_giam_toi_da")] public decimal? MucGiamToiDa { get; set; }
    [Column("tien_thue_toi_thieu")] public decimal TienThueToiThieu { get; set; }
    [Column("ngay_bat_dau")] public DateTime NgayBatDau { get; set; }
    [Column("ngay_ket_thuc")] public DateTime NgayKetThuc { get; set; }
    [Column("tong_luot_su_dung")] public int? TongLuotSuDung { get; set; }
    [Column("gioi_han_moi_khach")] public int? GioiHanMoiKhach { get; set; }
    [Column("pham_vi_ap_dung")] public GearGo.Models.Enums.PhamViApDung PhamVi { get; set; }
    [Column("trang_thai")] public GearGo.Models.Enums.TrangThaiKhuyenMai TrangThai { get; set; } = GearGo.Models.Enums.TrangThaiKhuyenMai.HienThi;
    public ICollection<KhuyenMaiSanPham> KhuyenMaiSanPhams { get; set; } = new List<KhuyenMaiSanPham>();
    public ICollection<KhuyenMaiDanhMuc> KhuyenMaiDanhMucs { get; set; } = new List<KhuyenMaiDanhMuc>();
    public ICollection<LuotSuDungKhuyenMai> LuotSuDungKhuyenMais { get; set; } = new List<LuotSuDungKhuyenMai>();
}

