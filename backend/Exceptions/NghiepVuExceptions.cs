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