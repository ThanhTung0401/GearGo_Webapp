using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.DTOs.KhuyenMai;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using GearGo.Models.Entities;
using GearGo.Models.Enums;

namespace GearGo.Services.Implements;
public class KhuyenMaiService : IKhuyenMaiService
{
    private readonly ApplicationDbContext _context;
    public KhuyenMaiService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<KhuyenMaiHopLe> KiemTraApDungAsync(string maGiamGia, long maKhachHang, List<long> sanPhamIds, decimal tienThueTruocGiam)
    {
        var now = DateTime.UtcNow;
        var km = await _context.KhuyenMais
            .Include(k => k.KhuyenMaiSanPhams)
            .Include(k => k.KhuyenMaiDanhMucs)
            .FirstOrDefaultAsync(k => k.MaGiamGia == maGiamGia);

        if (km == null) throw new KhuyenMaiKhongHopLeException("Mã giảm giá không tồn tại.");
        if (km.TrangThai == TrangThaiKhuyenMai.TamAn) throw new KhuyenMaiKhongHopLeException("Mã giảm giá đang tạm ẩn.");
        if (km.TrangThai == TrangThaiKhuyenMai.HetHan || now < km.BatDau || now > km.KetThuc)
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá đã hết hạn hoặc chưa đến thời gian áp dụng.");

        if (tienThueTruocGiam < km.TienThueToiThieu)
            throw new KhuyenMaiKhongHopLeException($"Đơn hàng chưa đạt mức tối thiểu {km.TienThueToiThieu} để áp dụng mã.");

        // Đếm tổng lượt đang giữ (còn hạn) hoặc đã dùng
        var tongLuot = await _context.LuotSuDungKhuyenMais
            .Where(l => l.MaKhuyenMai == km.MaKhuyenMai &&
                        (l.TrangThai == "DaSuDung" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now)))
            .CountAsync();

        if (km.GioiHanTongLuot.HasValue && tongLuot >= km.GioiHanTongLuot.Value)
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá đã hết lượt sử dụng.");

        // Đếm lượt của khách này
        var luotKhach = await _context.LuotSuDungKhuyenMais
            .Include(l => l.DonThue)
            .Where(l => l.MaKhuyenMai == km.MaKhuyenMai && l.DonThue.MaKhachHang == maKhachHang &&
                        (l.TrangThai == "DaSuDung" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now)))
            .CountAsync();
            
        if (km.GioiHanMoiKhach.HasValue && luotKhach >= km.GioiHanMoiKhach.Value)
            throw new KhuyenMaiKhongHopLeException("Bạn đã hết lượt sử dụng mã này.");

        // Kiểm tra phạm vi áp dụng
        if (km.PhamVi != PhamViApDung.TatCa)
        {
            // Logic lọc sản phẩm hợp lệ, tạm thời giả định đơn giản
            bool hopLe = false;
            if (km.PhamVi == PhamViApDung.TheoSanPham) {
                var spApDung = km.KhuyenMaiSanPhams.Select(x => x.MaSanPham).ToList();
                hopLe = sanPhamIds.Any(id => spApDung.Contains(id));
            } else if (km.PhamVi == PhamViApDung.TheoDanhMuc) {
                // ...
                hopLe = true; 
            }
            if (!hopLe) throw new KhuyenMaiKhongHopLeException("Mã giảm giá không áp dụng cho sản phẩm trong giỏ.");
        }

        // Tính số tiền giảm
        decimal soTienGiam = 0;
        if (km.LoaiGiam == LoaiKhuyenMai.SoTien) {
            soTienGiam = km.GiaTriGiam;
        } else {
            soTienGiam = tienThueTruocGiam * (km.GiaTriGiam / 100);
        }

        if (km.MucGiamToiDa.HasValue && soTienGiam > km.MucGiamToiDa.Value)
            soTienGiam = km.MucGiamToiDa.Value;

        return new KhuyenMaiHopLe { MaKhuyenMai = km.MaKhuyenMai, SoTienDuocGiam = soTienGiam };
    }

    public async Task GiuLuotAsync(long maKhuyenMai, long maDonThue, DateTime thoiDiemHetHan)
    {
        var luot = new LuotSuDungKhuyenMai {
            MaKhuyenMai = maKhuyenMai,
            MaDonThue = maDonThue,
            ThoiDiemHetHan = thoiDiemHetHan,
            TrangThai = "DangGiu"
        };
        _context.LuotSuDungKhuyenMais.Add(luot);
        await _context.SaveChangesAsync();
    }

    public async Task XacNhanDaSuDungAsync(long maDonThue)
    {
        var luot = await _context.LuotSuDungKhuyenMais
            .Include(l => l.DonThue)
            .FirstOrDefaultAsync(l => l.MaDonThue == maDonThue && l.TrangThai == "DangGiu");

        if (luot != null) {
            // Bảo vệ: Chỉ cho phép xác nhận dùng lượt khi đơn hàng đã được cập nhật thành Đã Xác Nhận (Đã thanh toán)
            if (luot.DonThue.TrangThai != TrangThaiDonThue.DaXacNhan) {
                throw new KhuyenMaiKhongHopLeException("Đơn hàng chưa được xác nhận thanh toán thành công, không thể dùng lượt.");
            }
            luot.TrangThai = "DaSuDung";
            luot.ThoiDiemSuDung = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task GiaiPhongLuotAsync(long maDonThue)
    {
        var luot = await _context.LuotSuDungKhuyenMais
            .Include(l => l.DonThue)
            .FirstOrDefaultAsync(l => l.MaDonThue == maDonThue && l.TrangThai == "DangGiu");

        if (luot != null) {
            // Bảo vệ: Chỉ giải phóng lượt khi đơn hàng đã bị hủy trước thanh toán (Khách Hủy, Cửa Hàng Hủy) hoặc Hết Hạn
            if (luot.DonThue.TrangThai != TrangThaiDonThue.KhachHuy &&
                luot.DonThue.TrangThai != TrangThaiDonThue.CuaHangHuy &&
                luot.DonThue.TrangThai != TrangThaiDonThue.HetHan) {
                throw new KhuyenMaiKhongHopLeException("Chỉ giải phóng lượt khi đơn hàng đã bị hủy hoặc hết hạn trước thanh toán.");
            }
            luot.TrangThai = "DaGiaiPhong";
            luot.ThoiDiemGiaiPhong = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}
