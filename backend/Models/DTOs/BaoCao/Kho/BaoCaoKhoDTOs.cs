using System;
using System.Collections.Generic;
using GearGo.Models.Common;

namespace GearGo.Models.DTOs.BaoCao.Kho;

/// <summary>
/// Siêu dữ liệu chung của mọi báo cáo kho (W6-T6): cho client biết bộ lọc thực tế đã áp dụng,
/// múi giờ, đơn vị tiền và mốc lấy dữ liệu để không hiểu nhầm số liệu.
/// </summary>
public class BaoCaoKhoMeta
{
    public DateTime ThoiDiemLayDuLieu { get; set; }
    public string MuiGioHienThi { get; set; } = "Asia/Ho_Chi_Minh (UTC+7)";
    public string DonViTien { get; set; } = "VND";

    /// <summary>Ngày đầu kỳ theo giờ Việt Nam (bao gồm). Null với báo cáo số dư hiện tại.</summary>
    public DateTime? TuNgay { get; set; }

    /// <summary>Ngày cuối kỳ theo giờ Việt Nam (bao gồm). Null với báo cáo số dư hiện tại.</summary>
    public DateTime? DenNgay { get; set; }

    /// <summary>Mốc UTC đầu kỳ, bao gồm: [00:00 ngày bắt đầu VN).</summary>
    public DateTime? TuUtc { get; set; }

    /// <summary>Mốc UTC cuối kỳ, KHÔNG bao gồm: [00:00 ngày sau ngày kết thúc VN).</summary>
    public DateTime? DenUtcKhongBaoGom { get; set; }

    /// <summary>Mốc ngày nghiệp vụ được dùng để lọc (ví dụ NgayNhapThucTe, ThoiDiemApDung).</summary>
    public string MocLoc { get; set; } = string.Empty;

    public List<string> GhiChu { get; set; } = new();
}

// ───────────────────────────── Nhập hàng ─────────────────────────────

public static class CheDoBaoCaoNhap
{
    /// <summary>Chọn phiếu nhập có ngày nhập thực tế trong kỳ; điều chỉnh hiển thị theo hiệu lực tại thời điểm truy vấn.</summary>
    public const string LoNhap = "LoNhap";

    /// <summary>Chọn các điều chỉnh đã áp dụng có thời điểm áp dụng trong kỳ, kể cả khi sửa phiếu nhập cũ ngoài kỳ.</summary>
    public const string PhatSinhDieuChinh = "PhatSinhDieuChinh";
}

public class LocNhapHangRequest
{
    public DateTime? TuNgay { get; set; }
    public DateTime? DenNgay { get; set; }
    public long? MaNhaCungCap { get; set; }
    public long? MaSanPhamNguon { get; set; }
    public string CheDo { get; set; } = CheDoBaoCaoNhap.LoNhap;
    public int Trang { get; set; } = 1;
    public int SoMoiTrang { get; set; } = 20;
}

public class NhapHangDongItem
{
    public long MaChiTietPhieuNhap { get; set; }
    public long MaSanPhamNguon { get; set; }

    /// <summary>Tên sản phẩm ghi trên chứng từ lúc nhập (snapshot); lịch sử không bị ghi đè.</summary>
    public string TenSanPhamLucNhap { get; set; } = string.Empty;

    /// <summary>Tên hiện tại của sản phẩm nguồn trong danh mục, hiển thị ở cột riêng.</summary>
    public string TenSanPhamHienTai { get; set; } = string.Empty;

    public int SoLuongGoc { get; set; }
    public decimal DonGiaGoc { get; set; }
    public decimal GiaTriGoc { get; set; }
    public int DeltaSoLuong { get; set; }
    public decimal DeltaGiaTri { get; set; }
    public int SoLuongHieuLuc { get; set; }
    public decimal GiaTriHieuLuc { get; set; }
}

public class NhapHangPhieuItem
{
    public long MaPhieuNhap { get; set; }
    public string MaPhieuHienThi { get; set; } = string.Empty;
    public string? SoChungTuNhaCungCap { get; set; }
    public long MaNhaCungCap { get; set; }

    /// <summary>Thông tin nhà cung cấp ghi trên phiếu lúc nhập (snapshot).</summary>
    public string? NhaCungCapLucNhap { get; set; }

    public string TenNhaCungCapHienTai { get; set; } = string.Empty;
    public DateTime? NgayNhapThucTe { get; set; }

    /// <summary>Tổng tiền ghi nhận trên đầu phiếu để đối chiếu với tổng các dòng.</summary>
    public decimal TongTienGhiNhanTrenPhieu { get; set; }

    public decimal TongGiaTriGoc { get; set; }
    public int TongSoLuongGoc { get; set; }

    /// <summary>True khi tổng các dòng khác tổng ghi trên phiếu — cần kiểm tra chứng từ, báo cáo không tự sửa.</summary>
    public bool LechTongTienPhieu { get; set; }

    public int DeltaSoLuong { get; set; }
    public decimal DeltaGiaTri { get; set; }
    public int TongSoLuongHieuLuc { get; set; }
    public decimal TongGiaTriHieuLuc { get; set; }
    public List<NhapHangDongItem> Dong { get; set; } = new();
}

public class NhapHangTheoSanPhamItem
{
    public long MaSanPhamNguon { get; set; }
    public string TenSanPham { get; set; } = string.Empty;
    public int SoLuongGoc { get; set; }
    public decimal GiaTriGoc { get; set; }
    public int DeltaSoLuong { get; set; }
    public decimal DeltaGiaTri { get; set; }
    public int SoLuongHieuLuc { get; set; }
    public decimal GiaTriHieuLuc { get; set; }
}

public class NhapHangResponse
{
    public BaoCaoKhoMeta Meta { get; set; } = new();
    public string CheDo { get; set; } = CheDoBaoCaoNhap.LoNhap;

    /// <summary>Số phiếu nhập khác nhau (distinct) đã nhập kho trong kỳ.</summary>
    public int TongSoPhieu { get; set; }

    /// <summary>Số thiết bị nhận gốc = tổng số lượng các dòng nhập được chấp nhận.</summary>
    public int TongSoLuongGoc { get; set; }

    public decimal TongGiaTriGoc { get; set; }

    /// <summary>Chênh lệch từ điều chỉnh đã áp dụng, tách riêng khỏi giá trị gốc.</summary>
    public int TongDeltaSoLuong { get; set; }
    public decimal TongDeltaGiaTri { get; set; }

    public int TongSoLuongHieuLuc { get; set; }
    public decimal TongGiaTriHieuLuc { get; set; }

    public List<NhapHangTheoSanPhamItem> TheoSanPhamNguon { get; set; } = new();
    public PagedResult<NhapHangPhieuItem> Phieu { get; set; } = new();
}

public class DieuChinhNhapItem
{
    public long MaPhieuDieuChinh { get; set; }
    public long MaPhieuNhap { get; set; }
    public string MaPhieuNhapHienThi { get; set; } = string.Empty;
    public string LoaiDieuChinh { get; set; } = string.Empty;
    public string? LyDo { get; set; }
    public DateTime ThoiDiemApDung { get; set; }
    public string? NguoiDuyet { get; set; }
    public int DeltaSoLuong { get; set; }
    public decimal DeltaGiaTri { get; set; }

    /// <summary>True khi phiếu nhập gốc có ngày nhập thực tế ngoài kỳ đang xem (sửa chứng từ cũ).</summary>
    public bool PhieuNhapNgoaiKy { get; set; }
    public DateTime? NgayNhapThucTe { get; set; }
}

public class DieuChinhNhapResponse
{
    public BaoCaoKhoMeta Meta { get; set; } = new();
    public int SoPhieuDieuChinh { get; set; }
    public int TongDeltaSoLuong { get; set; }
    public decimal TongDeltaGiaTri { get; set; }
    public PagedResult<DieuChinhNhapItem> Items { get; set; } = new();
}

// ───────────────────────────── Lịch sử đơn giá ─────────────────────────────

public class MocDonGiaItem
{
    public DateTime ThoiDiem { get; set; }

    /// <summary>"Nhap" cho lần nhập gốc, "DieuChinh" cho điều chỉnh đã áp dụng.</summary>
    public string Loai { get; set; } = string.Empty;

    public string MaChungTu { get; set; } = string.Empty;
    public string? NguonNhapHienThi { get; set; }
    public int SoLuong { get; set; }

    /// <summary>Đơn giá của lần nhập (chỉ có ở mốc "Nhap").</summary>
    public decimal? DonGia { get; set; }

    public decimal DeltaGiaTri { get; set; }
    public int DeltaSoLuong { get; set; }
}

public class LichSuDonGiaSanPhamItem
{
    public long MaSanPhamNguon { get; set; }
    public string TenSanPham { get; set; } = string.Empty;
    public int SoLanNhap { get; set; }
    public int TongSoLuongGoc { get; set; }
    public decimal TongGiaTriGoc { get; set; }

    /// <summary>Tổng giá trị / tổng số lượng cùng tập dữ liệu; null khi mẫu số bằng 0.</summary>
    public decimal? DonGiaBinhQuanGoc { get; set; }

    public int TongSoLuongHieuLuc { get; set; }
    public decimal TongGiaTriHieuLuc { get; set; }
    public decimal? DonGiaBinhQuanHieuLuc { get; set; }
    public decimal? DonGiaThapNhat { get; set; }
    public decimal? DonGiaCaoNhat { get; set; }
    public List<MocDonGiaItem> Moc { get; set; } = new();
}

public class LichSuDonGiaResponse
{
    public BaoCaoKhoMeta Meta { get; set; } = new();
    public List<LichSuDonGiaSanPhamItem> SanPham { get; set; } = new();
}

// ───────────────────────────── Hiện trạng kho ─────────────────────────────

public class LocHienTrangKhoRequest
{
    public long? MaSanPham { get; set; }
}

public class HienTrangKhoSanPhamItem
{
    public long MaSanPhamHienTai { get; set; }
    public string TenSanPham { get; set; } = string.Empty;

    /// <summary>Tổng hồ sơ thiết bị lưu — KHÔNG phải số vật phẩm đang ở kho.</summary>
    public int TongHoSo { get; set; }

    /// <summary>Tổng hồ sơ trừ thất lạc và ngừng sử dụng (đang khai thác).</summary>
    public int DangKhaiThac { get; set; }

    public int SanSang { get; set; }
    public int DangThue { get; set; }
    public int DangBaoTri { get; set; }
    public int ThatLac { get; set; }
    public int NgungSuDung { get; set; }
}

public class HienTrangKhoBaoCaoResponse
{
    public BaoCaoKhoMeta Meta { get; set; } = new();

    /// <summary>Luôn là "HienTai": báo cáo này không dựng lại kho tại ngày quá khứ.</summary>
    public string LoaiSoLieu { get; set; } = "HienTai";

    /// <summary>Báo cáo nhóm theo sản phẩm hiện tại của thiết bị (khác báo cáo nhập nhóm theo sản phẩm nguồn).</summary>
    public string NhomTheo { get; set; } = "SanPhamHienTai";

    public int TongHoSo { get; set; }
    public int DangKhaiThac { get; set; }
    public int SanSang { get; set; }
    public int DangThue { get; set; }
    public int DangBaoTri { get; set; }
    public int ThatLac { get; set; }
    public int NgungSuDung { get; set; }

    /// <summary>Tổng giá trị nhập của hồ sơ — chỉ quản trị viên, null với nhân viên.</summary>
    public decimal? TongGiaTriNhap { get; set; }

    public List<HienTrangKhoSanPhamItem> SanPham { get; set; } = new();
}

// ───────────────────────────── Bảo trì ─────────────────────────────

public static class MocLocBaoTri
{
    public const string NgayBatDau = "NgayBatDau";
    public const string NgayHoanThanh = "NgayHoanThanh";
}

public class LocBaoTriRequest
{
    public DateTime? TuNgay { get; set; }
    public DateTime? DenNgay { get; set; }

    /// <summary>NgayBatDau (mặc định) hoặc NgayHoanThanh.</summary>
    public string MocLoc { get; set; } = MocLocBaoTri.NgayBatDau;

    /// <summary>VeSinh hoặc SuaChua; bỏ trống = cả hai (luôn tách số liệu riêng).</summary>
    public string? LoaiXuLy { get; set; }
}

public class ThietBiSuaChuaItem
{
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public long MaSanPhamHienTai { get; set; }
    public string TenSanPhamHienTai { get; set; } = string.Empty;

    /// <summary>Số đợt sửa chữa (không tính vệ sinh) trong kỳ.</summary>
    public int SoDotSuaChua { get; set; }

    /// <summary>Số lần thuê suy ra từ bàn giao đã giao, không từ phân công bị hủy hay số đợt trả.</summary>
    public int SoLanThue { get; set; }

    public double? TongGioXuLy { get; set; }

    /// <summary>Chỉ quản trị viên.</summary>
    public decimal? TongChiPhiSua { get; set; }
}

public class BaoTriThongKeResponse
{
    public BaoCaoKhoMeta Meta { get; set; } = new();
    public string MocLoc { get; set; } = MocLocBaoTri.NgayBatDau;
    public int TongSoPhieu { get; set; }
    public int SoPhieuVeSinh { get; set; }
    public int SoPhieuSuaChua { get; set; }

    /// <summary>Phiếu chưa kết luận: chờ xử lý, đang xử lý, chờ kiểm tra.</summary>
    public int SoPhieuDangMo { get; set; }

    public int SoPhieuDat { get; set; }
    public int SoPhieuKhongDat { get; set; }

    /// <summary>Chi phí của phiếu đang mở/dự kiến — chỉ quản trị viên, chưa phải chi phí chốt.</summary>
    public decimal? ChiPhiDangXuLy { get; set; }

    /// <summary>Chi phí của phiếu đã kết luận — chỉ quản trị viên. Không phải phụ phí khách đã nộp.</summary>
    public decimal? ChiPhiDaChot { get; set; }

    public List<ThietBiSuaChuaItem> ThietBiHayHong { get; set; } = new();
}

// ───────────────────────────── Xuất CSV ─────────────────────────────

public static class LoaiBaoCaoKhoXuat
{
    public const string NhapHang = "NhapHang";
    public const string DieuChinhNhap = "DieuChinhNhap";
    public const string LichSuDonGia = "LichSuDonGia";
    public const string HienTrangKho = "HienTrangKho";
    public const string BaoTri = "BaoTri";

    public static readonly string[] TatCa = { NhapHang, DieuChinhNhap, LichSuDonGia, HienTrangKho, BaoTri };
}

public class XuatCsvKhoRequest
{
    public string LoaiBaoCao { get; set; } = string.Empty;
    public DateTime? TuNgay { get; set; }
    public DateTime? DenNgay { get; set; }
    public long? MaNhaCungCap { get; set; }
    public long? MaSanPhamNguon { get; set; }
    public long? MaSanPham { get; set; }
    public string CheDo { get; set; } = CheDoBaoCaoNhap.LoNhap;
    public string MocLoc { get; set; } = MocLocBaoTri.NgayBatDau;
    public string? LoaiXuLy { get; set; }
}

public class TepCsvKetQua
{
    public string TenTep { get; set; } = string.Empty;
    public string ContentType { get; set; } = "text/csv; charset=utf-8";
    public byte[] NoiDung { get; set; } = Array.Empty<byte>();
}
