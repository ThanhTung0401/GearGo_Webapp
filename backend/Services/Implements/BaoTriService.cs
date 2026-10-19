using System.Data;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoTri;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class BaoTriService : IBaoTriService
{
    private readonly ApplicationDbContext _context;
    private readonly IDeviceConflictDetector _conflictDetector;
    private readonly ILogger<BaoTriService> _logger;

    public BaoTriService(
        ApplicationDbContext context,
        IDeviceConflictDetector conflictDetector,
        ILogger<BaoTriService> logger)
    {
        _context = context;
        _conflictDetector = conflictDetector;
        _logger = logger;
    }

    public async Task<Result<PhieuBaoTri>> TaoPhieuBaoTriToiThieuAsync(
        long maThietBi,
        long? maDonThue,
        long maNhanVienLap,
        string loaiXuLy,
        string moTaLoi,
        string mucDo)
    {
        var thietBi = await _context.ThietBis.FindAsync(maThietBi);
        if (thietBi == null)
            return Result<PhieuBaoTri>.Loi(
                "THIET_BI_NOT_FOUND",
                "Không tìm thấy thiết bị để lập phiếu bảo trì."
            );

        var phieuDangMo = await _context.PhieuBaoTris
            .FirstOrDefaultAsync(p => p.MaThietBi == maThietBi
                                      && (p.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiChoXuLy
                                          || p.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiDangXuLy
                                          || p.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiChoKiemTra));

        if (phieuDangMo != null)
            return Result<PhieuBaoTri>.Ok(phieuDangMo);

        var phieuMoi = new PhieuBaoTri
        {
            MaThietBi = maThietBi,
            MaDonThue = maDonThue,
            MaNguoiLap = maNhanVienLap,
            LoaiXuLy = loaiXuLy,
            MoTaLoi = moTaLoi,
            MucDo = mucDo,
            NgayBatDau = DateTime.UtcNow,
            TrangThai = KietDomainConstants.BaoTriConfig.TrangThaiChoXuLy
        };

        thietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;

        _context.PhieuBaoTris.Add(phieuMoi);
        await _context.SaveChangesAsync();

        return Result<PhieuBaoTri>.Ok(phieuMoi);
    }

    public async Task<Result<DanhSachBaoTriResponse>> TimKiemAsync(TimKiemBaoTriRequest request)
    {
        var (trang, soMoiTrang) = KietCalculationHelpers.ChuanHoaPhanTrang(request.Trang, request.SoMoiTrang);

        var query = _context.PhieuBaoTris
            .AsNoTracking()
            .Include(p => p.ThietBi)
                .ThenInclude(tb => tb.SanPhamHienTai)
            .Include(p => p.NguoiLap)
            .Include(p => p.NguoiXuLy)
            .Include(p => p.NguoiXacNhanHoanThanh)
            .AsQueryable();

        if (request.MaThietBi.HasValue)
            query = query.Where(p => p.MaThietBi == request.MaThietBi.Value);

        if (request.MaNguoiXuLy.HasValue)
            query = query.Where(p => p.MaNguoiXuLy == request.MaNguoiXuLy.Value);

        if (!string.IsNullOrWhiteSpace(request.TrangThai))
            query = query.Where(p => p.TrangThai == request.TrangThai);

        if (!string.IsNullOrWhiteSpace(request.LoaiXuLy))
            query = query.Where(p => p.LoaiXuLy == request.LoaiXuLy);

        if (request.TuNgay.HasValue)
            query = query.Where(p => p.NgayBatDau >= request.TuNgay.Value);

        if (request.DenNgay.HasValue)
            query = query.Where(p => p.NgayBatDau <= request.DenNgay.Value);

        var tongSo = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.MaPhieuBaoTri)
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .ToListAsync();

        return Result<DanhSachBaoTriResponse>.Ok(new DanhSachBaoTriResponse
        {
            Items = items.Select(p => p.ToResponse()).ToList(),
            TongSo = tongSo,
            Trang = trang,
            SoMoiTrang = soMoiTrang
        });
    }

    public async Task<Result<BaoTriResponse>> LayChiTietAsync(long maPhieuBaoTri)
    {
        var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
        if (phieu == null)
            return Result<BaoTriResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu bảo trì.");

        var canhBao = await _conflictDetector.KiemTraXungDotDonTuongLaiAsync(
            phieu.MaThietBi,
            phieu.ThietBi?.MaThietBiHienThi ?? "",
            phieu.LoaiXuLy ?? "BaoTri",
            phieu.MaDonThue ?? 0);

        return Result<BaoTriResponse>.Ok(phieu.ToResponse(canhBao));
    }

    public async Task<Result<BaoTriResponse>> LapPhieuAsync(LapBaoTriRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.MoTaLoi))
            return Result<BaoTriResponse>.Loi("DU_LIEU_KHONG_HOP_LE", "Mô tả lỗi không được để trống.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var thietBi = await _context.ThietBis
                .Include(tb => tb.SanPhamHienTai)
                .FirstOrDefaultAsync(tb => tb.MaThietBi == request.MaThietBi);

            if (thietBi == null)
                return Result<BaoTriResponse>.Loi("THIET_BI_NOT_FOUND", "Không tìm thấy thiết bị.");

            if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
                return Result<BaoTriResponse>.Loi("THIET_BI_DANG_O_KHACH", "Thiết bị đang ở khách, chưa thể tiếp nhận bảo trì tại kho.");

            if (thietBi.TrangThaiSuDung == TrangThaiThietBi.ThatLac || thietBi.TrangThaiSuDung == TrangThaiThietBi.NgungSuDung)
                return Result<BaoTriResponse>.Loi("INVALID_STATE", "Thiết bị đang thất lạc hoặc đã ngừng sử dụng.");

            var phieuDangMo = await _context.PhieuBaoTris
                .FirstOrDefaultAsync(p => p.MaThietBi == request.MaThietBi
                                          && (p.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiChoXuLy
                                              || p.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiDangXuLy
                                              || p.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiChoKiemTra));

            if (phieuDangMo != null)
                return Result<BaoTriResponse>.Loi("THIET_BI_DA_CO_BAO_TRI_MO",
                    $"Thiết bị đã có phiếu bảo trì đang mở #{phieuDangMo.MaPhieuBaoTri}. Vui lòng tiếp tục trên phiếu hiện có.");

            var nhanVien = await _context.LayNhanVienAsync(actorId);
            if (nhanVien == null)
                return Result<BaoTriResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy hồ sơ nhân viên thao tác.");

            var trangThaiCu = thietBi.TrangThaiSuDung;
            thietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;

            var phieuMoi = new PhieuBaoTri
            {
                MaThietBi = request.MaThietBi,
                MaDonThue = request.MaDonThue,
                MaNguoiLap = nhanVien.MaNhanVien,
                LoaiXuLy = string.IsNullOrWhiteSpace(request.LoaiXuLy) ? KietDomainConstants.BaoTriConfig.LoaiSuaChua : request.LoaiXuLy,
                MoTaLoi = request.MoTaLoi,
                MucDo = string.IsNullOrWhiteSpace(request.MucDo) ? KietDomainConstants.BaoTriConfig.MucDoNhe : request.MucDo,
                NgayBatDau = DateTime.UtcNow,
                NgayDuKienHoanThanh = request.NgayDuKienHoanThanh,
                BangChung = request.BangChung,
                TrangThai = KietDomainConstants.BaoTriConfig.TrangThaiChoXuLy
            };

            _context.PhieuBaoTris.Add(phieuMoi);

            _context.LichSuTinhTrangThietBis.Add(new LichSuTinhTrangThietBi
            {
                MaThietBi = thietBi.MaThietBi,
                MaNguoiThucHien = actorId,
                TrangThaiTruoc = trangThaiCu.ToString(),
                TrangThaiSau = TrangThaiThietBi.DangBaoTri.ToString(),
                TinhTrangTruoc = thietBi.TinhTrang,
                TinhTrangSau = request.MoTaLoi,
                ThoiDiem = DateTime.UtcNow,
                LyDo = $"Lập phiếu bảo trì ({phieuMoi.LoaiXuLy}): {request.MoTaLoi}"
            });

            await _context.SaveChangesAsync();

            var canhBao = await _conflictDetector.KiemTraXungDotDonTuongLaiAsync(
                thietBi.MaThietBi,
                thietBi.MaThietBiHienThi,
                phieuMoi.LoaiXuLy,
                request.MaDonThue ?? 0);

            var fullPhieu = await LayPhieuBaoTriDayDuAsync(phieuMoi.MaPhieuBaoTri);
            return Result<BaoTriResponse>.Ok(fullPhieu!.ToResponse(canhBao));
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<BaoTriResponse>> PhanCongXuLyAsync(long maPhieuBaoTri, PhanCongBaoTriRequest request, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            if (phieu == null)
                return Result<BaoTriResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu bảo trì.");

            if (phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiHoanThanh
                || phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiKhongDat)
                return Result<BaoTriResponse>.Loi("PHIEU_BAO_TRI_DA_KET_THUC", "Phiếu bảo trì đã kết thúc, không thể phân công lại.");

            var nguoiXuLy = await _context.NhanViens
                .Include(n => n.TaiKhoan)
                .FirstOrDefaultAsync(n => n.MaNhanVien == request.MaNguoiXuLy);

            if (nguoiXuLy == null)
                return Result<BaoTriResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy nhân viên được phân công.");

            if (nguoiXuLy.TrangThaiLamViec != "DangLamViec" || nguoiXuLy.TaiKhoan?.TrangThai != "HoatDong")
                return Result<BaoTriResponse>.Loi("NHAN_VIEN_DA_NGHI_VIEC", "Nhân viên được phân công không còn làm việc hoặc tài khoản đã khóa.");

            phieu.MaNguoiXuLy = nguoiXuLy.MaNhanVien;
            if (phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiChoXuLy)
                phieu.TrangThai = KietDomainConstants.BaoTriConfig.TrangThaiDangXuLy;

            await _context.SaveChangesAsync();
            var updated = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            return Result<BaoTriResponse>.Ok(updated!.ToResponse());
        }, _logger);
    }

    public async Task<Result<BaoTriResponse>> CapNhatTienDoAsync(long maPhieuBaoTri, CapNhatTienDoRequest request, long actorId)
    {
        if (request.ChiPhi.HasValue && request.ChiPhi.Value < 0)
            return Result<BaoTriResponse>.Loi("CHI_PHI_KHONG_HOP_LE", "Chi phí bảo trì không được âm.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            if (phieu == null)
                return Result<BaoTriResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu bảo trì.");

            if (phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiHoanThanh
                || phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiKhongDat)
                return Result<BaoTriResponse>.Loi("PHIEU_BAO_TRI_DA_KET_THUC", "Phiếu bảo trì đã kết thúc, không thể sửa tiến độ.");

            var coQuyen = await KiemTraQuyenXuLyAsync(phieu, actorId);
            if (!coQuyen)
                return Result<BaoTriResponse>.Loi("KHONG_PHAI_NGUOI_XU_LY", "Bạn không phải người được phân công xử lý phiếu bảo trì này.");

            if (request.KetQua != null)
                phieu.KetQua = request.KetQua;
            if (request.ChiPhi.HasValue)
                phieu.ChiPhi = request.ChiPhi.Value;
            if (request.BangChung != null)
                phieu.BangChung = request.BangChung;
            if (request.NgayDuKienHoanThanh.HasValue)
                phieu.NgayDuKienHoanThanh = request.NgayDuKienHoanThanh.Value;

            if (phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiChoXuLy)
                phieu.TrangThai = KietDomainConstants.BaoTriConfig.TrangThaiDangXuLy;

            await _context.SaveChangesAsync();
            var updated = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            return Result<BaoTriResponse>.Ok(updated!.ToResponse());
        }, _logger);
    }

    public async Task<Result<BaoTriResponse>> GuiKiemTraAsync(long maPhieuBaoTri, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            if (phieu == null)
                return Result<BaoTriResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu bảo trì.");

            if (phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiHoanThanh
                || phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiKhongDat)
                return Result<BaoTriResponse>.Loi("PHIEU_BAO_TRI_DA_KET_THUC", "Phiếu bảo trì đã kết thúc.");

            var coQuyen = await KiemTraQuyenXuLyAsync(phieu, actorId);
            if (!coQuyen)
                return Result<BaoTriResponse>.Loi("KHONG_PHAI_NGUOI_XU_LY", "Bạn không phải người được phân công xử lý phiếu bảo trì này.");

            if (string.IsNullOrWhiteSpace(phieu.KetQua))
                return Result<BaoTriResponse>.Loi("KET_QUA_KIEM_TRA_CHUA_DU", "Cần cập nhật kết quả xử lý trước khi gửi kiểm tra nghiệm thu.");

            phieu.TrangThai = KietDomainConstants.BaoTriConfig.TrangThaiChoKiemTra;

            await _context.SaveChangesAsync();
            var updated = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            return Result<BaoTriResponse>.Ok(updated!.ToResponse());
        }, _logger);
    }

    public async Task<Result<BaoTriResponse>> XacNhanHoanThanhAsync(long maPhieuBaoTri, XacNhanBaoTriRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.KetQuaKiemTra))
            return Result<BaoTriResponse>.Loi("KET_QUA_KIEM_TRA_CHUA_DU", "Phải có kết luận kiểm tra nghiệm thu.");

        if (request.ChiPhi.HasValue && request.ChiPhi.Value < 0)
            return Result<BaoTriResponse>.Loi("CHI_PHI_KHONG_HOP_LE", "Chi phí bảo trì không được âm.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            if (phieu == null)
                return Result<BaoTriResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu bảo trì.");

            // Idempotency: Gọi hoàn thành lần 2 trả kết quả cũ, không ghi trùng lịch sử
            if (phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiHoanThanh)
                return Result<BaoTriResponse>.Ok(phieu.ToResponse());

            if (phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiKhongDat)
                return Result<BaoTriResponse>.Loi("PHIEU_BAO_TRI_DA_KET_THUC", "Phiếu bảo trì đã kết thúc với kết luận Không Đạt.");

            var ngayHoanThanh = request.NgayHoanThanhThucTe ?? DateTime.UtcNow;
            if (ngayHoanThanh > DateTime.UtcNow.AddMinutes(KietDomainConstants.PolicyConfig.DungSaiPhutThoiGianThuc))
                return Result<BaoTriResponse>.Loi("KET_QUA_KIEM_TRA_CHUA_DU", "Thời điểm hoàn thành thực tế không được ở tương lai.");

            if (phieu.NgayBatDau.HasValue && ngayHoanThanh < phieu.NgayBatDau.Value.AddMinutes(-KietDomainConstants.PolicyConfig.DungSaiPhutThoiGianThuc))
                return Result<BaoTriResponse>.Loi("KET_QUA_KIEM_TRA_CHUA_DU", "Thời điểm hoàn thành không được trước thời điểm bắt đầu.");

            var nhanVien = await _context.LayNhanVienAsync(actorId);
            if (nhanVien == null)
                return Result<BaoTriResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy hồ sơ nhân viên xác nhận.");

            phieu.TrangThai = KietDomainConstants.BaoTriConfig.TrangThaiHoanThanh;
            phieu.MaNguoiXacNhanHoanThanh = nhanVien.MaNhanVien;
            phieu.NgayHoanThanhThucTe = ngayHoanThanh;
            phieu.KetQua = request.KetQuaKiemTra;
            if (request.BangChung != null)
                phieu.BangChung = request.BangChung;
            if (request.ChiPhi.HasValue)
                phieu.ChiPhi = request.ChiPhi.Value;

            var thietBi = phieu.ThietBi;
            var trangThaiCu = thietBi.TrangThaiSuDung;
            thietBi.TrangThaiSuDung = TrangThaiThietBi.SanSang;

            _context.LichSuTinhTrangThietBis.Add(new LichSuTinhTrangThietBi
            {
                MaThietBi = thietBi.MaThietBi,
                MaNguoiThucHien = actorId,
                TrangThaiTruoc = trangThaiCu.ToString(),
                TrangThaiSau = TrangThaiThietBi.SanSang.ToString(),
                TinhTrangTruoc = phieu.MoTaLoi,
                TinhTrangSau = request.KetQuaKiemTra,
                ThoiDiem = DateTime.UtcNow,
                LyDo = $"Hoàn thành nghiệm thu bảo trì #{phieu.MaPhieuBaoTri}: {request.KetQuaKiemTra}"
            });

            await _context.SaveChangesAsync();
            var updated = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            return Result<BaoTriResponse>.Ok(updated!.ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<BaoTriResponse>> KetThucKhongDatAsync(long maPhieuBaoTri, XacNhanBaoTriRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.KetQuaKiemTra))
            return Result<BaoTriResponse>.Loi("KET_QUA_KIEM_TRA_CHUA_DU", "Phải nêu rõ lý do/kết luận không đạt.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            if (phieu == null)
                return Result<BaoTriResponse>.Loi("PHIEU_NOT_FOUND", "Không tìm thấy phiếu bảo trì.");

            if (phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiHoanThanh
                || phieu.TrangThai == KietDomainConstants.BaoTriConfig.TrangThaiKhongDat)
                return Result<BaoTriResponse>.Loi("PHIEU_BAO_TRI_DA_KET_THUC", "Phiếu bảo trì đã kết thúc.");

            var nhanVien = await _context.LayNhanVienAsync(actorId);
            if (nhanVien == null)
                return Result<BaoTriResponse>.Loi("NHAN_VIEN_NOT_FOUND", "Không tìm thấy hồ sơ nhân viên xác nhận.");

            phieu.TrangThai = KietDomainConstants.BaoTriConfig.TrangThaiKhongDat;
            phieu.MaNguoiXacNhanHoanThanh = nhanVien.MaNhanVien;
            phieu.NgayHoanThanhThucTe = request.NgayHoanThanhThucTe ?? DateTime.UtcNow;
            phieu.KetQua = request.KetQuaKiemTra;
            if (request.BangChung != null)
                phieu.BangChung = request.BangChung;
            if (request.ChiPhi.HasValue)
                phieu.ChiPhi = request.ChiPhi.Value;

            // Thiết bị giữ nguyên trạng thái DangBaoTri (không khả dụng) chờ đề nghị giáng cấp / ngừng sử dụng W5-T3
            phieu.ThietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;

            _context.LichSuTinhTrangThietBis.Add(new LichSuTinhTrangThietBi
            {
                MaThietBi = phieu.MaThietBi,
                MaNguoiThucHien = actorId,
                TrangThaiTruoc = TrangThaiThietBi.DangBaoTri.ToString(),
                TrangThaiSau = TrangThaiThietBi.DangBaoTri.ToString(),
                TinhTrangTruoc = phieu.MoTaLoi,
                TinhTrangSau = request.KetQuaKiemTra,
                ThoiDiem = DateTime.UtcNow,
                LyDo = $"Kết thúc bảo trì #{phieu.MaPhieuBaoTri} KHÔNG ĐẠT: {request.KetQuaKiemTra}"
            });

            await _context.SaveChangesAsync();
            var updated = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            return Result<BaoTriResponse>.Ok(updated!.ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }

    private async Task<PhieuBaoTri?> LayPhieuBaoTriDayDuAsync(long maPhieuBaoTri)
    {
        return await _context.PhieuBaoTris
            .Include(p => p.ThietBi)
                .ThenInclude(tb => tb.SanPhamHienTai)
            .Include(p => p.NguoiLap)
            .Include(p => p.NguoiXuLy)
            .Include(p => p.NguoiXacNhanHoanThanh)
            .FirstOrDefaultAsync(p => p.MaPhieuBaoTri == maPhieuBaoTri);
    }

    private async Task<bool> KiemTraQuyenXuLyAsync(PhieuBaoTri phieu, long actorId)
    {
        var taiKhoan = await _context.TaiKhoans.FirstOrDefaultAsync(t => t.MaTaiKhoan == actorId);
        if (taiKhoan?.VaiTro == "QuanTriVien")
            return true;

        var nhanVien = await _context.LayNhanVienAsync(actorId);
        if (nhanVien == null)
            return false;

        return phieu.MaNguoiXuLy.HasValue && phieu.MaNguoiXuLy.Value == nhanVien.MaNhanVien;
    }
}
