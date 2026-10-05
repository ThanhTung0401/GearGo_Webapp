using System.Data;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BanGiao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class BanGiaoService : IBanGiaoService
{
    private readonly ApplicationDbContext _context;

    public BanGiaoService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PhieuBanGiaoResponse>> LayTheoDonAsync(long maDonThue)
    {
        var phieu = await _context.PhieuBanGiaos
            .Include(p => p.ChiTietBanGiaos)
            .FirstOrDefaultAsync(p => p.MaDonThue == maDonThue);

        if (phieu == null)
            return Result<PhieuBanGiaoResponse>
                .Loi("NOT_FOUND", "Đơn thuê này chưa có biên bản bàn giao.");

        return Result<PhieuBanGiaoResponse>.Ok(MapToResponse(phieu));
    }

    public async Task<Result<PhieuBanGiaoResponse>> TaoHoacLayPhieuBanGiaoNhapAsync
            (long maDonThue, long maNhanVienTao)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var donThue = await _context.DonThues
                .Include(d => d.ChiTietDonThues)
                .FirstOrDefaultAsync(d => d.MaDonThue == maDonThue);

            if (donThue == null)
                return Result<PhieuBanGiaoResponse>.Loi("DON_NOT_FOUND", "Không tìm thấy đơn thuê.");

            if (donThue.TrangThai != TrangThaiDonThue.SanSangNhan)
                return Result<PhieuBanGiaoResponse>.Loi("INVALID_STATE", "Đơn thuê chưa sẵn sàng bàn giao.");

            // Nếu đã có phiếu nháp thì lấy lên
            var phieuDaCo = await _context.PhieuBanGiaos
                .Include(p => p.ChiTietBanGiaos)
                .FirstOrDefaultAsync(p => p.MaDonThue == maDonThue);

            if (phieuDaCo != null)
                return Result<PhieuBanGiaoResponse>.Ok(MapToResponse(phieuDaCo));

            // Khởi tạo phiếu nháp
            var phieuMoi = new PhieuBanGiao
            {
                MaDonThue = maDonThue,
                MaNhanVien = maNhanVienTao,
                TrangThai = "ChoGiao",
                ThoiDiemLap = DateTime.UtcNow
            };

            _context.PhieuBanGiaos.Add(phieuMoi);

            foreach (var chiTietDon in donThue.ChiTietDonThues)
            {
                var phanCongs = await _context.PhanCongThietBis
                    .Where(pc => pc.MaChiTietDon == chiTietDon.MaChiTietDon && pc.TrangThai == "DaPhanCong")
                    .ToListAsync();
                foreach (var phanCong in phanCongs)
                {
                    var ctBanGiao = new ChiTietBanGiao
                    {
                        PhieuBanGiao = phieuMoi,
                        MaPhanCong = phanCong.MaPhanCong,
                        TinhTrangTruocThue = "Hoạt động bình thường"
                    };
                    _context.ChiTietBanGiaos.Add(ctBanGiao);
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<PhieuBanGiaoResponse>.Ok(MapToResponse(phieuMoi));
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<PhieuBanGiaoResponse>.Loi("SYS_ERROR", "Lỗi: " + e.Message);
        }
    }

    public async Task<Result<PhieuBanGiaoResponse>> CapNhatPhieuBanGiaoNhapAsync
            (long maPhieuBanGiao, CapNhatPhieuBanGiaoRequest request)
    {
        var phieu = await _context.PhieuBanGiaos
            .Include(p => p.ChiTietBanGiaos)
            .FirstOrDefaultAsync(p => p.MaPhieuBanGiao == maPhieuBanGiao);

        if (phieu == null)
            return Result<PhieuBanGiaoResponse>.Loi("NOT_FOUND", "Không tìm thấy phiếu.");
        if (phieu.TrangThai == "DaGiao")
            return Result<PhieuBanGiaoResponse>.Loi("LOCKED", "Phiếu đã chốt không thể sửa.");

        // Cập nhật thông tin phiếu
        phieu.TenNguoiNhanThucTe = request.TenNguoiNhanThucTe;
        phieu.ThoiDiemKhachXacNhan = request.ThoiDiemKhachXacNhan;
        phieu.BangChungXacNhan = request.BangChungXacNhan;
        phieu.GhiChu = request.GhiChu;

        // Cập nhật chi tiết
        foreach (var reqChiTiet in request.ChiTiet)
        {
            var dbChiTiet = phieu.ChiTietBanGiaos
                .FirstOrDefault(c => c.MaPhanCong == reqChiTiet.MaPhanCong);

            if (dbChiTiet != null)
            {
                dbChiTiet.TinhTrangTruocThue = reqChiTiet.TinhTrangTruocThue;
                dbChiTiet.PhuKienThucGiao = reqChiTiet.PhuKienThucGiao;
                dbChiTiet.DanhSachAnh = reqChiTiet.DanhSachAnh;
                dbChiTiet.GhiChu = reqChiTiet.GhiChu;
            }
        }

        await _context.SaveChangesAsync();
        return Result<PhieuBanGiaoResponse>.Ok(MapToResponse(phieu));
    }

    public async Task<Result<bool>> ChotBanGiaoAsync
            (long maPhieuBanGiao, ChotBanGiaoRequest request, long maNhanVienChot)
    {
        using var transaction = await _context.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            var phieu = await _context.PhieuBanGiaos
                .Include(p => p.DonThue)
                .ThenInclude(d => d.ChiTietDonThues)
                .Include(p => p.ChiTietBanGiaos)
                .ThenInclude(c => c.PhanCongThietBi)
                .ThenInclude(pc => pc.ThietBi)
                .FirstOrDefaultAsync(p => p.MaPhieuBanGiao == maPhieuBanGiao);

            if (phieu == null)
                return Result<bool>.Loi("NOT_FOUND", "Không tìm thấy phiếu.");
            if (phieu.TrangThai == "DaGiao")
                return Result<bool>.Loi("LOCKED", "Phiếu đã chốt.");

            var nhanVienThucHien = await _context.NhanViens
                .FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVienChot);
            var tenNhanVien = nhanVienThucHien?.HoTen ?? "Nhân viên ?";

            // Chốt phiếu
            phieu.ChotPhieu(request.TenNguoiNhanThucTe, tenNhanVien);

            // Kiểm tra thanh toán
            decimal tongTienYeuCau = phieu.DonThue.ChiTietDonThues.Sum(c =>
                c.DonGiaThueMoiNgay * c.SoNgayTinhTien + c.MucCocMoiThietBi - c.TienGiam);
            decimal tongDaDong = await _context.ThanhToans
                .Where(t => t.MaDonThue == phieu.MaDonThue && t.TrangThai == "ThanhCong")
                .SumAsync(t => t.TongSoTien);
            if (tongDaDong < tongTienYeuCau)
            {
                return Result<bool>.Loi("CHUA_THANH_TOAN_DU",
                    $"Đơn thuê này chưa thanh toán đủ. Yêu cầu: {tongTienYeuCau}, Đã đóng: {tongDaDong}");
            }

            // Ghi lịch sử đơn
            _context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = phieu.MaDonThue,
                TrangThaiTruoc = TrangThaiDonThue.SanSangNhan.ToString(),
                TrangThaiSau = TrangThaiDonThue.DangThue.ToString(),
                ThoiDiem = DateTime.UtcNow,
                LyDo = "Khách hàng đã nhận thiết bị thành công"
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return Result<bool>.Ok(true);
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<bool>.Loi("SYS_ERROR", e.Message);
        }
    }

    private PhieuBanGiaoResponse MapToResponse(PhieuBanGiao entity)
    {
        return new PhieuBanGiaoResponse(
            entity.MaPhieuBanGiao, entity.MaDonThue, entity.MaNhanVien,
            entity.ThoiDiemLap, entity.ThoiDiemGiaoThucTe,
            entity.TenNhanVienLucGiao, entity.TenNguoiNhanThucTe,
            entity.TrangThai,
            entity.ChiTietBanGiaos.Select(c => new ChiTietBanGiaoResponse(
                c.MaChiTietBanGiao, c.MaPhanCong, c.TinhTrangTruocThue,
                c.PhuKienThucGiao, c.DanhSachAnh
            )).ToList()
        );
    }
}
