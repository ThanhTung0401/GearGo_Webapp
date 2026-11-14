using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.DTOs.KhuyenMai;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.KhuyenMai;

public partial class KhuyenMaiService : IKhuyenMaiService
{
    private readonly ApplicationDbContext _context;

    public KhuyenMaiService(ApplicationDbContext context)
    {
        _context = context;
    }

    // Kiểm tra trạng thái hiệu lực, ngưỡng tiền thuê tối thiểu và hạn mức lượt sử dụng
    private async Task<string?> KiemTraDieuKienCoBanAsync(
        GearGo.Models.Entities.KhuyenMai? km, long maKhachHang, decimal tienThueXetNguong, DateTime now)
    {
        if (km == null) return "Mã giảm giá không tồn tại.";
        if (km.TrangThai == TrangThaiKhuyenMai.TamAn) return "Mã giảm giá đang tạm ẩn.";
        if (km.TrangThai == TrangThaiKhuyenMai.HetHan || now < km.BatDau || now > km.KetThuc)
            return "Mã giảm giá đã hết hạn hoặc chưa đến thời gian áp dụng.";
        if (tienThueXetNguong < km.TienThueToiThieu)
            return $"Đơn hàng cần đạt mức tối thiểu {km.TienThueToiThieu:N0} đ tiền thuê.";

        var tongLuot = await _context.LuotSuDungKhuyenMais
            .CountAsync(l => l.MaKhuyenMai == km.MaKhuyenMai &&
                             (l.TrangThai == "DaSuDung" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now)));
        if (km.GioiHanTongLuot.HasValue && tongLuot >= km.GioiHanTongLuot.Value)
            return "Mã giảm giá đã hết lượt sử dụng.";

        if (maKhachHang > 0 && km.GioiHanMoiKhach.HasValue)
        {
            var luotKhach = await _context.LuotSuDungKhuyenMais
                .Include(l => l.DonThue)
                .CountAsync(l => l.MaKhuyenMai == km.MaKhuyenMai && l.DonThue.MaKhachHang == maKhachHang &&
                                 (l.TrangThai == "DaSuDung" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now)));
            if (luotKhach >= km.GioiHanMoiKhach.Value)
                return "Bạn đã hết lượt sử dụng mã này.";
        }
        return null;
    }

    public async Task<KhuyenMaiHopLe> KiemTraApDungAsync(string maGiamGia, long maKhachHang, List<long> sanPhamIds, decimal tienThueTruocGiam)
    {
        var maChuanHoa = KhuyenMaiHelper.ChuanHoaMa(maGiamGia);
        var km = await _context.KhuyenMais
            .Include(k => k.KhuyenMaiSanPhams).Include(k => k.KhuyenMaiDanhMucs)
            .FirstOrDefaultAsync(k => k.MaGiamGia == maChuanHoa);

        var loi = await KiemTraDieuKienCoBanAsync(km, maKhachHang, tienThueTruocGiam, DateTime.UtcNow);
        if (loi != null)
            throw new KhuyenMaiKhongHopLeException(loi);

        if (km!.PhamVi == PhamViApDung.TheoSanPham)
        {
            var spApDung = km.KhuyenMaiSanPhams.Select(x => x.MaSanPham).ToHashSet();
            if (!sanPhamIds.Any(id => spApDung.Contains(id)))
                throw new KhuyenMaiKhongHopLeException("Mã giảm giá không áp dụng cho sản phẩm trong đơn.");
        }
        else if (km.PhamVi == PhamViApDung.TheoDanhMuc)
        {
            var dmApDung = km.KhuyenMaiDanhMucs.Select(x => x.MaDanhMuc).ToHashSet();
            var spDanhMucs = await _context.SanPhams
                .Where(s => sanPhamIds.Contains(s.MaSanPham)).Select(s => s.MaDanhMuc).ToListAsync();
            if (!spDanhMucs.Any(dm => dmApDung.Contains(dm)))
                throw new KhuyenMaiKhongHopLeException("Mã giảm giá không áp dụng cho danh mục sản phẩm trong đơn.");
        }

        return new KhuyenMaiHopLe
        {
            MaKhuyenMai = km.MaKhuyenMai,
            SoTienDuocGiam = KhuyenMaiHelper.TinhTienGiam(km, tienThueTruocGiam)
        };
    }

    public async Task<KiemTraMaResult> KiemTraApDungChiTietAsync(string maGiamGia, long maKhachHang, List<DongBaoGiaItem> items)
    {
        var maChuanHoa = KhuyenMaiHelper.ChuanHoaMa(maGiamGia);
        var result = new KiemTraMaResult
        {
            MaGiamGia = maChuanHoa,
            TienThueXetNguong = items.Sum(i => i.TienThueTruocGiam),
            TongCoc = items.Sum(i => i.TienCocDong)
        };

        var km = await _context.KhuyenMais
            .Include(k => k.KhuyenMaiSanPhams).Include(k => k.KhuyenMaiDanhMucs)
            .FirstOrDefaultAsync(k => k.MaGiamGia == maChuanHoa);

        if (km != null) { result.MaKhuyenMai = km.MaKhuyenMai; result.TenKhuyenMai = km.TenKhuyenMai; }

        var loi = await KiemTraDieuKienCoBanAsync(km, maKhachHang, result.TienThueXetNguong, DateTime.UtcNow);
        if (loi != null) { result.HopLe = false; result.LyDoKhongHopLe = loi; return result; }

        var spHopLeIds = await LaySanPhamHopLeAsync(km!, items);
        decimal tienThueDuPhamVi = items
            .Where(i => km!.PhamVi == PhamViApDung.TatCa || spHopLeIds.Contains(i.MaSanPham))
            .Sum(i => i.TienThueTruocGiam);
        result.TienThueDuPhamVi = tienThueDuPhamVi;

        if (tienThueDuPhamVi <= 0)
        {
            result.HopLe = false;
            result.LyDoKhongHopLe = "Không có sản phẩm nào trong giỏ/đơn thuộc phạm vi áp dụng mã.";
            return result;
        }

        decimal tongGiam = KhuyenMaiHelper.TinhTienGiam(km!, tienThueDuPhamVi);
        result.HopLe = true;
        result.TongGiamGia = tongGiam;
        result.PhanBoCacDong = PhanBoGiamGia(items, tongGiam, spHopLeIds, km!.PhamVi);
        return result;
    }

    private async Task<HashSet<long>> LaySanPhamHopLeAsync(GearGo.Models.Entities.KhuyenMai km, List<DongBaoGiaItem> items)
    {
        if (km.PhamVi == PhamViApDung.TheoSanPham)
            return km.KhuyenMaiSanPhams.Select(x => x.MaSanPham).ToHashSet();

        var spHopLeIds = new HashSet<long>();
        if (km.PhamVi != PhamViApDung.TheoDanhMuc) return spHopLeIds;

        var dmHopLeIds = km.KhuyenMaiDanhMucs.Select(x => x.MaDanhMuc).ToHashSet();
        var spIdsCanTra = items.Where(i => !i.MaDanhMuc.HasValue).Select(i => i.MaSanPham).Distinct().ToList();
        var dictDm = spIdsCanTra.Any()
            ? await _context.SanPhams.Where(s => spIdsCanTra.Contains(s.MaSanPham)).ToDictionaryAsync(s => s.MaSanPham, s => s.MaDanhMuc)
            : new Dictionary<long, long>();

        foreach (var item in items)
        {
            var dm = item.MaDanhMuc ?? (dictDm.TryGetValue(item.MaSanPham, out var d) ? d : 0);
            if (dmHopLeIds.Contains(dm)) spHopLeIds.Add(item.MaSanPham);
        }
        return spHopLeIds;
    }
}
