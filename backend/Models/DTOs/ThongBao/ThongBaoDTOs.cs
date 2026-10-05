namespace GearGo.Models.DTOs.ThongBao;

public record TimThongBaoRequest(
    bool? ChuaDoc = null,
    int Trang = 1,
    int SoMoiTrang = 20
);

public record ThongBaoResponse(
    long MaThongBao,
    long? MaDonThue,
    string? TieuDe,
    string? NoiDung,
    DateTime ThoiDiemTao,
    DateTime? ThoiDiemDoc
);

// ── Command nội bộ cho service nghiệp vụ khác gọi ──

public record GhiLichSuDonCommand(
    long MaDonThue,
    string TrangThaiTruoc,
    string TrangThaiSau,
    long? MaNguoiThucHien,
    string? LyDo
);

public record GhiLichSuThietBiCommand(
    long MaThietBi,
    long? MaNguoiThucHien,
    string? TrangThaiTruoc,
    string? TrangThaiSau,
    string? TinhTrangTruoc,
    string? TinhTrangSau,
    string? LyDo,
    string? ThamChieuChungTu
);

public record GhiNhatKyCommand(
    long? MaTaiKhoan,
    string HanhDong,
    string LoaiDoiTuong,
    string MaDoiTuong,
    object? DuLieuTruoc,
    object? DuLieuSau,
    string? LyDo
);
