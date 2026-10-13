namespace GearGo.Exceptions;

  public abstract class NghiepVuException : Exception
  {
      public string MaLoi { get; }
      public object? ChiTiet { get; }
      protected NghiepVuException(string maLoi, string message, object? chiTiet = null)
          : base(message) { MaLoi = maLoi; ChiTiet = chiTiet; }
  }

  public class KhongDuHangException : NghiepVuException
  { public KhongDuHangException(string msg, object? ct = null) : base("KHONG_DU_HANG", msg, ct) {} }

  public class BaogiaThayDoiException : NghiepVuException
  { public BaogiaThayDoiException(string msg, object? ct = null) : base("BAO_GIA_THAY_DOI", msg, ct) {} }

  public class TrangThaiKhongHopLeException : NghiepVuException
  { public TrangThaiKhongHopLeException(string msg, object? ct = null) : base("TRANG_THAI_KHONG_HOP_LE", msg, ct) {} }

  public class TaiKhoanBiKhoaException : NghiepVuException
  { public TaiKhoanBiKhoaException(string msg, object? ct = null) : base("TAI_KHOAN_BI_KHOA", msg, ct) {} }

  public class KhuyenMaiKhongHopLeException : NghiepVuException
  { public KhuyenMaiKhongHopLeException(string msg, object? ct = null) : base("KHUYEN_MAI_KHONG_HOP_LE", msg, ct) {} }

  public class KhongTimThayException : NghiepVuException
  { public KhongTimThayException(string msg, object? ct = null) : base("KHONG_TIM_THAY", msg, ct) {} }

  public class KhongCoQuyenException : NghiepVuException
  { public KhongCoQuyenException(string msg, object? ct = null) : base("KHONG_CO_QUYEN", msg, ct) {} }

  public class XungDotDuLieuException : NghiepVuException
  { public XungDotDuLieuException(string maLoi, string msg, object? ct = null) : base(maLoi, msg, ct) {} }

  public class DuLieuKhongHopLeException : NghiepVuException
  { public DuLieuKhongHopLeException(string maLoi, string msg, object? ct = null) : base(maLoi, msg, ct) {} }

  public class DongKhongThuocPhieuException : NghiepVuException
  { public DongKhongThuocPhieuException(string msg, object? ct = null) : base("DONG_KHONG_THUOC_PHIEU", msg, ct) {} }

  public class PhanCongKhongThuocDonException : NghiepVuException
  { public PhanCongKhongThuocDonException(string msg, object? ct = null) : base("PHAN_CONG_KHONG_THUOC_DON", msg, ct) {} }

  public class KhongDuDieuKienSanSangException : NghiepVuException
  { public KhongDuDieuKienSanSangException(string msg, object? ct = null) : base("KHONG_DU_DIEU_KIEN_SAN_SANG", msg, ct) {} }

  public class LienHeDaTonTaiException : NghiepVuException
  { public LienHeDaTonTaiException(string msg, object? ct = null) : base("LIEN_HE_DA_TON_TAI", msg, ct) {} }

  public class HoSoKhongHopLeException : NghiepVuException
  { public HoSoKhongHopLeException(string msg, object? ct = null) : base("HO_SO_KHONG_HOP_LE", msg, ct) {} }

  public class DonKhongTimThayException : NghiepVuException
  { public DonKhongTimThayException(string msg = "Không tìm thấy đơn thuê.", object? ct = null) : base("DON_KHONG_TIM_THAY", msg, ct) {} }

  public class ThongBaoKhongTimThayException : NghiepVuException
  { public ThongBaoKhongTimThayException(string msg = "Không tìm thấy thông báo.", object? ct = null) : base("THONG_BAO_KHONG_TIM_THAY", msg, ct) {} }

  public class SuKienKhongHopLeException : NghiepVuException
  { public SuKienKhongHopLeException(string msg, object? ct = null) : base("SU_KIEN_KHONG_HOP_LE", msg, ct) {} }

  public class XungDotSuKienException : NghiepVuException
  { public XungDotSuKienException(string msg, object? ct = null) : base("XUNG_DOT_SU_KIEN", msg, ct) {} }

  // ── Week 4: hoàn tiền (W4-T6) ──

  public class HoanTienKhongTimThayException : NghiepVuException
  { public HoanTienKhongTimThayException(string msg = "Không tìm thấy khoản hoàn.", object? ct = null) : base("HOAN_TIEN_KHONG_TIM_THAY", msg, ct) {} }

  public class NguonHoanKhongHopLeException : NghiepVuException
  { public NguonHoanKhongHopLeException(string msg, object? ct = null) : base("NGUON_HOAN_KHONG_HOP_LE", msg, ct) {} }

  public class VuotHanMucHoanException : NghiepVuException
  { public VuotHanMucHoanException(string msg, object? ct = null) : base("VUOT_HAN_MUC_HOAN", msg, ct) {} }

  public class HoanChuaRoKetQuaException : NghiepVuException
  { public HoanChuaRoKetQuaException(string msg, object? ct = null) : base("HOAN_CHUA_RO_KET_QUA", msg, ct) {} }

  public class KetQuaHoanKhongKhopException : NghiepVuException
  { public KetQuaHoanKhongKhopException(string msg, object? ct = null) : base("KET_QUA_HOAN_KHONG_KHOP", msg, ct) {} }

  // ── Week 4: hủy đơn (W4-T7) ──

  public class DonDaBanGiaoException : NghiepVuException
  { public DonDaBanGiaoException(string msg = "Đơn đã bàn giao hoặc đã qua giai đoạn nhận; phải xử lý nhận trả/đối soát, không hủy.", object? ct = null) : base("DON_DA_BAN_GIAO", msg, ct) {} }

  public class ChiPhiHuyDaThayDoiException : NghiepVuException
  { public ChiPhiHuyDaThayDoiException(string msg, object? ct = null) : base("CHI_PHI_HUY_DA_THAY_DOI", msg, ct) {} }

  public class KhongCoQuyenHuyException : NghiepVuException
  { public KhongCoQuyenHuyException(string msg, object? ct = null) : base("KHONG_CO_QUYEN_HUY", msg, ct) {} }

  public class ChinhSachHuyChuaDuException : NghiepVuException
  { public ChinhSachHuyChuaDuException(string msg, object? ct = null) : base("CHINH_SACH_HUY_CHUA_DU", msg, ct) {} }

  public class DonDaHuyKhacYDinhException : NghiepVuException
  { public DonDaHuyKhacYDinhException(string msg, object? ct = null) : base("DON_DA_HUY_KHAC_Y_DINH", msg, ct) {} }

