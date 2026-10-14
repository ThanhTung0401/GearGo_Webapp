using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuaHan;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ quản lý đơn quá hạn và phân tích khả dụng sau nhận trả (W4-T2 - Minh Tú)
/// </summary>
public class QuaHanService : IQuaHanService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService _khaDungService;
    private readonly IThongBaoService _thongBaoService;
    private readonly ILogger<QuaHanService> _logger;

    public QuaHanService(
        ApplicationDbContext context,
        IKhaDungService khaDungService,
        IThongBaoService thongBaoService,
        ILogger<QuaHanService> logger)
    {
        _context = context;
        _khaDungService = khaDungService;
        _thongBaoService = thongBaoService;
        _logger = logger;
    }

    /// <summary>
    /// Helper chung tính phí trễ dự kiến cho từng thiết bị bàn giao theo snapshot và chính sách
    /// </summary>
    public async Task<Result<TinhPhiTreDuKienResponse>> TinhPhiTreDuKienAsync(long maChiTietBanGiao, DateTime mocTinh)
    {
        var chiTiet = await _context.ChiTietBanGiaos
            .Include(c => c.PhanCongThietBi)
                .ThenInclude(p => p.ChiTietDon)
                    .ThenInclude(cd => cd.DonThue)
                        .ThenInclude(d => d.ChinhSach)
            .FirstOrDefaultAsync(c => c.MaChiTietBanGiao == maChiTietBanGiao);

        if (chiTiet == null)
            return Result<TinhPhiTreDuKienResponse>.Loi("CHI_TIET_BAN_GIAO_NOT_FOUND", "Không tìm thấy chi tiết bàn giao.");

        var donThue = chiTiet.PhanCongThietBi.ChiTietDon.DonThue;
        var chiTietDon = chiTiet.PhanCongThietBi.ChiTietDon;
        var chinhSach = donThue.ChinhSach;

        // Trích xuất hệ số trễ từ nội dung chính sách (mặc định 1.5)
        decimal heSoTre = 1.5m;
        if (!string.IsNullOrEmpty(chinhSach?.NoiDungChinhSach))
        {
            try
            {
                using var doc = JsonDocument.Parse(chinhSach.NoiDungChinhSach);
                if (doc.RootElement.TryGetProperty("heSoTre", out var heSoProp) && heSoProp.ValueKind == JsonValueKind.Number)
                {
                    heSoTre = heSoProp.GetDecimal();
                }
            }
            catch
            {
                // Bỏ qua nếu parse JSON lỗi, dùng mặc định 1.5
            }
        }

        // Tính khoảng trễ
        var gioTraDuKien = donThue.GioTraDuKien;
        var khoangTre = mocTinh - gioTraDuKien;

        int soNgayTre = 0;
        decimal soTienTre = 0;

        if (khoangTre.TotalHours > 0)
        {
            // Làm tròn lên theo ngày: ceil(giờ trễ / 24)
            soNgayTre = (int)Math.Ceiling(khoangTre.TotalHours / 24.0);
            soTienTre = soNgayTre * chiTietDon.DonGiaThueMoiNgay * heSoTre;
        }

        return Result<TinhPhiTreDuKienResponse>.Ok(new TinhPhiTreDuKienResponse
        {
            MaChiTietBanGiao = maChiTietBanGiao,
            DonGiaSnapshot = chiTietDon.DonGiaThueMoiNgay,
            HeSo = heSoTre,
            SoNgayTre = soNgayTre,
            SoTien = soTienTre,
            GioTraDuKien = gioTraDuKien,
            MocTinh = mocTinh
        });
    }

    /// <summary>
    /// Lấy danh sách các đơn quá hạn có phân trang và bộ lọc
    /// </summary>
    public async Task<Result<PagedResult<DonQuaHanResponse>>> LayDonQuaHanAsync(LocQuaHanRequest filter, long actorId)
    {
        var mocTinh = filter.DenThoiDiem ?? DateTime.UtcNow;

        // Lấy tất cả các đơn thuê đang thuê và đã vượt giờ trả dự kiến
        var query = _context.DonThues
            .Include(d => d.KhachHang)
                .ThenInclude(kh => kh.TaiKhoan)
            .Include(d => d.ChiTietDonThues)
            .Where(d => d.TrangThai == TrangThaiDonThue.DangThue && d.GioTraDuKien < mocTinh);

        if (filter.MaDon.HasValue)
            query = query.Where(d => d.MaDonThue == filter.MaDon.Value);

        if (filter.MaSanPham.HasValue)
            query = query.Where(d => d.ChiTietDonThues.Any(cd => cd.MaSanPham == filter.MaSanPham.Value));

        var donList = await query.ToListAsync();
        var donQuaHanList = new List<DonQuaHanResponse>();

        // Duyệt từng đơn để kiểm tra tình trạng các thiết bị đã bàn giao
        foreach (var don in donList)
        {
            // Lấy danh sách chi tiết bàn giao thuộc các phiếu bàn giao đã giao thành công
            var banGiaoList = await _context.ChiTietBanGiaos
                .Include(ctb => ctb.PhieuBanGiao)
                .Where(ctb => ctb.PhieuBanGiao.MaDonThue == don.MaDonThue && ctb.PhieuBanGiao.TrangThai == "DaGiao")
                .ToListAsync();

            if (!banGiaoList.Any())
                continue;

            var banGiaoIds = banGiaoList.Select(ctb => ctb.MaChiTietBanGiao).ToList();

            // Lấy các chi tiết bàn giao đã được kết luận trả/mất trong phiếu nhận trả đã chốt
            var settledCtbIds = await _context.ChiTietNhanTras
                .Where(ct => ct.PhieuNhanTra.MaDonThue == don.MaDonThue && 
                             ct.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot &&
                             (ct.ThoiDiemTraThucTe != null || ct.KetLuan == "MatThietBi" || ct.ThoiDiemDuyetMat != null))
                .Select(ct => ct.MaChiTietBanGiao)
                .Distinct()
                .ToListAsync();

            var unreturnedIds = banGiaoIds.Except(settledCtbIds).ToList();

            // Nếu tất cả thiết bị đều đã kết luận thì không còn quá hạn
            if (!unreturnedIds.Any())
                continue;

            int soNgayTreMax = 0;
            decimal tongPhiTreDuKien = 0;

            foreach (var ctbId in unreturnedIds)
            {
                var tinhPhi = await TinhPhiTreDuKienAsync(ctbId, mocTinh);
                if (tinhPhi.ThanhCong && tinhPhi.DuLieu != null)
                {
                    tongPhiTreDuKien += tinhPhi.DuLieu.SoTien;
                    if (tinhPhi.DuLieu.SoNgayTre > soNgayTreMax)
                        soNgayTreMax = tinhPhi.DuLieu.SoNgayTre;
                }
            }

            var phieuBanGiao = banGiaoList.FirstOrDefault()?.PhieuBanGiao;

            donQuaHanList.Add(new DonQuaHanResponse
            {
                MaDonThue = don.MaDonThue,
                MaDonHienThi = $"DH-{don.MaDonThue:D6}",
                TenKhachHang = don.KhachHang?.HoTen ?? "Khách hàng",
                SoDienThoai = don.KhachHang?.TaiKhoan?.SoDienThoai ?? "",
                GioNhanThucTe = phieuBanGiao?.ThoiDiemGiaoThucTe,
                GioTraDuKien = don.GioTraDuKien,
                SoThietBiChuaTra = unreturnedIds.Count,
                TongSoThietBi = banGiaoIds.Count,
                SoNgayTreMax = soNgayTreMax,
                TongPhiTreDuKien = tongPhiTreDuKien,
                LaTraMotPhan = settledCtbIds.Any() && unreturnedIds.Any()
            });
        }

        int tongSo = donQuaHanList.Count;
        var pagedItems = donQuaHanList
            .Skip((filter.Trang - 1) * filter.SoMoiTrang)
            .Take(filter.SoMoiTrang)
            .ToList();

        var pagedResult = new PagedResult<DonQuaHanResponse>
        {
            Items = pagedItems,
            TotalItems = tongSo,
            CurrentPage = filter.Trang,
            PageSize = filter.SoMoiTrang
        };

        return Result<PagedResult<DonQuaHanResponse>>.Ok(pagedResult);
    }

    /// <summary>
    /// Lấy chi tiết quá hạn và phí trễ dự kiến từng thiết bị của đơn thuê
    /// </summary>
    public async Task<Result<QuaHanChiTietResponse>> LayChiTietQuaHanAsync(long donId, long actorId)
    {
        var don = await _context.DonThues
            .Include(d => d.ChiTietDonThues)
            .FirstOrDefaultAsync(d => d.MaDonThue == donId);

        if (don == null)
            return Result<QuaHanChiTietResponse>.Loi("DON_NOT_FOUND", "Không tìm thấy đơn thuê.");

        var mocNow = DateTime.UtcNow;

        // Lấy toàn bộ chi tiết bàn giao của đơn
        var chiTietBanGiaos = await _context.ChiTietBanGiaos
            .Include(ctb => ctb.PhieuBanGiao)
            .Include(ctb => ctb.PhanCongThietBi)
                .ThenInclude(pc => pc.ThietBi)
                    .ThenInclude(tb => tb.SanPhamHienTai)
            .Include(ctb => ctb.PhanCongThietBi)
                .ThenInclude(pc => pc.ChiTietDon)
            .Where(ctb => ctb.PhieuBanGiao.MaDonThue == donId && ctb.PhieuBanGiao.TrangThai == "DaGiao")
            .ToListAsync();

        if (!chiTietBanGiaos.Any())
            return Result<QuaHanChiTietResponse>.Loi("DON_CHUA_BAN_GIAO", "Đơn chưa có phiếu bàn giao hợp lệ để lập chi tiết quá hạn.");

        // Lấy tất cả dòng nhận trả đã chốt của đơn
        var nhanTras = await _context.ChiTietNhanTras
            .Include(nt => nt.PhieuNhanTra)
            .Where(nt => nt.PhieuNhanTra.MaDonThue == donId && nt.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot)
            .ToListAsync();

        var danhSachThietBi = new List<ThietBiQuaHanItem>();
        decimal tongPhiTreDuKien = 0;
        int soDaTra = 0;

        foreach (var ctb in chiTietBanGiaos)
        {
            var pc = ctb.PhanCongThietBi;
            var tb = pc.ThietBi;
            var cd = pc.ChiTietDon;

            var nt = nhanTras.FirstOrDefault(x => x.MaChiTietBanGiao == ctb.MaChiTietBanGiao);

            string trangThai = "ChuaTra";
            DateTime mocDung = mocNow;
            DateTime? gioTraThucTe = null;
            DateTime? gioDuyetMat = null;

            if (nt != null)
            {
                if (nt.KetLuan == "MatThietBi" && nt.ThoiDiemDuyetMat.HasValue)
                {
                    trangThai = "DaBaoMat";
                    gioDuyetMat = nt.ThoiDiemDuyetMat.Value;
                    mocDung = nt.ThoiDiemDuyetMat.Value;
                    soDaTra++;
                }
                else if (nt.ThoiDiemTraThucTe.HasValue)
                {
                    trangThai = "DaTra";
                    gioTraThucTe = nt.ThoiDiemTraThucTe.Value;
                    mocDung = nt.ThoiDiemTraThucTe.Value;
                    soDaTra++;
                }
            }

            var tinhPhi = await TinhPhiTreDuKienAsync(ctb.MaChiTietBanGiao, mocDung);
            decimal phiTre = 0;
            int soNgayTre = 0;
            decimal donGia = cd.DonGiaThueMoiNgay;
            decimal heSo = 1.5m;

            if (tinhPhi.ThanhCong && tinhPhi.DuLieu != null)
            {
                phiTre = tinhPhi.DuLieu.SoTien;
                soNgayTre = tinhPhi.DuLieu.SoNgayTre;
                donGia = tinhPhi.DuLieu.DonGiaSnapshot;
                heSo = tinhPhi.DuLieu.HeSo;
            }

            // Chỉ cộng tổng phí dự kiến cho các thiết bị chưa trả hoặc đã trả nhưng có phát sinh trễ
            tongPhiTreDuKien += phiTre;

            danhSachThietBi.Add(new ThietBiQuaHanItem
            {
                MaChiTietBanGiao = ctb.MaChiTietBanGiao,
                MaThietBi = tb.MaThietBi,
                MaThietBiHienThi = tb.MaThietBiHienThi,
                MaSanPham = tb.MaSanPhamHienTai,
                TenSanPham = tb.SanPhamHienTai.TenSanPham,
                GioTraThucTe = gioTraThucTe,
                GioDuyetMat = gioDuyetMat,
                TrangThai = trangThai,
                SoNgayTre = soNgayTre,
                DonGiaSnapshot = donGia,
                HeSo = heSo,
                PhiTreDuKien = phiTre
            });
        }

        return Result<QuaHanChiTietResponse>.Ok(new QuaHanChiTietResponse
        {
            MaDonThue = donId,
            GioTraDuKien = don.GioTraDuKien,
            MocTinhNow = mocNow,
            LaTraMotPhan = soDaTra > 0 && soDaTra < chiTietBanGiaos.Count,
            DanhSachThietBi = danhSachThietBi,
            TongPhiTreDuKien = tongPhiTreDuKien
        });
    }

    /// <summary>
    /// Lấy danh sách các đơn thuê tương lai bị ảnh hưởng do thiết bị quá hạn chưa về
    /// </summary>
    public async Task<Result<List<DonBiAnhHuongResponse>>> LayDonBiAnhHuongAsync(long donId, long actorId)
    {
        var don = await _context.DonThues.FindAsync(donId);
        if (don == null)
            return Result<List<DonBiAnhHuongResponse>>.Loi("DON_NOT_FOUND", "Không tìm thấy đơn thuê.");

        // Lấy các thiết bị bàn giao của đơn này mà chưa được trả trong phiếu chốt
        var chiTietBanGiaos = await _context.ChiTietBanGiaos
            .Include(c => c.PhanCongThietBi)
                .ThenInclude(p => p.ThietBi)
                    .ThenInclude(tb => tb.SanPhamHienTai)
            .Where(c => c.PhieuBanGiao.MaDonThue == donId && c.PhieuBanGiao.TrangThai == "DaGiao")
            .ToListAsync();

        var settledCtbIds = await _context.ChiTietNhanTras
            .Where(nt => nt.PhieuNhanTra.MaDonThue == donId && nt.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot)
            .Select(nt => nt.MaChiTietBanGiao)
            .ToListAsync();

        var unreturned = chiTietBanGiaos.Where(c => !settledCtbIds.Contains(c.MaChiTietBanGiao)).ToList();
        var unreturnedTbIds = unreturned.Select(c => c.PhanCongThietBi.MaThietBi).Distinct().ToList();

        var resultList = new List<DonBiAnhHuongResponse>();

        if (!unreturnedTbIds.Any())
            return Result<List<DonBiAnhHuongResponse>>.Ok(resultList);

        // 1. Kiểm tra các đơn tương lai đã được gán đích danh các thiết bị đang bị giữ quá hạn này
        var futureAssigned = await _context.PhanCongThietBis
            .Include(pc => pc.ThietBi)
                .ThenInclude(tb => tb.SanPhamHienTai)
            .Include(pc => pc.ChiTietDon)
                .ThenInclude(cd => cd.DonThue)
                    .ThenInclude(d => d.KhachHang)
            .Where(pc => unreturnedTbIds.Contains(pc.MaThietBi))
            .Where(pc => pc.ChiTietDon.DonThue.MaDonThue != donId)
            .Where(pc => pc.TrangThai == "DaPhanCong" &&
                         (pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan) &&
                         pc.ChiTietDon.DonThue.GioNhanDuKien >= don.GioTraDuKien)
            .ToListAsync();

        foreach (var fa in futureAssigned)
        {
            var futureDon = fa.ChiTietDon.DonThue;
            resultList.Add(new DonBiAnhHuongResponse
            {
                MaDonBiAnhHuong = futureDon.MaDonThue,
                MaDonHienThi = $"DH-{futureDon.MaDonThue:D6}",
                TenKhachHang = futureDon.KhachHang?.HoTen ?? "Khách hàng",
                GioNhanDuKien = futureDon.GioNhanDuKien,
                GioTraDuKien = futureDon.GioTraDuKien,
                MaThietBiVung = fa.MaThietBi,
                MaThietBiHienThi = fa.ThietBi.MaThietBiHienThi,
                MaSanPham = fa.ThietBi.MaSanPhamHienTai,
                TenSanPham = fa.ThietBi.SanPhamHienTai.TenSanPham,
                SoLuongThieu = 1,
                NguyenNhan = "ThietBiDangBiGiuQuaHan"
            });
        }

        // 2. Kiểm tra nguy cơ thiếu số lượng tổng theo sản phẩm cho các đơn kế tiếp
        var affectedProductIds = unreturned.Select(c => c.PhanCongThietBi.ThietBi.MaSanPhamHienTai).Distinct().ToList();
        var futureOrders = await _context.DonThues
            .Include(d => d.KhachHang)
            .Include(d => d.ChiTietDonThues)
                .ThenInclude(cd => cd.SanPham)
            .Where(d => d.MaDonThue != donId &&
                        (d.TrangThai == TrangThaiDonThue.DaXacNhan ||
                         d.TrangThai == TrangThaiDonThue.DangChuanBi ||
                         d.TrangThai == TrangThaiDonThue.SanSangNhan) &&
                        d.GioNhanDuKien >= don.GioTraDuKien &&
                        d.GioNhanDuKien <= DateTime.UtcNow.AddDays(7))
            .Where(d => d.ChiTietDonThues.Any(cd => affectedProductIds.Contains(cd.MaSanPham)))
            .ToListAsync();

        foreach (var fo in futureOrders)
        {
            foreach (var cd in fo.ChiTietDonThues.Where(cd => affectedProductIds.Contains(cd.MaSanPham)))
            {
                // Kiểm tra xem đơn này đã được liệt kê do gán đích danh chưa
                if (resultList.Any(r => r.MaDonBiAnhHuong == fo.MaDonThue && r.MaSanPham == cd.MaSanPham))
                    continue;

                int khaDung = await _khaDungService.LayKhaDungAsync(cd.MaSanPham, fo.GioNhanDuKien, fo.GioTraDuKien);
                if (khaDung < cd.SoLuong)
                {
                    resultList.Add(new DonBiAnhHuongResponse
                    {
                        MaDonBiAnhHuong = fo.MaDonThue,
                        MaDonHienThi = $"DH-{fo.MaDonThue:D6}",
                        TenKhachHang = fo.KhachHang?.HoTen ?? "Khách hàng",
                        GioNhanDuKien = fo.GioNhanDuKien,
                        GioTraDuKien = fo.GioTraDuKien,
                        MaThietBiVung = null,
                        MaThietBiHienThi = null,
                        MaSanPham = cd.MaSanPham,
                        TenSanPham = cd.SanPham?.TenSanPham ?? "",
                        SoLuongThieu = cd.SoLuong - Math.Max(0, khaDung),
                        NguyenNhan = "NguyCoThieuSoLuongSanPham"
                    });
                }
            }
        }

        return Result<List<DonBiAnhHuongResponse>>.Ok(resultList);
    }

    /// <summary>
    /// Quét các đơn quá hạn và gửi thông báo nhắc nhở (Idempotent theo mốc)
    /// </summary>
    public async Task<Result<KetQuaQuetNhacResponse>> QuetVaTaoNhacQuaHanAsync(DateTime? mocQuet)
    {
        var moc = mocQuet ?? DateTime.UtcNow;

        var filter = new LocQuaHanRequest
        {
            DenThoiDiem = moc,
            Trang = 1,
            SoMoiTrang = 1000
        };

        var donQuaHanRes = await LayDonQuaHanAsync(filter, 0);
        if (!donQuaHanRes.ThanhCong || donQuaHanRes.DuLieu == null)
            return Result<KetQuaQuetNhacResponse>.Loi("LOI_LAY_DON_QUA_HAN", "Không thể lấy danh sách đơn quá hạn.");

        int tongSo = donQuaHanRes.DuLieu.TotalItems;
        int soMoi = 0;
        int soBoQua = 0;
        int soLoi = 0;

        foreach (var item in donQuaHanRes.DuLieu.Items)
        {
            try
            {
                var eventKey = MaSuKienThongBao.NhacQuaHan(item.MaDonThue, moc);

                // Kiểm tra xem đã có thông báo với key này chưa để tránh spam
                var daCo = await _context.ThongBaos.AnyAsync(tb => tb.MaSuKien == eventKey);
                if (daCo)
                {
                    soBoQua++;
                    continue;
                }

                await _thongBaoService.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(
                    item.MaDonThue,
                    LoaiSuKienThongBao.NhacQuaHan,
                    eventKey,
                    $"Nhắc nhở đơn thuê {item.MaDonHienThi} đã quá hạn",
                    $"Đơn thuê {item.MaDonHienThi} của bạn hiện có {item.SoThietBiChuaTra} thiết bị chưa trả (trễ {item.SoNgayTreMax} ngày). Phí trễ ước tính: {item.TongPhiTreDuKien:N0} đ. Vui lòng hoàn trả sớm nhất có thể."
                ));

                await _context.SaveChangesAsync();
                soMoi++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo thông báo nhắc quá hạn cho đơn #{MaDon}", item.MaDonThue);
                soLoi++;
            }
        }

        return Result<KetQuaQuetNhacResponse>.Ok(new KetQuaQuetNhacResponse
        {
            TongSoDonQuet = tongSo,
            SoNhacNhoMoi = soMoi,
            SoBoQua = soBoQua,
            SoLoi = soLoi
        });
    }
}
