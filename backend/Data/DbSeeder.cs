using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data;

/// <summary>
/// Khởi tạo và đồng bộ dữ liệu Seed mẫu toàn diện cho tất cả 39 Entities trong hệ thống GearGo
/// Đảm bảo tính nhất quán quan hệ khóa ngoại (Foreign Keys), Enums và nghiệp vụ thực tế
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAllAsync(ApplicationDbContext context)
    {
        // ─────────────────────────────────────────────────────────────────────────────
        // 1. TAI_KHOAN (Tài khoản người dùng)
        // ─────────────────────────────────────────────────────────────────────────────
        var adminTk = await context.TaiKhoans.FirstOrDefaultAsync(t => t.Email == "admin@geargo.vn");
        if (adminTk == null)
        {
            adminTk = new TaiKhoan
            {
                Email = "admin@geargo.vn",
                SoDienThoai = "0901000001",
                MatKhauBam = "hash_geargo_admin",
                VaiTro = "QuanTriVien",
                TrangThai = "HoatDong"
            };
            context.TaiKhoans.Add(adminTk);
        }
        else
        {
            adminTk.VaiTro = "QuanTriVien";
            adminTk.TrangThai = "HoatDong";
        }

        var staffTk = await context.TaiKhoans.FirstOrDefaultAsync(t => t.Email == "staff@geargo.vn");
        if (staffTk == null)
        {
            staffTk = new TaiKhoan
            {
                Email = "staff@geargo.vn",
                SoDienThoai = "0901000002",
                MatKhauBam = "hash_geargo_staff",
                VaiTro = "NhanVien",
                TrangThai = "HoatDong"
            };
            context.TaiKhoans.Add(staffTk);
        }
        else
        {
            staffTk.VaiTro = "NhanVien";
            staffTk.TrangThai = "HoatDong";
        }

        var customerTk1 = await context.TaiKhoans.FirstOrDefaultAsync(t => t.Email == "customer@geargo.vn");
        if (customerTk1 == null)
        {
            customerTk1 = new TaiKhoan
            {
                Email = "customer@geargo.vn",
                SoDienThoai = "0901000003",
                MatKhauBam = "hash_geargo_customer",
                VaiTro = "KhachHang",
                TrangThai = "HoatDong"
            };
            context.TaiKhoans.Add(customerTk1);
        }

        var customerTk2 = await context.TaiKhoans.FirstOrDefaultAsync(t => t.Email == "other@geargo.vn");
        if (customerTk2 == null)
        {
            customerTk2 = new TaiKhoan
            {
                Email = "other@geargo.vn",
                SoDienThoai = "0901000004",
                MatKhauBam = "hash_geargo_customer2",
                VaiTro = "KhachHang",
                TrangThai = "HoatDong"
            };
            context.TaiKhoans.Add(customerTk2);
        }

        await context.SaveChangesAsync();

        // ─────────────────────────────────────────────────────────────────────────────
        // 2. KHACH_HANG & 3. NHAN_VIEN
        // ─────────────────────────────────────────────────────────────────────────────
        var khach1 = await context.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == customerTk1.MaTaiKhoan);
        if (khach1 == null)
        {
            khach1 = new KhachHang
            {
                MaTaiKhoan = customerTk1.MaTaiKhoan,
                HoTen = "Nguyễn Văn Khách Hàng",
                DiaChi = "123 Cầu Giấy, Hà Nội"
            };
            context.KhachHangs.Add(khach1);
        }

        var khach2 = await context.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == customerTk2.MaTaiKhoan);
        if (khach2 == null)
        {
            khach2 = new KhachHang
            {
                MaTaiKhoan = customerTk2.MaTaiKhoan,
                HoTen = "Trần Thị Lan",
                DiaChi = "456 Lê Lợi, TP. Hồ Chí Minh"
            };
            context.KhachHangs.Add(khach2);
        }

        var nhanVien1 = await context.NhanViens.FirstOrDefaultAsync(n => n.MaTaiKhoan == adminTk.MaTaiKhoan);
        if (nhanVien1 == null)
        {
            nhanVien1 = new NhanVien
            {
                MaTaiKhoan = adminTk.MaTaiKhoan,
                HoTen = "Quản trị viên hệ thống",
                TrangThaiLamViec = "DangLamViec"
            };
            context.NhanViens.Add(nhanVien1);
        }

        var nhanVien2 = await context.NhanViens.FirstOrDefaultAsync(n => n.MaTaiKhoan == staffTk.MaTaiKhoan);
        if (nhanVien2 == null)
        {
            nhanVien2 = new NhanVien
            {
                MaTaiKhoan = staffTk.MaTaiKhoan,
                HoTen = "Nguyễn Văn Vận Hành",
                TrangThaiLamViec = "DangLamViec"
            };
            context.NhanViens.Add(nhanVien2);
        }

        await context.SaveChangesAsync();

        // ─────────────────────────────────────────────────────────────────────────────
        // 4. DANH_MUC_SAN_PHAM (Danh mục sản phẩm)
        // ─────────────────────────────────────────────────────────────────────────────
        var dmLeu = await context.DanhMucSanPhams.FirstOrDefaultAsync(d => d.TenDanhMuc == "Lều & Bạt dã ngoại");
        if (dmLeu == null)
        {
            dmLeu = new DanhMucSanPham
            {
                TenDanhMuc = "Lều & Bạt dã ngoại",
                MoTa = "Lều cắm trại 2-6 người, tăng che mưa nắng, bạt trải dã ngoại cao cấp.",
                ThuTuHienThi = 1,
                TrangThai = "HoatDong"
            };
            context.DanhMucSanPhams.Add(dmLeu);
        }

        var dmBep = await context.DanhMucSanPhams.FirstOrDefaultAsync(d => d.TenDanhMuc == "Bếp & Dụng cụ nấu nướng");
        if (dmBep == null)
        {
            dmBep = new DanhMucSanPham
            {
                TenDanhMuc = "Bếp & Dụng cụ nấu nướng",
                MoTa = "Bếp ga dã ngoại gấp gọn, bộ nồi nhôm Anodized, bình giữ nhiệt.",
                ThuTuHienThi = 2,
                TrangThai = "HoatDong"
            };
            context.DanhMucSanPhams.Add(dmBep);
        }

        var dmBanGhe = await context.DanhMucSanPhams.FirstOrDefaultAsync(d => d.TenDanhMuc == "Bàn ghế & Đèn cắm trại");
        if (dmBanGhe == null)
        {
            dmBanGhe = new DanhMucSanPham
            {
                TenDanhMuc = "Bàn ghế & Đèn cắm trại",
                MoTa = "Bàn cuộn nhôm, ghế xếp Kermit, đèn LED vintage dã ngoại.",
                ThuTuHienThi = 3,
                TrangThai = "HoatDong"
            };
            context.DanhMucSanPhams.Add(dmBanGhe);
        }

        await context.SaveChangesAsync();

        // ─────────────────────────────────────────────────────────────────────────────
        // 5. SAN_PHAM & 6. HINH_ANH_SAN_PHAM
        // ─────────────────────────────────────────────────────────────────────────────
        var spLeu4 = await context.SanPhams.FirstOrDefaultAsync(s => s.MaSanPhamHienThi == "SP-LEU-001");
        if (spLeu4 == null)
        {
            spLeu4 = new SanPham
            {
                MaDanhMuc = dmLeu.MaDanhMuc,
                MaSanPhamHienThi = "SP-LEU-001",
                TenSanPham = "Lều Cắm Trại 4 Người Naturehike P-Series",
                ThuongHieu = "Naturehike",
                MoTa = "Lều chống mưa gió UPF50+, chống thấm 3000mm, khung hợp kim nhôm 7001 siêu nhẹ.",
                SucChua = 4,
                KichThuoc = "210 x 210 x 130 cm",
                ThongSo = "Trọng lượng 2.8kg, vải 210T Polyester",
                GiaThueMoiNgay = 120000,
                MucCocMoiThietBi = 500000,
                GiaTriBoiThuong = 1600000,
                TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
            };
            context.SanPhams.Add(spLeu4);
            await context.SaveChangesAsync();

            context.HinhAnhSanPhams.AddRange(
                new HinhAnhSanPham { MaSanPham = spLeu4.MaSanPham, DuongDan = "https://storage.geargo.vn/sp/leu4_main.jpg", LaAnhChinh = true, ThuTu = 1 },
                new HinhAnhSanPham { MaSanPham = spLeu4.MaSanPham, DuongDan = "https://storage.geargo.vn/sp/leu4_inside.jpg", LaAnhChinh = false, ThuTu = 2 }
            );
        }

        var spBepGa = await context.SanPhams.FirstOrDefaultAsync(s => s.MaSanPhamHienThi == "SP-BEP-001");
        if (spBepGa == null)
        {
            spBepGa = new SanPham
            {
                MaDanhMuc = dmBep.MaDanhMuc,
                MaSanPhamHienThi = "SP-BEP-001",
                TenSanPham = "Bếp Ga Dã Ngoại Gấp Gọn Kovea Spider",
                ThuongHieu = "Kovea",
                MoTa = "Bếp ga mini công suất cao, đầu đốt tỏa nhiệt đều, chân đế chống trượt gập gọn.",
                SucChua = 2,
                KichThuoc = "10 x 10 x 12 cm",
                ThongSo = "Trọng lượng 168g, công suất 2800W",
                GiaThueMoiNgay = 50000,
                MucCocMoiThietBi = 200000,
                GiaTriBoiThuong = 750000,
                TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
            };
            context.SanPhams.Add(spBepGa);
            await context.SaveChangesAsync();

            context.HinhAnhSanPhams.Add(
                new HinhAnhSanPham { MaSanPham = spBepGa.MaSanPham, DuongDan = "https://storage.geargo.vn/sp/bep_main.jpg", LaAnhChinh = true, ThuTu = 1 }
            );
        }

        var spGheKermit = await context.SanPhams.FirstOrDefaultAsync(s => s.MaSanPhamHienThi == "SP-GHE-001");
        if (spGheKermit == null)
        {
            spGheKermit = new SanPham
            {
                MaDanhMuc = dmBanGhe.MaDanhMuc,
                MaSanPhamHienThi = "SP-GHE-001",
                TenSanPham = "Ghế Xếp Dã Ngoại Kermit Naturehike",
                ThuongHieu = "Naturehike",
                MoTa = "Ghế cắm trại khung vân gỗ cao cấp, vải Oxford 600D chịu lực 120kg.",
                SucChua = 1,
                KichThuoc = "62 x 52 x 43 cm",
                ThongSo = "Chịu tải 120kg",
                GiaThueMoiNgay = 35000,
                MucCocMoiThietBi = 150000,
                GiaTriBoiThuong = 450000,
                TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
            };
            context.SanPhams.Add(spGheKermit);
            await context.SaveChangesAsync();

            context.HinhAnhSanPhams.Add(
                new HinhAnhSanPham { MaSanPham = spGheKermit.MaSanPham, DuongDan = "https://storage.geargo.vn/sp/ghe_main.jpg", LaAnhChinh = true, ThuTu = 1 }
            );
        }

        await context.SaveChangesAsync();

        // ─────────────────────────────────────────────────────────────────────────────
        // 7. NHA_CUNG_CAP (Nhà cung cấp)
        // ─────────────────────────────────────────────────────────────────────────────
        var ncc1 = await context.NhaCungCaps.FirstOrDefaultAsync(n => n.MaNhaCungCapHienThi == "NCC-NAT-01");
        if (ncc1 == null)
        {
            ncc1 = new NhaCungCap
            {
                MaNhaCungCapHienThi = "NCC-NAT-01",
                TenNhaCungCap = "Công ty TNHH Thiết bị Dã ngoại Naturehike Việt Nam",
                NguoiLienHe = "Trần Minh Quân",
                SoDienThoai = "02438889999",
                Email = "contact@naturehike.vn",
                DiaChi = "Tòa nhà Keangnam, Nam Từ Liêm, Hà Nội",
                MaSoThue = "0108889999",
                TrangThaiHopTac = "DangHopTac"
            };
            context.NhaCungCaps.Add(ncc1);
            await context.SaveChangesAsync();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 8. PHIEU_NHAP_HANG & 9. CHI_TIET_PHIEU_NHAP
        // ─────────────────────────────────────────────────────────────────────────────
        var phieuNhap1 = await context.PhieuNhapHangs.FirstOrDefaultAsync(p => p.MaPhieuHienThi == "PN-2026-001");
        if (phieuNhap1 == null)
        {
            phieuNhap1 = new PhieuNhapHang
            {
                MaNhaCungCap = ncc1.MaNhaCungCap,
                MaNguoiLap = nhanVien1.MaNhanVien,
                MaNguoiXacNhan = nhanVien1.MaNhanVien,
                MaPhieuHienThi = "PN-2026-001",
                SoChungTuNhaCungCap = "HD-NAT-202601",
                NgayLap = DateTime.UtcNow.AddMonths(-2),
                NgayNhapThucTe = DateTime.UtcNow.AddMonths(-2),
                NgayXacNhan = DateTime.UtcNow.AddMonths(-2),
                TongTien = 18000000,
                TenNguoiLapLucNhap = nhanVien1.HoTen,
                TenNguoiXacNhanLucNhap = nhanVien1.HoTen,
                TrangThai = TrangThaiPhieuNhap.DaNhapKho
            };
            context.PhieuNhapHangs.Add(phieuNhap1);
            await context.SaveChangesAsync();

            var ctpnLeu = new ChiTietPhieuNhap
            {
                MaPhieuNhap = phieuNhap1.MaPhieuNhap,
                MaSanPham = spLeu4.MaSanPham,
                TenSanPhamLucNhap = spLeu4.TenSanPham,
                SoLuong = 10,
                DonGiaNhap = 1200000,
                TinhTrangKhiNhap = "Mới 100%"
            };
            var ctpnBep = new ChiTietPhieuNhap
            {
                MaPhieuNhap = phieuNhap1.MaPhieuNhap,
                MaSanPham = spBepGa.MaSanPham,
                TenSanPhamLucNhap = spBepGa.TenSanPham,
                SoLuong = 10,
                DonGiaNhap = 450000,
                TinhTrangKhiNhap = "Mới 100%"
            };
            var ctpnGhe = new ChiTietPhieuNhap
            {
                MaPhieuNhap = phieuNhap1.MaPhieuNhap,
                MaSanPham = spGheKermit.MaSanPham,
                TenSanPhamLucNhap = spGheKermit.TenSanPham,
                SoLuong = 10,
                DonGiaNhap = 250000,
                TinhTrangKhiNhap = "Mới 100%"
            };
            context.ChiTietPhieuNhaps.AddRange(ctpnLeu, ctpnBep, ctpnGhe);
            await context.SaveChangesAsync();

            // ─────────────────────────────────────────────────────────────────────────
            // 10. THIET_BI (Từng thiết bị vật lý trong kho)
            // ─────────────────────────────────────────────────────────────────────────
            var thietBis = new List<ThietBi>
            {
                new ThietBi { MaChiTietPhieuNhap = ctpnLeu.MaChiTietPhieuNhap, MaSanPhamHienTai = spLeu4.MaSanPham, MaThietBiHienThi = "TB-LEU-001", NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = 1200000, TinhTrang = "Mới", TrangThaiSuDung = TrangThaiThietBi.DangThue },
                new ThietBi { MaChiTietPhieuNhap = ctpnLeu.MaChiTietPhieuNhap, MaSanPhamHienTai = spLeu4.MaSanPham, MaThietBiHienThi = "TB-LEU-002", NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = 1200000, TinhTrang = "Tốt", TrangThaiSuDung = TrangThaiThietBi.SanSang },
                new ThietBi { MaChiTietPhieuNhap = ctpnBep.MaChiTietPhieuNhap, MaSanPhamHienTai = spBepGa.MaSanPham, MaThietBiHienThi = "TB-BEP-001", NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = 450000, TinhTrang = "Tốt", TrangThaiSuDung = TrangThaiThietBi.DangThue },
                new ThietBi { MaChiTietPhieuNhap = ctpnBep.MaChiTietPhieuNhap, MaSanPhamHienTai = spBepGa.MaSanPham, MaThietBiHienThi = "TB-BEP-002", NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = 450000, TinhTrang = "Gãy chân đế", TrangThaiSuDung = TrangThaiThietBi.DangBaoTri },
                new ThietBi { MaChiTietPhieuNhap = ctpnGhe.MaChiTietPhieuNhap, MaSanPhamHienTai = spGheKermit.MaSanPham, MaThietBiHienThi = "TB-GHE-001", NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = 250000, TinhTrang = "Tốt", TrangThaiSuDung = TrangThaiThietBi.SanSang }
            };
            context.ThietBis.AddRange(thietBis);
            await context.SaveChangesAsync();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 11. CHINH_SACH (Chính sách thuê)
        // ─────────────────────────────────────────────────────────────────────────────
        var chinhSach1 = await context.ChinhSachs.FirstOrDefaultAsync(c => c.PhienBan == 1)
                         ?? await context.ChinhSachs.FirstOrDefaultAsync();
        if (chinhSach1 == null)
        {
            chinhSach1 = new ChinhSach
            {
                MaNguoiTao = nhanVien1.MaNhanVien,
                TenChinhSach = "Chính sách thuê tiêu chuẩn 2026",
                PhienBan = 1,
                ThoiDiemApDung = DateTime.UtcNow.AddMonths(-3),
                NoiDungChinhSach = "{\"heSoTre\": 1.5, \"hanMucStaff\": 500000, \"tyLeCoc\": 100}",
                NgayTao = DateTime.UtcNow.AddMonths(-3)
            };
            context.ChinhSachs.Add(chinhSach1);
            await context.SaveChangesAsync();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 12. GIO_THUE & 13. CHI_TIET_GIO_THUE
        // ─────────────────────────────────────────────────────────────────────────────
        var gioThue1 = await context.GioThues.FirstOrDefaultAsync(g => g.MaKhachHang == khach1.MaKhachHang);
        if (gioThue1 == null)
        {
            gioThue1 = new GioThue
            {
                MaKhachHang = khach1.MaKhachHang,
                GioNhanDuKien = DateTime.UtcNow.AddDays(5),
                GioTraDuKien = DateTime.UtcNow.AddDays(7),
                NgayCapNhat = DateTime.UtcNow
            };
            context.GioThues.Add(gioThue1);
            await context.SaveChangesAsync();

            context.ChiTietGioThues.Add(new ChiTietGioThue
            {
                MaGioThue = gioThue1.MaGioThue,
                MaSanPham = spLeu4.MaSanPham,
                SoLuong = 1
            });
            await context.SaveChangesAsync();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 14. KHUYEN_MAI, 15. KHUYEN_MAI_DANH_MUC, 16. KHUYEN_MAI_SAN_PHAM
        // ─────────────────────────────────────────────────────────────────────────────
        var km1 = await context.KhuyenMais.FirstOrDefaultAsync(k => k.MaGiamGia == "GEARGOHE2026");
        if (km1 == null)
        {
            km1 = new KhuyenMai
            {
                MaGiamGia = "GEARGOHE2026",
                TenKhuyenMai = "Chào hè rực rỡ - Giảm 10%",
                LoaiGiam = LoaiKhuyenMai.PhanTram,
                GiaTriGiam = 10,
                MucGiamToiDa = 100000,
                TienThueToiThieu = 200000,
                PhamVi = PhamViApDung.TheoDanhMuc,
                BatDau = DateTime.UtcNow.AddMonths(-1),
                KetThuc = DateTime.UtcNow.AddMonths(2),
                GioiHanTongLuot = 500,
                GioiHanMoiKhach = 2,
                TrangThai = TrangThaiKhuyenMai.HienThi
            };
            context.KhuyenMais.Add(km1);
            await context.SaveChangesAsync();

            context.KhuyenMaiDanhMucs.Add(new KhuyenMaiDanhMuc
            {
                MaKhuyenMai = km1.MaKhuyenMai,
                MaDanhMuc = dmLeu.MaDanhMuc
            });
            context.KhuyenMaiSanPhams.Add(new KhuyenMaiSanPham
            {
                MaKhuyenMai = km1.MaKhuyenMai,
                MaSanPham = spLeu4.MaSanPham
            });
            await context.SaveChangesAsync();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // 17. DON_THUE, 18. CHI_TIET_DON_THUE, 19. GIU_CHO, 20. LUOT_SU_DUNG_KHUYEN_MAI, 21. LICH_SU_TRANG_THAI_DON
        // ─────────────────────────────────────────────────────────────────────────────
        var donThue1 = await context.DonThues.FirstOrDefaultAsync(d => d.MaDonHienThi == "ORD-202610-001");
        if (donThue1 == null)
        {
            donThue1 = new DonThue
            {
                MaKhachHang = khach1.MaKhachHang,
                MaChinhSach = chinhSach1.MaChinhSach,
                MaDonHienThi = "ORD-202610-001",
                NgayDat = DateTime.UtcNow.AddDays(-3),
                GioNhanDuKien = DateTime.UtcNow.AddDays(-2),
                GioTraDuKien = DateTime.UtcNow.AddDays(-1),
                TenNguoiNhan = khach1.HoTen,
                SoDienThoaiNguoiNhan = "0901000003",
                EmailLienHe = customerTk1.Email,
                TongTienThueTruocGiam = 340000,
                TongTienGiam = 34000,
                TongTienCoc = 700000,
                TrangThai = TrangThaiDonThue.DangThue,
                TienThueGiuLaiKhiHuy = 0
            };
            context.DonThues.Add(donThue1);
            await context.SaveChangesAsync();
        }

        // 18. CHI_TIET_DON_THUE
        var ctd1 = await context.ChiTietDonThues.FirstOrDefaultAsync(c => c.MaDonThue == donThue1.MaDonThue && c.MaSanPham == spLeu4.MaSanPham);
        if (ctd1 == null)
        {
            ctd1 = new ChiTietDonThue
            {
                MaDonThue = donThue1.MaDonThue,
                MaSanPham = spLeu4.MaSanPham,
                TenSanPhamLucDat = spLeu4.TenSanPham,
                SoLuong = 1,
                SoNgayTinhTien = 2,
                DonGiaThueMoiNgay = 120000,
                TienGiam = 24000,
                MucCocMoiThietBi = 500000,
                GiaTriBoiThuongMoiThietBi = 1600000
            };
            context.ChiTietDonThues.Add(ctd1);
            await context.SaveChangesAsync();
        }

        var ctd2 = await context.ChiTietDonThues.FirstOrDefaultAsync(c => c.MaDonThue == donThue1.MaDonThue && c.MaSanPham == spBepGa.MaSanPham);
        if (ctd2 == null)
        {
            ctd2 = new ChiTietDonThue
            {
                MaDonThue = donThue1.MaDonThue,
                MaSanPham = spBepGa.MaSanPham,
                TenSanPhamLucDat = spBepGa.TenSanPham,
                SoLuong = 1,
                SoNgayTinhTien = 2,
                DonGiaThueMoiNgay = 50000,
                TienGiam = 10000,
                MucCocMoiThietBi = 200000,
                GiaTriBoiThuongMoiThietBi = 750000
            };
            context.ChiTietDonThues.Add(ctd2);
            await context.SaveChangesAsync();
        }

        // 19. GIU_CHO
        if (!await context.GiuChos.AnyAsync(g => g.MaChiTietDon == ctd1.MaChiTietDon))
        {
            context.GiuChos.AddRange(
                new GiuCho { MaChiTietDon = ctd1.MaChiTietDon, ThoiDiemTao = DateTime.UtcNow.AddDays(-3), ThoiDiemHetHan = DateTime.UtcNow.AddDays(2), TrangThai = TrangThaiGiuCho.DaXacNhan },
                new GiuCho { MaChiTietDon = ctd2.MaChiTietDon, ThoiDiemTao = DateTime.UtcNow.AddDays(-3), ThoiDiemHetHan = DateTime.UtcNow.AddDays(2), TrangThai = TrangThaiGiuCho.DaXacNhan }
            );
            await context.SaveChangesAsync();
        }

        // 20. LUOT_SU_DUNG_KHUYEN_MAI
        if (!await context.LuotSuDungKhuyenMais.AnyAsync(l => l.MaDonThue == donThue1.MaDonThue))
        {
            context.LuotSuDungKhuyenMais.Add(new LuotSuDungKhuyenMai
            {
                MaKhuyenMai = km1.MaKhuyenMai,
                MaDonThue = donThue1.MaDonThue,
                ThoiDiemGiuLuot = DateTime.UtcNow.AddDays(-3),
                ThoiDiemHetHan = DateTime.UtcNow.AddDays(2),
                ThoiDiemSuDung = DateTime.UtcNow.AddDays(-3),
                SoTienGiam = 34000,
                TrangThai = "DaSuDung"
            });
            await context.SaveChangesAsync();
        }

        // 21. LICH_SU_TRANG_THAI_DON
        if (!await context.LichSuTrangThaiDons.AnyAsync(l => l.MaDonThue == donThue1.MaDonThue))
        {
            context.LichSuTrangThaiDons.AddRange(
                new LichSuTrangThaiDon { MaDonThue = donThue1.MaDonThue, MaNguoiThucHien = customerTk1.MaTaiKhoan, TrangThaiTruoc = "TaoMoi", TrangThaiSau = "ChoThanhToan", ThoiDiem = DateTime.UtcNow.AddDays(-3), LyDo = "Đặt đơn trực tuyến" },
                new LichSuTrangThaiDon { MaDonThue = donThue1.MaDonThue, MaNguoiThucHien = adminTk.MaTaiKhoan, TrangThaiTruoc = "ChoThanhToan", TrangThaiSau = "DangThue", ThoiDiem = DateTime.UtcNow.AddDays(-2), LyDo = "Thanh toán thành công và đã bàn giao đồ" }
            );
            await context.SaveChangesAsync();
        }

        // 22. THANH_TOAN & 23. CHI_TIET_THANH_TOAN
        var thanhToan1 = await context.ThanhToans.FirstOrDefaultAsync(t => t.MaDonThue == donThue1.MaDonThue);
        if (thanhToan1 == null)
        {
            thanhToan1 = new ThanhToan
            {
                MaDonThue = donThue1.MaDonThue,
                MaNguoiGhiNhan = nhanVien2.MaNhanVien,
                MaYeuCau = "PAY_INIT_ORD001",
                CongThanhToan = "VNPay",
                MaGiaoDichCong = "VNP_202610_001",
                TongSoTien = 1006000,
                PhuongThuc = "VNPayQR",
                ThoiDiemTao = DateTime.UtcNow.AddDays(-3),
                ThoiDiemThanhCong = DateTime.UtcNow.AddDays(-3),
                TrangThai = "ThanhCong"
            };
            context.ThanhToans.Add(thanhToan1);
            await context.SaveChangesAsync();

            var ctttThue = new ChiTietThanhToan { MaThanhToan = thanhToan1.MaThanhToan, MucDich = "TienThue", SoTien = 306000 };
            var ctttCoc = new ChiTietThanhToan { MaThanhToan = thanhToan1.MaThanhToan, MucDich = "TienCoc", SoTien = 700000 };
            context.ChiTietThanhToans.AddRange(ctttThue, ctttCoc);
            await context.SaveChangesAsync();
        }

        var ctttCocDefault = await context.ChiTietThanhToans.FirstOrDefaultAsync(c => c.MaThanhToan == thanhToan1.MaThanhToan && c.MucDich == "TienCoc")
                             ?? await context.ChiTietThanhToans.FirstOrDefaultAsync(c => c.MaThanhToan == thanhToan1.MaThanhToan);

        // 24. PHAN_CONG_THIET_BI
        var tbLeu = await context.ThietBis.FirstAsync(t => t.MaThietBiHienThi == "TB-LEU-001");
        var tbBep = await context.ThietBis.FirstAsync(t => t.MaThietBiHienThi == "TB-BEP-001");

        var phanCong1 = await context.PhanCongThietBis.FirstOrDefaultAsync(p => p.MaChiTietDon == ctd1.MaChiTietDon && p.MaThietBi == tbLeu.MaThietBi);
        if (phanCong1 == null)
        {
            phanCong1 = new PhanCongThietBi
            {
                MaChiTietDon = ctd1.MaChiTietDon,
                MaThietBi = tbLeu.MaThietBi,
                MaNguoiPhanCong = nhanVien2.MaNhanVien,
                ThoiDiemPhanCong = DateTime.UtcNow.AddDays(-2),
                TrangThai = "DaBanGiao"
            };
            context.PhanCongThietBis.Add(phanCong1);
            await context.SaveChangesAsync();
        }

        var phanCong2 = await context.PhanCongThietBis.FirstOrDefaultAsync(p => p.MaChiTietDon == ctd2.MaChiTietDon && p.MaThietBi == tbBep.MaThietBi);
        if (phanCong2 == null)
        {
            phanCong2 = new PhanCongThietBi
            {
                MaChiTietDon = ctd2.MaChiTietDon,
                MaThietBi = tbBep.MaThietBi,
                MaNguoiPhanCong = nhanVien2.MaNhanVien,
                ThoiDiemPhanCong = DateTime.UtcNow.AddDays(-2),
                TrangThai = "DaBanGiao"
            };
            context.PhanCongThietBis.Add(phanCong2);
            await context.SaveChangesAsync();
        }

        // 25. PHIEU_BAN_GIAO & 26. CHI_TIET_BAN_GIAO
        var phieuBanGiao1 = await context.PhieuBanGiaos.FirstOrDefaultAsync(p => p.MaDonThue == donThue1.MaDonThue);
        if (phieuBanGiao1 == null)
        {
            phieuBanGiao1 = new PhieuBanGiao
            {
                MaDonThue = donThue1.MaDonThue,
                MaNhanVien = nhanVien2.MaNhanVien,
                ThoiDiemLap = DateTime.UtcNow.AddDays(-2),
                ThoiDiemGiaoThucTe = DateTime.UtcNow.AddDays(-2),
                TenNhanVienLucGiao = nhanVien2.HoTen,
                TenNguoiNhanThucTe = khach1.HoTen,
                ThoiDiemKhachXacNhan = DateTime.UtcNow.AddDays(-2),
                TrangThai = "DaGiao"
            };
            context.PhieuBanGiaos.Add(phieuBanGiao1);
            await context.SaveChangesAsync();
        }

        var ctbg1 = await context.ChiTietBanGiaos.FirstOrDefaultAsync(c => c.MaPhieuBanGiao == phieuBanGiao1.MaPhieuBanGiao && c.MaPhanCong == phanCong1.MaPhanCong);
        if (ctbg1 == null)
        {
            ctbg1 = new ChiTietBanGiao
            {
                MaPhieuBanGiao = phieuBanGiao1.MaPhieuBanGiao,
                MaPhanCong = phanCong1.MaPhanCong,
                TinhTrangTruocThue = "Lều mới, đầy đủ cọc ghim và dây căng",
                GhiChu = "Đã kiểm tra đủ phụ kiện"
            };
            context.ChiTietBanGiaos.Add(ctbg1);
            await context.SaveChangesAsync();
        }

        var ctbg2 = await context.ChiTietBanGiaos.FirstOrDefaultAsync(c => c.MaPhieuBanGiao == phieuBanGiao1.MaPhieuBanGiao && c.MaPhanCong == phanCong2.MaPhanCong);
        if (ctbg2 == null)
        {
            ctbg2 = new ChiTietBanGiao
            {
                MaPhieuBanGiao = phieuBanGiao1.MaPhieuBanGiao,
                MaPhanCong = phanCong2.MaPhanCong,
                TinhTrangTruocThue = "Bếp ga hoạt động tốt, đánh lửa nhạy",
                GhiChu = "Đã thử lửa tại quầy"
            };
            context.ChiTietBanGiaos.Add(ctbg2);
            await context.SaveChangesAsync();
        }

        // 27. PHIEU_NHAN_TRA & 28. CHI_TIET_NHAN_TRA
        var phieuNhanTra1 = await context.PhieuNhanTras.FirstOrDefaultAsync(p => p.MaDonThue == donThue1.MaDonThue);
        if (phieuNhanTra1 == null)
        {
            phieuNhanTra1 = new PhieuNhanTra
            {
                MaDonThue = donThue1.MaDonThue,
                MaNhanVien = nhanVien2.MaNhanVien,
                MaPhieuHienThi = "PNT-ORD001-01",
                LanTra = 1,
                LaLanTraCuoi = false,
                ThoiDiemLap = DateTime.UtcNow,
                TenNhanVienLucNhan = nhanVien2.HoTen,
                TrangThai = TrangThaiPhieuNhanTra.Nhap
            };
            context.PhieuNhanTras.Add(phieuNhanTra1);
            await context.SaveChangesAsync();
        }

        var ctnt1 = await context.ChiTietNhanTras.FirstOrDefaultAsync(c => c.MaPhieuNhanTra == phieuNhanTra1.MaPhieuNhanTra);
        if (ctnt1 == null)
        {
            ctnt1 = new ChiTietNhanTra
            {
                MaPhieuNhanTra = phieuNhanTra1.MaPhieuNhanTra,
                MaChiTietBanGiao = ctbg1.MaChiTietBanGiao,
                ThoiDiemTraThucTe = DateTime.UtcNow,
                KetLuan = "CanVeSinh",
                TinhTrangSauThue = "Lều bị dính bùn đất cần vệ sinh chuyên sâu",
                TrangThaiXuLy = "ChoXuLy"
            };
            context.ChiTietNhanTras.Add(ctnt1);
            await context.SaveChangesAsync();
        }

        // 29. PHU_PHI (Phụ phí W4-T3)
        var phuPhi1 = await context.PhuPhis.FirstOrDefaultAsync(p => p.MaDonThue == donThue1.MaDonThue);
        if (phuPhi1 == null)
        {
            phuPhi1 = new PhuPhi
            {
                MaDonThue = donThue1.MaDonThue,
                MaChiTietBanGiao = ctbg1.MaChiTietBanGiao,
                MaNguoiLap = nhanVien2.MaNhanVien,
                MaNguoiDuyet = nhanVien1.MaNhanVien,
                LoaiPhi = "VeSinhDacBiet",
                SoTien = 100000,
                LyDo = "Phí vệ sinh lều bám bùn đất",
                CanCuTinhPhi = "{\"loaiPhi\":\"VeSinhDacBiet\",\"congThuc\":\"DinhMucVeSinhChuan\"}",
                ThoiDiemLap = DateTime.UtcNow,
                ThoiDiemDuyet = DateTime.UtcNow,
                TrangThaiDuyet = "DaDuyet",
                TrangThaiTranhChap = null
            };
            context.PhuPhis.Add(phuPhi1);
            await context.SaveChangesAsync();
        }

        // 30. DOI_SOAT_TIEN_COC & 31. GIAO_DICH_DOI_SOAT & 32. HOAN_TIEN
        var doiSoat1 = await context.DoiSoatTienCocs.FirstOrDefaultAsync(d => d.MaDonThue == donThue1.MaDonThue);
        if (doiSoat1 == null)
        {
            doiSoat1 = new DoiSoatTienCoc
            {
                MaDonThue = donThue1.MaDonThue,
                MaNguoiLap = nhanVien2.MaNhanVien,
                LoaiDoiSoat = "DoiSoatBanDau",
                TienCocDuocDoiSoat = 700000,
                TongPhuPhiDuocDuyet = 100000,
                SoTienCanHoan = 600000,
                SoTienCanThuThem = 0,
                BangTinhDoiSoat = "{\"tienCoc\":700000,\"phuPhi\":100000,\"hoan\":600000}",
                ThoiDiemLap = DateTime.UtcNow,
                TrangThai = "ChoXuLyTien"
            };
            context.DoiSoatTienCocs.Add(doiSoat1);
            await context.SaveChangesAsync();

            if (ctttCocDefault != null)
            {
                context.GiaoDichDoiSoats.Add(new GiaoDichDoiSoat
                {
                    MaDoiSoat = doiSoat1.MaDoiSoat,
                    MaChiTietThanhToan = ctttCocDefault.MaChiTietThanhToan
                });

                context.HoanTiens.Add(new HoanTien
                {
                    MaChiTietThanhToanGoc = ctttCocDefault.MaChiTietThanhToan,
                    MaDoiSoat = doiSoat1.MaDoiSoat,
                    MaNguoiXuLy = nhanVien1.MaNhanVien,
                    MaYeuCau = "REF_ORD001_01",
                    LoaiHoan = "HoanCoc",
                    SoTien = 600000,
                    LyDo = "Hoàn cọc sau đối soát trừ phí vệ sinh",
                    ThoiDiemYeuCau = DateTime.UtcNow,
                    TrangThai = "ChoXuLy"
                });
                await context.SaveChangesAsync();
            }
        }

        // 33. PHIEU_BAO_TRI (Phiếu bảo trì thiết bị hư hỏng)
        var tbHong = await context.ThietBis.FirstAsync(t => t.MaThietBiHienThi == "TB-BEP-002");
        if (!await context.PhieuBaoTris.AnyAsync(p => p.MaThietBi == tbHong.MaThietBi))
        {
            context.PhieuBaoTris.Add(new PhieuBaoTri
            {
                MaThietBi = tbHong.MaThietBi,
                MaDonThue = donThue1.MaDonThue,
                MaNguoiLap = nhanVien2.MaNhanVien,
                LoaiXuLy = "SuaChua",
                MoTaLoi = "Chân đế bếp ga bị gãy khớp gập",
                MucDo = "TrungBinh",
                NgayBatDau = DateTime.UtcNow,
                TrangThai = "DangXuLy"
            });
            await context.SaveChangesAsync();
        }

        // 34. PHIEU_DIEU_CHINH_KHO & 35. CHI_TIET_DIEU_CHINH_KHO
        var phieuDieuChinh = await context.PhieuDieuChinhKhos.FirstOrDefaultAsync(p => p.LyDo == "Kiểm kê kho tháng 10/2026");
        if (phieuDieuChinh == null)
        {
            phieuDieuChinh = new PhieuDieuChinhKho
            {
                MaNguoiLap = nhanVien1.MaNhanVien,
                MaNguoiDuyet = nhanVien1.MaNhanVien,
                LoaiDieuChinh = "KiemKeDinhKy",
                LyDo = "Kiểm kê kho tháng 10/2026",
                ThoiDiemLap = DateTime.UtcNow,
                ThoiDiemDuyet = DateTime.UtcNow,
                TrangThai = "DaDuyet"
            };
            context.PhieuDieuChinhKhos.Add(phieuDieuChinh);
            await context.SaveChangesAsync();

            context.ChiTietDieuChinhKhos.Add(new ChiTietDieuChinhKho
            {
                MaPhieuDieuChinh = phieuDieuChinh.MaPhieuDieuChinh,
                MaThietBi = tbHong.MaThietBi,
                GiaTriTruoc = "{\"trangThai\":\"SanSang\"}",
                GiaTriSau = "{\"trangThai\":\"DangBaoTri\"}",
                GhiChu = "Chuyển sang bảo trì sau kiểm kê"
            });
            await context.SaveChangesAsync();
        }

        // 36. DANH_GIA (Đánh giá của khách hàng)
        if (!await context.DanhGias.AnyAsync(d => d.MaChiTietDon == ctd1.MaChiTietDon))
        {
            context.DanhGias.Add(new DanhGia
            {
                MaChiTietDon = ctd1.MaChiTietDon,
                SoSao = 5,
                NoiDung = "Lều rất tốt, chống gió chống mưa tuyệt vời, đầy đủ phụ kiện!",
                DanhSachAnh = "[\"https://storage.geargo.vn/reviews/tent_camp.jpg\"]",
                NgayTao = DateTime.UtcNow,
                TrangThaiHienThi = "HienThi"
            });
            await context.SaveChangesAsync();
        }

        // 37. THONG_BAO (Thông báo gửi cho người dùng)
        if (!await context.ThongBaos.AnyAsync(t => t.MaDonThue == donThue1.MaDonThue))
        {
            context.ThongBaos.AddRange(
                new ThongBao
                {
                    MaTaiKhoan = customerTk1.MaTaiKhoan,
                    MaDonThue = donThue1.MaDonThue,
                    MaSuKien = "EVT_ORD001_CONFIRMED",
                    LoaiSuKien = "XacNhanDon",
                    TieuDe = "Đơn thuê ORD-202610-001 đã được xác nhận",
                    NoiDung = "Cửa hàng đã chuẩn bị xong thiết bị. Bạn có thể đến nhận lều và bếp dã ngoại.",
                    KenhGui = "InApp",
                    TrangThaiGui = "DaGui",
                    ThoiDiemTao = DateTime.UtcNow.AddDays(-2),
                    ThoiDiemGui = DateTime.UtcNow.AddDays(-2)
                },
                new ThongBao
                {
                    MaTaiKhoan = customerTk1.MaTaiKhoan,
                    MaDonThue = donThue1.MaDonThue,
                    MaSuKien = "EVT_ORD001_FEE",
                    LoaiSuKien = "ThongBaoPhuPhi",
                    TieuDe = "Thông báo phụ phí vệ sinh đơn thuê ORD-202610-001",
                    NoiDung = "Phát sinh khoản phụ phí vệ sinh đặc biệt 100.000 VNĐ cho lều Naturehike.",
                    KenhGui = "InApp",
                    TrangThaiGui = "DaGui",
                    ThoiDiemTao = DateTime.UtcNow,
                    ThoiDiemGui = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // 38. LICH_SU_TINH_TRANG_THIET_BI (Lịch sử trạng thái thiết bị)
        if (!await context.LichSuTinhTrangThietBis.AnyAsync(l => l.MaThietBi == tbLeu.MaThietBi))
        {
            context.LichSuTinhTrangThietBis.Add(new LichSuTinhTrangThietBi
            {
                MaThietBi = tbLeu.MaThietBi,
                MaNguoiThucHien = staffTk.MaTaiKhoan,
                TrangThaiTruoc = "SanSang",
                TrangThaiSau = "DangThue",
                TinhTrangTruoc = "Mới",
                TinhTrangSau = "Bàn giao cho khách",
                ThoiDiem = DateTime.UtcNow.AddDays(-2),
                LyDo = "Bàn giao thiết bị cho đơn thuê ORD-202610-001"
            });
            await context.SaveChangesAsync();
        }

        // 39. NHAT_KY_THAO_TAC (Audit Trail toàn hệ thống)
        if (!await context.NhatKyThaoTacs.AnyAsync(n => n.LoaiDoiTuong == "HeThong"))
        {
            context.NhatKyThaoTacs.AddRange(
                new NhatKyThaoTac
                {
                    MaTaiKhoan = adminTk.MaTaiKhoan,
                    HanhDong = "KhoiTaoHeThong",
                    LoaiDoiTuong = "HeThong",
                    MaDoiTuong = "SYS_INIT",
                    ThoiDiem = DateTime.UtcNow.AddMonths(-3),
                    LyDo = "Khởi tạo hệ thống quản trị GearGo"
                },
                new NhatKyThaoTac
                {
                    MaTaiKhoan = staffTk.MaTaiKhoan,
                    HanhDong = "LapPhuPhi",
                    LoaiDoiTuong = "PhuPhi",
                    MaDoiTuong = phuPhi1?.MaPhuPhi.ToString() ?? "1",
                    ThoiDiem = DateTime.UtcNow,
                    LyDo = "Lập phụ phí vệ sinh đặc biệt"
                }
            );
            await context.SaveChangesAsync();
        }
    }
}
