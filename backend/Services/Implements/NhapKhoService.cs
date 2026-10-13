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

namespace GearGo.Services.Implements;

public class NhapKhoService : INhapKhoService
{
    private readonly ApplicationDbContext _context;

    public NhapKhoService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<KetQuaNhapKhoResponse>> XacNhanNhapKhoAsync(long phieuId, XacNhanNhapKhoRequest request, long actorId)
    {
        // 1. Lấy thông tin diễn viên, đảm bảo là Quản trị viên
        var account = await _context.TaiKhoans
            .Include(t => t.NhanVien)
            .FirstOrDefaultAsync(t => t.MaTaiKhoan == actorId);

        if (account == null || account.VaiTro != "QuanTriVien" || account.NhanVien == null || account.NhanVien.TrangThaiLamViec != "DangLamViec")
        {
            return Result<KetQuaNhapKhoResponse>.Loi("FORBIDDEN", "Chỉ quản trị viên mới được xác nhận nhập kho.");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Lock phiếu nhập để tránh conflict
            var phieuNhap = await _context.PhieuNhapHangs
                .Include(p => p.NhaCungCap)
                .Include(p => p.ChiTietPhieuNhaps)
                    .ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(p => p.MaPhieuNhap == phieuId);

            if (phieuNhap == null)
            {
                return Result<KetQuaNhapKhoResponse>.Loi("PHIEU_KHONG_TON_TAI", "Phiếu nhập không tồn tại.");
            }

            // Kiểm tra trạng thái hiện tại
            if (phieuNhap.TrangThai == TrangThaiPhieuNhap.DaNhapKho)
            {
                return Result<KetQuaNhapKhoResponse>.Loi("PHIEU_DA_NHAP_KHAC_DU_LIEU", "Phiếu nhập đã được xác nhận nhập kho trước đó.");
            }

            if (phieuNhap.TrangThai == TrangThaiPhieuNhap.DaHuy)
            {
                return Result<KetQuaNhapKhoResponse>.Loi("PHIEU_DA_HUY", "Phiếu nhập đã bị hủy.");
            }

            // 2. Kiểm tra nhà cung cấp
            if (phieuNhap.NhaCungCap == null || phieuNhap.NhaCungCap.TrangThaiHopTac != "DangHopTac")
            {
                return Result<KetQuaNhapKhoResponse>.Loi("NCC_NGUNG_HOP_TAC", "Nhà cung cấp đã ngừng hợp tác.");
            }

            // 3. Kiểm tra ngày nhập thực tế
            if (request.NgayNhapThucTe > DateTimeOffset.UtcNow)
            {
                return Result<KetQuaNhapKhoResponse>.Loi("NGAY_NHAP_KHONG_HOP_LE", "Ngày nhập thực tế không được ở tương lai.");
            }

            // 4. Validate các dòng và mã thiết bị
            var errorDetails = KiemTraDuLieuNhap(phieuNhap, request);
            if (errorDetails.Any())
            {
                return Result<KetQuaNhapKhoResponse>.Loi("SO_MA_KHONG_KHOP", "Dữ liệu dòng nhập không khớp.", errorDetails);
            }

            var allMaHienThi = request.DanhSachDong.SelectMany(d => d.ThietBi).Select(t => t.MaHienThi).ToList();
            if (allMaHienThi.Distinct().Count() != allMaHienThi.Count)
            {
                return Result<KetQuaNhapKhoResponse>.Loi("MA_THIET_BI_TRUNG", "Mã thiết bị bị trùng trong request.");
            }

            var existingThietBi = await _context.ThietBis
                .Where(t => allMaHienThi.Contains(t.MaThietBiHienThi))
                .Select(t => t.MaThietBiHienThi)
                .ToListAsync();

            if (existingThietBi.Any())
            {
                return Result<KetQuaNhapKhoResponse>.Loi("MA_THIET_BI_TRUNG", $"Các mã thiết bị đã tồn tại trong hệ thống: {string.Join(", ", existingThietBi)}");
            }

            // 5. Tính tổng và chốt thông tin
            // Cập nhật snapshot cho phiếu nhập
            phieuNhap.ThongTinNhaCungCapLucNhap = JsonSerializer.Serialize(new { phieuNhap.NhaCungCap.TenNhaCungCap, phieuNhap.NhaCungCap.SoDienThoai });
            phieuNhap.TenNguoiXacNhanLucNhap = account.NhanVien.HoTen;
            phieuNhap.NgayNhapThucTe = request.NgayNhapThucTe.UtcDateTime;
            phieuNhap.NgayXacNhan = DateTime.UtcNow;
            phieuNhap.MaNguoiXacNhan = account.NhanVien.MaNhanVien;
            phieuNhap.TrangThai = TrangThaiPhieuNhap.DaNhapKho;

            // 6. Tạo thiết bị và phiếu bảo trì
            var thietBis = new List<ThietBi>();
            var phieuBaoTris = new List<PhieuBaoTri>();
            decimal newTongTien = 0;

            foreach (var dongReq in request.DanhSachDong)
            {
                var chiTiet = phieuNhap.ChiTietPhieuNhaps.First(c => c.MaChiTietPhieuNhap == dongReq.MaChiTietPhieuNhap);
                
                chiTiet.SoLuong = dongReq.ThietBi.Count;
                chiTiet.TenSanPhamLucNhap = chiTiet.SanPham.TenSanPham;
                newTongTien += chiTiet.SoLuong * chiTiet.DonGiaNhap;

                foreach (var tbReq in dongReq.ThietBi)
                {
                    var thietBi = new ThietBi
                    {
                        MaChiTietPhieuNhap = chiTiet.MaChiTietPhieuNhap,
                        MaSanPhamHienTai = chiTiet.MaSanPham,
                        MaThietBiHienThi = tbReq.MaHienThi,
                        NgayNhap = request.NgayNhapThucTe.UtcDateTime,
                        GiaNhap = chiTiet.DonGiaNhap,
                        TinhTrang = tbReq.TinhTrang,
                        PhuKienDiKem = tbReq.PhuKien != null ? JsonSerializer.Serialize(tbReq.PhuKien) : null,
                        TrangThaiSuDung = tbReq.CanBaoTri ? TrangThaiThietBi.DangBaoTri : TrangThaiThietBi.SanSang,
                        GhiChu = tbReq.GhiChu
                    };

                    _context.ThietBis.Add(thietBi);
                    thietBis.Add(thietBi);

                    var lichSu = new LichSuTinhTrangThietBi
                    {
                        ThietBi = thietBi,
                        MaNguoiThucHien = actorId,
                        TrangThaiTruoc = null,
                        TrangThaiSau = thietBi.TrangThaiSuDung.ToString(),
                        TinhTrangTruoc = null,
                        TinhTrangSau = tbReq.TinhTrang,
                        ThoiDiem = DateTime.UtcNow,
                        LyDo = "Nhập kho mới",
                        ThamChieuChungTu = JsonSerializer.Serialize(new { MaPhieuNhap = phieuNhap.MaPhieuNhap })
                    };
                    _context.LichSuTinhTrangThietBis.Add(lichSu);

                    if (tbReq.CanBaoTri)
                    {
                        var pbt = new PhieuBaoTri
                        {
                            ThietBi = thietBi,
                            MaNguoiLap = account.NhanVien.MaNhanVien,
                            LoaiXuLy = "Sửa chữa sau nhập",
                            MoTaLoi = tbReq.MoTaLoi,
                            NgayBatDau = DateTime.UtcNow,
                            BangChung = tbReq.BangChung,
                            TrangThai = "ChoXuLy"
                        };
                        _context.PhieuBaoTris.Add(pbt);
                        phieuBaoTris.Add(pbt);
                    }
                }
            }

            phieuNhap.TongTien = newTongTien;

            var nhatKy = new NhatKyThaoTac
            {
                MaTaiKhoan = actorId,
                HanhDong = "XAC_NHAN_NHAP_KHO",
                LoaiDoiTuong = "PHIEU_NHAP_HANG",
                MaDoiTuong = phieuNhap.MaPhieuNhap.ToString(),
                DuLieuTruoc = JsonSerializer.Serialize(new { TrangThai = "Nhap" }),
                DuLieuSau = JsonSerializer.Serialize(new { TrangThai = "DaNhapKho", SoThietBi = thietBis.Count }),
                ThoiDiem = DateTime.UtcNow,
                LyDo = "Hoàn tất xác nhận nhập kho"
            };
            _context.NhatKyThaoTacs.Add(nhatKy);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var response = new KetQuaNhapKhoResponse
            {
                MaPhieu = phieuNhap.MaPhieuNhap,
                TrangThai = phieuNhap.TrangThai.ToString(),
                SoDaNhap = thietBis.Count,
                SoSanSang = thietBis.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.SanSang),
                SoBaoTri = thietBis.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.DangBaoTri),
                ThietBi = thietBis.Select(t => new ThietBiResponse
                {
                    MaThietBi = t.MaThietBi,
                    MaThietBiHienThi = t.MaThietBiHienThi,
                    MaSanPhamHienTai = t.MaSanPhamHienTai,
                    MaChiTietPhieuNhap = t.MaChiTietPhieuNhap,
                    TrangThaiSuDung = t.TrangThaiSuDung.ToString(),
                    TinhTrang = t.TinhTrang ?? "",
                    GiaNhap = t.GiaNhap,
                    NgayNhap = t.NgayNhap
                }).ToList()
            };

            return Result<KetQuaNhapKhoResponse>.Ok(response);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Result<KetQuaNhapKhoResponse>.Loi("LOI_HE_THONG", "Lỗi trong quá trình xác nhận nhập kho: " + ex.Message);
        }
    }

    private List<object> KiemTraDuLieuNhap(PhieuNhapHang phieuNhap, XacNhanNhapKhoRequest request)
    {
        var errors = new List<object>();
        var chiTietIds = phieuNhap.ChiTietPhieuNhaps.Select(c => c.MaChiTietPhieuNhap).ToList();

        foreach (var dongReq in request.DanhSachDong)
        {
            if (!chiTietIds.Contains(dongReq.MaChiTietPhieuNhap))
            {
                errors.Add(new { MaChiTietPhieuNhap = dongReq.MaChiTietPhieuNhap, Loi = "Dòng không thuộc phiếu nhập này" });
            }
        }
        return errors;
    }
}
