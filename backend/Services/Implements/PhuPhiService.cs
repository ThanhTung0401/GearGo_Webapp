using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhuPhi;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ quản lý phụ phí và giải quyết tranh chấp (UC14 - Kiện Minh)
/// Tuân thủ quy tắc nghiệp vụ trong Document/Plan_Week4.md
/// </summary>
public class PhuPhiService : IPhuPhiService
{
    private readonly ApplicationDbContext _context;
    private readonly IQuaHanService _quaHanService;

    public PhuPhiService(ApplicationDbContext context, IQuaHanService quaHanService)
    {
        _context = context;
        _quaHanService = quaHanService;
    }

    /// <summary>
    /// Lấy danh sách phụ phí của một đơn thuê
    /// </summary>
    public async Task<Result<List<PhuPhiResponse>>> LayDanhSachPhuPhiTheoDonAsync(long donId, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);

        var donThue = await _context.DonThues
            .Include(d => d.KhachHang)
            .FirstOrDefaultAsync(d => d.MaDonThue == donId);

        if (donThue == null)
            return Result<List<PhuPhiResponse>>.Loi("DON_KHONG_TIM_THAY", "Không tìm thấy đơn thuê.");

        // Kiểm tra quyền: nếu là khách hàng thì chỉ được xem đơn thuê của chính mình
        if (tk.VaiTro == "KhachHang")
        {
            var maKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, actorId);
            if (donThue.MaKhachHang != maKhachHang)
                return Result<List<PhuPhiResponse>>.Loi("KHONG_CO_QUYEN", "Khách hàng chỉ được xem phụ phí của đơn thuê thuộc sở hữu của mình.");
        }

        var danhSach = await _context.PhuPhis
            .Include(p => p.NguoiLap)
            .Include(p => p.NguoiDuyet)
            .Where(p => p.MaDonThue == donId)
            .OrderByDescending(p => p.ThoiDiemLap)
            .ToListAsync();

        var dtos = danhSach.Select(ChuyenSangPhuPhiResponse).ToList();
        return Result<List<PhuPhiResponse>>.Ok(dtos);
    }

    /// <summary>
    /// Gợi ý các loại phụ phí tự động cho thiết bị (phí trễ hạn, hư hỏng, mất thiết bị)
    /// </summary>
    public async Task<Result<List<GoiYPhuPhiResponse>>> GoiYPhiAsync(long chiTietBanGiaoId, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);

        var chiTiet = await _context.ChiTietBanGiaos
            .Include(c => c.PhanCongThietBi)
                .ThenInclude(p => p.ChiTietDon)
                    .ThenInclude(cd => cd.DonThue)
                        .ThenInclude(d => d.ChinhSach)
            .Include(c => c.PhanCongThietBi)
                .ThenInclude(p => p.ThietBi)
            .Include(c => c.ChiTietNhanTra)
            .FirstOrDefaultAsync(c => c.MaChiTietBanGiao == chiTietBanGiaoId);

        if (chiTiet == null)
            return Result<List<GoiYPhuPhiResponse>>.Loi("CHI_TIET_BAN_GIAO_NOT_FOUND", "Không tìm thấy chi tiết bàn giao.");

        var donThue = chiTiet.PhanCongThietBi.ChiTietDon.DonThue;
        var chiTietDon = chiTiet.PhanCongThietBi.ChiTietDon;
        var chinhSach = donThue.ChinhSach;
        var danhSachGoiY = new List<GoiYPhuPhiResponse>();

        // ─────────────────────────────────────────────────────────────────────────────
        // 1. GỢI Ý PHÍ TRỄ HẠN (TreHan)
        // Gọi helper chung TinhPhiTreDuKienAsync của Minh Tú (W4-T2)
        // ─────────────────────────────────────────────────────────────────────────────
        try
        {
            var ketQuaTinhTre = await _quaHanService.TinhPhiTreDuKienAsync(chiTietBanGiaoId, DateTime.UtcNow);
            if (ketQuaTinhTre.ThanhCong && ketQuaTinhTre.DuLieu != null && ketQuaTinhTre.DuLieu.SoTien > 0)
            {
                var duLieuTre = ketQuaTinhTre.DuLieu;
                danhSachGoiY.Add(new GoiYPhuPhiResponse
                {
                    MaChiTietBanGiao = chiTietBanGiaoId,
                    LoaiPhi = "TreHan",
                    SoTienGoiY = duLieuTre.SoTien,
                    LyDo = $"Thiết bị trả trễ {duLieuTre.SoNgayTre} ngày (hệ số phạt {duLieuTre.HeSo}x)",
                    CanCu = new CanCuTinhPhiDto
                    {
                        LoaiPhi = "TreHan",
                        CongThuc = "SoNgayTre * DonGiaSnapshot * HeSoTre",
                        DonGiaSnapshot = duLieuTre.DonGiaSnapshot,
                        HeSo = duLieuTre.HeSo,
                        SoNgayTre = duLieuTre.SoNgayTre,
                        GioTraDuKien = duLieuTre.GioTraDuKien,
                        ThoiDiemKetThuc = duLieuTre.MocTinh,
                        GhiChu = "Gợi ý tự động từ thời điểm hiện tại"
                    }
                });
            }
        }
        catch
        {
            // Fallback an toàn nếu có ngoại lệ trong quá trình tính phí trễ
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 2. GỢI Ý DỰA TRÊN BIÊN BẢN NHẬN TRẢ (NhanTra - Tuấn Kiệt)
        // ─────────────────────────────────────────────────────────────────────────────
        var nhanTra = chiTiet.ChiTietNhanTra;
        if (nhanTra != null)
        {
            // Bồi thường mất thiết bị
            if (nhanTra.KetLuan == "Mat" || !string.IsNullOrEmpty(nhanTra.BienBanMat))
            {
                // Ước tính giá trị bồi thường theo snapshot đơn thuê (15 lần đơn giá ngày hoặc giá trị tối thiểu)
                decimal giaTriBoiThuong = chiTietDon.DonGiaThueMoiNgay * 15;
                if (giaTriBoiThuong <= 0) giaTriBoiThuong = 1000000m;

                danhSachGoiY.Add(new GoiYPhuPhiResponse
                {
                    MaChiTietBanGiao = chiTietBanGiaoId,
                    LoaiPhi = "MatThietBi",
                    SoTienGoiY = giaTriBoiThuong,
                    LyDo = "Biên bản nhận trả ghi nhận thiết bị bị mất / không thể thu hồi.",
                    CanCu = new CanCuTinhPhiDto
                    {
                        LoaiPhi = "MatThietBi",
                        CongThuc = "GiaTriBoiThuongSnapshot",
                        DonGiaSnapshot = chiTietDon.DonGiaThueMoiNgay,
                        GhiChu = "Cần quản trị viên phê duyệt kết luận mất và mức phí bồi thường."
                    }
                });
            }

            // Phụ phí vệ sinh đặc biệt
            if (!string.IsNullOrEmpty(nhanTra.TinhTrangSauThue) &&
                (nhanTra.TinhTrangSauThue.Contains("bẩn", StringComparison.OrdinalIgnoreCase) ||
                 nhanTra.TinhTrangSauThue.Contains("vệ sinh", StringComparison.OrdinalIgnoreCase)))
            {
                danhSachGoiY.Add(new GoiYPhuPhiResponse
                {
                    MaChiTietBanGiao = chiTietBanGiaoId,
                    LoaiPhi = "VeSinhDacBiet",
                    SoTienGoiY = 100000m,
                    LyDo = $"Tình trạng sau thuê: {nhanTra.TinhTrangSauThue}",
                    CanCu = new CanCuTinhPhiDto
                    {
                        LoaiPhi = "VeSinhDacBiet",
                        CongThuc = "DinhMucVeSinhChuan",
                        GhiChu = "Phí vệ sinh chuyên sâu cho thiết bị bẩn nhiều bùn đất/dầu mỡ."
                    }
                });
            }
        }

        return Result<List<GoiYPhuPhiResponse>>.Ok(danhSachGoiY);
    }

    /// <summary>
    /// Lập phụ phí mới chờ duyệt
    /// </summary>
    public async Task<Result<PhuPhiResponse>> LapPhiAsync(LapPhuPhiRequest dto, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        if (string.IsNullOrWhiteSpace(dto.LoaiPhi))
            return Result<PhuPhiResponse>.Loi("LOAI_PHI_KHONG_HOP_LE", "Loại phụ phí không được để trống.");

        if (dto.SoTienDeNghi <= 0)
            return Result<PhuPhiResponse>.Loi("SO_TIEN_KHONG_HOP_LE", "Số tiền phụ phí thông thường phải lớn hơn 0.");

        using var tx = await _context.Database.BeginTransactionAsync();

        var donThue = await _context.DonThues.FirstOrDefaultAsync(d => d.MaDonThue == dto.MaDonThue);
        if (donThue == null)
            return Result<PhuPhiResponse>.Loi("DON_KHONG_TIM_THAY", "Không tìm thấy đơn thuê.");

        // ─────────────────────────────────────────────────────────────────────────────
        // CHỐNG TRÙNG LẶP TỔN THẤT CHO CÙNG THIẾT BỊ BÀN GIAO:
        // 1. Không lập 2 lần cùng một loại phí cho cùng thiết bị khi khoản cũ chưa bị từ chối.
        // 2. Không cộng vừa bồi thường mất thiết bị vừa sửa chữa (HuHong) cho cùng tổn thất.
        // ─────────────────────────────────────────────────────────────────────────────
        if (dto.MaChiTietBanGiao.HasValue)
        {
            var chiTiet = await _context.ChiTietBanGiaos.FirstOrDefaultAsync(c => c.MaChiTietBanGiao == dto.MaChiTietBanGiao.Value);
            if (chiTiet == null)
                return Result<PhuPhiResponse>.Loi("CHI_TIET_BAN_GIAO_NOT_FOUND", "Không tìm thấy chi tiết bàn giao tương ứng.");

            var phiHienCo = await _context.PhuPhis
                .Where(p => p.MaDonThue == dto.MaDonThue
                         && p.MaChiTietBanGiao == dto.MaChiTietBanGiao.Value
                         && p.TrangThaiDuyet != "TuChoi")
                .ToListAsync();

            if (phiHienCo.Any(p => p.LoaiPhi == dto.LoaiPhi))
                return Result<PhuPhiResponse>.Loi("PHI_TRUNG_TON_THAT", $"Thiết bị này đã có phụ phí loại '{dto.LoaiPhi}' đang chờ duyệt hoặc đã duyệt.");

            if (dto.LoaiPhi == "HuHong" && phiHienCo.Any(p => p.LoaiPhi == "MatThietBi"))
                return Result<PhuPhiResponse>.Loi("PHI_TRUNG_TON_THAT", "Không được lập phí sửa chữa cho thiết bị đã có hồ sơ bồi thường mất.");

            if (dto.LoaiPhi == "MatThietBi" && phiHienCo.Any(p => p.LoaiPhi == "HuHong"))
                return Result<PhuPhiResponse>.Loi("PHI_TRUNG_TON_THAT", "Không được lập phí bồi thường mất khi đã tính phí sửa chữa hư hỏng cho cùng thiết bị.");
        }
        else
        {
            var phiChungHienCo = await _context.PhuPhis
                .Where(p => p.MaDonThue == dto.MaDonThue
                         && p.MaChiTietBanGiao == null
                         && p.TrangThaiDuyet != "TuChoi")
                .ToListAsync();

            if (phiChungHienCo.Any(p => p.LoaiPhi == dto.LoaiPhi))
                return Result<PhuPhiResponse>.Loi("PHI_TRUNG_TON_THAT", $"Đơn thuê này đã có phụ phí chung loại '{dto.LoaiPhi}' đang chờ duyệt hoặc đã duyệt.");
        }

        var canCu = new CanCuTinhPhiDto
        {
            LoaiPhi = dto.LoaiPhi,
            CongThuc = "NhapThuCongTheoCanCuThucTe",
            GhiChu = dto.LyDo
        };

        var bangChungJson = dto.DanhSachAnh != null && dto.DanhSachAnh.Any()
            ? JsonSerializer.Serialize(dto.DanhSachAnh)
            : null;

        var phuPhiMoi = new PhuPhi
        {
            MaDonThue = dto.MaDonThue,
            MaChiTietBanGiao = dto.MaChiTietBanGiao,
            MaNguoiLap = maNhanVien,
            LoaiPhi = dto.LoaiPhi,
            SoTien = dto.SoTienDeNghi ?? 0,
            LyDo = dto.LyDo,
            CanCuTinhPhi = JsonSerializer.Serialize(canCu),
            BangChung = bangChungJson,
            ThoiDiemLap = DateTime.UtcNow,
            TrangThaiDuyet = "ChoDuyet",
            TrangThaiTranhChap = null
        };

        _context.PhuPhis.Add(phuPhiMoi);
        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhiMoi));
    }

    /// <summary>
    /// Sửa đổi thông tin phụ phí khi chưa được phê duyệt và chưa bị khóa đối soát
    /// </summary>
    public async Task<Result<PhuPhiResponse>> CapNhatPhiChuaDuyetAsync(long id, CapNhatPhuPhiRequest dto, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);

        var phuPhi = await _context.PhuPhis.FirstOrDefaultAsync(p => p.MaPhuPhi == id);
        if (phuPhi == null)
            return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí.");

        if (phuPhi.TrangThaiDuyet != "ChoDuyet")
            return Result<PhuPhiResponse>.Loi("PHU_PHI_DA_XU_LY", "Chỉ có thể sửa phụ phí khi đang ở trạng thái 'ChoDuyet'.");

        if (phuPhi.MaDoiSoat != null)
            return Result<PhuPhiResponse>.Loi("PHI_DA_KHOA_DOI_SOAT", "Phụ phí đã được đưa vào bảng đối soát xác nhận, không thể sửa trực tiếp.");

        if (dto.SoTien.HasValue)
        {
            if (dto.SoTien.Value <= 0)
                return Result<PhuPhiResponse>.Loi("SO_TIEN_KHONG_HOP_LE", "Số tiền phụ phí phải lớn hơn 0.");
            phuPhi.SoTien = dto.SoTien.Value;
        }

        if (!string.IsNullOrWhiteSpace(dto.LyDo))
            phuPhi.LyDo = dto.LyDo;

        if (dto.DanhSachAnh != null)
            phuPhi.BangChung = JsonSerializer.Serialize(dto.DanhSachAnh);

        await _context.SaveChangesAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhi));
    }

    /// <summary>
    /// Phê duyệt phụ phí
    /// </summary>
    public async Task<Result<PhuPhiResponse>> DuyetPhiAsync(long id, DuyetPhuPhiRequest dto, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        var phuPhi = await _context.PhuPhis
            .Include(p => p.DonThue)
                .ThenInclude(d => d.ChinhSach)
            .FirstOrDefaultAsync(p => p.MaPhuPhi == id);

        if (phuPhi == null)
            return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí.");

        if (phuPhi.TrangThaiDuyet != "ChoDuyet")
            return Result<PhuPhiResponse>.Loi("PHU_PHI_DA_XU_LY", "Phụ phí đã được duyệt hoặc từ chối trước đó.");

        if (phuPhi.MaDoiSoat != null)
            return Result<PhuPhiResponse>.Loi("PHI_DA_KHOA_DOI_SOAT", "Phụ phí đã gắn đối soát, không thể thay đổi trạng thái.");

        // ─────────────────────────────────────────────────────────────────────────────
        // KIỂM TRA THẨM QUYỀN PHÊ DUYỆT:
        // - Ngưỡng tự duyệt của Nhân viên: <= 500.000 VNĐ.
        // - Khoản bồi thường mất thiết bị (MatThietBi) hoặc số tiền > 500.000 VNĐ:
        //   BẮT BUỘC vai trò Quản trị viên (QuanTriVien) mới được duyệt.
        // ─────────────────────────────────────────────────────────────────────────────
        const decimal HAN_MUC_STAFF = 500000m;
        bool laAdmin = tk.VaiTro == "QuanTriVien";

        if (!laAdmin && (phuPhi.SoTien > HAN_MUC_STAFF || phuPhi.LoaiPhi == "MatThietBi"))
        {
            return Result<PhuPhiResponse>.Loi("VUOT_QUYEN_DUYET_PHI",
                $"Khoản phụ phí {phuPhi.SoTien:N0} VNĐ hoặc bồi thường mất thiết bị vượt thẩm quyền duyệt của nhân viên. Cần Quản trị viên phê duyệt.");
        }

        phuPhi.TrangThaiDuyet = "DaDuyet";
        phuPhi.MaNguoiDuyet = maNhanVien;
        phuPhi.ThoiDiemDuyet = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.LyDo))
            phuPhi.LyDo = $"{phuPhi.LyDo} [Duyệt: {dto.LyDo}]";

        await _context.SaveChangesAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhi));
    }

    /// <summary>
    /// Từ chối phụ phí
    /// </summary>
    public async Task<Result<PhuPhiResponse>> TuChoiPhiAsync(long id, DuyetPhuPhiRequest dto, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        var phuPhi = await _context.PhuPhis.FirstOrDefaultAsync(p => p.MaPhuPhi == id);
        if (phuPhi == null)
            return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí.");

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

    /// <summary>
    /// Khách hàng mở khiếu nại tranh chấp phụ phí
    /// </summary>
    public async Task<Result<PhuPhiResponse>> TaoTranhChapAsync(long id, TranhChapRequest dto, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        var maKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, actorId);

        var phuPhi = await _context.PhuPhis
            .Include(p => p.DonThue)
            .FirstOrDefaultAsync(p => p.MaPhuPhi == id);

        if (phuPhi == null)
            return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí.");

        // Chỉ khách hàng chủ đơn mới được khiếu nại
        if (phuPhi.DonThue.MaKhachHang != maKhachHang)
            return Result<PhuPhiResponse>.Loi("KHONG_CO_QUYEN", "Khách hàng không sở hữu đơn thuê chứa khoản phụ phí này.");

        if (phuPhi.TrangThaiDuyet != "DaDuyet")
            return Result<PhuPhiResponse>.Loi("TRANG_THAI_KHONG_HOP_LE", "Chỉ có thể khiếu nại phụ phí đã được duyệt chính thức.");

        if (phuPhi.TrangThaiTranhChap == "DangTranhChap")
            return Result<PhuPhiResponse>.Loi("PHI_DANG_TRANH_CHAP", "Phụ phí này đang trong quá trình giải quyết tranh chấp.");

        phuPhi.TrangThaiTranhChap = "DangTranhChap";
        phuPhi.LyDo = $"{phuPhi.LyDo} [Khách khiếu nại: {dto.NoiDung}]";

        if (dto.DanhSachAnh != null && dto.DanhSachAnh.Any())
            phuPhi.BangChung = JsonSerializer.Serialize(dto.DanhSachAnh);

        await _context.SaveChangesAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhi));
    }

    /// <summary>
    /// Quản trị viên xử lý kết quả tranh chấp
    /// </summary>
    public async Task<Result<PhuPhiResponse>> GiaiQuyetTranhChapAsync(long id, GiaiQuyetTranhChapRequest dto, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        if (tk.VaiTro != "QuanTriVien")
            return Result<PhuPhiResponse>.Loi("KHONG_CO_QUYEN", "Chỉ Quản trị viên mới có quyền giải quyết tranh chấp phụ phí.");

        var phuPhi = await _context.PhuPhis.FirstOrDefaultAsync(p => p.MaPhuPhi == id);
        if (phuPhi == null)
            return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí.");

        if (phuPhi.TrangThaiTranhChap != "DangTranhChap")
            return Result<PhuPhiResponse>.Loi("TRANG_THAI_KHONG_HOP_LE", "Phụ phí không ở trạng thái đang tranh chấp.");

        phuPhi.TrangThaiTranhChap = "DaGiaiQuyet";
        phuPhi.KetQuaGiaiQuyet = $"{dto.KetQua}: {dto.LyDo}";

        if (dto.KetQua == "HuyPhi")
        {
            phuPhi.TrangThaiDuyet = "TuChoi";
        }
        else if (dto.KetQua == "DieuChinh" && dto.SoTienDeXuatSauXuLy.HasValue)
        {
            // Nếu khoản phí chưa bị khóa đối soát, cho phép cập nhật số tiền đã hòa giải
            if (phuPhi.MaDoiSoat == null)
            {
                phuPhi.SoTien = dto.SoTienDeXuatSauXuLy.Value;
            }
        }

        await _context.SaveChangesAsync();
        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phuPhi));
    }

    /// <summary>
    /// Lập phụ phí điều chỉnh sau đối soát
    /// </summary>
    public async Task<Result<PhuPhiResponse>> LapDieuChinhPhiAsync(long phiGocId, DieuChinhPhiRequest dto, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        if (tk.VaiTro != "QuanTriVien")
            return Result<PhuPhiResponse>.Loi("KHONG_CO_QUYEN", "Chỉ Quản trị viên mới có quyền lập phụ phí điều chỉnh.");

        var maNhanVien = await LayMaNhanVienAsync(actorId);

        var phiGoc = await _context.PhuPhis.FirstOrDefaultAsync(p => p.MaPhuPhi == phiGocId);
        if (phiGoc == null)
            return Result<PhuPhiResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí gốc.");

        if (phiGoc.TrangThaiDuyet != "DaDuyet")
            return Result<PhuPhiResponse>.Loi("TRANG_THAI_KHONG_HOP_LE", "Chỉ có thể điều chỉnh khoản phụ phí đã được duyệt.");

        // ─────────────────────────────────────────────────────────────────────────────
        // KIỂM TRA ĐIỀU CHỈNH:
        // Tổng nghĩa vụ sau điều chỉnh (Phí gốc + Các điều chỉnh trước + Điều chỉnh mới) >= 0.
        // ─────────────────────────────────────────────────────────────────────────────
        var cacDieuChinhCu = await _context.PhuPhis
            .Where(p => p.MaPhuPhiGoc == phiGocId && p.TrangThaiDuyet == "DaDuyet")
            .SumAsync(p => p.SoTien);

        decimal tongSauDieuChinh = phiGoc.SoTien + cacDieuChinhCu + dto.SoTienDieuChinhCoDau;
        if (tongSauDieuChinh < 0)
        {
            return Result<PhuPhiResponse>.Loi("TONG_PHI_KHONG_DUOC_AM",
                $"Tổng nghĩa vụ sau điều chỉnh ({tongSauDieuChinh:N0} VNĐ) không được âm. Vui lòng kiểm tra lại số tiền điều chỉnh.");
        }

        var phiDieuChinh = new PhuPhi
        {
            MaDonThue = phiGoc.MaDonThue,
            MaChiTietBanGiao = phiGoc.MaChiTietBanGiao,
            MaNguoiLap = maNhanVien,
            MaNguoiDuyet = maNhanVien,
            MaPhuPhiGoc = phiGocId,
            LoaiPhi = $"DieuChinh_{phiGoc.LoaiPhi}",
            SoTien = dto.SoTienDieuChinhCoDau,
            LyDo = dto.LyDo,
            BangChung = dto.DanhSachAnh != null ? JsonSerializer.Serialize(dto.DanhSachAnh) : null,
            ThoiDiemLap = DateTime.UtcNow,
            ThoiDiemDuyet = DateTime.UtcNow,
            TrangThaiDuyet = "DaDuyet",
            TrangThaiTranhChap = null
        };

        _context.PhuPhis.Add(phiDieuChinh);
        await _context.SaveChangesAsync();

        return Result<PhuPhiResponse>.Ok(ChuyenSangPhuPhiResponse(phiDieuChinh));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────────
    private async Task<long> LayMaNhanVienAsync(long maTaiKhoan)
    {
        var nv = await _context.NhanViens.FirstOrDefaultAsync(n => n.MaTaiKhoan == maTaiKhoan);
        if (nv == null)
            throw new KhongCoQuyenException("Không tìm thấy hồ sơ nhân viên tương ứng với tài khoản đăng nhập.");
        return nv.MaNhanVien;
    }

    private static PhuPhiResponse ChuyenSangPhuPhiResponse(PhuPhi entity)
    {
        CanCuTinhPhiDto? canCu = null;
        if (!string.IsNullOrEmpty(entity.CanCuTinhPhi))
        {
            try { canCu = JsonSerializer.Deserialize<CanCuTinhPhiDto>(entity.CanCuTinhPhi); }
            catch { /* Ignore parse error */ }
        }

        List<string>? bangChung = null;
        if (!string.IsNullOrEmpty(entity.BangChung))
        {
            try { bangChung = JsonSerializer.Deserialize<List<string>>(entity.BangChung); }
            catch { /* Ignore parse error */ }
        }

        return new PhuPhiResponse
        {
            MaPhuPhi = entity.MaPhuPhi,
            MaDonThue = entity.MaDonThue,
            MaChiTietBanGiao = entity.MaChiTietBanGiao,
            MaNguoiLap = entity.MaNguoiLap,
            TenNguoiLap = entity.NguoiLap?.HoTen,
            MaNguoiDuyet = entity.MaNguoiDuyet,
            TenNguoiDuyet = entity.NguoiDuyet?.HoTen,
            MaPhuPhiGoc = entity.MaPhuPhiGoc,
            MaDoiSoat = entity.MaDoiSoat,
            LoaiPhi = entity.LoaiPhi,
            SoTien = entity.SoTien,
            LyDo = entity.LyDo,
            CanCuTinhPhi = canCu,
            BangChung = bangChung,
            ThoiDiemLap = entity.ThoiDiemLap,
            ThoiDiemDuyet = entity.ThoiDiemDuyet,
            TrangThaiDuyet = entity.TrangThaiDuyet,
            TrangThaiTranhChap = entity.TrangThaiTranhChap,
            KetQuaGiaiQuyet = entity.KetQuaGiaiQuyet,
            DaKhoaDoiSoat = entity.MaDoiSoat != null
        };
    }
}
