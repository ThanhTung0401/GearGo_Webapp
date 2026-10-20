using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.DTOs.KhuyenMai;
using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements;
using GearGo.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Bộ kiểm thử nghiệm thu tự động cho Week 6 (W6-T2 & W6-T3 - Kiện Minh):
/// Kiểm tra W6-05 đến W6-11 theo đúng đặc tả Plan_Week6.md
/// </summary>
public class KhuyenMaiTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly DuLieuMau _du;

    public KhuyenMaiTests()
    {
        using var ctx = _db.NewContext();
        _du = Seed.CoBan(ctx);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task W6_05_ValidateMaTrung_ThoiHanSai_PhanTramNgoaiMien_PhamViRong()
    {
        using var s = _db.Mo();
        var adminKmService = new QuanTriKhuyenMaiService(s.Ctx);
        var now = DateTime.UtcNow;

        // 1. Tạo mã SUMMER2026 hợp lệ
        var tao1 = await adminKmService.TaoAsync(new TaoKhuyenMaiRequest
        {
            MaGiamGia = " summer2026 ", // có khoảng trắng và chữ thường
            TenKhuyenMai = "Mùa hè sôi động",
            LoaiGiam = LoaiKhuyenMai.PhanTram,
            GiaTriGiam = 15,
            TienThueToiThieu = 200_000,
            PhamVi = PhamViApDung.TatCa,
            BatDau = now,
            KetThuc = now.AddDays(10),
            GioiHanTongLuot = 50
        }, _du.TkQuanTri);

        Assert.True(tao1.ThanhCong);
        Assert.Equal("SUMMER2026", tao1.DuLieu!.MaGiamGia); // Đã được chuẩn hóa Trim + Uppercase

        // 2. Tạo mã trùng chữ thường "summer2026" -> Bị từ chối 409 MA_GIAM_GIA_TRUNG
        var taoTrung = await adminKmService.TaoAsync(new TaoKhuyenMaiRequest
        {
            MaGiamGia = "SUMMER2026",
            LoaiGiam = LoaiKhuyenMai.SoTien,
            GiaTriGiam = 50_000,
            PhamVi = PhamViApDung.TatCa,
            BatDau = now,
            KetThuc = now.AddDays(5)
        }, _du.TkQuanTri);

        Assert.False(taoTrung.ThanhCong);
        Assert.Equal("MA_GIAM_GIA_TRUNG", taoTrung.MaLoi);

        // 3. Thời hạn sai: Bắt đầu sau kết thúc
        var taoSaiThoiGian = await adminKmService.TaoAsync(new TaoKhuyenMaiRequest
        {
            MaGiamGia = "SAITHIETBI",
            LoaiGiam = LoaiKhuyenMai.SoTien,
            GiaTriGiam = 20_000,
            PhamVi = PhamViApDung.TatCa,
            BatDau = now.AddDays(5),
            KetThuc = now // BatDau > KetThuc
        }, _du.TkQuanTri);

        Assert.False(taoSaiThoiGian.ThanhCong);
        Assert.Equal("CAU_HINH_GIAM_KHONG_HOP_LE", taoSaiThoiGian.MaLoi);

        // 4. Phần trăm ngoài miền: 150%
        var taoSaiPhanTram = await adminKmService.TaoAsync(new TaoKhuyenMaiRequest
        {
            MaGiamGia = "SAIPHANTRAM",
            LoaiGiam = LoaiKhuyenMai.PhanTram,
            GiaTriGiam = 150, // > 100%
            PhamVi = PhamViApDung.TatCa,
            BatDau = now,
            KetThuc = now.AddDays(5)
        }, _du.TkQuanTri);

        Assert.False(taoSaiPhanTram.ThanhCong);
        Assert.Equal("CAU_HINH_GIAM_KHONG_HOP_LE", taoSaiPhanTram.MaLoi);

        // 5. Phạm vi TheoSanPham nhưng rỗng danh sách
        var taoRongSanPham = await adminKmService.TaoAsync(new TaoKhuyenMaiRequest
        {
            MaGiamGia = "RONGSP",
            LoaiGiam = LoaiKhuyenMai.SoTien,
            GiaTriGiam = 20_000,
            PhamVi = PhamViApDung.TheoSanPham,
            SanPhamIds = new List<long>(), // rỗng
            BatDau = now,
            KetThuc = now.AddDays(5)
        }, _du.TkQuanTri);

        Assert.False(taoRongSanPham.ThanhCong);
        Assert.Equal("PHAM_VI_MA_KHONG_HOP_LE", taoRongSanPham.MaLoi);
    }

    [Fact]
    public async Task W6_06_GioHangHonHop_DungNguong_DungTran_CocGiuNguyen()
    {
        // Kịch bản mục 13.1 Plan_Week6.md:
        // SP A: Tiền thuê 300.000 (thuộc phạm vi)
        // SP B: Tiền thuê 200.000 (ngoài phạm vi)
        // Tổng cọc: 1.000.000
        // Mã giảm 20%, tối đa 50.000, tiền thuê tối thiểu 400.000.
        using var s = _db.Mo();
        var now = DateTime.UtcNow;

        // Tạo 2 sản phẩm A và B
        var spA = new SanPham
        {
            MaSanPhamHienThi = "SP_A_TEST",
            TenSanPham = "Lều A",
            GiaThueMoiNgay = 300_000,
            MucCocMoiThietBi = 600_000,
            GiaTriBoiThuong = 2_000_000,
            TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh,
            MaDanhMuc = 1
        };
        var spB = new SanPham
        {
            MaSanPhamHienThi = "SP_B_TEST",
            TenSanPham = "Đèn B",
            GiaThueMoiNgay = 200_000,
            MucCocMoiThietBi = 400_000,
            GiaTriBoiThuong = 1_000_000,
            TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh,
            MaDanhMuc = 1
        };
        s.Ctx.SanPhams.AddRange(spA, spB);
        await s.Ctx.SaveChangesAsync();

        // Tạo mã áp dụng TheoSanPham cho spA
        var km = new KhuyenMai
        {
            MaGiamGia = "GIAM20A",
            TenKhuyenMai = "Giảm 20% cho spA",
            LoaiGiam = LoaiKhuyenMai.PhanTram,
            GiaTriGiam = 20,
            MucGiamToiDa = 50_000,
            TienThueToiThieu = 400_000,
            PhamVi = PhamViApDung.TheoSanPham,
            BatDau = now.AddDays(-1),
            KetThuc = now.AddDays(5),
            TrangThai = TrangThaiKhuyenMai.HienThi
        };
        s.Ctx.KhuyenMais.Add(km);
        await s.Ctx.SaveChangesAsync();

        s.Ctx.KhuyenMaiSanPhams.Add(new KhuyenMaiSanPham { MaKhuyenMai = km.MaKhuyenMai, MaSanPham = spA.MaSanPham });
        await s.Ctx.SaveChangesAsync();

        var kmService = new KhuyenMaiService(s.Ctx);

        // Chuẩn bị giỏ hàng: A thuê 1 ngày = 300k, cọc 600k. B thuê 1 ngày = 200k, cọc 400k.
        var items = new List<DongBaoGiaItem>
        {
            new() { MaSanPham = spA.MaSanPham, DonGiaThueMoiNgay = 300_000, SoLuong = 1, SoNgay = 1, TienCocDong = 600_000 },
            new() { MaSanPham = spB.MaSanPham, DonGiaThueMoiNgay = 200_000, SoLuong = 1, SoNgay = 1, TienCocDong = 400_000 }
        };

        var kq = await kmService.KiemTraApDungChiTietAsync("GIAM20A", _du.KhachA, items);

        Assert.True(kq.HopLe);
        Assert.Equal(500_000, kq.TienThueXetNguong); // 300k + 200k >= 400k -> Đủ điều kiện
        Assert.Equal(300_000, kq.TienThueDuPhamVi);  // Chỉ có A đủ điều kiện
        Assert.Equal(50_000, kq.TongGiamGia);       // 300k * 20% = 60k -> Bị trần 50k
        Assert.Equal(1_000_000, kq.TongCoc);         // Cọc giữ nguyên 1.000.000 đ
        Assert.Equal(1_450_000, kq.TongThanhToanBanDau); // (500k - 50k) + 1.000k = 1.450.000 đ

        // Phân bổ dòng: A giảm 50.000, B giảm 0
        var dongA = kq.PhanBoCacDong.First(d => d.MaSanPham == spA.MaSanPham);
        var dongB = kq.PhanBoCacDong.First(d => d.MaSanPham == spB.MaSanPham);
        Assert.Equal(50_000, dongA.TienGiam);
        Assert.Equal(0, dongB.TienGiam);
    }

    [Fact]
    public async Task W6_07_GiamVuotTienThueDuDieuKien_ChiaGiamDonDuOnDinh()
    {
        using var s = _db.Mo();
        var kmService = new KhuyenMaiService(s.Ctx);

        // Trường hợp 1: Giảm cố định 400.000 đ nhưng dòng thuê chỉ có 300.000 đ
        // Phải chặn không bao giờ giảm quá tiền thuê dòng đó (không âm dòng)
        var lines1 = new List<DongBaoGiaItem>
        {
            new() { MaSanPham = 1, DonGiaThueMoiNgay = 300_000, SoLuong = 1, SoNgay = 1 }
        };
        var phanBo1 = kmService.PhanBoGiamGia(lines1, 400_000);
        Assert.Equal(300_000, phanBo1[0].TienGiam); // Tối đa 300.000 đ, không bị âm!
        Assert.Equal(0, phanBo1[0].TienThueSauGiam);

        // Trường hợp 2: Giảm 10.000 đ cho 3 dòng có tiền thuê bằng nhau (mỗi dòng 100.000 đ)
        // 10.000 / 3 = 3.333 dư 1 -> Phân bổ chính xác từng đồng VND, dồn dư ổn định
        var lines2 = new List<DongBaoGiaItem>
        {
            new() { MaSanPham = 10, DonGiaThueMoiNgay = 100_000, SoLuong = 1, SoNgay = 1 },
            new() { MaSanPham = 20, DonGiaThueMoiNgay = 100_000, SoLuong = 1, SoNgay = 1 },
            new() { MaSanPham = 30, DonGiaThueMoiNgay = 100_000, SoLuong = 1, SoNgay = 1 }
        };
        var phanBo2 = kmService.PhanBoGiamGia(lines2, 10_000);

        Assert.Equal(10_000, phanBo2.Sum(p => p.TienGiam)); // Tổng phân bổ đúng khớp 10.000 đ
        Assert.Equal(3_334, phanBo2.First(p => p.MaSanPham == 10).TienGiam); // Dòng đầu nhận phần dư +1
        Assert.Equal(3_333, phanBo2.First(p => p.MaSanPham == 20).TienGiam);
        Assert.Equal(3_333, phanBo2.First(p => p.MaSanPham == 30).TienGiam);
    }

    [Fact]
    public async Task W6_08_Concurrency_HaiKhachTranhLuotCuoi_KhongVuotHanMuc()
    {
        using var s = _db.Mo();
        var now = DateTime.UtcNow;

        // Tạo mã chỉ có duy nhất 1 lượt sử dụng
        var km = new KhuyenMai
        {
            MaGiamGia = "DUYNHAT1",
            TenKhuyenMai = "Mã 1 lượt",
            LoaiGiam = LoaiKhuyenMai.SoTien,
            GiaTriGiam = 50_000,
            PhamVi = PhamViApDung.TatCa,
            BatDau = now.AddDays(-1),
            KetThuc = now.AddDays(5),
            GioiHanTongLuot = 1,
            TrangThai = TrangThaiKhuyenMai.HienThi
        };
        s.Ctx.KhuyenMais.Add(km);
        await s.Ctx.SaveChangesAsync();

        // Tạo 2 đơn hợp lệ trong DB cho khách A và khách B
        var donA = Seed.Don(s.Ctx, _du, now.AddDays(1), TrangThaiDonThue.ChoThanhToan, daThanhToan: false, maKhach: _du.KhachA);
        var donB = Seed.Don(s.Ctx, _du, now.AddDays(1), TrangThaiDonThue.ChoThanhToan, daThanhToan: false, maKhach: _du.KhachB);

        var kmService = new KhuyenMaiService(s.Ctx);

        // Khách A giữ lượt thành công
        var giuA = await kmService.GiuLuotV2Async(new GiuLuotCommand
        {
            MaKhuyenMai = km.MaKhuyenMai,
            MaDonThue = donA.MaDon,
            MaKhachHang = _du.KhachA,
            ThoiDiemHetHan = now.AddMinutes(15),
            SoTienGiamSnapshot = 50_000
        });

        Assert.Equal("DangGiu", giuA.TrangThai);

        // Khách B tranh lượt cuối -> Bị quăng ngoại lệ MA_HET_LUOT
        var exB = await Assert.ThrowsAsync<KhuyenMaiKhongHopLeException>(async () =>
        {
            await kmService.GiuLuotV2Async(new GiuLuotCommand
            {
                MaKhuyenMai = km.MaKhuyenMai,
                MaDonThue = donB.MaDon,
                MaKhachHang = _du.KhachB,
                ThoiDiemHetHan = now.AddMinutes(15),
                SoTienGiamSnapshot = 50_000
            });
        });

        Assert.Contains("hết lượt", exB.Message);
    }

    [Fact]
    public async Task W6_09_DonHetHan_LuotTuDongNhaNgayTrongQuery()
    {
        using var s = _db.Mo();
        var now = DateTime.UtcNow;

        // Mã giới hạn 1 lượt
        var km = new KhuyenMai
        {
            MaGiamGia = "LIMIT1",
            TenKhuyenMai = "Mã 1 lượt test hết hạn",
            LoaiGiam = LoaiKhuyenMai.SoTien,
            GiaTriGiam = 20_000,
            PhamVi = PhamViApDung.TatCa,
            BatDau = now.AddDays(-1),
            KetThuc = now.AddDays(5),
            GioiHanTongLuot = 1,
            TrangThai = TrangThaiKhuyenMai.HienThi
        };
        s.Ctx.KhuyenMais.Add(km);
        await s.Ctx.SaveChangesAsync();

        var donCu = Seed.Don(s.Ctx, _du, now.AddDays(1), TrangThaiDonThue.ChoThanhToan, daThanhToan: false, maKhach: _du.KhachA);
        var donMoi = Seed.Don(s.Ctx, _du, now.AddDays(1), TrangThaiDonThue.ChoThanhToan, daThanhToan: false, maKhach: _du.KhachB);

        // Tạo 1 lượt DangGiu nhưng ĐÃ HẾT HẠN từ 10 phút trước (job chưa quét)
        s.Ctx.LuotSuDungKhuyenMais.Add(new LuotSuDungKhuyenMai
        {
            MaKhuyenMai = km.MaKhuyenMai,
            MaDonThue = donCu.MaDon,
            TrangThai = "DangGiu",
            ThoiDiemGiuLuot = now.AddMinutes(-30),
            ThoiDiemHetHan = now.AddMinutes(-10) // Hết hạn!
        });
        await s.Ctx.SaveChangesAsync();

        var kmService = new KhuyenMaiService(s.Ctx);

        // Khách B kiểm tra và giữ lượt mới -> Phải thành công vì lượt cũ đã hết hạn
        var items = new List<DongBaoGiaItem>
        {
            new() { MaSanPham = _du.SanPham, DonGiaThueMoiNgay = 100_000, SoLuong = 1, SoNgay = 1 }
        };
        var checkB = await kmService.KiemTraApDungChiTietAsync("LIMIT1", _du.KhachB, items);
        Assert.True(checkB.HopLe);

        var giuB = await kmService.GiuLuotV2Async(new GiuLuotCommand
        {
            MaKhuyenMai = km.MaKhuyenMai,
            MaDonThue = donMoi.MaDon,
            MaKhachHang = _du.KhachB,
            ThoiDiemHetHan = now.AddMinutes(15),
            SoTienGiamSnapshot = 20_000
        });

        Assert.Equal("DangGiu", giuB.TrangThai);
    }

    [Fact]
    public async Task W6_10_ThanhToanLap_HuyDonSauThanhToan_KhongHoanLuot()
    {
        using var s = _db.Mo();
        var now = DateTime.UtcNow;

        var km = new KhuyenMai
        {
            MaGiamGia = "IDEMPOTENT1",
            TenKhuyenMai = "Mã test thanh toán",
            LoaiGiam = LoaiKhuyenMai.SoTien,
            GiaTriGiam = 50_000,
            PhamVi = PhamViApDung.TatCa,
            BatDau = now.AddDays(-1),
            KetThuc = now.AddDays(5),
            TrangThai = TrangThaiKhuyenMai.HienThi
        };
        s.Ctx.KhuyenMais.Add(km);
        await s.Ctx.SaveChangesAsync();

        var don = Seed.Don(s.Ctx, _du, now.AddDays(1), TrangThaiDonThue.ChoThanhToan, daThanhToan: false, maKhach: _du.KhachA);
        var kmService = new KhuyenMaiService(s.Ctx);

        // Giữ lượt
        await kmService.GiuLuotV2Async(new GiuLuotCommand
        {
            MaKhuyenMai = km.MaKhuyenMai,
            MaDonThue = don.MaDon,
            MaKhachHang = _du.KhachA,
            ThoiDiemHetHan = now.AddMinutes(15),
            SoTienGiamSnapshot = 50_000
        });

        // 1. Webhook thanh toán lần 1 -> DaSuDung
        await kmService.XacNhanDaSuDungAsync(don.MaDon);
        var luot = await s.Ctx.LuotSuDungKhuyenMais.FirstAsync(l => l.MaDonThue == don.MaDon);
        Assert.Equal("DaSuDung", luot.TrangThai);

        // 2. Webhook thanh toán lặp lần 2 và lần 3 -> Không báo lỗi (Idempotent), không nhân lượt
        await kmService.XacNhanDaSuDungAsync(don.MaDon);
        await kmService.XacNhanDaSuDungAsync(don.MaDon);
        var count = await s.Ctx.LuotSuDungKhuyenMais.CountAsync(l => l.MaDonThue == don.MaDon);
        Assert.Equal(1, count);

        // 3. Hủy đơn sau thanh toán -> Giải phóng lượt KHÔNG được phục hồi lượt đã dùng
        await kmService.GiaiPhongLuotAsync(don.MaDon, "Khách hủy sau khi thanh toán");
        await s.Ctx.Entry(luot).ReloadAsync();
        Assert.Equal("DaSuDung", luot.TrangThai); // Vẫn là DaSuDung!
    }

    [Fact]
    public async Task W6_11_MaBiAn_DonDangGiuConHan_VanThanhToanTheoGiaCamKet()
    {
        using var s = _db.Mo();
        var now = DateTime.UtcNow;

        var km = new KhuyenMai
        {
            MaGiamGia = "FLASH50",
            TenKhuyenMai = "Flash Sale",
            LoaiGiam = LoaiKhuyenMai.SoTien,
            GiaTriGiam = 50_000,
            PhamVi = PhamViApDung.TatCa,
            BatDau = now.AddDays(-1),
            KetThuc = now.AddDays(1),
            TrangThai = TrangThaiKhuyenMai.HienThi
        };
        s.Ctx.KhuyenMais.Add(km);
        await s.Ctx.SaveChangesAsync();

        var don = Seed.Don(s.Ctx, _du, now.AddDays(1), TrangThaiDonThue.ChoThanhToan, daThanhToan: false, maKhach: _du.KhachA);
        var kmService = new KhuyenMaiService(s.Ctx);
        var adminService = new QuanTriKhuyenMaiService(s.Ctx);

        // Khách A giữ lượt thành công trước
        await kmService.GiuLuotV2Async(new GiuLuotCommand
        {
            MaKhuyenMai = km.MaKhuyenMai,
            MaDonThue = don.MaDon,
            MaKhachHang = _du.KhachA,
            ThoiDiemHetHan = now.AddMinutes(15),
            SoTienGiamSnapshot = 50_000
        });

        // Admin tạm ẩn mã
        var anRes = await adminService.TamAnAsync(km.MaKhuyenMai, new DoiHienThiKhuyenMaiRequest { LyDo = "Tạm dừng chương trình" }, _du.TkQuanTri);
        Assert.True(anRes.ThanhCong);

        // Khách B mới vào áp mã -> Bị từ chối vì đang tạm ẩn
        var items = new List<DongBaoGiaItem>
        {
            new() { MaSanPham = _du.SanPham, DonGiaThueMoiNgay = 100_000, SoLuong = 1, SoNgay = 1 }
        };
        var checkB = await kmService.KiemTraApDungChiTietAsync("FLASH50", _du.KhachB, items);
        Assert.False(checkB.HopLe);
        Assert.Contains("tạm ẩn", checkB.LyDoKhongHopLe);

        // Nhưng Khách A (đơn đã giữ còn hạn) vẫn thanh toán thành công theo cam kết snapshot!
        await kmService.XacNhanDaSuDungAsync(don.MaDon);
        var luotA = await s.Ctx.LuotSuDungKhuyenMais.FirstAsync(l => l.MaDonThue == don.MaDon);
        Assert.Equal("DaSuDung", luotA.TrangThai);
    }
}
