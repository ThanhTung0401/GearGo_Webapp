using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ thanh toán, thu bổ sung đối soát và đối chiếu ngoại lệ (W4-T5, W4-T8 - Minh Tú)
/// </summary>
public class ThanhToanService : IThanhToanService
{
    private readonly ApplicationDbContext _context;
    private readonly IHoanTienService? _hoanTienService;
    private readonly IThongBaoService? _thongBaoService;
    private readonly IKhuyenMaiService? _khuyenMaiService;
    private readonly ILogger<ThanhToanService> _logger;

    public ThanhToanService(
        ApplicationDbContext context,
        ILogger<ThanhToanService>? logger = null,
        IHoanTienService? hoanTienService = null,
        IThongBaoService? thongBaoService = null,
        IKhuyenMaiService? khuyenMaiService = null)
    {
        _context = context;
        _logger = logger ?? Microsoft.Extensions.Logging.Abstractions.NullLogger<ThanhToanService>.Instance;
        _hoanTienService = hoanTienService;
        _thongBaoService = thongBaoService;
        _khuyenMaiService = khuyenMaiService;
    }

    /// <summary>
    /// Xác nhận thanh toán ban đầu của đơn thuê (Week 2)
    /// </summary>
    public async Task<Result<string>> XacNhanThanhToanAsync(XacNhanThanhToanRequest request)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            // 1. Idempotency ưu tiên trước: nếu giao dịch đối tác cho đơn này đã được ghi nhận ThanhCong -> trả kết quả cũ ngay
            if (!string.IsNullOrWhiteSpace(request.MaGiaoDichDoiTac))
            {
                var giaoDichCu = await _context.ThanhToans
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.MaDonThue == request.MaDonThue
                                              && t.MaGiaoDichCong == request.MaGiaoDichDoiTac
                                              && t.TrangThai == KietDomainConstants.PhieuStatus.ThanhCong);

                if (giaoDichCu != null)
                {
                    return Result<string>.Ok(giaoDichCu.MaYeuCau);
                }
            }

            // 2. Tìm đơn thuê kèm Giữ chỗ và Lượt sử dụng khuyến mãi
            var donThue = await _context.DonThues
                .Include(d => d.ChiTietDonThues)
                    .ThenInclude(c => c.GiuCho)
                .Include(d => d.LuotSuDungKhuyenMai)
                .FirstOrDefaultAsync(d => d.MaDonThue == request.MaDonThue);

            if (donThue == null)
                return Result<string>.Loi(KietDomainConstants.ErrorCodes.DonThueNotFound, "Không tìm thấy đơn thuê.");

            var now = DateTime.UtcNow;
            var maYeuCau = DisplayCodeHelper.SinhMaYeuCauThanhToan(now);

            var thanhToanMoi = new ThanhToan
            {
                MaDonThue = donThue.MaDonThue,
                MaYeuCau = maYeuCau,
                PhuongThuc = request.PhuongThucThanhToan,
                TongSoTien = request.SoTienDaTra,
                MaGiaoDichCong = request.MaGiaoDichDoiTac,
                TrangThai = KietDomainConstants.PhieuStatus.ThanhCong,
                ThoiDiemTao = now,
                ThoiDiemThanhCong = now
            };

            // 3. Tách 2 dòng ChiTietThanhToan (TienThue và TienCoc) theo đặc tả UC06
            decimal tienThue = Math.Max(0, donThue.TongTienThueTruocGiam - donThue.TongTienGiam);
            decimal tienCoc = Math.Max(0, donThue.TongTienCoc);

            thanhToanMoi.ChiTietThanhToans.Add(new ChiTietThanhToan
            {
                MucDich = KietDomainConstants.MucDichGiaoDich.TienThue,
                SoTien = tienThue,
                ThanhToan = thanhToanMoi
            });

            thanhToanMoi.ChiTietThanhToans.Add(new ChiTietThanhToan
            {
                MucDich = KietDomainConstants.MucDichGiaoDich.TienCoc,
                SoTien = tienCoc,
                ThanhToan = thanhToanMoi
            });

            // 4. Kiểm tra nhánh đối soát nâng cao (UC06 mục 10.11):
            // Nếu đơn đã chuyển sang HetHan / KhachHuy / CuaHangHuy hoặc đã DaXacNhan bởi giao dịch khác mà tiền vẫn thu ở gateway
            if (donThue.TrangThai != TrangThaiDonThue.ChoThanhToan)
            {
                thanhToanMoi.TrangThaiDoiChieu = KietDomainConstants.PhieuStatus.CanDoiSoat;
                thanhToanMoi.GhiChu = $"Giao dịch thu tiền khi đơn đang ở trạng thái {donThue.TrangThai} — cần đối soát/hoàn tiền.";
                _context.ThanhToans.Add(thanhToanMoi);

                _logger.LogWarning(
                    "Phát sinh giao dịch cần đối soát #{MaYeuCau} cho đơn #{MaDonThue} (Trạng thái đơn: {TrangThai}).",
                    maYeuCau, donThue.MaDonThue, donThue.TrangThai);

                return Result<string>.Loi("TRANG_THAI_KHONG_HOP_LE", $"Đơn hàng không ở trạng thái chờ thanh toán ({donThue.TrangThai}).");
            }

            // 5. Luồng chuẩn: Đơn đang ChoThanhToan -> Xác nhận đơn + Giữ chỗ + Khuyến mãi + Lịch sử
            _context.ThanhToans.Add(thanhToanMoi);
            donThue.XacNhanThanhToan();

            if (donThue.LuotSuDungKhuyenMai != null && donThue.LuotSuDungKhuyenMai.TrangThai == KietDomainConstants.PhieuStatus.DangGiu)
            {
                donThue.LuotSuDungKhuyenMai.TrangThai = KietDomainConstants.PhieuStatus.DaSuDung;
                donThue.LuotSuDungKhuyenMai.ThoiDiemSuDung = now;
            }

            // 5.1. Xác nhận sử dụng lượt khuyến mãi nếu đơn có mã (W6-T3)
            if (_khuyenMaiService != null)
            {
                await _khuyenMaiService.XacNhanDaSuDungAsync(donThue.MaDonThue);
            }

            AuditLogHelper.GhiLichSuDon(
                _context,
                donThue.MaDonThue,
                null,
                TrangThaiDonThue.ChoThanhToan.ToString(),
                TrangThaiDonThue.DaXacNhan.ToString(),
                $"Khách hàng đã thanh toán qua {request.PhuongThucThanhToan}",
                now);

            return Result<string>.Ok(thanhToanMoi.MaYeuCau);
        }, _logger, IsolationLevel.Serializable);
    }

    /// <summary>
    /// Tạo yêu cầu thu bổ sung phụ phí đối soát (W4-T5)
    /// </summary>
    public async Task<Result<YeuCauThuResponse>> TaoThuBoSungAsync(TaoThuBoSungRequest request, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            // Kiểm tra bảng đối soát
            var doiSoat = await _context.DoiSoatTienCocs
                .Include(ds => ds.DonThue)
                .FirstOrDefaultAsync(ds => ds.MaDoiSoat == request.MaDoiSoat);

            if (doiSoat == null)
                return Result<YeuCauThuResponse>.Loi(KietDomainConstants.ErrorCodes.DoiSoatNotFound, "Không tìm thấy bảng đối soát.");

            if (doiSoat.SoTienCanThuThem <= 0)
                return Result<YeuCauThuResponse>.Loi(KietDomainConstants.ErrorCodes.KhongCoNghiaVuThuThem, "Bảng tính không thiếu hoặc chưa được xác nhận.");

            // Kiểm tra xem đã có giao dịch nào đang chờ hoặc đã thành công cho đối soát này chưa
            var existingThanhToan = await _context.ThanhToans
                .Include(t => t.ChiTietThanhToans)
                .FirstOrDefaultAsync(t => t.MaDonThue == doiSoat.MaDonThue
                                          && (t.TrangThai == KietDomainConstants.PhieuStatus.ChoThanhToan || t.TrangThai == KietDomainConstants.PhieuStatus.ThanhCong)
                                          && t.GhiChu != null
                                          && t.GhiChu.Contains($"DoiSoat_{request.MaDoiSoat}"));

            if (existingThanhToan != null)
            {
                var chiTietExist = existingThanhToan.ChiTietThanhToans.FirstOrDefault();
                return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
                {
                    MaThanhToan = existingThanhToan.MaThanhToan,
                    MaYeuCau = existingThanhToan.MaYeuCau,
                    SoTien = existingThanhToan.TongSoTien,
                    MucDich = chiTietExist?.MucDich ?? KietDomainConstants.MucDichGiaoDich.ThuBoSung,
                    TrangThai = existingThanhToan.TrangThai,
                    PaymentUrl = $"https://mock-gateway.geargo.vn/pay?id={existingThanhToan.MaYeuCau}",
                    CanDoiChieu = existingThanhToan.TrangThaiDoiChieu == KietDomainConstants.PhieuStatus.CanDoiChieu
                });
            }

            var now = DateTime.UtcNow;
            var maYeuCau = DisplayCodeHelper.SinhMaYeuCauThanhToan(now);

            var thanhToanMoi = new Models.Entities.ThanhToan
            {
                MaDonThue = doiSoat.MaDonThue,
                MaYeuCau = maYeuCau,
                PhuongThuc = string.IsNullOrEmpty(request.PhuongThucDuocHoTro) ? "VNPAY" : request.PhuongThucDuocHoTro,
                TongSoTien = doiSoat.SoTienCanThuThem,
                TrangThai = KietDomainConstants.PhieuStatus.ChoThanhToan,
                TrangThaiDoiChieu = "ChuaDoiChieu",
                ThoiDiemTao = now,
                GhiChu = $"ThuBoSung_DoiSoat_{request.MaDoiSoat}"
            };

            var chiTietThanhToan = new Models.Entities.ChiTietThanhToan
            {
                MucDich = KietDomainConstants.MucDichGiaoDich.ThuBoSung,
                SoTien = doiSoat.SoTienCanThuThem,
                ThanhToan = thanhToanMoi
            };

            thanhToanMoi.ChiTietThanhToans.Add(chiTietThanhToan);
            _context.ThanhToans.Add(thanhToanMoi);

            await _context.SaveChangesAsync();

            return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
            {
                MaThanhToan = thanhToanMoi.MaThanhToan,
                MaYeuCau = maYeuCau,
                SoTien = doiSoat.SoTienCanThuThem,
                MucDich = KietDomainConstants.MucDichGiaoDich.ThuBoSung,
                TrangThai = KietDomainConstants.PhieuStatus.ChoThanhToan,
                PaymentUrl = $"https://mock-gateway.geargo.vn/pay?id={maYeuCau}",
                CanDoiChieu = false
            });
        }, _logger);
    }

    /// <summary>
    /// Lấy trạng thái giao dịch thu theo mã yêu cầu
    /// </summary>
    public async Task<Result<YeuCauThuResponse>> LayTrangThaiGiaoDichAsync(string maYeuCau, long actorId)
    {
        var thanhToan = await _context.ThanhToans
            .Include(t => t.ChiTietThanhToans)
            .FirstOrDefaultAsync(t => t.MaYeuCau == maYeuCau);

        if (thanhToan == null)
            return Result<YeuCauThuResponse>.Loi(KietDomainConstants.ErrorCodes.GiaoDichNotFound, "Không tìm thấy giao dịch.");

        var chiTiet = thanhToan.ChiTietThanhToans.FirstOrDefault();

        return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
        {
            MaThanhToan = thanhToan.MaThanhToan,
            MaYeuCau = thanhToan.MaYeuCau,
            SoTien = thanhToan.TongSoTien,
            MucDich = chiTiet?.MucDich ?? "",
            TrangThai = thanhToan.TrangThai,
            PaymentUrl = thanhToan.TrangThai == KietDomainConstants.PhieuStatus.ChoThanhToan ? $"https://mock-gateway.geargo.vn/pay?id={thanhToan.MaYeuCau}" : null,
            CanDoiChieu = thanhToan.TrangThaiDoiChieu == KietDomainConstants.PhieuStatus.CanDoiChieu
                          || thanhToan.TrangThaiDoiChieu == KietDomainConstants.PhieuStatus.CanDoiSoat
        });
    }

    /// <summary>
    /// Xử lý callback webhook thu bổ sung và liên kết đối soát (W4-T5, W4-T8)
    /// </summary>
    public async Task<Result<YeuCauThuResponse>> XuLyCallbackThuBoSungAsync(XuLyCallbackRequest request)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var thanhToan = await _context.ThanhToans
                .Include(t => t.ChiTietThanhToans)
                .Include(t => t.DonThue)
                .FirstOrDefaultAsync(t => t.MaYeuCau == request.MaYeuCau);

            if (thanhToan == null)
                return Result<YeuCauThuResponse>.Loi("GIAO_DICH_NOT_FOUND", "Không tìm thấy giao dịch.");

            var chiTiet = thanhToan.ChiTietThanhToans.FirstOrDefault();

            // 1. Tính lũy đẳng (Idempotency): Nếu giao dịch đã ghi nhận thành công từ trước, trả kết quả cũ
            if (thanhToan.TrangThai == "ThanhCong")
            {
                await transaction.CommitAsync();
                return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
                {
                    MaThanhToan = thanhToan.MaThanhToan,
                    MaYeuCau = thanhToan.MaYeuCau,
                    SoTien = thanhToan.TongSoTien,
                    MucDich = chiTiet?.MucDich ?? "ThuBoSung",
                    TrangThai = thanhToan.TrangThai,
                    CanDoiChieu = thanhToan.TrangThaiDoiChieu == "CanDoiChieu"
                });
            }

            // 2. Ngoại lệ W4-T8: Kiểm tra nếu số tiền thanh toán từ cổng không khớp
            if (request.SoTien != thanhToan.TongSoTien)
            {
                thanhToan.TrangThaiDoiChieu = "CanDoiChieu";
                thanhToan.TrangThai = "ChuaRoKetQua";
                thanhToan.GhiChu += $" [Ngoại lệ W4-T8: Sai số tiền callback. Yêu cầu: {thanhToan.TongSoTien}, Thực nhận: {request.SoTien}]";
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Result<YeuCauThuResponse>.Loi("SO_TIEN_GATEWAY_KHONG_KHOP", "Số tiền gateway không khớp, đã chuyển sang trạng thái cần đối chiếu.");
            }

            // 3. Ngoại lệ W4-T8: Tiền tới khi đơn đã hết hạn hoặc đã bị hủy
            if (thanhToan.DonThue.TrangThai == TrangThaiDonThue.KhachHuy ||
                thanhToan.DonThue.TrangThai == TrangThaiDonThue.CuaHangHuy ||
                thanhToan.DonThue.TrangThai == TrangThaiDonThue.HetHan)
            {
                thanhToan.TrangThaiDoiChieu = "CanDoiChieu";
                thanhToan.TrangThai = "ChuaRoKetQua";
                thanhToan.ThoiDiemThanhCong = DateTime.UtcNow;
                thanhToan.MaGiaoDichCong = request.MaGiaoDichCong;
                thanhToan.GhiChu += " [Ngoại lệ W4-T8: Tiền về sau khi đơn đã hủy hoặc hết hạn. Cần hoàn tiền thừa.]";
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Result<YeuCauThuResponse>.Loi("TIEN_VE_SAU_HUY", "Đơn đã hủy/hết hạn, khoản tiền được ghi nhận và đưa vào danh sách đối chiếu hoàn tiền.");
            }

            // 4. Xử lý thất bại từ gateway
            if (request.TrangThai == "ThatBai")
            {
                thanhToan.TrangThai = "ThatBai";
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return Result<YeuCauThuResponse>.Loi("THANH_TOAN_THAT_BAI", "Giao dịch thanh toán thất bại từ cổng thanh toán.");
            }

            // 5. Cập nhật thành công
            thanhToan.TrangThai = "ThanhCong";
            thanhToan.ThoiDiemThanhCong = DateTime.UtcNow;
            thanhToan.MaGiaoDichCong = request.MaGiaoDichCong ?? $"GATEWAY_{DateTime.UtcNow.Ticks}";

            // 6. Liên kết đối soát qua GIAO_DICH_DOI_SOAT
            if (chiTiet != null && !string.IsNullOrEmpty(thanhToan.GhiChu))
            {
                var match = Regex.Match(thanhToan.GhiChu, @"DoiSoat_(\d+)");
                if (match.Success && long.TryParse(match.Groups[1].Value, out long maDoiSoat))
                {
                    var doiSoat = await _context.DoiSoatTienCocs.FindAsync(maDoiSoat);
                    if (doiSoat != null)
                    {
                        var daLienKet = await _context.GiaoDichDoiSoats
                            .AnyAsync(g => g.MaDoiSoat == maDoiSoat && g.MaChiTietThanhToan == chiTiet.MaChiTietThanhToan);

                        if (!daLienKet)
                        {
                            var lienKet = new GiaoDichDoiSoat
                            {
                                MaDoiSoat = maDoiSoat,
                                MaChiTietThanhToan = chiTiet.MaChiTietThanhToan
                            };
                            _context.GiaoDichDoiSoats.Add(lienKet);
                        }
                    }
                }
            }

            // 7. Gửi thông báo sự kiện
            if (_thongBaoService != null)
            {
                await _thongBaoService.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(
                    thanhToan.MaDonThue,
                    LoaiSuKienThongBao.ThanhToanBoSung,
                    MaSuKienThongBao.ThanhToanBoSung(thanhToan.MaThanhToan),
                    "Thanh toán thu bổ sung thành công",
                    $"Bạn đã thanh toán thành công số tiền thu bổ sung {thanhToan.TongSoTien:N0} đ cho đơn hàng #{thanhToan.MaDonThue}."
                ));
            }

            // Quan trọng: KHÔNG đổi trạng thái đơn thuê về DaXacNhan/DangThue
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
            {
                MaThanhToan = thanhToan.MaThanhToan,
                MaYeuCau = thanhToan.MaYeuCau,
                SoTien = thanhToan.TongSoTien,
                MucDich = chiTiet?.MucDich ?? "ThuBoSung",
                TrangThai = "ThanhCong",
                CanDoiChieu = false
            });
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<YeuCauThuResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi xử lý callback: {e.Message}");
        }
    }

    /// <summary>
    /// Lấy danh sách giao dịch cần đối chiếu ngoại lệ (W4-T8)
    /// </summary>
    public async Task<Result<List<GiaoDichCanDoiChieuResponse>>> LayDanhSachCanDoiChieuAsync(long actorId)
    {
        var list = await _context.ThanhToans
            .Where(t => t.TrangThaiDoiChieu == "CanDoiChieu" || t.TrangThai == "ChuaRoKetQua")
            .OrderByDescending(t => t.ThoiDiemTao)
            .Select(t => new GiaoDichCanDoiChieuResponse
            {
                MaThanhToan = t.MaThanhToan,
                MaYeuCau = t.MaYeuCau,
                MaDonThue = t.MaDonThue,
                TongSoTien = t.TongSoTien,
                PhuongThuc = t.PhuongThuc,
                TrangThai = t.TrangThai,
                TrangThaiDoiChieu = t.TrangThaiDoiChieu,
                LyDoCanDoiChieu = t.GhiChu,
                ThoiDiemTao = t.ThoiDiemTao
            })
            .ToListAsync();

        return Result<List<GiaoDichCanDoiChieuResponse>>.Ok(list);
    }

    /// <summary>
    /// Quản trị viên đối chiếu và xử lý giao dịch ngoại lệ, hoàn tiền thừa nếu có (W4-T8)
    /// </summary>
    public async Task<Result<string>> DoiChieuGiaoDichAsync(long maThanhToan, DoiChieuGiaoDichRequest request, long actorId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var thanhToan = await _context.ThanhToans
                .Include(t => t.ChiTietThanhToans)
                .Include(t => t.DonThue)
                .FirstOrDefaultAsync(t => t.MaThanhToan == maThanhToan);

            if (thanhToan == null)
                return Result<string>.Loi("GIAO_DICH_NOT_FOUND", "Không tìm thấy giao dịch.");

            var chiTiet = thanhToan.ChiTietThanhToans.FirstOrDefault();
            if (chiTiet == null)
            {
                chiTiet = new ChiTietThanhToan
                {
                    MaThanhToan = thanhToan.MaThanhToan,
                    MucDich = "ThuBoSung",
                    SoTien = thanhToan.TongSoTien
                };
                thanhToan.ChiTietThanhToans.Add(chiTiet);
                await _context.SaveChangesAsync();
            }

            var yeuCauHoanCanGui = new List<HoanTien>();

            if (request.KetLuan == "HopLe_HoanTienThua")
            {
                decimal soTienHoan = request.SoTienHoan ?? thanhToan.TongSoTien;
                if (soTienHoan <= 0)
                    return Result<string>.Loi("SO_TIEN_HOAN_KHONG_HOP_LE", "Số tiền hoàn phải lớn hơn 0.");

                if (_hoanTienService == null)
                    return Result<string>.Loi("SYS_ERROR", "Dịch vụ hoàn tiền chưa được cấu hình.");

                // Cập nhật trạng thái giao dịch thu thành ThanhCong để đủ điều kiện hợp lệ làm nguồn hoàn tiền
                thanhToan.TrangThai = TrangThaiThanhToan.ThanhCong;
                await _context.SaveChangesAsync();

                // Lập yêu cầu hoàn qua HoanTienService của Thanh Tùng (W4-T6)
                var yeuCau = await _hoanTienService.LapYeuCauHoanAsync(new LapHoanCommand(
                    thanhToan.MaDonThue,
                    LoaiHoanTien.HoanThuThua,
                    $"TT:{chiTiet.MaChiTietThanhToan}",
                    soTienHoan,
                    new[] { chiTiet.MaChiTietThanhToan },
                    null,
                    $"Đối chiếu xử lý hoàn tiền thừa giao dịch #{thanhToan.MaThanhToan}: {request.GhiChu}"
                ), actorId);

                yeuCauHoanCanGui.AddRange(yeuCau);

                thanhToan.TrangThaiDoiChieu = "DaDoiChieu";
                thanhToan.GhiChu += $" [Đã đối chiếu admin: Lập lệnh hoàn tiền {soTienHoan:N0} đ. Lý do: {request.GhiChu}]";
            }
            else if (request.KetLuan == "HopLe_XacNhan")
            {
                thanhToan.TrangThaiDoiChieu = "DaDoiChieu";
                thanhToan.TrangThai = "ThanhCong";
                thanhToan.GhiChu += $" [Đã đối chiếu admin: Xác nhận hợp lệ. Ghi chú: {request.GhiChu}]";
            }
            else if (request.KetLuan == "TuChoi")
            {
                thanhToan.TrangThaiDoiChieu = "DaDoiChieu";
                thanhToan.TrangThai = "ThatBai";
                thanhToan.GhiChu += $" [Đã đối chiếu admin: Từ chối giao dịch. Lý do: {request.GhiChu}]";
            }
            else
            {
                return Result<string>.Loi("KET_LUAN_KHONG_HOP_LE", "Kết luận đối chiếu không hợp lệ.");
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Gửi lệnh hoàn ra gateway nếu có
            if (yeuCauHoanCanGui.Any() && _hoanTienService != null)
            {
                await _hoanTienService.GuiYeuCauDaLapAsync(yeuCauHoanCanGui.Select(h => h.MaHoanTien), actorId);
            }

            return Result<string>.Ok($"Đối chiếu thành công giao dịch #{thanhToan.MaThanhToan} với kết luận '{request.KetLuan}'.");
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<string>.Loi("SYS_ERROR", $"Lỗi hệ thống khi đối chiếu giao dịch: {e.Message}");
        }
    }
}
