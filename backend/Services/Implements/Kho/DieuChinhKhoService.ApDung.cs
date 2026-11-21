using System;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DieuChinhKho;
using GearGo.Models.DTOs.Kho;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

public partial class DieuChinhKhoService
{
    public async Task<Result<DieuChinhKhoResponse>> DuyetVaApDungAsync(long id, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<DieuChinhKhoResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var nhanVien = nvCheck.DuLieu!;
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _context.PhieuDieuChinhKhos.Include(p => p.ChiTietDieuChinhKhos)
                .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == id);
            if (phieu == null)
                return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu điều chỉnh.");
            if (phieu.TrangThai == DomainConstants.Status.Applied)
                return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
            if (phieu.TrangThai == "TuChoi")
                return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidState, "Phiếu điều chỉnh đã bị từ chối trước đó.");

            // Sắp xếp theo ID tăng dần để khóa thiết bị theo thứ tự cố định, tránh deadlock.
            foreach (var ct in phieu.ChiTietDieuChinhKhos.OrderBy(c => c.MaChiTietDieuChinh))
            {
                var ketQuaDong = await ApDungDongDieuChinhAsync(phieu, ct, actorId);
                if (ketQuaDong != null) return ketQuaDong;
            }

            phieu.TrangThai = DomainConstants.Status.Applied;
            phieu.MaNguoiDuyet = nhanVien.MaNhanVien;
            phieu.TenNguoiDuyetLucDuyet = nhanVien.HoTen;
            phieu.ThoiDiemDuyet = DateTime.UtcNow;
            phieu.ThoiDiemApDung = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Result<DieuChinhKhoResponse>.Ok(MapToResponse(phieu));
        }, _logger, IsolationLevel.Serializable);
    }

    private Task<Result<DieuChinhKhoResponse>?> ApDungDongDieuChinhAsync(
        PhieuDieuChinhKho phieu, ChiTietDieuChinhKho ct, long actorId) =>
        phieu.LoaiDieuChinh switch
        {
            DomainConstants.Lifecycle.Downgrade => ApDungGiangCapAsync(phieu, ct, actorId),
            DomainConstants.Lifecycle.Decommission => ApDungNgungSuDungAsync(phieu, ct, actorId),
            "KhaiBaoTrungSaiThietBi" => ApDungKhaiBaoTrungSaiAsync(phieu, ct, actorId),
            "KhaiBaoThieuThietBi" => ApDungKhaiBaoThieuAsync(phieu, ct, actorId),
            "KiemKeSaiLech" => ApDungKiemKeAsync(phieu, ct, actorId),
            // SaiGiaNhap không sửa dòng nhập gốc; giá trị hiệu lực được tính động qua GiaTriNhapHieuLucQuery.
            _ => Task.FromResult<Result<DieuChinhKhoResponse>?>(null)
        };

    private async Task<Result<DieuChinhKhoResponse>?> ApDungGiangCapAsync(
        PhieuDieuChinhKho phieu, ChiTietDieuChinhKho ct, long actorId)
    {
        if (!ct.MaThietBi.HasValue)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Dòng điều chỉnh thiếu mã thiết bị.");

        var tb = await _context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBi == ct.MaThietBi.Value);
        if (tb == null)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị cần giáng cấp.");
        if (tb.TrangThaiSuDung == TrangThaiThietBi.DangThue)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotRecovered, "Thiết bị đang cho thuê, không thể áp dụng giáng cấp.");

        var camKet = await KiemTraCamKetThietBiAsync(tb.MaThietBi, DomainConstants.Lifecycle.Downgrade, actorId);
        if (camKet != null) return camKet;

        long spMoi = tb.MaSanPhamHienTai;
        string tinhTrangMoi = tb.TinhTrang ?? "Bình thường";
        if (!string.IsNullOrWhiteSpace(ct.GiaTriSau))
        {
            using var doc = JsonDocument.Parse(ct.GiaTriSau);
            if (doc.RootElement.TryGetProperty("maSanPhamHienTai", out var spProp) || doc.RootElement.TryGetProperty("MaSanPhamHienTai", out spProp))
                spMoi = spProp.GetInt64();
            if (doc.RootElement.TryGetProperty("tinhTrang", out var ttProp) || doc.RootElement.TryGetProperty("TinhTrang", out ttProp))
                tinhTrangMoi = ttProp.GetString() ?? tinhTrangMoi;
        }

        if (!await _context.SanPhams.AnyAsync(s => s.MaSanPham == spMoi))
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.TargetProductMismatch, $"Sản phẩm đích #{spMoi} không tồn tại.");

        var ttCu = tb.TrangThaiSuDung;
        var tinhTrangCu = tb.TinhTrang;
        tb.MaSanPhamHienTai = spMoi;
        tb.TinhTrang = tinhTrangMoi;

        AuditLogHelper.GhiLichSuThietBi(_context, tb.MaThietBi, actorId, ttCu.ToString(), tb.TrangThaiSuDung.ToString(),
            tinhTrangCu, tb.TinhTrang, $"Duyệt giáng cấp theo phiếu điều chỉnh #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
        return null;
    }

    private async Task<Result<DieuChinhKhoResponse>?> ApDungNgungSuDungAsync(
        PhieuDieuChinhKho phieu, ChiTietDieuChinhKho ct, long actorId)
    {
        if (!ct.MaThietBi.HasValue)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Dòng điều chỉnh thiếu mã thiết bị.");

        var tb = await _context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBi == ct.MaThietBi.Value);
        if (tb == null)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị cần ngừng sử dụng.");
        if (tb.TrangThaiSuDung == TrangThaiThietBi.DangThue)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotRecovered, "Thiết bị đang cho thuê, không thể ngừng sử dụng.");

        var camKet = await KiemTraCamKetThietBiAsync(tb.MaThietBi, DomainConstants.Lifecycle.Decommission, actorId);
        if (camKet != null) return camKet;

        var ttCu = tb.TrangThaiSuDung;
        tb.TrangThaiSuDung = TrangThaiThietBi.NgungSuDung;
        AuditLogHelper.GhiLichSuThietBi(_context, tb.MaThietBi, actorId, ttCu.ToString(), tb.TrangThaiSuDung.ToString(),
            tb.TinhTrang, tb.TinhTrang, $"Duyệt ngừng sử dụng theo phiếu điều chỉnh #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
        return null;
    }

    private async Task<Result<DieuChinhKhoResponse>?> ApDungKhaiBaoTrungSaiAsync(
        PhieuDieuChinhKho phieu, ChiTietDieuChinhKho ct, long actorId)
    {
        if (!ct.MaThietBi.HasValue)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Dòng điều chỉnh thiếu mã thiết bị.");

        var tb = await _context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBi == ct.MaThietBi.Value);
        if (tb == null)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị khai báo sai.");
        if (tb.TrangThaiSuDung == TrangThaiThietBi.DangThue)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotRecovered, "Thiết bị đang cho thuê, không thể loại bỏ khỏi khai thác.");

        // Kiểm tra cam kết lịch thuê tương lai trước khi loại thiết bị khai báo sai (UC7.10 dòng phụ 4.1)
        var loiCamKet = await KiemTraCamKetThietBiAsync(tb.MaThietBi, "NgungSuDung", actorId);
        if (loiCamKet != null) return loiCamKet;

        var ttCu = tb.TrangThaiSuDung;
        var tinhTrangCu = tb.TinhTrang;
        tb.TrangThaiSuDung = TrangThaiThietBi.NgungSuDung;
        tb.TinhTrang = "KhaiBaoSai";

        AuditLogHelper.GhiLichSuThietBi(_context, tb.MaThietBi, actorId, ttCu.ToString(), tb.TrangThaiSuDung.ToString(),
            tinhTrangCu, tb.TinhTrang, $"Loại bỏ hồ sơ khai báo sai theo phiếu điều chỉnh #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
        return null;
    }

    private async Task<Result<DieuChinhKhoResponse>?> ApDungKhaiBaoThieuAsync(
        PhieuDieuChinhKho phieu, ChiTietDieuChinhKho ct, long actorId)
    {
        if (!ct.MaChiTietPhieuNhap.HasValue)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.InvalidData, "Thiếu mã chi tiết phiếu nhập gốc để bổ sung thiết bị.");

        var ctpn = await _context.ChiTietPhieuNhaps.Include(c => c.SanPham)
            .FirstOrDefaultAsync(c => c.MaChiTietPhieuNhap == ct.MaChiTietPhieuNhap.Value);
        if (ctpn == null)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.DetailNotFound, "Không tìm thấy dòng chi tiết phiếu nhập gốc.");

        string prefix = ctpn.SanPham?.TenSanPham != null ? ctpn.SanPham.TenSanPham.Split(' ')[0].ToUpper() : "TB";
        var tbMoi = new ThietBi
        {
            MaChiTietPhieuNhap = ctpn.MaChiTietPhieuNhap,
            MaSanPhamHienTai = ctpn.MaSanPham,
            MaThietBiHienThi = $"TB-{prefix}-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
            GiaNhap = ctpn.DonGiaNhap,
            TrangThaiSuDung = TrangThaiThietBi.SanSang,
            TinhTrang = "Mới (Bổ sung từ đợt nhập cũ)"
        };
        _context.ThietBis.Add(tbMoi);
        await _context.SaveChangesAsync();

        ct.MaThietBi = tbMoi.MaThietBi;
        AuditLogHelper.GhiLichSuThietBi(_context, tbMoi.MaThietBi, actorId, "KhoiTao", tbMoi.TrangThaiSuDung.ToString(),
            null, tbMoi.TinhTrang, $"Bổ sung thiết bị thiếu từ phiếu nhập #{ctpn.MaPhieuNhap} theo phiếu điều chỉnh #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
        return null;
    }

    private async Task<Result<DieuChinhKhoResponse>?> ApDungKiemKeAsync(
        PhieuDieuChinhKho phieu, ChiTietDieuChinhKho ct, long actorId)
    {
        if (!ct.MaThietBi.HasValue) return null;

        var tb = await _context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBi == ct.MaThietBi.Value);
        if (tb == null || string.IsNullOrWhiteSpace(ct.GiaTriSau)) return null;

        if (tb.TrangThaiSuDung == TrangThaiThietBi.DangThue)
            return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.EquipmentNotRecovered,
                "Thiết bị đang cho thuê ở khách, không thể điều chỉnh giảm/chuyển trạng thái qua kiểm kê (UC6.11).");

        using var doc = JsonDocument.Parse(ct.GiaTriSau);
        var ttCu = tb.TrangThaiSuDung;
        var tinhTrangCu = tb.TinhTrang;

        if ((doc.RootElement.TryGetProperty("trangThaiSuDung", out var ttProp) || doc.RootElement.TryGetProperty("TrangThaiSuDung", out ttProp)) &&
            Enum.TryParse<TrangThaiThietBi>(ttProp.GetString(), true, out var newTt))
        {
            // Nếu điều chỉnh sang trạng thái không sẵn sàng (Mất/Ngừng sử dụng/Bảo trì) phải kiểm tra cam kết lịch tương lai (UC6.11.1)
            if (newTt != TrangThaiThietBi.SanSang)
            {
                var loiCamKet = await KiemTraCamKetThietBiAsync(tb.MaThietBi, "NgungSuDung", actorId);
                if (loiCamKet != null) return loiCamKet;
            }
            tb.TrangThaiSuDung = newTt;
        }
        if (doc.RootElement.TryGetProperty("tinhTrang", out var condProp) || doc.RootElement.TryGetProperty("TinhTrang", out condProp))
            tb.TinhTrang = condProp.GetString() ?? tb.TinhTrang;

        AuditLogHelper.GhiLichSuThietBi(_context, tb.MaThietBi, actorId, ttCu.ToString(), tb.TrangThaiSuDung.ToString(),
            tinhTrangCu, tb.TinhTrang, $"Điều chỉnh sau kiểm kê theo phiếu #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
        return null;
    }

    private async Task<Result<DieuChinhKhoResponse>?> KiemTraCamKetThietBiAsync(
        long maThietBi, string loaiThayDoi, long actorId)
    {
        if (_khoService == null) return null;

        var check = await _khoService.PhanTichAnhHuongAsync(new PhanTichAnhHuongRequest
        {
            MaThietBi = maThietBi,
            LoaiThayDoi = loaiThayDoi
        }, actorId);
        if (check.ThanhCong && check.DuLieu!.CoTheApDungHienTai) return null;

        string vuongMac = check.DuLieu != null
            ? string.Join("; ", check.DuLieu.VuongMac.Concat(check.DuLieu.ThieuSoLuongTheoLich))
            : "Vướng cam kết đơn thuê";
        return Result<DieuChinhKhoResponse>.Loi(DomainConstants.Errors.AdjustmentViolatesCommitment,
            $"Không thể duyệt do phát sinh thiếu cam kết: {vuongMac}");
    }
}
