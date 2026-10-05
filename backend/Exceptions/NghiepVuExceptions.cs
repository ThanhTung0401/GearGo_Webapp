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
