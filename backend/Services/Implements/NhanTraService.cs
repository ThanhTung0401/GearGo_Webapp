using System.Data;
using System.Text.Json;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.NhanTra;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using GearGo.Services.Strategies;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

/// <summary>
/// Cài đặt dịch vụ nhận trả thiết bị nhiều đợt và kết luận mất (UC12 - Tuấn Kiệt)
/// </summary>
public class NhanTraService : INhanTraService
{
    private readonly ApplicationDbContext _context;
    private readonly IEnumerable<IInspectionStrategy> _strategies;
    private readonly ILogger<NhanTraService> _logger;

    public NhanTraService(
        ApplicationDbContext context,
        IEnumerable<IInspectionStrategy> strategies,
        ILogger<NhanTraService> logger)
    {
        _context = context;
        _strategies = strategies;
        _logger = logger;
    }

    /// <summary>
    /// Tạo phiếu nhận trả nháp mới dưới khóa giao dịch
    /// </summary>
    public async Task<Result<NhanTraResponse>> TaoPhieuNhanTraNhapAsync(
            long donId, TaoNhanTraRequest request, long actorId
    ) {
        if (request.DanhSachChiTietBanGiao == null || request.DanhSachChiTietBanGiao.Count == 0)
            return Result<NhanTraResponse>.Loi("DANH_SACH_RONG", "Phải chọn ít nhất 1 thiết bị để nhận trả.");

        if (request.DanhSachChiTietBanGiao.Distinct().Count() != request.DanhSachChiTietBanGiao.Count)
            return Result<NhanTraResponse>.Loi("DUPLICATE_ITEMS", "Danh sách thiết bị chọn bị trùng lặp.");

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var donThue = await _context.DonThues
                .Include(d => d.PhieuBanGiao)
                    .ThenInclude(pb => pb.ChiTietBanGiaos)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId);

            if (donThue == null)
                return Result<NhanTraResponse>.Loi("DON_NOT_FOUND", "Không tìm thấy đơn thuê.");

            if (donThue.PhieuBanGiao == null || donThue.PhieuBanGiao.TrangThai != "DaGiao")
                return Result<NhanTraResponse>.Loi("DON_CHUA_BAN_GIAO", "Đơn chưa hoàn tất bàn giao thiết bị.");

            var validCtbIds = donThue.PhieuBanGiao.ChiTietBanGiaos.Select(c => c.MaChiTietBanGiao).ToHashSet();
            if (request.DanhSachChiTietBanGiao.Any(id => !validCtbIds.Contains(id)))
                return Result<NhanTraResponse>.Loi("THIET_BI_KHONG_THUOC_BAN_GIAO", "Một số thiết bị không thuộc biên bản bàn giao của đơn thuê.");

            // Kiểm tra xem thiết bị đã chốt trả ở đợt trước chưa
            bool daChot = await _context.ChiTietNhanTras.AnyAsync(ct =>
                request.DanhSachChiTietBanGiao.Contains(ct.MaChiTietBanGiao) &&
                ct.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot);

            if (daChot)
                return Result<NhanTraResponse>.Loi("THIET_BI_DA_TRA", "Một số thiết bị đã được chốt nhận trả ở đợt trước.");

            // Kiểm tra xem thiết bị đã nằm trong phiếu nháp nào chưa
            var existingDraftDetails = await _context.ChiTietNhanTras
                .Include(ct => ct.PhieuNhanTra)
                .Where(ct => request.DanhSachChiTietBanGiao.Contains(ct.MaChiTietBanGiao) &&
                             ct.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.Nhap)
                .ToListAsync();

            if (existingDraftDetails.Count > 0)
            {
                var phieuId = existingDraftDetails.First().MaPhieuNhanTra;
                var phieuHienCo = await LayPhieuNhanTraTheoIdAsync(phieuId);
                if (phieuHienCo != null && phieuHienCo.ChiTietNhanTras.Count == request.DanhSachChiTietBanGiao.Count)
                {
                    await transaction.CommitAsync();
                    return Result<NhanTraResponse>.Ok(MapToResponse(phieuHienCo, 0, new List<string>()));
                }

                return Result<NhanTraResponse>.Loi("DONG_DA_CO_PHIEU_NHAN",
                    $"Thiết bị đã nằm trong phiếu nhận trả nháp #{phieuId}.", new { MaPhieu = phieuId });
            }

            var nhanVien = await _context.NhanViens.FirstOrDefaultAsync(nv => nv.MaTaiKhoan == actorId)
                           ?? await _context.NhanViens.FirstOrDefaultAsync(nv => nv.MaNhanVien == actorId);

            if (nhanVien == null)
                return Result<NhanTraResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy thông tin nhân viên tiếp nhận.");

            int countPhieu = await _context.PhieuNhanTras.CountAsync(p => p.MaDonThue == donId);
            int lanTra = countPhieu + 1;
            string maPhieuHienThi = $"PNT-DT{donThue.MaDonThue:D4}-{lanTra:D2}";

            var phieuMoi = new PhieuNhanTra
            {
                MaDonThue = donId,
                MaNhanVien = nhanVien.MaNhanVien,
                MaPhieuHienThi = maPhieuHienThi,
                LanTra = lanTra,
                LaLanTraCuoi = false,
                ThoiDiemLap = DateTime.UtcNow,
                TrangThai = TrangThaiPhieuNhanTra.Nhap,
                TenNhanVienLucNhan = nhanVien.HoTen,
                GhiChu = request.GhiChu
            };

            _context.PhieuNhanTras.Add(phieuMoi);
            await _context.SaveChangesAsync();

            foreach (var ctbId in request.DanhSachChiTietBanGiao)
            {
                var ct = new ChiTietNhanTra
                {
                    MaPhieuNhanTra = phieuMoi.MaPhieuNhanTra,
                    MaChiTietBanGiao = ctbId,
                    KetLuan = "Dat",
                    TrangThaiXuLy = "ChoKiemTra"
                };
                _context.ChiTietNhanTras.Add(ct);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var resultPhieu = await LayPhieuNhanTraTheoIdAsync(phieuMoi.MaPhieuNhanTra);
            return Result<NhanTraResponse>.Ok(MapToResponse(resultPhieu!, 0, new List<string>()));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Lỗi khi tạo phiếu nhận trả nháp đơn {DonId}", donId);
            throw;
        }
    }

    /// <summary>
    /// Cập nhật thông tin kiểm tra thiết bị trên phiếu nhận trả nháp
    /// </summary>
    public async Task<Result<NhanTraResponse>> CapNhatPhieuNhanTraNhapAsync(long phieuId, CapNhatPhieuNhanTraRequest request, long actorId)
    {
        var phieu = await _context.PhieuNhanTras
            .Include(p => p.DonThue)
                .ThenInclude(d => d.PhieuBanGiao)
            .Include(p => p.ChiTietNhanTras)
            .FirstOrDefaultAsync(p => p.MaPhieuNhanTra == phieuId);

        if (phieu == null)
            return Result<NhanTraResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu nhận trả.");

        if (phieu.TrangThai != TrangThaiPhieuNhanTra.Nhap)
            return Result<NhanTraResponse>.Loi("PHIEU_NHAN_DA_CHOT", "Không thể sửa phiếu nhận trả đã chốt hoặc đã hủy.");

        foreach (var dong in request.DanhSachDong)
        {
            var chiTiet = phieu.ChiTietNhanTras.FirstOrDefault(ct => ct.MaChiTietBanGiao == dong.MaChiTietBanGiao);
            if (chiTiet == null)
                return Result<NhanTraResponse>.Loi("THIET_BI_KHONG_THUOC_PHIEU", $"Thiết bị bàn giao #{dong.MaChiTietBanGiao} không thuộc phiếu này.");

            if (dong.KetLuan == "MatThietBi")
            {
                // Đồ mất: không điền giả giờ trả thực tế
                chiTiet.ThoiDiemTraThucTe = null;
                chiTiet.TrangThaiXuLy = "ChoDuyetMat";
                chiTiet.BienBanMat = dong.BienBanMat ?? chiTiet.BienBanMat;
            }
            else
            {
                if (dong.ThoiDiemTraThucTe.HasValue)
                {
                    if (dong.ThoiDiemTraThucTe.Value > DateTime.UtcNow.AddMinutes(5))
                        return Result<NhanTraResponse>.Loi("THOI_DIEM_TRA_KHONG_HOP_LE", "Thời điểm trả thực tế không được ở tương lai.");

                    if (phieu.DonThue?.PhieuBanGiao?.ThoiDiemGiaoThucTe.HasValue == true &&
                        dong.ThoiDiemTraThucTe.Value < phieu.DonThue.PhieuBanGiao.ThoiDiemGiaoThucTe.Value)
                    {
                        return Result<NhanTraResponse>.Loi("THOI_DIEM_TRA_KHONG_HOP_LE", "Thời điểm trả không được trước thời điểm bàn giao.");
                    }

                    chiTiet.ThoiDiemTraThucTe = dong.ThoiDiemTraThucTe.Value;
                }
                else
                {
                    chiTiet.ThoiDiemTraThucTe = DateTime.UtcNow;
                }
                chiTiet.TrangThaiXuLy = "DaKiemTra";
            }

            chiTiet.KetLuan = dong.KetLuan ?? chiTiet.KetLuan;
            chiTiet.TinhTrangSauThue = dong.TinhTrangSauThue;
            chiTiet.PhuKienThucNhan = dong.PhuKienThucNhan != null ? JsonSerializer.Serialize(dong.PhuKienThucNhan) : chiTiet.PhuKienThucNhan;
            chiTiet.PhuKienConThieu = dong.PhuKienConThieu != null ? JsonSerializer.Serialize(dong.PhuKienConThieu) : chiTiet.PhuKienConThieu;
            chiTiet.DanhSachAnh = dong.DanhSachAnh != null ? JsonSerializer.Serialize(dong.DanhSachAnh) : chiTiet.DanhSachAnh;
            chiTiet.GhiChu = dong.GhiChu;
        }

        if (!string.IsNullOrWhiteSpace(request.GhiChu))
            phieu.GhiChu = request.GhiChu;

        await _context.SaveChangesAsync();

        var resultPhieu = await LayPhieuNhanTraTheoIdAsync(phieuId);
        return Result<NhanTraResponse>.Ok(MapToResponse(resultPhieu!, 0, new List<string>()));
    }

    /// <summary>
    /// Tách các dòng chưa đủ điều kiện sang phiếu nháp mới
    /// </summary>
    public async Task<Result<TachDongResponse>> TachDongChoXuLyAsync(long phieuId, TachDongChoXuLyRequest request, long actorId)
    {
        if (request.DanhSachChiTietNhanTra == null || request.DanhSachChiTietNhanTra.Count == 0)
            return Result<TachDongResponse>.Loi("DANH_SACH_RONG", "Phải chọn ít nhất 1 dòng để tách.");

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var phieuGoc = await _context.PhieuNhanTras
                .Include(p => p.ChiTietNhanTras)
                .FirstOrDefaultAsync(p => p.MaPhieuNhanTra == phieuId);

            if (phieuGoc == null)
                return Result<TachDongResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu nhận trả gốc.");

            if (phieuGoc.TrangThai != TrangThaiPhieuNhanTra.Nhap)
                return Result<TachDongResponse>.Loi("PHIEU_NHAN_DA_CHOT", "Không thể tách dòng từ phiếu đã chốt hoặc đã hủy.");

            var dongCanTach = phieuGoc.ChiTietNhanTras
                .Where(ct => request.DanhSachChiTietNhanTra.Contains(ct.MaChiTietNhanTra))
                .ToList();

            if (dongCanTach.Count == 0)
                return Result<TachDongResponse>.Loi("KHONG_CO_DONG_HOP_LE", "Không tìm thấy dòng nhận trả hợp lệ thuộc phiếu này để tách.");

            if (dongCanTach.Count == phieuGoc.ChiTietNhanTras.Count)
                return Result<TachDongResponse>.Loi("KHONG_THE_TACH_HET", "Không thể tách toàn bộ dòng; phiếu gốc phải còn ít nhất một dòng.");

            var nhanVien = await _context.NhanViens.FirstOrDefaultAsync(nv => nv.MaTaiKhoan == actorId)
                           ?? await _context.NhanViens.FirstOrDefaultAsync(nv => nv.MaNhanVien == actorId);

            int countPhieu = await _context.PhieuNhanTras.CountAsync(p => p.MaDonThue == phieuGoc.MaDonThue);
            int nextLanTra = countPhieu + 1;
            string maPhieuHienThi = $"PNT-DT{phieuGoc.MaDonThue:D4}-{nextLanTra:D2}";

            var phieuMoi = new PhieuNhanTra
            {
                MaDonThue = phieuGoc.MaDonThue,
                MaNhanVien = nhanVien?.MaNhanVien ?? phieuGoc.MaNhanVien,
                MaPhieuHienThi = maPhieuHienThi,
                LanTra = nextLanTra,
                LaLanTraCuoi = false,
                ThoiDiemLap = DateTime.UtcNow,
                TrangThai = TrangThaiPhieuNhanTra.Nhap,
                TenNhanVienLucNhan = nhanVien?.HoTen ?? phieuGoc.TenNhanVienLucNhan,
                GhiChu = $"Tách từ đợt {phieuGoc.LanTra}. Lý do: {request.LyDo}"
            };

            _context.PhieuNhanTras.Add(phieuMoi);
            await _context.SaveChangesAsync();

            // Di chuyển khóa ngoại MaPhieuNhanTra của dòng nháp sang phiếu mới (không nhân bản dòng)
            foreach (var ct in dongCanTach)
            {
                ct.MaPhieuNhanTra = phieuMoi.MaPhieuNhanTra;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var phieuGocResponse = await LayPhieuNhanTraTheoIdAsync(phieuGoc.MaPhieuNhanTra);
            var phieuMoiResponse = await LayPhieuNhanTraTheoIdAsync(phieuMoi.MaPhieuNhanTra);

            return Result<TachDongResponse>.Ok(new TachDongResponse
            {
                PhieuGoc = MapToResponse(phieuGocResponse!, 0, new List<string>()),
                PhieuMoi = MapToResponse(phieuMoiResponse!, 0, new List<string>())
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Lỗi khi tách dòng nhận trả phiếu {PhieuId}", phieuId);
            throw;
        }
    }

    /// <summary>
    /// Quản trị viên phê duyệt kết luận mất thiết bị
    /// </summary>
    public async Task<Result<ChiTietNhanTraResponse>> DuyetKetLuanMatAsync(long phieuId, long chiTietId, DuyetMatRequest request, long actorId)
    {
        var adminTk = await _context.TaiKhoans.FindAsync(actorId);
        if (adminTk == null || adminTk.VaiTro != "QuanTriVien")
            return Result<ChiTietNhanTraResponse>.Loi("KHONG_CO_QUYEN", "Chỉ Quản trị viên mới có quyền phê duyệt kết luận mất thiết bị.");

        var chiTiet = await _context.ChiTietNhanTras
            .Include(ct => ct.PhieuNhanTra)
            .Include(ct => ct.ChiTietBanGiao)
                .ThenInclude(ctb => ctb.PhanCongThietBi)
                    .ThenInclude(pc => pc.ThietBi)
                        .ThenInclude(tb => tb.SanPhamHienTai)
            .FirstOrDefaultAsync(ct => ct.MaChiTietNhanTra == chiTietId && ct.MaPhieuNhanTra == phieuId);

        if (chiTiet == null)
            return Result<ChiTietNhanTraResponse>.Loi("CHI_TIET_NOT_FOUND", "Không tìm thấy chi tiết nhận trả.");

        if (chiTiet.KetLuan != "MatThietBi")
            return Result<ChiTietNhanTraResponse>.Loi("KHONG_PHAI_MAT_THIET_BI", "Dòng này không có kết luận mất thiết bị.");

        // Kiểm tra phụ phí bồi thường hợp lệ
        var phuPhi = await _context.PhuPhis.FindAsync(request.MaPhuPhiBoiThuong);
        if (phuPhi == null)
            return Result<ChiTietNhanTraResponse>.Loi("PHU_PHI_NOT_FOUND", "Không tìm thấy phụ phí bồi thường tương ứng.");

        if (phuPhi.MaDonThue != chiTiet.PhieuNhanTra.MaDonThue || phuPhi.MaChiTietBanGiao != chiTiet.MaChiTietBanGiao)
            return Result<ChiTietNhanTraResponse>.Loi("KET_LUAN_MAT_CHUA_DU", "Phụ phí bồi thường không thuộc đúng đơn hoặc thiết bị bàn giao này.");

        if (phuPhi.TrangThaiDuyet != "DaDuyet")
            return Result<ChiTietNhanTraResponse>.Loi("KET_LUAN_MAT_CHUA_DU", "Phụ phí bồi thường phải ở trạng thái Đã Duyệt trước khi phê duyệt kết luận mất.");

        var adminNv = await _context.NhanViens.FirstOrDefaultAsync(nv => nv.MaTaiKhoan == actorId)
                      ?? await _context.NhanViens.FirstOrDefaultAsync(nv => nv.MaNhanVien == actorId);

        chiTiet.MaNguoiDuyetMat = adminNv?.MaNhanVien ?? actorId;
        chiTiet.ThoiDiemDuyetMat = DateTime.UtcNow;
        chiTiet.TrangThaiXuLy = "DaDuyetMat";
        chiTiet.BienBanMat = request.BienBanMat ?? chiTiet.BienBanMat;
        chiTiet.GhiChu = string.IsNullOrEmpty(chiTiet.GhiChu)
            ? $"Duyệt mất: {request.LyDo}"
            : $"{chiTiet.GhiChu} | Duyệt mất: {request.LyDo}";

        await _context.SaveChangesAsync();

        return Result<ChiTietNhanTraResponse>.Ok(MapChiTietToResponse(chiTiet));
    }

    /// <summary>
    /// Chốt phiếu nhận trả đợt này
    /// </summary>
    public async Task<Result<NhanTraResponse>> ChotNhanTraAsync(long phieuId, long actorId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var phieu = await _context.PhieuNhanTras
                .Include(p => p.DonThue)
                .Include(p => p.ChiTietNhanTras)
                    .ThenInclude(ct => ct.ChiTietBanGiao)
                        .ThenInclude(ctb => ctb.PhanCongThietBi)
                            .ThenInclude(pc => pc.ThietBi)
                                .ThenInclude(tb => tb.SanPhamHienTai)
                .FirstOrDefaultAsync(p => p.MaPhieuNhanTra == phieuId);

            if (phieu == null)
                return Result<NhanTraResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu nhận trả.");

            // Idempotency: nếu đã chốt rồi thì trả lại kết quả cũ
            if (phieu.TrangThai == TrangThaiPhieuNhanTra.DaChot)
            {
                await transaction.CommitAsync();
                return Result<NhanTraResponse>.Ok(MapToResponse(phieu, 0, new List<string>()));
            }

            if (phieu.TrangThai != TrangThaiPhieuNhanTra.Nhap)
                return Result<NhanTraResponse>.Loi("INVALID_STATE", "Phiếu không ở trạng thái Nháp để có thể chốt.");

            var nhanVien = await _context.NhanViens.FirstOrDefaultAsync(nv => nv.MaTaiKhoan == actorId)
                           ?? await _context.NhanViens.FirstOrDefaultAsync(nv => nv.MaNhanVien == actorId);

            if (nhanVien == null)
                return Result<NhanTraResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy thông tin nhân viên chốt phiếu.");

            // Kiểm tra từng dòng chi tiết
            foreach (var ct in phieu.ChiTietNhanTras)
            {
                if (string.IsNullOrEmpty(ct.KetLuan))
                    return Result<NhanTraResponse>.Loi("KET_LUAN_CHUA_DU", $"Thiết bị #{ct.MaChiTietBanGiao} chưa có kết luận kiểm tra.");

                if (ct.KetLuan == "MatThietBi")
                {
                    if (!ct.ThoiDiemDuyetMat.HasValue || !ct.MaNguoiDuyetMat.HasValue)
                        return Result<NhanTraResponse>.Loi("KET_LUAN_MAT_CHUA_DU",
                            $"Thiết bị #{ct.MaChiTietBanGiao} được báo mất nhưng chưa được Quản trị viên phê duyệt kết luận mất.");

                    bool coPhiDuyet = await _context.PhuPhis.AnyAsync(p =>
                        p.MaChiTietBanGiao == ct.MaChiTietBanGiao &&
                        p.LoaiPhi == "MatThietBi" &&
                        p.TrangThaiDuyet == "DaDuyet");

                    if (!coPhiDuyet)
                        return Result<NhanTraResponse>.Loi("KET_LUAN_MAT_CHUA_DU",
                            $"Thiết bị #{ct.MaChiTietBanGiao} chưa có phụ phí bồi thường mất thiết bị được phê duyệt.");
                }
                else
                {
                    if (!ct.ThoiDiemTraThucTe.HasValue)
                        ct.ThoiDiemTraThucTe = DateTime.UtcNow;
                }
            }

            var canhBaoDonSau = new List<string>();

            // Cập nhật trạng thái từng thiết bị và khởi tạo bảo trì nếu cần
            foreach (var ct in phieu.ChiTietNhanTras)
            {
                var thietBi = ct.ChiTietBanGiao.PhanCongThietBi.ThietBi;
                var trangThaiCu = thietBi.TrangThaiSuDung;

                // Tìm Strategy phù hợp với kết luận kiểm tra
                var strategy = _strategies.FirstOrDefault(s => s.CanHandle(ct.KetLuan ?? ""));
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

                // Kiểm tra cảnh báo nếu thiết bị hỏng/mất đã có lịch phân công cho đơn tương lai
                if (thietBi.TrangThaiSuDung != TrangThaiThietBi.SanSang)
                {
                    var donSauBiAnhHuong = await _context.PhanCongThietBis
                        .Include(pc => pc.ChiTietDon)
                        .Where(pc => pc.MaThietBi == thietBi.MaThietBi &&
                                     pc.TrangThai == "DaPhanCong" &&
                                     pc.ChiTietDon.MaDonThue != phieu.MaDonThue)
                        .Select(pc => pc.ChiTietDon.MaDonThue)
                        .Distinct()
                        .ToListAsync();

                    if (donSauBiAnhHuong.Count > 0)
                    {
                        canhBaoDonSau.Add($"Thiết bị {thietBi.MaThietBiHienThi} ({ct.KetLuan}) ảnh hưởng đến các đơn tương lai: {string.Join(", ", donSauBiAnhHuong)}");
                    }
                }
            }

            // Đếm lại tổng số đồ còn nợ trên toàn đơn
            int tongGiao = await _context.ChiTietBanGiaos
                .CountAsync(ctb => ctb.PhieuBanGiao.MaDonThue == phieu.MaDonThue);

            var allSettledCtbIds = await _context.ChiTietNhanTras
                .Where(ct => ct.PhieuNhanTra.MaDonThue == phieu.MaDonThue &&
                             (ct.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot || ct.MaPhieuNhanTra == phieu.MaPhieuNhanTra))
                .Select(ct => ct.MaChiTietBanGiao)
                .Distinct()
                .CountAsync();

            int soConNo = Math.Max(0, tongGiao - allSettledCtbIds);

            // Gọi phương thức nghiệp vụ đóng gói trên Entity
            phieu.ChotPhieu(nhanVien.HoTen ?? "Nhân viên", soConNo == 0);

            if (soConNo > 0)
            {
                phieu.DonThue.TrangThai = TrangThaiDonThue.DangThue; // Giữ nguyên đang thuê
            }
            else
            {
                phieu.DonThue.TrangThai = TrangThaiDonThue.ChoDoiSoat; // Chuyển sang chờ đối soát

                _context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
                {
                    MaDonThue = phieu.MaDonThue,
                    TrangThaiTruoc = TrangThaiDonThue.DangThue.ToString(),
                    TrangThaiSau = TrangThaiDonThue.ChoDoiSoat.ToString(),
                    ThoiDiem = DateTime.UtcNow,
                    LyDo = $"Hoàn tất nhận trả toàn bộ thiết bị (Đợt cuối - Phiếu {phieu.MaPhieuHienThi})"
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var resultPhieu = await LayPhieuNhanTraTheoIdAsync(phieuId);
            return Result<NhanTraResponse>.Ok(MapToResponse(resultPhieu!, soConNo, canhBaoDonSau));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Lỗi khi chốt phiếu nhận trả {PhieuId}", phieuId);
            throw;
        }
    }

    // ─── PRIVATE HELPERS ───

    private async Task<PhieuNhanTra?> LayPhieuNhanTraTheoIdAsync(long phieuId)
    {
        return await _context.PhieuNhanTras
            .Include(p => p.ChiTietNhanTras)
                .ThenInclude(ct => ct.ChiTietBanGiao)
                    .ThenInclude(ctb => ctb.PhanCongThietBi)
                        .ThenInclude(pc => pc.ThietBi)
                            .ThenInclude(tb => tb.SanPhamHienTai)
            .Include(p => p.ChiTietNhanTras)
                .ThenInclude(ct => ct.NguoiDuyetMat)
            .FirstOrDefaultAsync(p => p.MaPhieuNhanTra == phieuId);
    }

    private static NhanTraResponse MapToResponse(PhieuNhanTra p, int soConNo, List<string> canhBao)
    {
        return new NhanTraResponse
        {
            MaPhieu = p.MaPhieuNhanTra,
            MaDonThue = p.MaDonThue,
            MaPhieuHienThi = p.MaPhieuHienThi,
            LanTra = p.LanTra,
            TrangThai = p.TrangThai.ToString(),
            ThoiDiemLap = p.ThoiDiemLap,
            ThoiDiemChot = p.ThoiDiemChot,
            TenNhanVienLucNhan = p.TenNhanVienLucNhan,
            GhiChu = p.GhiChu,
            LaLanTraCuoi = p.LaLanTraCuoi,
            SoThietBiConNo = soConNo,
            CanhBaoDonSau = canhBao,
            ChiTiet = p.ChiTietNhanTras.Select(MapChiTietToResponse).ToList()
        };
    }

    private static ChiTietNhanTraResponse MapChiTietToResponse(ChiTietNhanTra ct)
    {
        var tb = ct.ChiTietBanGiao.PhanCongThietBi.ThietBi;
        return new ChiTietNhanTraResponse
        {
            MaChiTietNhanTra = ct.MaChiTietNhanTra,
            MaChiTietBanGiao = ct.MaChiTietBanGiao,
            MaThietBi = tb?.MaThietBi ?? 0,
            MaThietBiHienThi = tb?.MaThietBiHienThi ?? "",
            TenSanPham = tb?.SanPhamHienTai?.TenSanPham ?? "",
            ThoiDiemTraThucTe = ct.ThoiDiemTraThucTe,
            KetLuan = ct.KetLuan,
            TinhTrangSauThue = ct.TinhTrangSauThue,
            PhuKienThucNhan = ct.PhuKienThucNhan,
            PhuKienConThieu = ct.PhuKienConThieu,
            DanhSachAnh = ct.DanhSachAnh,
            BienBanMat = ct.BienBanMat,
            TrangThaiXuLy = ct.TrangThaiXuLy,
            MaNguoiDuyetMat = ct.MaNguoiDuyetMat,
            TenNguoiDuyetMat = ct.NguoiDuyetMat?.HoTen,
            ThoiDiemDuyetMat = ct.ThoiDiemDuyetMat,
            GhiChu = ct.GhiChu
        };
    }
}
