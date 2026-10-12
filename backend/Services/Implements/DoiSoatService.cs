using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DoiSoat;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ đối soát cọc, hoàn tất đơn thuê và điều chỉnh đối soát (UC15 - Kim Xuyến)
/// Tuân thủ quy tắc nghiệp vụ trong Document/Plan_Week4.md
/// </summary>
public class DoiSoatService : IDoiSoatService
{
    private readonly ApplicationDbContext _context;
    private readonly IThanhToanService _thanhToanService;

    public DoiSoatService(ApplicationDbContext context, IThanhToanService thanhToanService)
    {
        _context = context;
        _thanhToanService = thanhToanService;
    }

    /// <summary>
    /// Xem trước bảng tính đối soát và kiểm tra các điều kiện tiên quyết (không ghi dữ liệu)
    /// </summary>
    public async Task<Result<XemTruocDoiSoatResponse>> XemTruocAsync(long donId, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);

        var don = await _context.DonThues
            .Include(d => d.ChiTietDonThues)
            .FirstOrDefaultAsync(d => d.MaDonThue == donId);

        if (don == null)
            return Result<XemTruocDoiSoatResponse>.Loi("DON_KHONG_TIM_THAY", "Không tìm thấy đơn thuê.");

        var vuongMac = new List<string>();

        // 1. Kiểm tra trạng thái đơn: phải ở ChoDoiSoat hoặc DaNhanTra
        if (don.TrangThai != TrangThaiDonThue.ChoDoiSoat && don.TrangThai != TrangThaiDonThue.DaNhanTra)
        {
            vuongMac.Add($"Đơn đang ở trạng thái '{don.TrangThai}', chưa sẵn sàng để đối soát.");
        }

        // 2. Kiểm tra thiết bị còn nợ / bàn giao chưa có kết luận nhận trả
        var chiTietBanGiaos = await _context.ChiTietBanGiaos
            .Include(c => c.PhieuBanGiao)
            .Include(c => c.ChiTietNhanTra)
                .ThenInclude(nt => nt!.PhieuNhanTra)
            .Where(c => c.PhieuBanGiao != null && c.PhieuBanGiao.MaDonThue == donId)
            .ToListAsync();

        foreach (var ct in chiTietBanGiaos)
        {
            if (ct.ChiTietNhanTra == null)
            {
                vuongMac.Add($"Chi tiết bàn giao #{ct.MaChiTietBanGiao} chưa có kết luận nhận trả hoặc kết luận mất.");
            }
            else if (ct.ChiTietNhanTra.PhieuNhanTra == null || ct.ChiTietNhanTra.PhieuNhanTra.TrangThai != TrangThaiPhieuNhanTra.DaChot)
            {
                vuongMac.Add($"Thiết bị #{ct.MaChiTietBanGiao} đang nằm trong phiếu nhận trả chưa chốt (phiếu #{ct.ChiTietNhanTra.MaPhieuNhanTra}).");
            }
        }

        // 3. Kiểm tra phụ phí: không còn khoản chờ duyệt hoặc đang tranh chấp
        var phuPhis = await _context.PhuPhis
            .Where(p => p.MaDonThue == donId)
            .ToListAsync();

        foreach (var p in phuPhis)
        {
            if (p.TrangThaiDuyet == "ChoDuyet")
            {
                vuongMac.Add($"Khoản phụ phí #{p.MaPhuPhi} ({p.LoaiPhi}) vẫn đang chờ duyệt.");
            }
            if (p.TrangThaiTranhChap == "DangTranhChap")
            {
                vuongMac.Add($"Khoản phụ phí #{p.MaPhuPhi} ({p.LoaiPhi}) đang trong quá trình khiếu nại / tranh chấp.");
            }
        }

        // 4. Lấy các nguồn cọc hợp lệ của đơn
        var chiTietCoc = await _context.ChiTietThanhToans
            .Include(ct => ct.ThanhToan)
            .Include(ct => ct.GiaoDichDoiSoat)
            .Include(ct => ct.HoanTiens)
            .Where(ct => ct.ThanhToan.MaDonThue == donId 
                      && ct.MucDich == "TienCoc" 
                      && ct.ThanhToan.TrangThai == "ThanhCong")
            .ToListAsync();

        var danhSachNguonCoc = new List<NguonCocDto>();
        decimal tongCocKhaDung = 0;

        foreach (var ct in chiTietCoc)
        {
            // Kiểm tra xem đã bị đối soát khác dùng chưa
            var doiSoatKhac = ct.GiaoDichDoiSoat != null && ct.GiaoDichDoiSoat.MaDoiSoat != 0;
            if (doiSoatKhac)
            {
                // Đã bị liên kết ở đối soát khác
                continue;
            }

            var daHoan = ct.HoanTiens
                .Where(h => h.TrangThai == "ThanhCong")
                .Sum(h => h.SoTien);

            var conLai = ct.SoTien - daHoan;
            if (conLai > 0)
            {
                tongCocKhaDung += conLai;
                danhSachNguonCoc.Add(new NguonCocDto
                {
                    MaChiTietThanhToan = ct.MaChiTietThanhToan,
                    MaThanhToan = ct.MaThanhToan,
                    MaYeuCau = ct.ThanhToan.MaYeuCau,
                    SoTien = conLai,
                    PhuongThuc = ct.ThanhToan.PhuongThuc,
                    ThoiDiem = ct.ThanhToan.ThoiDiemThanhCong ?? ct.ThanhToan.ThoiDiemTao
                });
            }
        }

        // 5. Lấy các phụ phí đã duyệt hợp lệ
        var danhSachPhuPhiDuyet = phuPhis
            .Where(p => p.TrangThaiDuyet == "Duyet" && p.TrangThaiTranhChap != "DangTranhChap")
            .Select(p => new PhuPhiDoiSoatDto
            {
                MaPhuPhi = p.MaPhuPhi,
                MaChiTietBanGiao = p.MaChiTietBanGiao,
                LoaiPhi = p.LoaiPhi,
                SoTien = p.SoTien,
                LyDo = p.LyDo,
                TrangThaiDuyet = p.TrangThaiDuyet,
                TrangThaiTranhChap = p.TrangThaiTranhChap
            })
            .ToList();

        decimal tongPhuPhi = danhSachPhuPhiDuyet.Sum(p => p.SoTien);
        decimal canHoan = Math.Max(0, tongCocKhaDung - tongPhuPhi);
        decimal canThuThem = Math.Max(0, tongPhuPhi - tongCocKhaDung);

        var dauVanTay = TinhDauVanTay(donId, tongCocKhaDung, tongPhuPhi, canHoan, canThuThem);

        return Result<XemTruocDoiSoatResponse>.Ok(new XemTruocDoiSoatResponse
        {
            MaDonThue = donId,
            MaDonHienThi = don.MaDonHienThi,
            DuDieuKien = vuongMac.Count == 0,
            VuongMac = vuongMac,
            TienCocDuocDoiSoat = tongCocKhaDung,
            TongPhuPhiDuocDuyet = tongPhuPhi,
            SoTienCanHoan = canHoan,
            SoTienCanThuThem = canThuThem,
            NguonCoc = danhSachNguonCoc,
            PhuPhi = danhSachPhuPhiDuyet,
            DauVanTayBangTinh = dauVanTay
        });
    }

    /// <summary>
    /// Lập phiếu đối soát ban đầu (trạng thái ChoChot) dưới khóa bảo vệ đơn
    /// </summary>
    public async Task<Result<DoiSoatResponse>> LapDoiSoatAsync(LapDoiSoatRequest dto, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var don = await _context.DonThues
                .FirstOrDefaultAsync(d => d.MaDonThue == dto.MaDonThue);

            if (don == null)
                return Result<DoiSoatResponse>.Loi("DON_KHONG_TIM_THAY", "Không tìm thấy đơn thuê.");

            // Kiểm tra xem đã có đối soát ban đầu nào chưa
            var existingDoiSoat = await _context.DoiSoatTienCocs
                .Include(d => d.PhuPhis)
                .Include(d => d.GiaoDichDoiSoats)
                .Include(d => d.HoanTiens)
                .Include(d => d.NguoiLap)
                .Include(d => d.NguoiChot)
                .FirstOrDefaultAsync(d => d.MaDonThue == dto.MaDonThue && d.LoaiDoiSoat == "BanDau");

            if (existingDoiSoat != null)
            {
                // Nếu đối soát đã tồn tại, trả lại đối soát hiện có theo quy tắc Idempotent
                return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(existingDoiSoat));
            }

            // Kiểm tra điều kiện xem trước
            var xemTruocRes = await XemTruocAsync(dto.MaDonThue, actorId);
            if (!xemTruocRes.ThanhCong || xemTruocRes.DuLieu == null)
                return Result<DoiSoatResponse>.Loi(xemTruocRes.MaLoi ?? "LOI_XEM_TRUOC", xemTruocRes.ThongDiep ?? "Lỗi khi kiểm tra đối soát.");

            var xemTruoc = xemTruocRes.DuLieu;
            if (!xemTruoc.DuDieuKien)
            {
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_CHUA_DU_DIEU_KIEN", 
                    "Đơn thuê chưa đủ điều kiện lập đối soát: " + string.Join("; ", xemTruoc.VuongMac));
            }

            // Tạo phiếu đối soát mới
            var doiSoatMoi = new DoiSoatTienCoc
            {
                MaDonThue = dto.MaDonThue,
                LoaiDoiSoat = "BanDau",
                MaNguoiLap = maNhanVien,
                TienCocDuocDoiSoat = xemTruoc.TienCocDuocDoiSoat,
                TongPhuPhiDuocDuyet = xemTruoc.TongPhuPhiDuocDuyet,
                SoTienCanHoan = xemTruoc.SoTienCanHoan,
                SoTienCanThuThem = xemTruoc.SoTienCanThuThem,
                TrangThai = "ChoChot",
                ThoiDiemLap = DateTime.UtcNow
            };

            _context.DoiSoatTienCocs.Add(doiSoatMoi);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoatMoi));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi lập đối soát: {ex.Message}");
        }
    }

    /// <summary>
    /// Xác nhận bảng tính đối soát: cố định số tiền, khóa phụ phí và liên kết giao dịch cọc
    /// </summary>
    public async Task<Result<DoiSoatResponse>> XacNhanBangTinhAsync(long id, XacNhanDoiSoatRequest dto, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var doiSoat = await _context.DoiSoatTienCocs
                .Include(d => d.DonThue)
                .Include(d => d.GiaoDichDoiSoats)
                .Include(d => d.PhuPhis)
                .Include(d => d.HoanTiens)
                .Include(d => d.NguoiLap)
                .Include(d => d.NguoiChot)
                .FirstOrDefaultAsync(d => d.MaDoiSoat == id);

            if (doiSoat == null)
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy phiếu đối soát.");

            if (doiSoat.TrangThai == "DaChot")
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_DA_CHOT", "Phiếu đối soát này đã được chốt, không thể xác nhận lại.");

            // Tính toán lại để đảm bảo dữ liệu mới nhất
            var xemTruocRes = await XemTruocAsync(doiSoat.MaDonThue, actorId);
            if (!xemTruocRes.ThanhCong || xemTruocRes.DuLieu == null)
                return Result<DoiSoatResponse>.Loi(xemTruocRes.MaLoi ?? "LOI_XEM_TRUOC", xemTruocRes.ThongDiep ?? "Lỗi khi kiểm tra đối soát.");

            var xemTruoc = xemTruocRes.DuLieu;
            if (!xemTruoc.DuDieuKien)
            {
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_CHUA_DU_DIEU_KIEN", 
                    "Dữ liệu thay đổi khiến đơn không còn đủ điều kiện: " + string.Join("; ", xemTruoc.VuongMac));
            }

            // Kiểm tra dấu vân tay nếu client gửi
            if (!string.IsNullOrEmpty(dto.DauVanTayBangTinh) && dto.DauVanTayBangTinh != xemTruoc.DauVanTayBangTinh)
            {
                return Result<DoiSoatResponse>.Loi("BANG_TINH_DA_THAY_DOI", 
                    "Dữ liệu cọc hoặc phụ phí đã thay đổi kể từ lúc xem trước. Vui lòng tải lại trang để xem số liệu mới.");
            }

            // Cố định số liệu
            doiSoat.TienCocDuocDoiSoat = xemTruoc.TienCocDuocDoiSoat;
            doiSoat.TongPhuPhiDuocDuyet = xemTruoc.TongPhuPhiDuocDuyet;
            doiSoat.SoTienCanHoan = xemTruoc.SoTienCanHoan;
            doiSoat.SoTienCanThuThem = xemTruoc.SoTienCanThuThem;

            // 1. Khóa phụ phí: Gán MaDoiSoat cho các phụ phí đã duyệt
            var phuPhiIds = xemTruoc.PhuPhi.Select(p => p.MaPhuPhi).ToList();
            var cacPhuPhi = await _context.PhuPhis
                .Where(p => phuPhiIds.Contains(p.MaPhuPhi))
                .ToListAsync();

            foreach (var p in cacPhuPhi)
            {
                p.MaDoiSoat = doiSoat.MaDoiSoat;
            }

            // 2. Liên kết nguồn cọc vào GIAO_DICH_DOI_SOAT
            var nguonCocIds = xemTruoc.NguonCoc.Select(n => n.MaChiTietThanhToan).ToList();
            var cacChiTietCoc = await _context.ChiTietThanhToans
                .Include(ct => ct.GiaoDichDoiSoat)
                .Where(ct => nguonCocIds.Contains(ct.MaChiTietThanhToan))
                .ToListAsync();

            foreach (var ct in cacChiTietCoc)
            {
                if (ct.GiaoDichDoiSoat == null)
                {
                    _context.GiaoDichDoiSoats.Add(new GiaoDichDoiSoat
                    {
                        MaDoiSoat = doiSoat.MaDoiSoat,
                        MaChiTietThanhToan = ct.MaChiTietThanhToan
                    });
                }
            }

            // 3. Lưu JSON snapshot vào bang_tinh_doi_soat
            var snapshot = new BangTinhDoiSoatDto
            {
                NguonCocChiTietIds = nguonCocIds,
                PhuPhiIds = phuPhiIds,
                TienCocSnapshot = xemTruoc.TienCocDuocDoiSoat,
                TongPhiSnapshot = xemTruoc.TongPhuPhiDuocDuyet,
                CanHoanSnapshot = xemTruoc.SoTienCanHoan,
                CanThuThemSnapshot = xemTruoc.SoTienCanThuThem,
                DauVanTay = xemTruoc.DauVanTayBangTinh,
                ThoiDiemXacNhan = DateTime.UtcNow
            };
            doiSoat.BangTinhDoiSoat = JsonSerializer.Serialize(snapshot);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi xác nhận bảng tính: {ex.Message}");
        }
    }

    /// <summary>
    /// Phát lệnh xử lý tiền: tạo yêu cầu hoàn cọc (nếu C > P) hoặc gọi thanh toán thu thêm (nếu P > C)
    /// </summary>
    public async Task<Result<DoiSoatResponse>> YeuCauXuLyTienAsync(long id, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var doiSoat = await _context.DoiSoatTienCocs
                .Include(d => d.DonThue)
                .Include(d => d.GiaoDichDoiSoats)
                    .ThenInclude(g => g.ChiTietThanhToan)
                        .ThenInclude(ct => ct.ThanhToan)
                .Include(d => d.HoanTiens)
                .FirstOrDefaultAsync(d => d.MaDoiSoat == id);

            if (doiSoat == null)
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy phiếu đối soát.");

            if (doiSoat.TrangThai == "DaChot")
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_DA_CHOT", "Phiếu đối soát đã chốt, không thể phát lệnh xử lý tiền mới.");

            // 1. Trường hợp cần thu thêm (P > C)
            if (doiSoat.SoTienCanThuThem > 0)
            {
                var thuThemRes = await _thanhToanService.TaoThuBoSungAsync(new TaoThuBoSungRequest
                {
                    MaDoiSoat = doiSoat.MaDoiSoat,
                    PhuongThucDuocHoTro = "VNPAY"
                }, actorId);

                if (!thuThemRes.ThanhCong && thuThemRes.MaLoi != "THU_THEM_DANG_CHO")
                {
                    return Result<DoiSoatResponse>.Loi(thuThemRes.MaLoi ?? "LOI_THU_THEM", thuThemRes.ThongDiep ?? "Lỗi khi tạo yêu cầu thu bổ sung.");
                }

                doiSoat.TrangThai = "DangXuLyTien";
            }
            // 2. Trường hợp cần hoàn cọc (C > P)
            else if (doiSoat.SoTienCanHoan > 0)
            {
                // Kiểm tra xem đã lập yêu cầu hoàn tiền chưa
                var daLapHoan = doiSoat.HoanTiens.Any(h => h.TrangThai == "ChoXuLy" || h.TrangThai == "ThanhCong");
                if (!daLapHoan)
                {
                    // Lập yêu cầu hoàn tiền gắn với từng chi tiết thu gốc
                    decimal conPhaiHoan = doiSoat.SoTienCanHoan;

                    var danhSachChiTietNguon = doiSoat.GiaoDichDoiSoats
                        .Select(g => g.ChiTietThanhToan)
                        .Where(ct => ct.MucDich == "TienCoc")
                        .ToList();

                    foreach (var ct in danhSachChiTietNguon)
                    {
                        if (conPhaiHoan <= 0) break;

                        decimal tienCoTheHoan = ct.SoTien; // Đã kiểm tra ở bước xem trước
                        decimal soTienHoanLanNay = Math.Min(conPhaiHoan, tienCoTheHoan);

                        var maYeuCauHoan = $"REF_{doiSoat.MaDoiSoat}_{ct.MaChiTietThanhToan}_{DateTime.UtcNow:yyyyMMddHHmmss}";

                        var hoanTienMoi = new HoanTien
                        {
                            MaChiTietThanhToanGoc = ct.MaChiTietThanhToan,
                            MaDoiSoat = doiSoat.MaDoiSoat,
                            MaNguoiXuLy = maNhanVien,
                            MaYeuCau = maYeuCauHoan,
                            LoaiHoan = "HoanCoc",
                            SoTien = soTienHoanLanNay,
                            LyDo = $"Hoàn tiền cọc sau đối soát đơn #{doiSoat.MaDonThue}",
                            ThoiDiemYeuCau = DateTime.UtcNow,
                            TrangThai = "ChoXuLy"
                        };

                        _context.HoanTiens.Add(hoanTienMoi);
                        conPhaiHoan -= soTienHoanLanNay;
                    }
                }

                doiSoat.TrangThai = "DangXuLyTien";
            }
            // 3. Trường hợp P == C
            else
            {
                // Không cần thu thêm cũng không cần hoàn cọc, chuyển thẳng sang sẵn sàng chốt
                doiSoat.TrangThai = "ChoChot";
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi yêu cầu xử lý tiền: {ex.Message}");
        }
    }

    /// <summary>
    /// Chốt đối soát sau khi toàn bộ tiền đã xử lý thành công, chuyển trạng thái đơn sang HoanTat
    /// </summary>
    public async Task<Result<DoiSoatResponse>> ChotDoiSoatAsync(long id, long actorId)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, actorId);
        var maNhanVien = await LayMaNhanVienAsync(actorId);

        var nv = await _context.NhanViens
            .Include(n => n.TaiKhoan)
            .FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien);

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var doiSoat = await _context.DoiSoatTienCocs
                .Include(d => d.DonThue)
                .Include(d => d.HoanTiens)
                .Include(d => d.GiaoDichDoiSoats)
                    .ThenInclude(g => g.ChiTietThanhToan)
                        .ThenInclude(ct => ct.ThanhToan)
                .Include(d => d.PhuPhis)
                .Include(d => d.NguoiLap)
                .Include(d => d.NguoiChot)
                .FirstOrDefaultAsync(d => d.MaDoiSoat == id);

            if (doiSoat == null)
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy phiếu đối soát.");

            // Idempotent: Nếu đã chốt thì trả kết quả cũ
            if (doiSoat.TrangThai == "DaChot")
            {
                return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));
            }

            // 1. Kiểm tra tiến độ hoàn tiền nếu có nghĩa vụ hoàn
            if (doiSoat.SoTienCanHoan > 0)
            {
                var daHoanThanhCong = doiSoat.HoanTiens
                    .Where(h => h.TrangThai == "ThanhCong")
                    .Sum(h => h.SoTien);

                if (daHoanThanhCong < doiSoat.SoTienCanHoan)
                {
                    var conPending = doiSoat.HoanTiens.Any(h => h.TrangThai == "ChoXuLy");
                    return Result<DoiSoatResponse>.Loi("GIAO_DICH_CHUA_RO_KET_QUA", 
                        $"Tiền hoàn chưa được thực hiện thành công đủ. Đã hoàn: {daHoanThanhCong:N0}đ / Cần hoàn: {doiSoat.SoTienCanHoan:N0}đ. {(conPending ? "Có lệnh hoàn đang chờ xử lý." : "")}");
                }
            }

            // 2. Kiểm tra tiến độ thu thêm nếu có nghĩa vụ thu thêm
            if (doiSoat.SoTienCanThuThem > 0)
            {
                // Kiểm tra xem đã có chi tiết thu bổ sung thành công chưa
                var daThuBoSung = doiSoat.GiaoDichDoiSoats
                    .Select(g => g.ChiTietThanhToan)
                    .Where(ct => ct.MucDich == "ThuBoSung" && ct.ThanhToan.TrangThai == "ThanhCong")
                    .Sum(ct => ct.SoTien);

                // Hoặc kiểm tra qua ThanhToan có ghi chú gắn với đối soát
                if (daThuBoSung < doiSoat.SoTienCanThuThem)
                {
                    var thanhToanThanhCong = await _context.ThanhToans
                        .Include(t => t.ChiTietThanhToans)
                        .Where(t => t.MaDonThue == doiSoat.MaDonThue 
                                 && t.TrangThai == "ThanhCong" 
                                 && t.GhiChu != null 
                                 && t.GhiChu.Contains(doiSoat.MaDoiSoat.ToString()))
                        .SelectMany(t => t.ChiTietThanhToans)
                        .Where(ct => ct.MucDich == "ThuBoSung")
                        .SumAsync(ct => ct.SoTien);

                    if (thanhToanThanhCong < doiSoat.SoTienCanThuThem)
                    {
                        return Result<DoiSoatResponse>.Loi("GIAO_DICH_CHUA_RO_KET_QUA", 
                            $"Tiền thu thêm chưa được thanh toán đủ. Đã thu: {Math.Max(daThuBoSung, thanhToanThanhCong):N0}đ / Cần thu thêm: {doiSoat.SoTienCanThuThem:N0}đ.");
                    }
                }
            }

            // 3. Kiểm tra không còn phụ phí mới đang tranh chấp
            var phuPhiTranhChap = await _context.PhuPhis
                .AnyAsync(p => p.MaDonThue == doiSoat.MaDonThue && p.TrangThaiTranhChap == "DangTranhChap");

            if (phuPhiTranhChap)
            {
                return Result<DoiSoatResponse>.Loi("PHI_DANG_TRANH_CHAP", "Không thể chốt đối soát khi đơn thuê còn phụ phí đang có tranh chấp chưa giải quyết.");
            }

            // 4. Tiến hành chốt đối soát
            doiSoat.TrangThai = "DaChot";
            doiSoat.ThoiDiemChot = DateTime.UtcNow;
            doiSoat.MaNguoiChot = maNhanVien;
            doiSoat.TenNguoiChotLucDoiSoat = nv?.HoTen ?? "Nhân viên vận hành";

            // 5. Chuyển trạng thái đơn thuê sang HoanTat
            var trangThaiTruoc = doiSoat.DonThue.TrangThai.ToString();
            doiSoat.DonThue.TrangThai = TrangThaiDonThue.HoanTat;
            doiSoat.DonThue.ThoiDiemHoanTat = DateTime.UtcNow;

            // 6. Ghi lịch sử chuyển trạng thái đơn
            _context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = doiSoat.MaDonThue,
                MaNguoiThucHien = actorId,
                TrangThaiTruoc = trangThaiTruoc,
                TrangThaiSau = TrangThaiDonThue.HoanTat.ToString(),
                ThoiDiem = DateTime.UtcNow,
                LyDo = $"Đối soát hoàn tất: cọc đối soát {doiSoat.TienCocDuocDoiSoat:N0}đ, phụ phí {doiSoat.TongPhuPhiDuocDuyet:N0}đ"
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi chốt đối soát: {ex.Message}");
        }
    }

    /// <summary>
    /// Lập phiếu đối soát điều chỉnh sau khi đơn đã chốt hoàn tất (tham chiếu đối soát gốc)
    /// </summary>
    public async Task<Result<DoiSoatResponse>> LapDoiSoatDieuChinhAsync(long doiSoatGocId, DieuChinhDoiSoatRequest dto, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        if (tk.VaiTro != "QuanTriVien")
            return Result<DoiSoatResponse>.Loi("KHONG_CO_QUYEN", "Chỉ quản trị viên mới được quyền lập đối soát điều chỉnh.");

        var maNhanVien = await LayMaNhanVienAsync(actorId);

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var doiSoatGoc = await _context.DoiSoatTienCocs
                .Include(d => d.DonThue)
                .Include(d => d.GiaoDichDoiSoats)
                .Include(d => d.HoanTiens)
                .FirstOrDefaultAsync(d => d.MaDoiSoat == doiSoatGocId);

            if (doiSoatGoc == null)
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy phiếu đối soát gốc.");

            if (doiSoatGoc.TrangThai != "DaChot")
                return Result<DoiSoatResponse>.Loi("DOI_SOAT_CHUA_CHOT", "Chỉ có thể lập điều chỉnh cho phiếu đối soát đã chốt hoàn tất.");

            // Lấy danh sách các khoản phụ phí điều chỉnh được yêu cầu
            var phuPhiDieuChinhs = await _context.PhuPhis
                .Where(p => dto.DanhSachMaPhuPhiDieuChinh.Contains(p.MaPhuPhi) 
                         && p.MaDonThue == doiSoatGoc.MaDonThue
                         && p.MaPhuPhiGoc != null
                         && p.TrangThaiDuyet == "Duyet")
                .ToListAsync();

            if (!phuPhiDieuChinhs.Any())
                return Result<DoiSoatResponse>.Loi("KHONG_CO_PHI_DIEU_CHINH", "Không tìm thấy khoản phụ phí điều chỉnh hợp lệ đã được phê duyệt.");

            // Tính toán số dư theo công thức Plan 7.0:
            // SoDu = CocGoc + TongThuBoSungDaThanhCong - TongHoanLienQuanDaThanhCong - TongPhiHieuLucSauDieuChinh
            decimal cocGoc = doiSoatGoc.TienCocDuocDoiSoat;
            
            decimal tongThuBoSung = await _context.ChiTietThanhToans
                .Include(ct => ct.ThanhToan)
                .Where(ct => ct.ThanhToan.MaDonThue == doiSoatGoc.MaDonThue 
                          && ct.MucDich == "ThuBoSung" 
                          && ct.ThanhToan.TrangThai == "ThanhCong")
                .SumAsync(ct => ct.SoTien);

            decimal tongHoanDaThanhCong = await _context.HoanTiens
                .Where(h => h.MaDoiSoat == doiSoatGoc.MaDoiSoat && h.TrangThai == "ThanhCong")
                .SumAsync(h => h.SoTien);

            decimal tongPhiSauDieuChinh = await _context.PhuPhis
                .Where(p => p.MaDonThue == doiSoatGoc.MaDonThue && p.TrangThaiDuyet == "Duyet")
                .SumAsync(p => p.SoTien);

            decimal soDu = cocGoc + tongThuBoSung - tongHoanDaThanhCong - tongPhiSauDieuChinh;

            decimal canHoanMoi = Math.Max(0, soDu);
            decimal canThuThemMoi = Math.Max(0, -soDu);

            var doiSoatDieuChinh = new DoiSoatTienCoc
            {
                MaDonThue = doiSoatGoc.MaDonThue,
                MaDoiSoatGoc = doiSoatGoc.MaDoiSoat,
                LoaiDoiSoat = "DieuChinh",
                MaNguoiLap = maNhanVien,
                TienCocDuocDoiSoat = 0, // Không phân bổ lại cọc đã gắn
                TongPhuPhiDuocDuyet = phuPhiDieuChinhs.Sum(p => p.SoTien),
                SoTienCanHoan = canHoanMoi,
                SoTienCanThuThem = canThuThemMoi,
                TrangThai = "ChoChot",
                ThoiDiemLap = DateTime.UtcNow,
                LyDoDieuChinh = dto.LyDo
            };

            _context.DoiSoatTienCocs.Add(doiSoatDieuChinh);
            await _context.SaveChangesAsync();

            // Gán MaDoiSoat cho các phụ phí điều chỉnh này
            foreach (var p in phuPhiDieuChinhs)
            {
                p.MaDoiSoat = doiSoatDieuChinh.MaDoiSoat;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoatDieuChinh));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<DoiSoatResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi lập đối soát điều chỉnh: {ex.Message}");
        }
    }

    /// <summary>
    /// Lấy thông tin đối soát theo mã đơn thuê
    /// </summary>
    public async Task<Result<DoiSoatResponse>> LayTheoDonAsync(long donId, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
        var don = await _context.DonThues.FirstOrDefaultAsync(d => d.MaDonThue == donId);
        if (don == null)
            return Result<DoiSoatResponse>.Loi("DON_KHONG_TIM_THAY", "Không tìm thấy đơn thuê.");

        if (tk.VaiTro == "KhachHang")
        {
            var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, actorId);
            if (don.MaKhachHang != maKhach)
                return Result<DoiSoatResponse>.Loi("KHONG_CO_QUYEN", "Khách hàng chỉ được xem đối soát của đơn mình.");
        }

        var doiSoat = await _context.DoiSoatTienCocs
            .Include(d => d.DonThue)
            .Include(d => d.PhuPhis)
            .Include(d => d.GiaoDichDoiSoats)
                .ThenInclude(g => g.ChiTietThanhToan)
                    .ThenInclude(ct => ct.ThanhToan)
            .Include(d => d.HoanTiens)
            .Include(d => d.NguoiLap)
            .Include(d => d.NguoiChot)
            .Where(d => d.MaDonThue == donId)
            .OrderByDescending(d => d.ThoiDiemLap)
            .FirstOrDefaultAsync();

        if (doiSoat == null)
            return Result<DoiSoatResponse>.Loi("CHUA_CO_DOI_SOAT", "Đơn thuê chưa có phiếu đối soát nào.");

        return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));
    }

    /// <summary>
    /// Lấy thông tin đối soát theo ID
    /// </summary>
    public async Task<Result<DoiSoatResponse>> LayTheoIdAsync(long id, long actorId)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);

        var doiSoat = await _context.DoiSoatTienCocs
            .Include(d => d.DonThue)
            .Include(d => d.PhuPhis)
            .Include(d => d.GiaoDichDoiSoats)
                .ThenInclude(g => g.ChiTietThanhToan)
                    .ThenInclude(ct => ct.ThanhToan)
            .Include(d => d.HoanTiens)
            .Include(d => d.NguoiLap)
            .Include(d => d.NguoiChot)
            .FirstOrDefaultAsync(d => d.MaDoiSoat == id);

        if (doiSoat == null)
            return Result<DoiSoatResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy phiếu đối soát.");

        if (tk.VaiTro == "KhachHang")
        {
            var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, actorId);
            if (doiSoat.DonThue.MaKhachHang != maKhach)
                return Result<DoiSoatResponse>.Loi("KHONG_CO_QUYEN", "Khách hàng chỉ được xem đối soát của đơn mình.");
        }

        return Result<DoiSoatResponse>.Ok(await ChuyenSangResponseAsync(doiSoat));
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

    private static string TinhDauVanTay(long donId, decimal coc, decimal phi, decimal canHoan, decimal canThu)
    {
        var input = $"{donId}_{coc}_{phi}_{canHoan}_{canThu}";
        using var md5 = MD5.Create();
        var hash = md5.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hash);
    }

    private async Task<DoiSoatResponse> ChuyenSangResponseAsync(DoiSoatTienCoc d)
    {
        var daHoan = d.HoanTiens.Where(h => h.TrangThai == "ThanhCong").Sum(h => h.SoTien);
        var hoanPending = d.HoanTiens.Where(h => h.TrangThai == "ChoXuLy").Sum(h => h.SoTien);

        var daThuThem = d.GiaoDichDoiSoats
            .Select(g => g.ChiTietThanhToan)
            .Where(ct => ct != null && ct.MucDich == "ThuBoSung" && ct.ThanhToan != null && ct.ThanhToan.TrangThai == "ThanhCong")
            .Sum(ct => ct.SoTien);

        var thuThemPending = await _context.ThanhToans
            .Where(t => t.MaDonThue == d.MaDonThue && t.TrangThai == "ChoThanhToan" && t.GhiChu != null && t.GhiChu.Contains(d.MaDoiSoat.ToString()))
            .SumAsync(t => t.TongSoTien);

        decimal conChuaLapYeuCau = 0;
        bool coTheChot = false;

        if (d.SoTienCanHoan > 0)
        {
            conChuaLapYeuCau = Math.Max(0, d.SoTienCanHoan - daHoan - hoanPending);
            coTheChot = daHoan >= d.SoTienCanHoan;
        }
        else if (d.SoTienCanThuThem > 0)
        {
            conChuaLapYeuCau = Math.Max(0, d.SoTienCanThuThem - daThuThem - thuThemPending);
            coTheChot = daThuThem >= d.SoTienCanThuThem;
        }
        else
        {
            coTheChot = true;
        }

        var nguonCoc = d.GiaoDichDoiSoats
            .Select(g => g.ChiTietThanhToan)
            .Where(ct => ct != null && ct.MucDich == "TienCoc")
            .Select(ct => new NguonCocDto
            {
                MaChiTietThanhToan = ct.MaChiTietThanhToan,
                MaThanhToan = ct.MaThanhToan,
                MaYeuCau = ct.ThanhToan?.MaYeuCau ?? string.Empty,
                SoTien = ct.SoTien,
                PhuongThuc = ct.ThanhToan?.PhuongThuc ?? string.Empty,
                ThoiDiem = ct.ThanhToan?.ThoiDiemThanhCong ?? ct.ThanhToan?.ThoiDiemTao ?? DateTime.UtcNow
            })
            .ToList();

        var danhSachPhuPhi = d.PhuPhis
            .Select(p => new PhuPhiDoiSoatDto
            {
                MaPhuPhi = p.MaPhuPhi,
                MaChiTietBanGiao = p.MaChiTietBanGiao,
                LoaiPhi = p.LoaiPhi,
                SoTien = p.SoTien,
                LyDo = p.LyDo,
                TrangThaiDuyet = p.TrangThaiDuyet,
                TrangThaiTranhChap = p.TrangThaiTranhChap
            })
            .ToList();

        var giaoDichThuThem = d.GiaoDichDoiSoats
            .Select(g => g.ChiTietThanhToan)
            .Where(ct => ct != null && ct.MucDich == "ThuBoSung")
            .Select(ct => new GiaoDichThuDoiSoatDto
            {
                MaChiTietThanhToan = ct.MaChiTietThanhToan,
                MaThanhToan = ct.MaThanhToan,
                MaYeuCau = ct.ThanhToan?.MaYeuCau ?? string.Empty,
                SoTien = ct.SoTien,
                TrangThai = ct.ThanhToan?.TrangThai ?? string.Empty,
                ThoiDiem = ct.ThanhToan?.ThoiDiemThanhCong ?? ct.ThanhToan?.ThoiDiemTao ?? DateTime.UtcNow
            })
            .ToList();

        var giaoDichHoan = d.HoanTiens
            .Select(h => new GiaoDichHoanDoiSoatDto
            {
                MaHoanTien = h.MaHoanTien,
                MaChiTietThanhToanGoc = h.MaChiTietThanhToanGoc,
                MaYeuCau = h.MaYeuCau,
                SoTien = h.SoTien,
                TrangThai = h.TrangThai,
                ThoiDiemYeuCau = h.ThoiDiemYeuCau,
                ThoiDiemThanhCong = h.ThoiDiemThanhCong
            })
            .ToList();

        return new DoiSoatResponse
        {
            MaDoiSoat = d.MaDoiSoat,
            MaDonThue = d.MaDonThue,
            MaDonHienThi = d.DonThue?.MaDonHienThi,
            MaDoiSoatGoc = d.MaDoiSoatGoc,
            LoaiDoiSoat = d.LoaiDoiSoat,
            TrangThai = d.TrangThai,
            TienCocDuocDoiSoat = d.TienCocDuocDoiSoat,
            TongPhuPhiDuocDuyet = d.TongPhuPhiDuocDuyet,
            CanHoan = d.SoTienCanHoan,
            CanThuThem = d.SoTienCanThuThem,
            DaHoanThanhCong = daHoan,
            HoanDangCho = hoanPending,
            DaThuThemThanhCong = daThuThem,
            ThuThemDangCho = thuThemPending,
            ConChuaLapYeuCau = conChuaLapYeuCau,
            CoTheChot = coTheChot,
            MaNguoiLap = d.MaNguoiLap,
            TenNguoiLap = d.NguoiLap?.HoTen,
            MaNguoiChot = d.MaNguoiChot,
            TenNguoiChot = d.TenNguoiChotLucDoiSoat ?? d.NguoiChot?.HoTen,
            ThoiDiemLap = d.ThoiDiemLap,
            ThoiDiemChot = d.ThoiDiemChot,
            LyDoDieuChinh = d.LyDoDieuChinh,
            NguonCoc = nguonCoc,
            DanhSachPhuPhi = danhSachPhuPhi,
            GiaoDichThuThem = giaoDichThuThem,
            GiaoDichHoan = giaoDichHoan
        };
    }
}
