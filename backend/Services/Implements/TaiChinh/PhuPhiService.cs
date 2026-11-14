using System.Text.Json;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhuPhi;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

/// <summary>
/// Dịch vụ quản lý phụ phí, gợi ý phí tự động và giải quyết tranh chấp (UC14).
/// </summary>
public partial class PhuPhiService : IPhuPhiService
{
    private const decimal HanMucDuyetStaff = 500000m;
    private readonly ApplicationDbContext _context;
    private readonly IQuaHanService _quaHanService;

    public PhuPhiService(ApplicationDbContext context, IQuaHanService quaHanService)
    {
        _context = context;
        _quaHanService = quaHanService;
    }

    public async Task<Result<List<PhuPhiResponse>>> LayDanhSachPhuPhiTheoDonAsync(long donId, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        var donThue = await _context.DonThues.Include(d => d.KhachHang).FirstOrDefaultAsync(d => d.MaDonThue == donId);
        if (donThue == null) return Result<List<PhuPhiResponse>>.Loi("DON_KHONG_TIM_THAY", "Không tìm thấy đơn thuê.");

        if (tk.VaiTro == "KhachHang" && donThue.MaKhachHang != await ActorGuard.LayMaKhachHangAsync(_context, actorId))
            return Result<List<PhuPhiResponse>>.Loi("KHONG_CO_QUYEN", "Khách hàng chỉ được xem phụ phí của đơn thuê thuộc sở hữu của mình.");

        var danhSach = await _context.PhuPhis.Include(p => p.NguoiLap).Include(p => p.NguoiDuyet)
            .Where(p => p.MaDonThue == donId).OrderByDescending(p => p.ThoiDiemLap).ToListAsync();
        return Result<List<PhuPhiResponse>>.Ok(danhSach.Select(ChuyenSangPhuPhiResponse).ToList());
    }

    public async Task<Result<PhuPhiResponse>> LapPhiAsync(LapPhuPhiRequest dto, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        if (string.IsNullOrWhiteSpace(dto.LoaiPhi))
            return Result<PhuPhiResponse>.Loi("LOAI_PHI_KHONG_HOP_LE", "Loại phụ phí không được để trống.");
        if (dto.SoTienDeNghi <= 0)
            return Result<PhuPhiResponse>.Loi("SO_TIEN_KHONG_HOP_LE", "Số tiền phụ phí thông thường phải lớn hơn 0.");

        using var tx = await _context.Database.BeginTransactionAsync();
        if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == dto.MaDonThue))
            return Result<PhuPhiResponse>.Loi("DON_KHONG_TIM_THAY", "Không tìm thấy đơn thuê.");

        var err = await KiemTraTrungTonThatAsync(dto);
        if (err != null) return err;

        var canCu = new CanCuTinhPhiDto { LoaiPhi = dto.LoaiPhi, CongThuc = "NhapThuCongTheoCanCuThucTe", GhiChu = dto.LyDo };
        var phuPhiMoi = new PhuPhi
        {
            MaDonThue = dto.MaDonThue, MaChiTietBanGiao = dto.MaChiTietBanGiao, MaNguoiLap = maNhanVien,
            LoaiPhi = dto.LoaiPhi, SoTien = dto.SoTienDeNghi ?? 0, LyDo = dto.LyDo,
            CanCuTinhPhi = JsonSerializer.Serialize(canCu),
            BangChung = dto.DanhSachAnh != null && dto.DanhSachAnh.Any() ? JsonSerializer.Serialize(dto.DanhSachAnh) : null,
            ThoiDiemLap = DateTime.UtcNow, TrangThaiDuyet = "ChoDuyet", TrangThaiTranhChap = null
        };

        _context.PhuPhis.Add(phuPhiMoi);
        await _context.SaveChangesAsync();
        await tx.CommitAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhiMoi));
    }

    public async Task<Result<PhuPhiResponse>> CapNhatPhiChuaDuyetAsync(long id, CapNhatPhuPhiRequest dto, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var phuPhi = await _context.PhuPhis.FirstOrDefaultAsync(p => p.MaPhuPhi == id);
        if (phuPhi == null) return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí.");
        if (phuPhi.TrangThaiDuyet != "ChoDuyet")
            return Result<PhuPhiResponse>.Loi("PHU_PHI_DA_XU_LY", "Chỉ có thể sửa phụ phí khi đang ở trạng thái 'ChoDuyet'.");
        if (phuPhi.MaDoiSoat != null)
            return Result<PhuPhiResponse>.Loi("PHI_DA_KHOA_DOI_SOAT", "Phụ phí đã được đưa vào bảng đối soát xác nhận, không thể sửa trực tiếp.");

        if (dto.SoTien.HasValue)
        {
            if (dto.SoTien.Value <= 0) return Result<PhuPhiResponse>.Loi("SO_TIEN_KHONG_HOP_LE", "Số tiền phụ phí phải lớn hơn 0.");
            phuPhi.SoTien = dto.SoTien.Value;
        }
        if (!string.IsNullOrWhiteSpace(dto.LyDo)) phuPhi.LyDo = dto.LyDo;
        if (dto.DanhSachAnh != null) phuPhi.BangChung = JsonSerializer.Serialize(dto.DanhSachAnh);

        await _context.SaveChangesAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhi));
    }

    public async Task<Result<PhuPhiResponse>> DuyetPhiAsync(long id, DuyetPhuPhiRequest dto, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        var phuPhi = await _context.PhuPhis.Include(p => p.DonThue).ThenInclude(d => d.ChinhSach)
            .FirstOrDefaultAsync(p => p.MaPhuPhi == id);
        if (phuPhi == null) return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí.");
        if (phuPhi.TrangThaiDuyet != "ChoDuyet")
            return Result<PhuPhiResponse>.Loi("PHU_PHI_DA_XU_LY", "Phụ phí đã được duyệt hoặc từ chối trước đó.");
        if (phuPhi.MaDoiSoat != null)
            return Result<PhuPhiResponse>.Loi("PHI_DA_KHOA_DOI_SOAT", "Phụ phí đã gắn đối soát, không thể thay đổi trạng thái.");

        if (tk.VaiTro != "QuanTriVien" && (phuPhi.SoTien > HanMucDuyetStaff || phuPhi.LoaiPhi == "MatThietBi"))
            return Result<PhuPhiResponse>.Loi("VUOT_QUYEN_DUYET_PHI",
                $"Khoản phụ phí {phuPhi.SoTien:N0} VNĐ hoặc bồi thường mất thiết bị vượt thẩm quyền duyệt của nhân viên. Cần Quản trị viên phê duyệt.");

        phuPhi.TrangThaiDuyet = "DaDuyet";
        phuPhi.MaNguoiDuyet = maNhanVien;
        phuPhi.ThoiDiemDuyet = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.LyDo)) phuPhi.LyDo = $"{phuPhi.LyDo} [Duyệt: {dto.LyDo}]";

        await _context.SaveChangesAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhi));
    }

    public async Task<Result<PhuPhiResponse>> TuChoiPhiAsync(long id, DuyetPhuPhiRequest dto, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        var phuPhi = await _context.PhuPhis.FirstOrDefaultAsync(p => p.MaPhuPhi == id);
        if (phuPhi == null) return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí.");
        if (phuPhi.TrangThaiDuyet != "ChoDuyet")
            return Result<PhuPhiResponse>.Loi("PHU_PHI_DA_XU_LY", "Phụ phí đã được xử lý trước đó.");
        if (phuPhi.MaDoiSoat != null)
            return Result<PhuPhiResponse>.Loi("PHI_DA_KHOA_DOI_SOAT", "Phụ phí đã khóa đối soát, không thể từ chối.");

        phuPhi.TrangThaiDuyet = "TuChoi";
        phuPhi.MaNguoiDuyet = maNhanVien;
        phuPhi.ThoiDiemDuyet = DateTime.UtcNow;
        phuPhi.LyDo = $"{phuPhi.LyDo} [Từ chối: {dto.LyDo}]";

        await _context.SaveChangesAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhi));
    }

    public async Task<Result<PhuPhiResponse>> LapDieuChinhPhiAsync(long phiGocId, DieuChinhPhiRequest dto, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        if (tk.VaiTro != "QuanTriVien")
            return Result<PhuPhiResponse>.Loi("KHONG_CO_QUYEN", "Chỉ Quản trị viên mới có quyền lập phụ phí điều chỉnh.");
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        var phiGoc = await _context.PhuPhis.FirstOrDefaultAsync(p => p.MaPhuPhi == phiGocId);
        if (phiGoc == null) return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí gốc.");
        if (phiGoc.TrangThaiDuyet != "DaDuyet")
            return Result<PhuPhiResponse>.Loi("TRANG_THAI_KHONG_HOP_LE", "Chỉ có thể điều chỉnh khoản phụ phí đã được duyệt.");

        var cacDieuChinhCu = await _context.PhuPhis
            .Where(p => p.MaPhuPhiGoc == phiGocId && p.TrangThaiDuyet == "DaDuyet").SumAsync(p => p.SoTien);
        decimal tongSauDieuChinh = phiGoc.SoTien + cacDieuChinhCu + dto.SoTienDieuChinhCoDau;
        if (tongSauDieuChinh < 0)
            return Result<PhuPhiResponse>.Loi("TONG_PHI_KHONG_DUOC_AM",
                $"Tổng nghĩa vụ sau điều chỉnh ({tongSauDieuChinh:N0} VNĐ) không được âm. Vui lòng kiểm tra lại số tiền điều chỉnh.");

        var phiDieuChinh = new PhuPhi
        {
            MaDonThue = phiGoc.MaDonThue, MaChiTietBanGiao = phiGoc.MaChiTietBanGiao,
            MaNguoiLap = maNhanVien, MaNguoiDuyet = maNhanVien, MaPhuPhiGoc = phiGocId,
            LoaiPhi = $"DieuChinh_{phiGoc.LoaiPhi}", SoTien = dto.SoTienDieuChinhCoDau, LyDo = dto.LyDo,
            BangChung = dto.DanhSachAnh != null ? JsonSerializer.Serialize(dto.DanhSachAnh) : null,
            ThoiDiemLap = DateTime.UtcNow, ThoiDiemDuyet = DateTime.UtcNow,
            TrangThaiDuyet = "DaDuyet", TrangThaiTranhChap = null
        };
        _context.PhuPhis.Add(phiDieuChinh);
        await _context.SaveChangesAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phiDieuChinh));
    }

    private async Task<Result<PhuPhiResponse>?> KiemTraTrungTonThatAsync(LapPhuPhiRequest dto)
    {
        if (dto.MaChiTietBanGiao.HasValue)
        {
            if (!await _context.ChiTietBanGiaos.AnyAsync(c => c.MaChiTietBanGiao == dto.MaChiTietBanGiao.Value))
                return Result<PhuPhiResponse>.Loi("CHI_TIET_BAN_GIAO_NOT_FOUND", "Không tìm thấy chi tiết bàn giao tương ứng.");

            var phiHienCo = await _context.PhuPhis
                .Where(p => p.MaDonThue == dto.MaDonThue && p.MaChiTietBanGiao == dto.MaChiTietBanGiao.Value && p.TrangThaiDuyet != "TuChoi")
                .ToListAsync();
            if (phiHienCo.Any(p => p.LoaiPhi == dto.LoaiPhi))
                return Result<PhuPhiResponse>.Loi("PHI_TRUNG_TON_THAT", $"Thiết bị này đã có phụ phí loại '{dto.LoaiPhi}' đang chờ duyệt hoặc đã duyệt.");
            if (dto.LoaiPhi == "HuHong" && phiHienCo.Any(p => p.LoaiPhi == "MatThietBi"))
                return Result<PhuPhiResponse>.Loi("PHI_TRUNG_TON_THAT", "Không được lập phí sửa chữa cho thiết bị đã có hồ sơ bồi thường mất.");
            if (dto.LoaiPhi == "MatThietBi" && phiHienCo.Any(p => p.LoaiPhi == "HuHong"))
                return Result<PhuPhiResponse>.Loi("PHI_TRUNG_TON_THAT", "Không được lập phí bồi thường mất khi đã tính phí sửa chữa hư hỏng cho cùng thiết bị.");
            return null;
        }

        var coPhiChung = await _context.PhuPhis.AnyAsync(p => p.MaDonThue == dto.MaDonThue
            && p.MaChiTietBanGiao == null && p.TrangThaiDuyet != "TuChoi" && p.LoaiPhi == dto.LoaiPhi);
        return coPhiChung
            ? Result<PhuPhiResponse>.Loi("PHI_TRUNG_TON_THAT", $"Đơn thuê này đã có phụ phí chung loại '{dto.LoaiPhi}' đang chờ duyệt hoặc đã duyệt.")
            : null;
    }

    private async Task<long> LayMaNhanVienAsync(long maTaiKhoan) =>
        await ActorGuard.LayMaNhanVienAsync(_context, maTaiKhoan)
        ?? throw new KhongCoQuyenException("Không tìm thấy hồ sơ nhân viên tương ứng với tài khoản đăng nhập.");
}
