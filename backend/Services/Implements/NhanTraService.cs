using System.Data;
using System.Text.Json;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.NhanTra;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using GearGo.Services.Specifications;
using GearGo.Services.Strategies;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

/// <summary>
/// Cài đặt dịch vụ nhận trả thiết bị nhiều đợt và kết luận mất (UC12 - Tuấn Kiệt)
/// Áp dụng Clean Architecture: StrategyFactory, Specification, CQRS Query Delegation, Facade, TransactionWrapper và Rich Domain
/// </summary>
public class NhanTraService : INhanTraService
{
    private readonly ApplicationDbContext _context;
    private readonly ITruyVanNhanTraService _truyVanService;
    private readonly IInspectionStrategyFactory _strategyFactory;
    private readonly IDeviceConflictDetector _conflictDetector;
    private readonly ILogger<NhanTraService> _logger;

    public NhanTraService(
        ApplicationDbContext context,
        ITruyVanNhanTraService truyVanService,
        IInspectionStrategyFactory strategyFactory,
        IDeviceConflictDetector conflictDetector,
        ILogger<NhanTraService> logger)
    {
        _context = context;
        _truyVanService = truyVanService;
        _strategyFactory = strategyFactory;
        _conflictDetector = conflictDetector;
        _logger = logger;
    }

    public async Task<Result<NhanTraResponse>> TaoPhieuNhanTraNhapAsync(
        long donId, TaoNhanTraRequest request, long actorId)
    {
        if (request.DanhSachChiTietBanGiao == null || request.DanhSachChiTietBanGiao.Count == 0)
            return Result<NhanTraResponse>.Loi("DANH_SACH_RONG", "Phải chọn ít nhất 1 thiết bị để nhận trả.");

        if (request.DanhSachChiTietBanGiao.Distinct().Count() != request.DanhSachChiTietBanGiao.Count)
            return Result<NhanTraResponse>.Loi("DUPLICATE_ITEMS", "Danh sách thiết bị chọn bị trùng lặp.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var donThue = await _context.DonThues
                .Include(d => d.PhieuBanGiao)
                    .ThenInclude(pb => pb!.ChiTietBanGiaos)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId);

            if (donThue == null)
                return Result<NhanTraResponse>.Loi("DON_NOT_FOUND", "Không tìm thấy đơn thuê.");

            if (donThue.PhieuBanGiao == null || donThue.PhieuBanGiao.TrangThai != "DaGiao")
                return Result<NhanTraResponse>.Loi("DON_CHUA_BAN_GIAO", "Đơn chưa hoàn tất bàn giao thiết bị.");

            var validCtbIds = donThue.PhieuBanGiao.ChiTietBanGiaos.Select(c => c.MaChiTietBanGiao).ToHashSet();
            if (request.DanhSachChiTietBanGiao.Any(id => !validCtbIds.Contains(id)))
                return Result<NhanTraResponse>.Loi("THIET_BI_KHONG_THUOC_BAN_GIAO", "Một số thiết bị không thuộc biên bản bàn giao của đơn thuê.");

            bool daChot = await _context.ChiTietNhanTras.AnyAsync(ct =>
                request.DanhSachChiTietBanGiao.Contains(ct.MaChiTietBanGiao) &&
                ct.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot);

            if (daChot)
                return Result<NhanTraResponse>.Loi("THIET_BI_DA_TRA", "Một số thiết bị đã được chốt nhận trả ở đợt trước.");

            var existingDraftDetails = await _context.ChiTietNhanTras
                .Include(ct => ct.PhieuNhanTra)
                .Where(ct => request.DanhSachChiTietBanGiao.Contains(ct.MaChiTietBanGiao) &&
                             ct.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.Nhap)
                .ToListAsync();

            if (existingDraftDetails.Count > 0)
            {
                var phieuId = existingDraftDetails.First().MaPhieuNhanTra;
                var phieuHienCo = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
                if (phieuHienCo != null && phieuHienCo.ChiTietNhanTras.Count == request.DanhSachChiTietBanGiao.Count)
                {
                    return Result<NhanTraResponse>.Ok(phieuHienCo.ToResponse());
                }

                return Result<NhanTraResponse>.Loi("DONG_DA_CO_PHIEU_NHAN",
                    $"Thiết bị đã nằm trong phiếu nhận trả nháp #{phieuId}.", new { MaPhieu = phieuId });
            }

            var nhanVien = await _context.LayNhanVienAsync(actorId);
            if (nhanVien == null)
                return Result<NhanTraResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy thông tin nhân viên tiếp nhận.");

            int countPhieu = await _context.PhieuNhanTras.CountAsync(p => p.MaDonThue == donId);
            int lanTra = countPhieu + 1;

            var phieuMoi = new PhieuNhanTra
            {
                MaDonThue = donId,
                MaNhanVien = nhanVien.MaNhanVien,
                MaPhieuHienThi = $"PNT-DT{donThue.MaDonThue:D4}-{lanTra:D2}",
                LanTra = lanTra,
                ThoiDiemLap = DateTime.UtcNow,
                TrangThai = TrangThaiPhieuNhanTra.Nhap,
                GhiChu = request.GhiChu
            };

            _context.PhieuNhanTras.Add(phieuMoi);

            foreach (var ctbId in request.DanhSachChiTietBanGiao)
            {
                _context.ChiTietNhanTras.Add(new ChiTietNhanTra
                {
                    PhieuNhanTra = phieuMoi,
                    MaChiTietBanGiao = ctbId,
                    TrangThaiXuLy = "ChoXuLy"
                });
            }

            await _context.SaveChangesAsync();
            var resultPhieu = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuMoi.MaPhieuNhanTra);
            return Result<NhanTraResponse>.Ok(resultPhieu!.ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<NhanTraResponse>> CapNhatPhieuNhanTraNhapAsync(
        long phieuId, CapNhatPhieuNhanTraRequest request, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            if (phieu == null)
                return Result<NhanTraResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu nhận trả.");

            if (phieu.TrangThai == TrangThaiPhieuNhanTra.DaChot)
                return Result<NhanTraResponse>.Loi("PHIEU_NHAN_DA_CHOT", "Phiếu đã chốt, không được sửa.");

            var nhanVien = await _context.LayNhanVienAsync(actorId);
            if (nhanVien == null)
                return Result<NhanTraResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy thông tin nhân viên thao tác.");

            if (request.DanhSachDong != null && request.DanhSachDong.Count > 0)
            {
                var ctDict = phieu.ChiTietNhanTras.ToDictionary(c => c.MaChiTietBanGiao);

                foreach (var dong in request.DanhSachDong)
                {
                    if (!ctDict.TryGetValue(dong.MaChiTietBanGiao, out var ctnt))
                        return Result<NhanTraResponse>.Loi("CHI_TIET_NOT_FOUND", $"Không tìm thấy chi tiết bàn giao #{dong.MaChiTietBanGiao} trong phiếu này.");

                    if (dong.ThoiDiemTraThucTe.HasValue && dong.ThoiDiemTraThucTe.Value > DateTime.UtcNow.AddMinutes(5))
                        return Result<NhanTraResponse>.Loi("THOI_DIEM_TRA_KHONG_HOP_LE", "Thời điểm trả thực tế không được ở tương lai.");

                    if (!string.IsNullOrEmpty(dong.KetLuan) && !_strategyFactory.IsValidConclusion(dong.KetLuan))
                        return Result<NhanTraResponse>.Loi("KET_LUAN_KHONG_HOP_LE", $"Kết luận '{dong.KetLuan}' không hợp lệ.");

                    ctnt.ThoiDiemTraThucTe = dong.ThoiDiemTraThucTe;
                    ctnt.KetLuan = dong.KetLuan;
                    ctnt.TinhTrangSauThue = dong.TinhTrangSauThue;
                    ctnt.BienBanMat = dong.BienBanMat;
                    ctnt.GhiChu = dong.GhiChu;

                    if (dong.PhuKienThucNhan != null)
                        ctnt.PhuKienThucNhan = JsonSerializer.Serialize(dong.PhuKienThucNhan);
                    if (dong.PhuKienConThieu != null)
                        ctnt.PhuKienConThieu = JsonSerializer.Serialize(dong.PhuKienConThieu);
                    if (dong.DanhSachAnh != null)
                        ctnt.DanhSachAnh = JsonSerializer.Serialize(dong.DanhSachAnh);

                    ctnt.TrangThaiXuLy = "DaKiemTra";
                }
            }

            if (!string.IsNullOrEmpty(request.GhiChu))
                phieu.GhiChu = request.GhiChu;

            await _context.SaveChangesAsync();
            var resultPhieu = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            return Result<NhanTraResponse>.Ok(resultPhieu!.ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<TachDongResponse>> TachDongChoXuLyAsync(
        long phieuId, TachDongChoXuLyRequest request, long actorId)
    {
        if (request.DanhSachChiTietNhanTra == null || request.DanhSachChiTietNhanTra.Count == 0)
            return Result<TachDongResponse>.Loi("DANH_SACH_RONG", "Phải chọn ít nhất 1 dòng để tách.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieuGoc = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            if (phieuGoc == null)
                return Result<TachDongResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu nhận trả gốc.");

            if (phieuGoc.TrangThai == TrangThaiPhieuNhanTra.DaChot)
                return Result<TachDongResponse>.Loi("PHIEU_NHAN_DA_CHOT", "Không thể tách dòng từ phiếu đã chốt.");

            if (request.DanhSachChiTietNhanTra.Count >= phieuGoc.ChiTietNhanTras.Count)
                return Result<TachDongResponse>.Loi("KHONG_THE_TACH_HET", "Không thể tách toàn bộ dòng. Phiếu gốc phải giữ lại ít nhất 1 dòng.");

            var nhanVien = await _context.LayNhanVienAsync(actorId);
            if (nhanVien == null)
                return Result<TachDongResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy thông tin nhân viên thao tác.");

            int countPhieu = await _context.PhieuNhanTras.CountAsync(p => p.MaDonThue == phieuGoc.MaDonThue);
            int lanTraMoi = countPhieu + 1;

            var phieuMoi = new PhieuNhanTra
            {
                MaDonThue = phieuGoc.MaDonThue,
                MaNhanVien = nhanVien.MaNhanVien,
                MaPhieuHienThi = $"PNT-DT{phieuGoc.MaDonThue:D4}-{lanTraMoi:D2}",
                LanTra = lanTraMoi,
                ThoiDiemLap = DateTime.UtcNow,
                TrangThai = TrangThaiPhieuNhanTra.Nhap,
                GhiChu = $"Tách từ phiếu #{phieuGoc.MaPhieuHienThi}. Lý do: {request.LyDo}"
            };

            _context.PhieuNhanTras.Add(phieuMoi);

            var dongCanTach = phieuGoc.ChiTietNhanTras
                .Where(ct => request.DanhSachChiTietNhanTra.Contains(ct.MaChiTietNhanTra))
                .ToList();

            foreach (var ct in dongCanTach)
            {
                ct.PhieuNhanTra = phieuMoi;
                ct.GhiChu = (ct.GhiChu != null ? ct.GhiChu + "; " : "") + $"Tách từ phiếu #{phieuGoc.MaPhieuHienThi}: {request.LyDo}";
            }

            phieuGoc.GhiChu = (phieuGoc.GhiChu != null ? phieuGoc.GhiChu + "; " : "") +
                              $"Đã tách {dongCanTach.Count} thiết bị sang phiếu #{phieuMoi.MaPhieuHienThi}";

            await _context.SaveChangesAsync();

            var loadedGoc = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuGoc.MaPhieuNhanTra);
            var loadedMoi = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuMoi.MaPhieuNhanTra);

            return Result<TachDongResponse>.Ok(new TachDongResponse
            {
                PhieuGoc = loadedGoc!.ToResponse(),
                PhieuMoi = loadedMoi!.ToResponse()
            });
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<ChiTietNhanTraResponse>> DuyetKetLuanMatAsync(
        long phieuId, long chiTietId, DuyetMatRequest request, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            if (phieu == null)
                return Result<ChiTietNhanTraResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu nhận trả.");

            if (phieu.TrangThai == TrangThaiPhieuNhanTra.DaChot)
                return Result<ChiTietNhanTraResponse>.Loi("PHIEU_NHAN_DA_CHOT", "Phiếu nhận trả đã chốt.");

            var ct = phieu.ChiTietNhanTras.FirstOrDefault(c => c.MaChiTietNhanTra == chiTietId);
            if (ct == null)
                return Result<ChiTietNhanTraResponse>.Loi("CHI_TIET_NOT_FOUND", "Không tìm thấy chi tiết nhận trả.");

            if (ct.KetLuan != "MatThietBi")
                return Result<ChiTietNhanTraResponse>.Loi("KHONG_PHAI_MAT_THIET_BI", "Dòng kiểm tra này không có kết luận mất thiết bị.");

            var phuPhi = await _context.PhuPhis.FirstOrDefaultAsync(p =>
                p.MaPhuPhi == request.MaPhuPhiBoiThuong &&
                p.MaDonThue == phieu.MaDonThue &&
                p.MaChiTietBanGiao == ct.MaChiTietBanGiao &&
                p.LoaiPhi == "MatThietBi");

            if (phuPhi == null)
                return Result<ChiTietNhanTraResponse>.Loi("PHU_PHI_NOT_FOUND",
                    "Không tìm thấy khoản phụ phí bồi thường mất thiết bị hợp lệ cho dòng này.");

            if (phuPhi.TrangThaiDuyet != "DaDuyet")
                return Result<ChiTietNhanTraResponse>.Loi("KET_LUAN_MAT_CHUA_DU",
                    "Khoản phụ phí bồi thường mất thiết bị chưa được phê duyệt.");

            var adminNv = await _context.LayNhanVienAsync(actorId);
            if (adminNv == null)
                return Result<ChiTietNhanTraResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy hồ sơ nhân viên của quản trị viên.");

            ct.MaNguoiDuyetMat = adminNv.MaNhanVien;
            ct.ThoiDiemDuyetMat = DateTime.UtcNow;
            ct.TrangThaiXuLy = "DaDuyetMat";
            if (!string.IsNullOrEmpty(request.LyDo))
                ct.GhiChu = (ct.GhiChu != null ? ct.GhiChu + "; " : "") + $"[Admin duyệt mất]: {request.LyDo}";
            ct.ChiTietBanGiao.PhanCongThietBi.ThietBi.TrangThaiSuDung = TrangThaiThietBi.ThatLac;

            await _context.SaveChangesAsync();

            var reloaded = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            var updatedCt = reloaded!.ChiTietNhanTras.First(c => c.MaChiTietNhanTra == chiTietId);
            return Result<ChiTietNhanTraResponse>.Ok(updatedCt.ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<NhanTraResponse>> ChotNhanTraAsync(long phieuId, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            if (phieu == null)
                return Result<NhanTraResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu nhận trả.");

            if (phieu.TrangThai == TrangThaiPhieuNhanTra.DaChot)
            {
                int soConNoHienTai = await _truyVanService.DemThietBiConNoAsync(phieu.MaDonThue);
                return Result<NhanTraResponse>.Ok(phieu.ToResponse(soConNoHienTai));
            }

            var nhanVien = await _context.LayNhanVienAsync(actorId);
            if (nhanVien == null)
                return Result<NhanTraResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy thông tin nhân viên chốt phiếu.");

            var validation = await NhanTraValidationRules.KiemTraDieuKienChotAsync(phieu, _context);
            if (!validation.ThanhCong)
                return Result<NhanTraResponse>.Loi(validation.MaLoi ?? "VALIDATION_FAILED", validation.ThongDiep ?? "Điều kiện kiểm tra không hợp lệ.");

            var canhBaoDonSau = new List<string>();

            foreach (var ct in phieu.ChiTietNhanTras)
            {
                var thietBi = ct.ChiTietBanGiao.PhanCongThietBi.ThietBi;
                var trangThaiCu = thietBi.TrangThaiSuDung;

                var strategy = _strategyFactory.GetStrategy(ct.KetLuan);
                if (strategy != null)
                {
                    await strategy.XuLySauKiemTraAsync(ct, thietBi, nhanVien, phieu.MaDonThue);
                }

                _context.LichSuTinhTrangThietBis.Add(new LichSuTinhTrangThietBi
                {
                    MaThietBi = thietBi.MaThietBi,
                    MaNguoiThucHien = actorId,
                    TrangThaiTruoc = trangThaiCu.ToString(),
                    TrangThaiSau = thietBi.TrangThaiSuDung.ToString(),
                    TinhTrangTruoc = ct.ChiTietBanGiao.TinhTrangTruocThue,
                    TinhTrangSau = ct.TinhTrangSauThue,
                    ThoiDiem = DateTime.UtcNow,
                    LyDo = $"Nhận trả đợt {phieu.LanTra}: Kết luận {ct.KetLuan}"
                });

                if (thietBi.TrangThaiSuDung != TrangThaiThietBi.SanSang)
                {
                    var conflicts = await _conflictDetector.KiemTraXungDotDonTuongLaiAsync(
                        thietBi.MaThietBi,
                        thietBi.MaThietBiHienThi,
                        ct.KetLuan ?? "",
                        phieu.MaDonThue);
                    canhBaoDonSau.AddRange(conflicts);
                }
            }

            int soConNo = await _truyVanService.DemThietBiConNoAsync(phieu.MaDonThue, phieu.MaPhieuNhanTra);

            phieu.ChotPhieu(nhanVien.HoTen ?? "Nhân viên", soConNo == 0);

            if (soConNo > 0)
            {
                phieu.DonThue.TrangThai = TrangThaiDonThue.DangThue;
            }
            else
            {
                phieu.DonThue.TrangThai = TrangThaiDonThue.ChoDoiSoat;

                _context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
                {
                    MaDonThue = phieu.MaDonThue,
                    TrangThaiTruoc = TrangThaiDonThue.DangThue.ToString(),
                    TrangThaiSau = TrangThaiDonThue.ChoDoiSoat.ToString(),
                    ThoiDiem = DateTime.UtcNow,
                    LyDo = $"Hoàn tất nhận trả toàn bộ thiết bị (Đợt cuối - Phiếu {phieu.MaPhieuHienThi})"
                });
            }

            return Result<NhanTraResponse>.Ok(phieu.ToResponse(soConNo, canhBaoDonSau));
        }, _logger, IsolationLevel.Serializable);
    }
}
