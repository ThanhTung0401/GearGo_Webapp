using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhieuNhap;
using GearGo.Models.DTOs.ThietBi;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Dịch vụ xác nhận nhập kho và sinh hồ sơ thiết bị thực tế.
/// </summary>
public class NhapKhoService : INhapKhoService
{
    private readonly ApplicationDbContext _context;

    public NhapKhoService(ApplicationDbContext context) => _context = context;

    public async Task<Result<KetQuaNhapKhoResponse>> XacNhanNhapKhoAsync(long phieuId, XacNhanNhapKhoRequest request, long actorId)
    {
        var account = await _context.TaiKhoans.Include(t => t.NhanVien)
            .FirstOrDefaultAsync(t => t.MaTaiKhoan == actorId);
        // [PN-06] Bỏ hard-coded account.VaiTro != "QuanTriVien": quyền PhieuNhap.Duyet đã được kiểm tra ở controller.
        // Nhân viên kho được cấp quyền PhieuNhap_Duyet phải xác nhận nhập kho được.
        if (account == null || account.TrangThai != "HoatDong" || account.NhanVien == null || account.NhanVien.TrangThaiLamViec != "DangLamViec")
            return Result<KetQuaNhapKhoResponse>.Loi("FORBIDDEN", "Tài khoản không hoạt động hoặc nhân sự đã nghỉ việc, không thể xác nhận nhập kho.");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var phieuNhap = await _context.PhieuNhapHangs
                .Include(p => p.NhaCungCap)
                .Include(p => p.ChiTietPhieuNhaps).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(p => p.MaPhieuNhap == phieuId);

            var loiHopLe = await KiemTraDieuKienNhapKhoAsync(phieuNhap, request);
            if (loiHopLe != null) return loiHopLe;

            ChotThongTinPhieuNhap(phieuNhap!, account.NhanVien, request.NgayNhapThucTe);
            var thietBis = TaoThietBiVaLichSu(phieuNhap!, request, account.NhanVien.MaNhanVien, actorId);

            _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
            {
                MaTaiKhoan = actorId, HanhDong = "XAC_NHAN_NHAP_KHO", LoaiDoiTuong = "PHIEU_NHAP_HANG",
                MaDoiTuong = phieuNhap!.MaPhieuNhap.ToString(),
                DuLieuTruoc = JsonSerializer.Serialize(new { TrangThai = "Nhap" }),
                DuLieuSau = JsonSerializer.Serialize(new { TrangThai = "DaNhapKho", SoThietBi = thietBis.Count }),
                ThoiDiem = DateTime.UtcNow, LyDo = "Hoàn tất xác nhận nhập kho"
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return Result<KetQuaNhapKhoResponse>.Ok(DungKetQuaNhapKho(phieuNhap, thietBis));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<KetQuaNhapKhoResponse>.Loi("LOI_HE_THONG", "Lỗi trong quá trình xác nhận nhập kho: " + ex.Message);
        }
    }

    private async Task<Result<KetQuaNhapKhoResponse>?> KiemTraDieuKienNhapKhoAsync(
        PhieuNhapHang? phieuNhap, XacNhanNhapKhoRequest request)
    {
        if (phieuNhap == null)
            return Result<KetQuaNhapKhoResponse>.Loi("PHIEU_KHONG_TON_TAI", "Phiếu nhập không tồn tại.");
        if (phieuNhap.TrangThai == TrangThaiPhieuNhap.DaNhapKho)
            return Result<KetQuaNhapKhoResponse>.Loi("PHIEU_DA_NHAP_KHAC_DU_LIEU", "Phiếu nhập đã được xác nhận nhập kho trước đó.");
        if (phieuNhap.TrangThai == TrangThaiPhieuNhap.DaHuy)
            return Result<KetQuaNhapKhoResponse>.Loi("PHIEU_DA_HUY", "Phiếu nhập đã bị hủy.");
        if (phieuNhap.NhaCungCap == null || phieuNhap.NhaCungCap.TrangThaiHopTac != "DangHopTac")
            return Result<KetQuaNhapKhoResponse>.Loi("NCC_NGUNG_HOP_TAC", "Nhà cung cấp đã ngừng hợp tác.");
        if (request.NgayNhapThucTe > DateTimeOffset.UtcNow)
            return Result<KetQuaNhapKhoResponse>.Loi("NGAY_NHAP_KHONG_HOP_LE", "Ngày nhập thực tế không được ở tương lai.");

        var errorDetails = KiemTraDuLieuNhap(phieuNhap, request);
        if (errorDetails.Any())
            return Result<KetQuaNhapKhoResponse>.Loi("SO_MA_KHONG_KHOP", "Dữ liệu dòng nhập không khớp.", errorDetails);

        var allMaHienThi = request.DanhSachDong.SelectMany(d => d.ThietBi).Select(t => t.MaHienThi).ToList();
        if (allMaHienThi.Distinct().Count() != allMaHienThi.Count)
            return Result<KetQuaNhapKhoResponse>.Loi("MA_THIET_BI_TRUNG", "Mã thiết bị bị trùng trong request.");

        var existingThietBi = await _context.ThietBis
            .Where(t => allMaHienThi.Contains(t.MaThietBiHienThi))
            .Select(t => t.MaThietBiHienThi).ToListAsync();
        if (existingThietBi.Any())
            return Result<KetQuaNhapKhoResponse>.Loi("MA_THIET_BI_TRUNG", $"Các mã thiết bị đã tồn tại trong hệ thống: {string.Join(", ", existingThietBi)}");

        return null;
    }

    private static void ChotThongTinPhieuNhap(PhieuNhapHang phieuNhap, NhanVien nhanVien, DateTimeOffset ngayNhapThucTe)
    {
        phieuNhap.ThongTinNhaCungCapLucNhap = JsonSerializer.Serialize(new { phieuNhap.NhaCungCap!.TenNhaCungCap, phieuNhap.NhaCungCap.SoDienThoai });
        phieuNhap.TenNguoiXacNhanLucNhap = nhanVien.HoTen;
        phieuNhap.NgayNhapThucTe = ngayNhapThucTe.UtcDateTime;
        phieuNhap.NgayXacNhan = DateTime.UtcNow;
        phieuNhap.MaNguoiXacNhan = nhanVien.MaNhanVien;
        phieuNhap.TrangThai = TrangThaiPhieuNhap.DaNhapKho;
    }

    private List<ThietBi> TaoThietBiVaLichSu(
        PhieuNhapHang phieuNhap, XacNhanNhapKhoRequest request, long maNhanVien, long actorId)
    {
        var thietBis = new List<ThietBi>();
        decimal newTongTien = 0;

        foreach (var dongReq in request.DanhSachDong)
        {
            var chiTiet = phieuNhap.ChiTietPhieuNhaps.First(c => c.MaChiTietPhieuNhap == dongReq.MaChiTietPhieuNhap);
            // [PN-08] Lưu dấu vết số lượng từ chối trả NCC trước khi ghi đè SoLuong thực nhận.
            var soLuongDuKien = chiTiet.SoLuong;
            var soLuongThucNhan = dongReq.ThietBi.Count;
            if (soLuongThucNhan < soLuongDuKien)
            {
                var auditNote = $"Dự kiến: {soLuongDuKien}, Thực nhận: {soLuongThucNhan}, Từ chối trả NCC: {soLuongDuKien - soLuongThucNhan}";
                chiTiet.GhiChu = string.IsNullOrWhiteSpace(chiTiet.GhiChu) ? auditNote : $"{chiTiet.GhiChu} | {auditNote}";
            }
            chiTiet.SoLuong = soLuongThucNhan;
            chiTiet.TenSanPhamLucNhap = chiTiet.SanPham.TenSanPham;
            newTongTien += chiTiet.SoLuong * chiTiet.DonGiaNhap;

            foreach (var tbReq in dongReq.ThietBi)
            {
                var thietBi = new ThietBi
                {
                    MaChiTietPhieuNhap = chiTiet.MaChiTietPhieuNhap, MaSanPhamHienTai = chiTiet.MaSanPham,
                    MaThietBiHienThi = tbReq.MaHienThi, NgayNhap = request.NgayNhapThucTe.UtcDateTime,
                    GiaNhap = chiTiet.DonGiaNhap, TinhTrang = tbReq.TinhTrang,
                    PhuKienDiKem = tbReq.PhuKien != null ? JsonSerializer.Serialize(tbReq.PhuKien) : null,
                    TrangThaiSuDung = tbReq.CanBaoTri ? TrangThaiThietBi.DangBaoTri : TrangThaiThietBi.SanSang,
                    GhiChu = tbReq.GhiChu
                };
                _context.ThietBis.Add(thietBi);
                thietBis.Add(thietBi);

                _context.LichSuTinhTrangThietBis.Add(new LichSuTinhTrangThietBi
                {
                    ThietBi = thietBi, MaNguoiThucHien = actorId, TrangThaiTruoc = null,
                    TrangThaiSau = thietBi.TrangThaiSuDung.ToString(), TinhTrangTruoc = null,
                    TinhTrangSau = tbReq.TinhTrang, ThoiDiem = DateTime.UtcNow, LyDo = "Nhập kho mới",
                    ThamChieuChungTu = JsonSerializer.Serialize(new { MaPhieuNhap = phieuNhap.MaPhieuNhap })
                });

                if (tbReq.CanBaoTri)
                {
                    _context.PhieuBaoTris.Add(new PhieuBaoTri
                    {
                        ThietBi = thietBi, MaNguoiLap = maNhanVien, LoaiXuLy = "Sửa chữa sau nhập",
                        MoTaLoi = tbReq.MoTaLoi, NgayBatDau = DateTime.UtcNow,
                        BangChung = tbReq.BangChung, TrangThai = "ChoXuLy"
                    });
                }
            }
        }

        phieuNhap.TongTien = newTongTien;
        return thietBis;
    }

    private static KetQuaNhapKhoResponse DungKetQuaNhapKho(PhieuNhapHang phieuNhap, List<ThietBi> thietBis) => new()
    {
        MaPhieu = phieuNhap.MaPhieuNhap, TrangThai = phieuNhap.TrangThai.ToString(),
        SoDaNhap = thietBis.Count,
        SoSanSang = thietBis.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.SanSang),
        SoBaoTri = thietBis.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.DangBaoTri),
        ThietBi = thietBis.Select(t => new ThietBiResponse
        {
            MaThietBi = t.MaThietBi, MaThietBiHienThi = t.MaThietBiHienThi,
            MaSanPhamHienTai = t.MaSanPhamHienTai, MaChiTietPhieuNhap = t.MaChiTietPhieuNhap,
            TrangThaiSuDung = t.TrangThaiSuDung.ToString(), TinhTrang = t.TinhTrang ?? "",
            GiaNhap = t.GiaNhap, NgayNhap = t.NgayNhap
        }).ToList()
    };

    private static List<object> KiemTraDuLieuNhap(PhieuNhapHang phieuNhap, XacNhanNhapKhoRequest request)
    {
        var chiTietIds = phieuNhap.ChiTietPhieuNhaps.Select(c => c.MaChiTietPhieuNhap).ToHashSet();
        return request.DanhSachDong
            .Where(dongReq => !chiTietIds.Contains(dongReq.MaChiTietPhieuNhap))
            .Select(dongReq => (object)new { MaChiTietPhieuNhap = dongReq.MaChiTietPhieuNhap, Loi = "Dòng không thuộc phiếu nhập này" })
            .ToList();
    }
}
