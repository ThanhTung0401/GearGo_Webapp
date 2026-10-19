using System.Data;
using System.Text.Json;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.VongDoiThietBi;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class VongDoiThietBiService : IVongDoiThietBiService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService _khaDungService;
    private readonly ILogger<VongDoiThietBiService> _logger;

    public VongDoiThietBiService(
        ApplicationDbContext context,
        IKhaDungService khaDungService,
        ILogger<VongDoiThietBiService> logger)
    {
        _context = context;
        _khaDungService = khaDungService;
        _logger = logger;
    }

    public async Task<Result<HoSoVongDoiResponse>> LayHoSoVongDoiAsync(long thietBiId, bool laAdmin)
    {
        var thietBi = await _context.ThietBis
            .AsNoTracking()
            .Include(tb => tb.SanPhamHienTai)
            .Include(tb => tb.ChiTietPhieuNhap)
                .ThenInclude(ct => ct.SanPham)
            .FirstOrDefaultAsync(tb => tb.MaThietBi == thietBiId);

        if (thietBi == null)
            return Result<HoSoVongDoiResponse>.Loi("THIET_BI_NOT_FOUND", "Không tìm thấy thiết bị.");

        var baoTris = await _context.PhieuBaoTris
            .AsNoTracking()
            .Where(p => p.MaThietBi == thietBiId)
            .OrderByDescending(p => p.MaPhieuBaoTri)
            .Select(p => new TomTatBaoTriDto
            {
                MaPhieuBaoTri = p.MaPhieuBaoTri,
                LoaiXuLy = p.LoaiXuLy,
                MoTaLoi = p.MoTaLoi,
                TrangThai = p.TrangThai,
                NgayBatDau = p.NgayBatDau,
                NgayHoanThanhThucTe = p.NgayHoanThanhThucTe
            })
            .ToListAsync();

        var dieuChinhs = await _context.ChiTietDieuChinhKhos
            .AsNoTracking()
            .Include(ct => ct.PhieuDieuChinhKho)
            .Where(ct => ct.MaThietBi == thietBiId)
            .OrderByDescending(ct => ct.MaPhieuDieuChinh)
            .Select(ct => new TomTatDieuChinhDto
            {
                MaPhieuDieuChinh = ct.MaPhieuDieuChinh,
                LoaiDieuChinh = ct.PhieuDieuChinhKho.LoaiDieuChinh,
                TrangThai = ct.PhieuDieuChinhKho.TrangThai,
                LyDo = ct.PhieuDieuChinhKho.LyDo,
                ThoiDiemLap = ct.PhieuDieuChinhKho.ThoiDiemLap,
                ThoiDiemApDung = ct.PhieuDieuChinhKho.ThoiDiemApDung
            })
            .ToListAsync();

        var lichSus = await _context.LichSuTinhTrangThietBis
            .AsNoTracking()
            .Where(ls => ls.MaThietBi == thietBiId)
            .OrderByDescending(ls => ls.ThoiDiem)
            .Select(ls => new TomTatTinhTrangDto
            {
                MaLichSu = ls.MaLichSuThietBi,
                TrangThaiTruoc = ls.TrangThaiTruoc,
                TrangThaiSau = ls.TrangThaiSau,
                TinhTrangTruoc = ls.TinhTrangTruoc,
                TinhTrangSau = ls.TinhTrangSau,
                ThoiDiem = ls.ThoiDiem,
                LyDo = ls.LyDo
            })
            .ToListAsync();

        return Result<HoSoVongDoiResponse>.Ok(new HoSoVongDoiResponse
        {
            MaThietBi = thietBi.MaThietBi,
            MaThietBiHienThi = thietBi.MaThietBiHienThi,
            TrangThaiSuDung = thietBi.TrangThaiSuDung.ToString(),
            TinhTrang = thietBi.TinhTrang,
            NgayNhap = thietBi.NgayNhap,
            GiaNhap = laAdmin ? thietBi.GiaNhap : null,
            MaChiTietPhieuNhap = thietBi.MaChiTietPhieuNhap,
            MaSanPhamNguon = thietBi.ChiTietPhieuNhap?.MaSanPham ?? thietBi.MaSanPhamHienTai,
            TenSanPhamNguon = thietBi.ChiTietPhieuNhap?.SanPham?.TenSanPham ?? "",
            MaSanPhamHienTai = thietBi.MaSanPhamHienTai,
            TenSanPhamHienTai = thietBi.SanPhamHienTai?.TenSanPham ?? "",
            LichSuBaoTri = baoTris,
            LichSuDieuChinh = dieuChinhs,
            LichSuTinhTrang = lichSus
        });
    }

    public async Task<Result<AnhHuongThayDoiResponse>> XemAnhHuongThayDoiAsync(long thietBiId, XemAnhHuongThayDoiRequest request)
    {
        var thietBi = await _context.ThietBis
            .AsNoTracking()
            .FirstOrDefaultAsync(tb => tb.MaThietBi == thietBiId);

        if (thietBi == null)
            return Result<AnhHuongThayDoiResponse>.Loi(KietDomainConstants.ErrorCodes.ThietBiNotFound, "Không tìm thấy thiết bị.");

        if (request.LoaiThayDoi == KietDomainConstants.VongDoiConfig.LoaiGiangCap)
        {
            if (!request.MaSanPhamDich.HasValue)
                return Result<AnhHuongThayDoiResponse>.Loi(KietDomainConstants.ErrorCodes.SanPhamDichKhongPhuHop, "Phải chọn sản phẩm đích khi giáng cấp.");

            var spDich = await _context.SanPhams.FirstOrDefaultAsync(s => s.MaSanPham == request.MaSanPhamDich.Value);
            if (spDich == null || spDich.TrangThaiKinhDoanh != TrangThaiKinhDoanh.DangKinhDoanh || spDich.MaSanPham == thietBi.MaSanPhamHienTai)
                return Result<AnhHuongThayDoiResponse>.Loi(KietDomainConstants.ErrorCodes.SanPhamDichKhongPhuHop, "Sản phẩm đích không tồn tại, không đang kinh doanh hoặc trùng sản phẩm hiện tại.");
        }

        var response = await PhanTichCamKetThietBiAsync(thietBi, request.LoaiThayDoi);
        return Result<AnhHuongThayDoiResponse>.Ok(response);
    }

    public async Task<Result<DeNghiVongDoiResponse>> DeNghiGiangCapAsync(long thietBiId, DeNghiGiangCapRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.LyDo))
            return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.DuLieuKhongHopLe, "Phải có lý do đề nghị giáng cấp.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var thietBi = await _context.ThietBis
                .FirstOrDefaultAsync(tb => tb.MaThietBi == thietBiId);

            if (thietBi == null)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.ThietBiNotFound, "Không tìm thấy thiết bị.");

            if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.ThietBiChuaThuHoi, "Thiết bị đang phục vụ khách hàng, chưa thể giáng cấp.");

            var spDich = await _context.SanPhams.FirstOrDefaultAsync(s => s.MaSanPham == request.MaSanPhamDich);
            if (spDich == null || spDich.TrangThaiKinhDoanh != TrangThaiKinhDoanh.DangKinhDoanh || spDich.MaSanPham == thietBi.MaSanPhamHienTai)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.SanPhamDichKhongPhuHop, "Sản phẩm đích không hợp lệ hoặc trùng sản phẩm hiện tại.");

            var anhHuong = await PhanTichCamKetThietBiAsync(thietBi, KietDomainConstants.VongDoiConfig.LoaiGiangCap);
            if (!anhHuong.CoTheDeNghi || anhHuong.CamKetCuThe.Count > 0 || anhHuong.ThieuSoLuongTheoLich.Count > 0)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.ThayDoiLamThieuCamKet,
                    $"Không thể giáng cấp do vướng cam kết đơn thuê: {string.Join("; ", anhHuong.VuongMac.Concat(anhHuong.ThieuSoLuongTheoLich))}");

            var nvResult = await _context.LayNhanVienHopLeAsync(actorId);
            if (!nvResult.ThanhCong)
                return Result<DeNghiVongDoiResponse>.Loi(nvResult.MaLoi!, "Không tìm thấy hồ sơ nhân viên đề nghị.");
            var nhanVien = nvResult.DuLieu!;

            var phieu = new PhieuDieuChinhKho
            {
                MaNguoiLap = nhanVien.MaNhanVien,
                TenNguoiLapLucLap = nhanVien.HoTen,
                LoaiDieuChinh = KietDomainConstants.VongDoiConfig.LoaiGiangCap,
                LyDo = request.LyDo,
                BangChung = request.BangChung,
                ThoiDiemLap = DateTime.UtcNow,
                TrangThai = KietDomainConstants.PhieuStatus.ChoDuyet
            };

            _context.PhieuDieuChinhKhos.Add(phieu);

            var chiTiet = new ChiTietDieuChinhKho
            {
                PhieuDieuChinhKho = phieu,
                MaThietBi = thietBi.MaThietBi,
                MaChiTietPhieuNhap = thietBi.MaChiTietPhieuNhap,
                GiaTriTruoc = JsonSerializer.Serialize(new
                {
                    thietBi.MaSanPhamHienTai,
                    thietBi.TinhTrang,
                    TrangThaiSuDung = thietBi.TrangThaiSuDung.ToString(),
                    thietBi.MaChiTietPhieuNhap
                }),
                GiaTriSau = JsonSerializer.Serialize(new
                {
                    MaSanPhamHienTai = request.MaSanPhamDich,
                    TinhTrang = request.TinhTrang,
                    TrangThaiSuDung = thietBi.TrangThaiSuDung.ToString(),
                    thietBi.MaChiTietPhieuNhap
                }),
                GhiChu = $"Đề nghị giáng cấp từ SP #{thietBi.MaSanPhamHienTai} sang SP #{request.MaSanPhamDich}"
            };

            _context.ChiTietDieuChinhKhos.Add(chiTiet);
            await _context.SaveChangesAsync();

            return Result<DeNghiVongDoiResponse>.Ok(new DeNghiVongDoiResponse
            {
                MaPhieuDieuChinh = phieu.MaPhieuDieuChinh,
                MaThietBi = thietBi.MaThietBi,
                LoaiDieuChinh = phieu.LoaiDieuChinh,
                TrangThai = phieu.TrangThai,
                LyDo = phieu.LyDo,
                ThoiDiemLap = phieu.ThoiDiemLap
            });
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<DeNghiVongDoiResponse>> DeNghiNgungSuDungAsync(long thietBiId, DeNghiNgungSuDungRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.LyDo))
            return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.DuLieuKhongHopLe, "Phải có lý do đề nghị ngừng sử dụng.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var thietBi = await _context.ThietBis
                .FirstOrDefaultAsync(tb => tb.MaThietBi == thietBiId);

            if (thietBi == null)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.ThietBiNotFound, "Không tìm thấy thiết bị.");

            if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.ThietBiChuaThuHoi, "Thiết bị đang phục vụ khách hàng, không được ngừng sử dụng.");

            var anhHuong = await PhanTichCamKetThietBiAsync(thietBi, KietDomainConstants.VongDoiConfig.LoaiNgungSuDung);
            if (!anhHuong.CoTheDeNghi || anhHuong.CamKetCuThe.Count > 0 || anhHuong.ThieuSoLuongTheoLich.Count > 0)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.ThayDoiLamThieuCamKet,
                    $"Không thể ngừng sử dụng: {string.Join("; ", anhHuong.VuongMac.Concat(anhHuong.ThieuSoLuongTheoLich))}");

            var nvResult = await _context.LayNhanVienHopLeAsync(actorId);
            if (!nvResult.ThanhCong)
                return Result<DeNghiVongDoiResponse>.Loi(nvResult.MaLoi!, "Không tìm thấy hồ sơ nhân viên đề nghị.");
            var nhanVien = nvResult.DuLieu!;

            var phieu = new PhieuDieuChinhKho
            {
                MaNguoiLap = nhanVien.MaNhanVien,
                TenNguoiLapLucLap = nhanVien.HoTen,
                LoaiDieuChinh = KietDomainConstants.VongDoiConfig.LoaiNgungSuDung,
                LyDo = request.LyDo,
                BangChung = request.BangChung,
                ThoiDiemLap = DateTime.UtcNow,
                TrangThai = KietDomainConstants.PhieuStatus.ChoDuyet
            };

            _context.PhieuDieuChinhKhos.Add(phieu);

            var chiTiet = new ChiTietDieuChinhKho
            {
                PhieuDieuChinhKho = phieu,
                MaThietBi = thietBi.MaThietBi,
                MaChiTietPhieuNhap = thietBi.MaChiTietPhieuNhap,
                GiaTriTruoc = JsonSerializer.Serialize(new
                {
                    thietBi.MaSanPhamHienTai,
                    thietBi.TinhTrang,
                    TrangThaiSuDung = thietBi.TrangThaiSuDung.ToString()
                }),
                GiaTriSau = JsonSerializer.Serialize(new
                {
                    thietBi.MaSanPhamHienTai,
                    TinhTrang = request.KetLuanKiemTra ?? thietBi.TinhTrang,
                    TrangThaiSuDung = TrangThaiThietBi.NgungSuDung.ToString()
                }),
                GhiChu = $"Đề nghị ngừng sử dụng thiết bị #{thietBi.MaThietBiHienThi}: {request.LyDo}"
            };

            _context.ChiTietDieuChinhKhos.Add(chiTiet);
            await _context.SaveChangesAsync();

            return Result<DeNghiVongDoiResponse>.Ok(new DeNghiVongDoiResponse
            {
                MaPhieuDieuChinh = phieu.MaPhieuDieuChinh,
                MaThietBi = thietBi.MaThietBi,
                LoaiDieuChinh = phieu.LoaiDieuChinh,
                TrangThai = phieu.TrangThai,
                LyDo = phieu.LyDo,
                ThoiDiemLap = phieu.ThoiDiemLap
            });
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<DeNghiVongDoiResponse>> DuyetDeNghiVongDoiAsync(long maPhieuDieuChinh, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _context.PhieuDieuChinhKhos
                .Include(p => p.ChiTietDieuChinhKhos)
                .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == maPhieuDieuChinh);

            if (phieu == null)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.PhieuNotFound, "Không tìm thấy phiếu đề nghị điều chỉnh.");

            var chiTiet = phieu.ChiTietDieuChinhKhos.FirstOrDefault();
            if (chiTiet == null || !chiTiet.MaThietBi.HasValue)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.DuLieuKhongHopLe, "Phiếu điều chỉnh không gắn thiết bị hợp lệ.");

            if (phieu.TrangThai == KietDomainConstants.PhieuStatus.DaApDung)
            {
                return Result<DeNghiVongDoiResponse>.Ok(new DeNghiVongDoiResponse
                {
                    MaPhieuDieuChinh = phieu.MaPhieuDieuChinh,
                    MaThietBi = chiTiet.MaThietBi.Value,
                    LoaiDieuChinh = phieu.LoaiDieuChinh ?? "",
                    TrangThai = phieu.TrangThai,
                    LyDo = phieu.LyDo,
                    ThoiDiemLap = phieu.ThoiDiemLap,
                    ThoiDiemApDung = phieu.ThoiDiemApDung
                });
            }

            var thietBi = await _context.ThietBis.FirstOrDefaultAsync(tb => tb.MaThietBi == chiTiet.MaThietBi.Value);
            if (thietBi == null)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.ThietBiNotFound, "Không tìm thấy thiết bị.");

            if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.ThietBiChuaThuHoi, "Thiết bị đang phục vụ khách, không thể duyệt áp dụng.");

            // Kiểm tra lại cam kết tại thời điểm duyệt (W5-T3-A05)
            var anhHuong = await PhanTichCamKetThietBiAsync(thietBi, phieu.LoaiDieuChinh ?? KietDomainConstants.VongDoiConfig.LoaiGiangCap);
            if (!anhHuong.CoTheApDungHienTai || anhHuong.CamKetCuThe.Count > 0 || anhHuong.ThieuSoLuongTheoLich.Count > 0)
                return Result<DeNghiVongDoiResponse>.Loi(KietDomainConstants.ErrorCodes.ThayDoiLamThieuCamKet,
                    $"Không thể duyệt áp dụng do phát sinh thiếu cam kết: {string.Join("; ", anhHuong.VuongMac.Concat(anhHuong.ThieuSoLuongTheoLich))}");

            var nvResult = await _context.LayNhanVienHopLeAsync(actorId);
            if (!nvResult.ThanhCong)
                return Result<DeNghiVongDoiResponse>.Loi(nvResult.MaLoi!, "Không tìm thấy hồ sơ quản trị viên duyệt.");
            var nhanVien = nvResult.DuLieu!;

            var trangThaiCu = thietBi.TrangThaiSuDung;
            var tinhTrangCu = thietBi.TinhTrang;

            if (phieu.LoaiDieuChinh == KietDomainConstants.VongDoiConfig.LoaiGiangCap && !string.IsNullOrWhiteSpace(chiTiet.GiaTriSau))
            {
                using var doc = JsonDocument.Parse(chiTiet.GiaTriSau);
                if (doc.RootElement.TryGetProperty("MaSanPhamHienTai", out var spProp))
                {
                    thietBi.MaSanPhamHienTai = spProp.GetInt64();
                }
                if (doc.RootElement.TryGetProperty("TinhTrang", out var ttProp) && ttProp.ValueKind == JsonValueKind.String)
                {
                    thietBi.TinhTrang = ttProp.GetString();
                }
            }
            else if (phieu.LoaiDieuChinh == KietDomainConstants.VongDoiConfig.LoaiNgungSuDung)
            {
                thietBi.TrangThaiSuDung = TrangThaiThietBi.NgungSuDung;
            }

            phieu.MaNguoiDuyet = nhanVien.MaNhanVien;
            phieu.TenNguoiDuyetLucDuyet = nhanVien.HoTen;
            phieu.ThoiDiemDuyet = DateTime.UtcNow;
            phieu.ThoiDiemApDung = DateTime.UtcNow;
            phieu.TrangThai = KietDomainConstants.PhieuStatus.DaApDung;

            AuditLogHelper.GhiLichSuThietBi(
                _context,
                thietBi.MaThietBi,
                actorId,
                trangThaiCu.ToString(),
                thietBi.TrangThaiSuDung.ToString(),
                tinhTrangCu,
                thietBi.TinhTrang,
                $"Duyệt áp dụng vòng đời ({phieu.LoaiDieuChinh}) theo phiếu #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");

            await _context.SaveChangesAsync();

            return Result<DeNghiVongDoiResponse>.Ok(new DeNghiVongDoiResponse
            {
                MaPhieuDieuChinh = phieu.MaPhieuDieuChinh,
                MaThietBi = thietBi.MaThietBi,
                LoaiDieuChinh = phieu.LoaiDieuChinh ?? "",
                TrangThai = phieu.TrangThai,
                LyDo = phieu.LyDo,
                ThoiDiemLap = phieu.ThoiDiemLap,
                ThoiDiemApDung = phieu.ThoiDiemApDung
            });
        }, _logger, IsolationLevel.Serializable);
    }

    private async Task<AnhHuongThayDoiResponse> PhanTichCamKetThietBiAsync(ThietBi thietBi, string loaiThayDoi)
    {
        var res = new AnhHuongThayDoiResponse
        {
            CoTheDeNghi = true,
            CoTheApDungHienTai = true
        };

        if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
        {
            res.CoTheDeNghi = false;
            res.CoTheApDungHienTai = false;
            res.VuongMac.Add("Thiết bị đang được khách thuê (chưa thu hồi).");
        }

        if (loaiThayDoi == KietDomainConstants.VongDoiConfig.LoaiNgungSuDung)
        {
            bool coBaoTriMo = await _context.PhieuBaoTris.AnyAsync(p =>
                p.MaThietBi == thietBi.MaThietBi &&
                (p.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiChoXuLy ||
                 p.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiDangXuLy ||
                 p.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiChoKiemTra));

            if (coBaoTriMo)
            {
                res.CoTheDeNghi = false;
                res.CoTheApDungHienTai = false;
                res.VuongMac.Add("Thiết bị đang có phiếu bảo trì chưa kết luận, phải kết thúc phiếu bảo trì trước khi ngừng sử dụng.");
            }
        }

        // 1. Kiểm tra các đơn đã phân công đích danh thiết bị này
        var camKetCuThe = await _context.PhanCongThietBis
            .Include(pc => pc.ChiTietDon)
                .ThenInclude(ct => ct.DonThue)
            .Where(pc => pc.MaThietBi == thietBi.MaThietBi &&
                         pc.TrangThai == KietDomainConstants.PhieuStatus.DaPhanCong &&
                         (pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan))
            .Select(pc => pc.ChiTietDon.MaDonThue)
            .Distinct()
            .ToListAsync();

        if (camKetCuThe.Count > 0)
        {
            res.CamKetCuThe.AddRange(camKetCuThe);
            res.CoTheApDungHienTai = false;
            res.VuongMac.Add($"Thiết bị đã được gán cho đơn thuê: {string.Join(", ", camKetCuThe)}");
        }

        // 2. Kiểm tra cam kết theo số lượng sản phẩm nguồn cho các đơn tương lai (W5-T3-A03)
        // Chỉ cần kiểm tra nếu thiết bị hiện tại đang là nguồn sẵn sàng (SanSang)
        if (thietBi.TrangThaiSuDung == TrangThaiThietBi.SanSang)
        {
            var donTuongLai = await _context.ChiTietDonThues
                .Include(ct => ct.DonThue)
                .Where(ct => ct.MaSanPham == thietBi.MaSanPhamHienTai &&
                             (ct.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan ||
                              ct.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                              ct.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                              ct.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan))
                .Select(ct => new
                {
                    ct.MaDonThue,
                    ct.DonThue.GioNhanDuKien,
                    ct.DonThue.GioTraDuKien
                })
                .Distinct()
                .ToListAsync();

            foreach (var don in donTuongLai)
            {
                var khaDungMap = await _khaDungService.LayKhaDungNhieuAsync(
                    new List<long> { thietBi.MaSanPhamHienTai },
                    don.GioNhanDuKien,
                    don.GioTraDuKien);

                int khaDungConLai = khaDungMap.TryGetValue(thietBi.MaSanPhamHienTai, out var sl) ? sl : 0;
                // Nếu bỏ đi 1 thiết bị này mà khaDungConLai < 1 (tức là hiện tại khaDungConLai == 0, đã chạm trần cam kết)
                if (khaDungConLai < 1)
                {
                    res.CoTheApDungHienTai = false;
                    res.ThieuSoLuongTheoLich.Add(
                        $"Đơn #{don.MaDonThue} ({don.GioNhanDuKien:yyyy-MM-dd} -> {don.GioTraDuKien:yyyy-MM-dd}) sẽ thiếu thiết bị nếu giảm nguồn sản phẩm #{thietBi.MaSanPhamHienTai}.");
                }
            }
        }

        return res;
    }
}
