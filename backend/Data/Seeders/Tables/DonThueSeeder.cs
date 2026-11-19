using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung đơn thuê đa trạng thái, chi tiết đơn, giữ chỗ, lịch sử trạng thái và thanh toán.</summary>
internal static class DonThueSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var khachs = await context.KhachHangs.OrderBy(k => k.MaKhachHang).ToListAsync();
        var sps = await context.SanPhams.OrderBy(s => s.MaSanPham).ToListAsync();
        var cs = await context.ChinhSachs.OrderByDescending(c => c.PhienBan).FirstOrDefaultAsync();
        var nv = await context.NhanViens.OrderBy(n => n.MaNhanVien).FirstOrDefaultAsync();
        if (khachs.Count == 0 || sps.Count == 0 || cs == null || nv == null) return;

        var orders = new[]
        {
            ("ORD-202611-101", TrangThaiDonThue.ChoThanhToan, 2, 4, 360000m, 0m, 1000000m, false),
            ("ORD-202611-102", TrangThaiDonThue.DaXacNhan, 1, 3, 280000m, 28000m, 800000m, true),
            ("ORD-202611-103", TrangThaiDonThue.DangChuanBi, 0, 2, 450000m, 0m, 1200000m, true),
            ("ORD-202611-104", TrangThaiDonThue.DangThue, -1, 2, 320000m, 50000m, 700000m, true),
            ("ORD-202611-105", TrangThaiDonThue.HoanTat, -7, -5, 560000m, 0m, 1000000m, true),
            ("ORD-202611-106", TrangThaiDonThue.KhachHuy, -4, -2, 240000m, 0m, 500000m, false),
            // Các đơn bổ sung để đủ mọi trạng thái UC4.2, UC5.3, UC5.4, UC5.5, UC5.6, UC3.4
            ("ORD-202611-107", TrangThaiDonThue.SanSangNhan, 0, 2, 360000m, 0m, 800000m, true),
            ("ORD-202611-108", TrangThaiDonThue.ChoDoiSoat, -3, -1, 300000m, 0m, 500000m, true),
            ("ORD-202611-109", TrangThaiDonThue.ChoDoiSoat, -4, -1, 400000m, 0m, 1000000m, true),
            ("ORD-202611-110", TrangThaiDonThue.DaXacNhan, 3, 5, 420000m, 0m, 900000m, true),
            ("ORD-202611-111", TrangThaiDonThue.DangThue, -2, 1, 360000m, 0m, 800000m, true),
        };

        var customer1 = await context.KhachHangs
            .Include(k => k.TaiKhoan)
            .FirstOrDefaultAsync(k => k.TaiKhoan.Email == "customer@geargo.vn") ?? khachs[0];

        var readyEquipments = await context.ThietBis
            .Where(t => t.TrangThaiSuDung == TrangThaiThietBi.SanSang)
            .OrderBy(t => t.MaThietBi)
            .Take(4)
            .ToListAsync();

        for (var i = 0; i < orders.Length; i++)
        {
            var (maDon, tt, nhanOff, traOff, tongThue, giam, coc, daThanhToan) = orders[i];
            if (await context.DonThues.AnyAsync(d => d.MaDonHienThi == maDon)) continue;

            var kh = (maDon == "ORD-202611-110") ? customer1 : khachs[i % khachs.Count];
            var sp = sps[i % sps.Count];
            var don = new DonThue
            {
                MaKhachHang = kh.MaKhachHang,
                MaChinhSach = cs.MaChinhSach,
                MaDonHienThi = maDon,
                NgayDat = DateTime.UtcNow.AddDays(nhanOff - 1),
                GioNhanDuKien = DateTime.UtcNow.AddDays(nhanOff),
                GioTraDuKien = DateTime.UtcNow.AddDays(traOff),
                TenNguoiNhan = kh.HoTen,
                SoDienThoaiNguoiNhan = $"090200001{i}",
                EmailLienHe = $"khach{i + 1}@geargo.vn",
                TongTienThueTruocGiam = tongThue,
                TongTienGiam = giam,
                TongTienCoc = coc,
                TrangThai = tt,
                TienThueGiuLaiKhiHuy = tt == TrangThaiDonThue.KhachHuy ? 50000m : 0m
            };
            context.DonThues.Add(don);
            await context.SaveChangesAsync();

            var ctd = new ChiTietDonThue
            {
                MaDonThue = don.MaDonThue,
                MaSanPham = sp.MaSanPham,
                TenSanPhamLucDat = sp.TenSanPham,
                SoLuong = 1,
                SoNgayTinhTien = 2,
                DonGiaThueMoiNgay = sp.GiaThueMoiNgay,
                TienGiam = giam,
                MucCocMoiThietBi = sp.MucCocMoiThietBi,
                GiaTriBoiThuongMoiThietBi = sp.GiaTriBoiThuong
            };
            context.ChiTietDonThues.Add(ctd);
            await context.SaveChangesAsync();

            context.GiuChos.Add(new GiuCho
            {
                MaChiTietDon = ctd.MaChiTietDon,
                ThoiDiemTao = don.NgayDat,
                ThoiDiemHetHan = don.GioTraDuKien.AddDays(1),
                TrangThai = tt == TrangThaiDonThue.KhachHuy ? TrangThaiGiuCho.DaGiaiPhong : TrangThaiGiuCho.DaXacNhan
            });

            context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = don.MaDonThue,
                MaNguoiThucHien = kh.MaTaiKhoan,
                TrangThaiTruoc = "TaoMoi",
                TrangThaiSau = tt.ToString(),
                ThoiDiem = don.NgayDat,
                LyDo = $"Khởi tạo đơn mẫu {maDon}"
            });

            if (daThanhToan)
            {
                var pay = new ThanhToan
                {
                    MaDonThue = don.MaDonThue,
                    MaNguoiGhiNhan = nv.MaNhanVien,
                    MaYeuCau = $"PAY_{maDon}",
                    CongThanhToan = "VNPay",
                    MaGiaoDichCong = $"VNP_{maDon}",
                    TongSoTien = (tongThue - giam) + coc,
                    PhuongThuc = "VNPayQR",
                    ThoiDiemTao = don.NgayDat,
                    ThoiDiemThanhCong = don.NgayDat.AddMinutes(5),
                    TrangThai = "ThanhCong"
                };
                context.ThanhToans.Add(pay);
                await context.SaveChangesAsync();

                context.ChiTietThanhToans.AddRange(
                    new ChiTietThanhToan { MaThanhToan = pay.MaThanhToan, MucDich = "TienThue", SoTien = tongThue - giam },
                    new ChiTietThanhToan { MaThanhToan = pay.MaThanhToan, MucDich = "TienCoc", SoTien = coc }
                );
            }

            // Phân công thiết bị cho đơn SanSangNhan (UC4.2), ChoDoiSoat & DangThue chưa trả (UC4.3, UC5.2)
            if ((maDon == "ORD-202611-107" || maDon == "ORD-202611-108" || maDon == "ORD-202611-109" || maDon == "ORD-202611-111") && readyEquipments.Count > 0)
            {
                var eq = readyEquipments[i % readyEquipments.Count];
                var pc = new PhanCongThietBi
                {
                    MaChiTietDon = ctd.MaChiTietDon,
                    MaThietBi = eq.MaThietBi,
                    MaNguoiPhanCong = nv.MaNhanVien,
                    TrangThai = "DaPhanCong"
                };
                context.PhanCongThietBis.Add(pc);
                await context.SaveChangesAsync();

                if (maDon == "ORD-202611-111")
                {
                    var pbg = new PhieuBanGiao
                    {
                        MaDonThue = don.MaDonThue,
                        MaNhanVien = nv.MaNhanVien,
                        ThoiDiemLap = don.NgayDat.AddHours(2),
                        ThoiDiemGiaoThucTe = don.GioNhanDuKien,
                        TenNhanVienLucGiao = nv.HoTen,
                        TenNguoiNhanThucTe = don.TenNguoiNhan,
                        TrangThai = "DaBanGiao"
                    };
                    context.PhieuBanGiaos.Add(pbg);
                    await context.SaveChangesAsync();

                    context.ChiTietBanGiaos.Add(new ChiTietBanGiao
                    {
                        MaPhieuBanGiao = pbg.MaPhieuBanGiao,
                        MaPhanCong = pc.MaPhanCong,
                        TinhTrangTruocThue = "Ngoại quan tốt, đầy đủ phụ kiện"
                    });
                }
            }

            // Seed Phụ phí mẫu:
            // - ORD-202611-111: Phụ phí Đang tranh chấp + Chờ duyệt (UC5.3)
            // - ORD-202611-108: Phụ phí 900k > Cọc 500k (UC5.5 Thu tiền bổ sung)
            // - ORD-202611-109: Phụ phí 150k < Cọc 1.000k (UC5.6 Hoàn tiền)
            if (maDon == "ORD-202611-111")
            {
                context.PhuPhis.Add(new PhuPhi
                {
                    MaDonThue = don.MaDonThue,
                    MaNguoiLap = nv.MaNhanVien,
                    LoaiPhi = "HuHongThietBi",
                    SoTien = 250000m,
                    LyDo = "Rách nhẹ bạt phủ ngoài lều (Khách khiếu nại mức phí)",
                    TrangThaiDuyet = "ChoDuyet",
                    TrangThaiTranhChap = "DangTranhChap"
                });
            }
            else if (maDon == "ORD-202611-108")
            {
                context.PhuPhis.Add(new PhuPhi
                {
                    MaDonThue = don.MaDonThue,
                    MaNguoiLap = nv.MaNhanVien,
                    MaNguoiDuyet = nv.MaNhanVien,
                    LoaiPhi = "HuHongThietBi",
                    SoTien = 900000m,
                    LyDo = "Gãy khung nhôm chính & mất bộ cọc lều",
                    TrangThaiDuyet = "DaDuyet",
                    ThoiDiemDuyet = DateTime.UtcNow
                });
            }
            else if (maDon == "ORD-202611-109")
            {
                context.PhuPhis.Add(new PhuPhi
                {
                    MaDonThue = don.MaDonThue,
                    MaNguoiLap = nv.MaNhanVien,
                    MaNguoiDuyet = nv.MaNhanVien,
                    LoaiPhi = "VeSinh",
                    SoTien = 150000m,
                    LyDo = "Phí vệ sinh bùn đất bám khung & túi ngủ",
                    TrangThaiDuyet = "DaDuyet",
                    ThoiDiemDuyet = DateTime.UtcNow
                });
            }
            await context.SaveChangesAsync();
        }
    }
}
