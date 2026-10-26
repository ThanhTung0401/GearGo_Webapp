using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.DTOs.BaoCao.Kho;
using GearGo.Models.DTOs.Kho;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements;
using GearGo.Tests.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GearGo.Tests;

public class BaoCaoKhoTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<ApplicationDbContext> _options;
    private readonly DongHoGia _clock = new();

    public BaoCaoKhoTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = CreateContext();
        context.Database.EnsureCreated();
    }

    private ApplicationDbContext CreateContext() => new SqliteTestDbContext(_options);

    public void Dispose()
    {
        _connection.Dispose();
    }

    private async Task SeedUsersAsync(ApplicationDbContext context)
    {
        var adminTk = new TaiKhoan
        {
            MaTaiKhoan = 1,
            Email = "admin@geargo.vn",
            SoDienThoai = "0901000001",
            VaiTro = "QuanTriVien",
            TrangThai = "HoatDong"
        };
        var staffTk = new TaiKhoan
        {
            MaTaiKhoan = 2,
            Email = "staff@geargo.vn",
            SoDienThoai = "0901000002",
            VaiTro = "NhanVien",
            TrangThai = "HoatDong"
        };

        var adminNv = new NhanVien
        {
            MaNhanVien = 1,
            MaTaiKhoan = 1,
            HoTen = "Admin Quản Trị",
            TrangThaiLamViec = "DangLamViec"
        };
        var staffNv = new NhanVien
        {
            MaNhanVien = 2,
            MaTaiKhoan = 2,
            HoTen = "Minh Tú (NV Kho)",
            TrangThaiLamViec = "DangLamViec"
        };

        var ncc = new NhaCungCap
        {
            MaNhaCungCap = 1,
            MaNhaCungCapHienThi = "NCC-01",
            TenNhaCungCap = "Naturehike Vietnam",
            TrangThaiHopTac = "DangHopTac"
        };

        var dm = new DanhMucSanPham
        {
            MaDanhMuc = 1,
            TenDanhMuc = "Lều cắm trại",
            TrangThai = "HoatDong"
        };

        var sp1 = new SanPham
        {
            MaSanPham = 10,
            MaSanPhamHienThi = "SP-LEU-NEW",
            TenSanPham = "Lều 4 người mới",
            MaDanhMuc = 1,
            GiaThueMoiNgay = 100_000,
            MucCocMoiThietBi = 500_000,
            GiaTriBoiThuong = 2_000_000,
            TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
        };

        var sp2 = new SanPham
        {
            MaSanPham = 20,
            MaSanPhamHienThi = "SP-LEU-OLD",
            TenSanPham = "Lều 4 người giáng cấp (cũ 80%)",
            MaDanhMuc = 1,
            GiaThueMoiNgay = 70_000,
            MucCocMoiThietBi = 300_000,
            GiaTriBoiThuong = 1_200_000,
            TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
        };

        context.TaiKhoans.AddRange(adminTk, staffTk);
        context.NhanViens.AddRange(adminNv, staffNv);
        context.NhaCungCaps.Add(ncc);
        context.DanhMucSanPhams.Add(dm);
        context.SanPhams.AddRange(sp1, sp2);
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task W6_21_LayNhapHang_ChiLayPhieuDaNhapKho_VaDungNgayNhapThucTe()
    {
        // ARRANGE
        using var context = CreateContext();
        await SeedUsersAsync(context);

        // Phiếu 1: DaNhapKho, NgayNhapThucTe trong tháng 10/2026, NgayLap từ tháng 8/2026
        var pn1 = new PhieuNhapHang
        {
            MaPhieuNhap = 1,
            MaPhieuHienThi = "PN-01",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayLap = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
            NgayNhapThucTe = new DateTime(2026, 10, 15, 10, 0, 0, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 10_000_000
        };
        var ct1 = new ChiTietPhieuNhap
        {
            MaChiTietPhieuNhap = 1,
            MaPhieuNhap = 1,
            MaSanPham = 10,
            SoLuong = 5,
            DonGiaNhap = 2_000_000
        };

        // Phiếu 2: Nhap (chưa nhập kho), NgayNhapThucTe giả định trong tháng 10
        var pn2 = new PhieuNhapHang
        {
            MaPhieuNhap = 2,
            MaPhieuHienThi = "PN-02-NHAP",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayLap = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc),
            NgayNhapThucTe = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.Nhap,
            TongTien = 6_000_000
        };
        var ct2 = new ChiTietPhieuNhap
        {
            MaChiTietPhieuNhap = 2,
            MaPhieuNhap = 2,
            MaSanPham = 10,
            SoLuong = 3,
            DonGiaNhap = 2_000_000
        };

        // Phiếu 3: DaHuy
        var pn3 = new PhieuNhapHang
        {
            MaPhieuNhap = 3,
            MaPhieuHienThi = "PN-03-HUY",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayLap = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc),
            NgayNhapThucTe = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaHuy,
            TongTien = 4_000_000
        };

        context.PhieuNhapHangs.AddRange(pn1, pn2, pn3);
        context.ChiTietPhieuNhaps.AddRange(ct1, ct2);
        await context.SaveChangesAsync();

        var service = new BaoCaoKhoService(context, new KhoService(context), _clock);

        // ACT: Lọc tháng 10/2026
        var req = new LocNhapHangRequest
        {
            TuNgay = new DateTime(2026, 10, 1),
            DenNgay = new DateTime(2026, 10, 31)
        };
        var res = await service.LayNhapHangAsync(req, 1);

        // ASSERT
        Assert.True(res.ThanhCong);
        var data = res.DuLieu!;
        Assert.Equal(1, data.TongSoPhieu); // Chỉ có PN-01
        Assert.Equal(5, data.TongSoLuongGoc);
        Assert.Equal(10_000_000, data.TongGiaTriGoc);
        Assert.Equal("PN-01", data.Phieu.Items.First().MaPhieuHienThi);
    }

    [Fact]
    public async Task W6_22_DieuChinhHaiLanLienTiep_TinhDungDeltaVaGiaTriHieuLuc()
    {
        // ARRANGE: Chứng từ gốc 10 chiếc x 2.000.000 = 20.000.000đ (Mục 13.4 Plan Week 6)
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var pn = new PhieuNhapHang
        {
            MaPhieuNhap = 1,
            MaPhieuHienThi = "PN-10-LEU",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayNhapThucTe = new DateTime(2026, 10, 5, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 20_000_000
        };
        var ctpn = new ChiTietPhieuNhap
        {
            MaChiTietPhieuNhap = 1,
            MaPhieuNhap = 1,
            MaSanPham = 10,
            SoLuong = 10,
            DonGiaNhap = 2_000_000
        };

        // Điều chỉnh 1: Tăng giá lên 2.100.000đ (+1.000.000)
        var pdc1 = new PhieuDieuChinhKho
        {
            MaPhieuDieuChinh = 1,
            MaPhieuNhapLienQuan = 1,
            MaNguoiLap = 1,
            LoaiDieuChinh = "SaiGiaNhap",
            LyDo = "Tăng giá lô 1",
            ThoiDiemApDung = new DateTime(2026, 10, 10, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = DomainConstants.Status.Applied
        };
        var ctdc1 = new ChiTietDieuChinhKho
        {
            MaChiTietDieuChinh = 1,
            MaPhieuDieuChinh = 1,
            MaChiTietPhieuNhap = 1,
            GiaTriTruoc = JsonSerializer.Serialize(new { donGiaNhap = 2_000_000 }),
            GiaTriSau = JsonSerializer.Serialize(new { donGiaNhap = 2_100_000 })
        };

        // Điều chỉnh 2: Giảm giá về 2.050.000đ (-500.000)
        var pdc2 = new PhieuDieuChinhKho
        {
            MaPhieuDieuChinh = 2,
            MaPhieuNhapLienQuan = 1,
            MaNguoiLap = 1,
            LoaiDieuChinh = "SaiGiaNhap",
            LyDo = "Chiết khấu lại lô 1",
            ThoiDiemApDung = new DateTime(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = DomainConstants.Status.Applied
        };
        var ctdc2 = new ChiTietDieuChinhKho
        {
            MaChiTietDieuChinh = 2,
            MaPhieuDieuChinh = 2,
            MaChiTietPhieuNhap = 1,
            GiaTriTruoc = JsonSerializer.Serialize(new { donGiaNhap = 2_100_000 }),
            GiaTriSau = JsonSerializer.Serialize(new { donGiaNhap = 2_050_000 })
        };

        // Phiếu điều chỉnh 3: Còn ở trạng thái ChoDuyet -> KHÔNG được tính vào delta
        var pdc3 = new PhieuDieuChinhKho
        {
            MaPhieuDieuChinh = 3,
            MaPhieuNhapLienQuan = 1,
            MaNguoiLap = 1,
            LoaiDieuChinh = "SaiGiaNhap",
            LyDo = "Đề nghị tiếp",
            ThoiDiemApDung = new DateTime(2026, 10, 14, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = DomainConstants.Status.PendingApproval
        };
        var ctdc3 = new ChiTietDieuChinhKho
        {
            MaChiTietDieuChinh = 3,
            MaPhieuDieuChinh = 3,
            MaChiTietPhieuNhap = 1,
            GiaTriTruoc = JsonSerializer.Serialize(new { donGiaNhap = 2_050_000 }),
            GiaTriSau = JsonSerializer.Serialize(new { donGiaNhap = 1_900_000 })
        };

        context.PhieuNhapHangs.Add(pn);
        context.ChiTietPhieuNhaps.Add(ctpn);
        context.PhieuDieuChinhKhos.AddRange(pdc1, pdc2, pdc3);
        context.ChiTietDieuChinhKhos.AddRange(ctdc1, ctdc2, ctdc3);
        await context.SaveChangesAsync();

        var service = new BaoCaoKhoService(context, new KhoService(context), _clock);

        // ACT
        var res = await service.LayNhapHangAsync(new LocNhapHangRequest
        {
            TuNgay = new DateTime(2026, 10, 1),
            DenNgay = new DateTime(2026, 10, 31)
        }, 1);

        // ASSERT
        Assert.True(res.ThanhCong);
        var data = res.DuLieu!;
        Assert.Equal(20_000_000, data.TongGiaTriGoc);
        Assert.Equal(500_000, data.TongDeltaGiaTri); // +1.000.000 - 500.000 = +500.000
        Assert.Equal(20_500_000, data.TongGiaTriHieuLuc);
        Assert.Equal(10, data.TongSoLuongGoc);
        Assert.Equal(10, data.TongSoLuongHieuLuc);
    }

    [Fact]
    public async Task W6_23_DieuChinhTrongKy_TacDongLoNhapNgoaiKy()
    {
        // ARRANGE: Phiếu nhập vào tháng 8/2026; Phiếu điều chỉnh áp dụng vào tháng 10/2026
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var pnThang8 = new PhieuNhapHang
        {
            MaPhieuNhap = 5,
            MaPhieuHienThi = "PN-THANG-8",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayNhapThucTe = new DateTime(2026, 8, 10, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 10_000_000
        };
        var ctpn5 = new ChiTietPhieuNhap
        {
            MaChiTietPhieuNhap = 5,
            MaPhieuNhap = 5,
            MaSanPham = 10,
            SoLuong = 5,
            DonGiaNhap = 2_000_000
        };

        var pdcThang10 = new PhieuDieuChinhKho
        {
            MaPhieuDieuChinh = 10,
            MaPhieuNhapLienQuan = 5,
            MaNguoiLap = 1,
            LoaiDieuChinh = "SaiGiaNhap",
            LyDo = "Sửa đơn giá hồi tố",
            ThoiDiemApDung = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = DomainConstants.Status.Applied
        };
        var ctdc10 = new ChiTietDieuChinhKho
        {
            MaChiTietDieuChinh = 10,
            MaPhieuDieuChinh = 10,
            MaChiTietPhieuNhap = 5,
            GiaTriTruoc = JsonSerializer.Serialize(new { donGiaNhap = 2_000_000 }),
            GiaTriSau = JsonSerializer.Serialize(new { donGiaNhap = 1_800_000 }) // Delta = -1.000.000
        };

        context.PhieuNhapHangs.Add(pnThang8);
        context.ChiTietPhieuNhaps.Add(ctpn5);
        context.PhieuDieuChinhKhos.Add(pdcThang10);
        context.ChiTietDieuChinhKhos.Add(ctdc10);
        await context.SaveChangesAsync();

        var service = new BaoCaoKhoService(context, new KhoService(context), _clock);

        // ACT 1: Xem báo cáo theo lô nhập tháng 10 -> Không có lô nhập mới nào của tháng 10
        var resLoNhap = await service.LayNhapHangAsync(new LocNhapHangRequest
        {
            TuNgay = new DateTime(2026, 10, 1),
            DenNgay = new DateTime(2026, 10, 31)
        }, 1);
        Assert.True(resLoNhap.ThanhCong);
        Assert.Equal(0, resLoNhap.DuLieu!.TongSoPhieu);

        // ACT 2: Xem báo cáo phát sinh điều chỉnh tháng 10 -> Có điều chỉnh số 10, ghi rõ phiếu ngoài kỳ
        var resPhatSinh = await service.LayDieuChinhNhapAsync(new LocNhapHangRequest
        {
            TuNgay = new DateTime(2026, 10, 1),
            DenNgay = new DateTime(2026, 10, 31)
        }, 1);
        Assert.True(resPhatSinh.ThanhCong);
        var dataPhatSinh = resPhatSinh.DuLieu!;
        Assert.Equal(1, dataPhatSinh.SoPhieuDieuChinh);
        Assert.Equal(-1_000_000, dataPhatSinh.TongDeltaGiaTri);

        var item = dataPhatSinh.Items.Items.First();
        Assert.Equal(10, item.MaPhieuDieuChinh);
        Assert.True(item.PhieuNhapNgoaiKy);
    }

    [Fact]
    public async Task W6_24_GiangCapThietBi_VaTachBietVeSinhSuaChuaBaoTri()
    {
        // ARRANGE
        using var context = CreateContext();
        await SeedUsersAsync(context);

        // Thiết bị A nhập nguồn thuộc SP-LEU-NEW (10), nhưng đã bị giáng cấp sang SP-LEU-OLD (20)
        var pn = new PhieuNhapHang
        {
            MaPhieuNhap = 1,
            MaPhieuHienThi = "PN-GOC",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayNhapThucTe = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 2_000_000
        };
        var ctpn = new ChiTietPhieuNhap
        {
            MaChiTietPhieuNhap = 1,
            MaPhieuNhap = 1,
            MaSanPham = 10, // Nguồn: 10
            SoLuong = 1,
            DonGiaNhap = 2_000_000
        };
        var tbA = new ThietBi
        {
            MaThietBi = 101,
            MaThietBiHienThi = "TB-A",
            MaChiTietPhieuNhap = 1,
            MaSanPhamHienTai = 20, // Đã giáng cấp sang 20
            TrangThaiSuDung = TrangThaiThietBi.SanSang,
            GiaNhap = 2_000_000,
            NgayNhap = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc)
        };

        // Bảo trì của TB-A:
        // 1 phiếu Vệ sinh (Hoàn thành)
        var btVeSinh = new PhieuBaoTri
        {
            MaPhieuBaoTri = 1,
            MaThietBi = 101,
            MaNguoiLap = 1,
            LoaiXuLy = DomainConstants.Maintenance.TypeCleaning,
            NgayBatDau = new DateTime(2026, 10, 5, 0, 0, 0, DateTimeKind.Utc),
            NgayHoanThanhThucTe = new DateTime(2026, 10, 5, 2, 0, 0, DateTimeKind.Utc),
            ChiPhi = 50_000,
            TrangThai = DomainConstants.Status.Completed
        };
        // 1 phiếu Sửa chữa đã hoàn thành (chi phí chốt 150.000)
        var btSua1 = new PhieuBaoTri
        {
            MaPhieuBaoTri = 2,
            MaThietBi = 101,
            MaNguoiLap = 1,
            LoaiXuLy = DomainConstants.Maintenance.TypeRepair,
            NgayBatDau = new DateTime(2026, 10, 10, 0, 0, 0, DateTimeKind.Utc),
            NgayHoanThanhThucTe = new DateTime(2026, 10, 11, 0, 0, 0, DateTimeKind.Utc),
            ChiPhi = 150_000,
            TrangThai = DomainConstants.Status.Completed
        };
        // 1 phiếu Sửa chữa đang xử lý (chi phí dự kiến 200.000)
        var btSua2 = new PhieuBaoTri
        {
            MaPhieuBaoTri = 3,
            MaThietBi = 101,
            MaNguoiLap = 1,
            LoaiXuLy = DomainConstants.Maintenance.TypeRepair,
            NgayBatDau = new DateTime(2026, 10, 20, 0, 0, 0, DateTimeKind.Utc),
            ChiPhi = 200_000,
            TrangThai = DomainConstants.Status.InProgress
        };

        context.PhieuNhapHangs.Add(pn);
        context.ChiTietPhieuNhaps.Add(ctpn);
        context.ThietBis.Add(tbA);
        context.PhieuBaoTris.AddRange(btVeSinh, btSua1, btSua2);
        await context.SaveChangesAsync();

        var service = new BaoCaoKhoService(context, new KhoService(context), _clock);

        // 1. Kiểm tra Báo cáo nhập hàng -> Gom theo sản phẩm nguồn (10)
        var resNhap = await service.LayNhapHangAsync(new LocNhapHangRequest
        {
            TuNgay = new DateTime(2026, 10, 1),
            DenNgay = new DateTime(2026, 10, 31)
        }, 1);
        Assert.True(resNhap.ThanhCong);
        Assert.Equal(10, resNhap.DuLieu!.TheoSanPhamNguon.First().MaSanPhamNguon);

        // 2. Kiểm tra Báo cáo hiện trạng kho -> Gom theo sản phẩm hiện tại (20)
        var resKho = await service.LayHienTrangKhoAsync(new LocHienTrangKhoRequest(), 1);
        Assert.True(resKho.ThanhCong);
        var itemKho = resKho.DuLieu!.SanPham.FirstOrDefault(s => s.MaSanPhamHienTai == 20);
        Assert.NotNull(itemKho);
        Assert.Equal(1, itemKho.TongHoSo);

        // 3. Kiểm tra Báo cáo bảo trì -> Phân định vệ sinh vs sửa chữa; chỉ tính sửa chữa là hỏng
        var resBt = await service.LayThongKeBaoTriAsync(new LocBaoTriRequest
        {
            TuNgay = new DateTime(2026, 10, 1),
            DenNgay = new DateTime(2026, 10, 31)
        }, 1);
        Assert.True(resBt.ThanhCong);
        var dataBt = resBt.DuLieu!;
        Assert.Equal(3, dataBt.TongSoPhieu);
        Assert.Equal(1, dataBt.SoPhieuVeSinh);
        Assert.Equal(2, dataBt.SoPhieuSuaChua);
        Assert.Equal(1, dataBt.SoPhieuDangMo);
        Assert.Equal(200_000, dataBt.ChiPhiDangXuLy);
        Assert.Equal(200_000, dataBt.ChiPhiDaChot); // 50k (vệ sinh) + 150k (sửa) = 200k đã chốt

        // Thiết bị hay hỏng: Chỉ đếm số đợt sửa chữa (2 lần, không đếm lần vệ sinh)
        var top = Assert.Single(dataBt.ThietBiHayHong);
        Assert.Equal(101, top.MaThietBi);
        Assert.Equal(2, top.SoDotSuaChua);
    }

    [Fact]
    public async Task W6_28_LocBienNgayVietNam_KhongMatGiaoDich()
    {
        // ARRANGE: Ngày Việt Nam 2026-10-01 (tương đương 2026-09-30 17:00:00 UTC) đến 2026-10-02 (2026-10-02 17:00:00 UTC)
        using var context = CreateContext();
        await SeedUsersAsync(context);

        // Giao dịch 1: Đúng 00:00:00 giờ VN ngày 1/10 (tức 17:00:00 UTC ngày 30/9)
        var pn1 = new PhieuNhapHang
        {
            MaPhieuNhap = 1,
            MaPhieuHienThi = "PN-DAU-NGAY",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayNhapThucTe = new DateTime(2026, 9, 30, 17, 0, 0, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 1_000_000
        };

        // Giao dịch 2: 23:59:59.800 giờ VN ngày 2/10 (tức 16:59:59.800 UTC ngày 2/10)
        var pn2 = new PhieuNhapHang
        {
            MaPhieuNhap = 2,
            MaPhieuHienThi = "PN-CUOI-NGAY",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayNhapThucTe = new DateTime(2026, 10, 2, 16, 59, 59, 800, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 2_000_000
        };

        // Giao dịch 3: 00:00:01 giờ VN ngày 3/10 (tức 17:00:01 UTC ngày 2/10) -> Ngoài kỳ
        var pn3 = new PhieuNhapHang
        {
            MaPhieuNhap = 3,
            MaPhieuHienThi = "PN-NGOAI-KY",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayNhapThucTe = new DateTime(2026, 10, 2, 17, 0, 1, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 3_000_000
        };

        context.PhieuNhapHangs.AddRange(pn1, pn2, pn3);
        await context.SaveChangesAsync();

        var service = new BaoCaoKhoService(context, new KhoService(context), _clock);

        // ACT: Lọc từ ngày 01/10 đến 02/10
        var res = await service.LayNhapHangAsync(new LocNhapHangRequest
        {
            TuNgay = new DateTime(2026, 10, 1),
            DenNgay = new DateTime(2026, 10, 2)
        }, 1);

        // ASSERT
        Assert.True(res.ThanhCong);
        var data = res.DuLieu!;
        Assert.Equal(2, data.TongSoPhieu);
        Assert.Contains(data.Phieu.Items, p => p.MaPhieuHienThi == "PN-DAU-NGAY");
        Assert.Contains(data.Phieu.Items, p => p.MaPhieuHienThi == "PN-CUOI-NGAY");
        Assert.DoesNotContain(data.Phieu.Items, p => p.MaPhieuHienThi == "PN-NGOAI-KY");
    }

    [Fact]
    public async Task W6_29_XuatCsv_ChongFormulaInjection_VaCoUtf8Bom()
    {
        // ARRANGE: Tên hoặc chứng từ chứa công thức hiểm độc
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var pn = new PhieuNhapHang
        {
            MaPhieuNhap = 1,
            MaPhieuHienThi = "=cmd|' /C calc'!A0",
            SoChungTuNhaCungCap = "+SUM(A1:A10)",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayNhapThucTe = new DateTime(2026, 10, 5, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 1_000_000
        };
        var ctpn = new ChiTietPhieuNhap
        {
            MaChiTietPhieuNhap = 1,
            MaPhieuNhap = 1,
            MaSanPham = 10,
            TenSanPhamLucNhap = "@DangerousFormula",
            SoLuong = 1,
            DonGiaNhap = 1_000_000
        };

        context.PhieuNhapHangs.Add(pn);
        context.ChiTietPhieuNhaps.Add(ctpn);
        await context.SaveChangesAsync();

        var service = new BaoCaoKhoService(context, new KhoService(context), _clock);

        // ACT: Admin gọi xuất CSV
        var res = await service.XuatCsvAsync(new XuatCsvKhoRequest
        {
            LoaiBaoCao = LoaiBaoCaoKhoXuat.NhapHang,
            TuNgay = new DateTime(2026, 10, 1),
            DenNgay = new DateTime(2026, 10, 31)
        }, 1);

        // ASSERT
        Assert.True(res.ThanhCong);
        var tep = res.DuLieu!;
        Assert.NotEmpty(tep.NoiDung);

        // Kiểm tra UTF-8 BOM ở 3 byte đầu tiên: 0xEF, 0xBB, 0xBF
        Assert.Equal(0xEF, tep.NoiDung[0]);
        Assert.Equal(0xBB, tep.NoiDung[1]);
        Assert.Equal(0xBF, tep.NoiDung[2]);

        // Đọc nội dung CSV
        var text = Encoding.UTF8.GetString(tep.NoiDung);
        // Các ký tự =, +, @ đứng đầu ô text phải được prefix thêm dấu nháy đơn '
        Assert.Contains("'=cmd|' /C calc'!A0", text);
        Assert.Contains("'+SUM(A1:A10)", text);
        Assert.Contains("'@DangerousFormula", text);
    }

    [Fact]
    public async Task W6_T6_A03_LichSuDonGia_TinhDonGiaBinhQuanGiaQuyenChinhXac()
    {
        // ARRANGE: Nhập 1 chiếc giá 100.000đ và 9 chiếc giá 200.000đ
        // Đơn giá bình quân = (100.000 + 1.800.000) / 10 = 190.000đ (không phải 150.000đ)
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var pn1 = new PhieuNhapHang
        {
            MaPhieuNhap = 1,
            MaPhieuHienThi = "PN-1",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayNhapThucTe = new DateTime(2026, 10, 5, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 100_000
        };
        var ct1 = new ChiTietPhieuNhap
        {
            MaChiTietPhieuNhap = 1,
            MaPhieuNhap = 1,
            MaSanPham = 10,
            SoLuong = 1,
            DonGiaNhap = 100_000
        };

        var pn2 = new PhieuNhapHang
        {
            MaPhieuNhap = 2,
            MaPhieuHienThi = "PN-2",
            MaNhaCungCap = 1,
            MaNguoiLap = 1,
            NgayNhapThucTe = new DateTime(2026, 10, 6, 0, 0, 0, DateTimeKind.Utc),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 1_800_000
        };
        var ct2 = new ChiTietPhieuNhap
        {
            MaChiTietPhieuNhap = 2,
            MaPhieuNhap = 2,
            MaSanPham = 10,
            SoLuong = 9,
            DonGiaNhap = 200_000
        };

        context.PhieuNhapHangs.AddRange(pn1, pn2);
        context.ChiTietPhieuNhaps.AddRange(ct1, ct2);
        await context.SaveChangesAsync();

        var service = new BaoCaoKhoService(context, new KhoService(context), _clock);

        // ACT
        var res = await service.LayLichSuDonGiaAsync(new LocNhapHangRequest
        {
            TuNgay = new DateTime(2026, 10, 1),
            DenNgay = new DateTime(2026, 10, 31),
            MaSanPhamNguon = 10
        }, 1);

        // ASSERT
        Assert.True(res.ThanhCong);
        var spData = Assert.Single(res.DuLieu!.SanPham);
        Assert.Equal(10, spData.TongSoLuongGoc);
        Assert.Equal(1_900_000, spData.TongGiaTriGoc);
        Assert.Equal(190_000, spData.DonGiaBinhQuanGoc); // 190.000đ, không phải 150.000đ
    }

    [Fact]
    public async Task PhanQuyen_NhanVienKhongDuocXemGiaTriNhap_VaBiChanExport()
    {
        // ARRANGE: actorId = 2 (NhanVien)
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var service = new BaoCaoKhoService(context, new KhoService(context), _clock);

        // ACT & ASSERT 1: Nhập hàng (chỉ Admin)
        var resNhap = await service.LayNhapHangAsync(new LocNhapHangRequest(), 2);
        Assert.False(resNhap.ThanhCong);
        Assert.Equal(DomainConstants.Errors.ForbiddenCostInspection, resNhap.MaLoi);

        // ACT & ASSERT 2: Xuất CSV (chỉ Admin)
        var resCsv = await service.XuatCsvAsync(new XuatCsvKhoRequest { LoaiBaoCao = LoaiBaoCaoKhoXuat.NhapHang }, 2);
        Assert.False(resCsv.ThanhCong);
        Assert.Equal(DomainConstants.Errors.ForbiddenCostInspection, resCsv.MaLoi);

        // ACT & ASSERT 3: Hiện trạng kho (NhanVien xem được nhưng TongGiaTriNhap = null)
        var resKho = await service.LayHienTrangKhoAsync(new LocHienTrangKhoRequest(), 2);
        Assert.True(resKho.ThanhCong);
        Assert.Null(resKho.DuLieu!.TongGiaTriNhap);

        // ACT & ASSERT 4: Bảo trì (NhanVien xem được số phiếu nhưng ChiPhi = null)
        var resBt = await service.LayThongKeBaoTriAsync(new LocBaoTriRequest(), 2);
        Assert.True(resBt.ThanhCong);
        Assert.Null(resBt.DuLieu!.ChiPhiDangXuLy);
        Assert.Null(resBt.DuLieu!.ChiPhiDaChot);
    }
}
