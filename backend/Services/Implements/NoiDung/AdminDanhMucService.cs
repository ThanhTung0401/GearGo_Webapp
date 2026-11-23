using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.DTOs.Admin;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.NoiDung;

public class AdminDanhMucService : IAdminDanhMucService
{
    private readonly ApplicationDbContext _context;

    public AdminDanhMucService(ApplicationDbContext context) => _context = context;

    public async Task<object> LayDanhSachAsync()
        => await _context.Set<DanhMucSanPham>().ToListAsync();

    public async Task<object> TaoMoiAsync(TaoDanhMucRequest req)
    {
        // [DM-04] Validate tên và kiểm tra trùng tên trong cùng cấp cha.
        var tenTrim = (req.TenDanhMuc ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(tenTrim))
            throw new DuLieuKhongHopLeException("TEN_DANH_MUC_RONG", "Tên danh mục không được để trống.");
        if (req.MaDanhMucCha.HasValue && await _context.Set<DanhMucSanPham>().FindAsync(req.MaDanhMucCha.Value) == null)
            throw new KhongTimThayException("Danh mục cha không tồn tại.");
        if (await _context.Set<DanhMucSanPham>().AnyAsync(d => d.MaDanhMucCha == req.MaDanhMucCha && d.TenDanhMuc == tenTrim))
            throw new XungDotDuLieuException("DANH_MUC_TRUNG_TEN", "Đã tồn tại danh mục cùng tên trong cấp cha này.");

        var danhMuc = new DanhMucSanPham
        {
            TenDanhMuc = tenTrim, MaDanhMucCha = req.MaDanhMucCha,
            MoTa = req.MoTa, ThuTuHienThi = req.ThuTuHienThi, TrangThai = req.TrangThai
        };
        _context.Add(danhMuc);
        await _context.SaveChangesAsync();
        return danhMuc;
    }

    public async Task<object> CapNhatAsync(long id, CapNhatDanhMucRequest req)
    {
        var danhMuc = await _context.Set<DanhMucSanPham>().FindAsync(id)
            ?? throw new KhongTimThayException("Không tìm thấy danh mục.");

        // [DM-04] Validate tên và kiểm tra trùng tên trong cùng cấp cha (khác chính nó).
        var tenTrim = (req.TenDanhMuc ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(tenTrim))
            throw new DuLieuKhongHopLeException("TEN_DANH_MUC_RONG", "Tên danh mục không được để trống.");
        if (req.MaDanhMucCha.HasValue)
            await KiemTraDanhMucChaHopLeAsync(id, req.MaDanhMucCha.Value);
        if (await _context.Set<DanhMucSanPham>().AnyAsync(d => d.MaDanhMucCha == req.MaDanhMucCha && d.TenDanhMuc == tenTrim && d.MaDanhMuc != id))
            throw new XungDotDuLieuException("DANH_MUC_TRUNG_TEN", "Đã tồn tại danh mục cùng tên trong cấp cha này.");

        danhMuc.TenDanhMuc = tenTrim;
        danhMuc.MaDanhMucCha = req.MaDanhMucCha;
        danhMuc.MoTa = req.MoTa;
        danhMuc.ThuTuHienThi = req.ThuTuHienThi;
        danhMuc.TrangThai = req.TrangThai;

        await _context.SaveChangesAsync();
        return danhMuc;
    }

    // Kiểm tra danh mục cha tồn tại và không tạo vòng lặp phân cấp đa tầng
    private async Task KiemTraDanhMucChaHopLeAsync(long id, long maDanhMucCha)
    {
        if (maDanhMucCha == id)
            throw new DuLieuKhongHopLeException("DANH_MUC_CHA_SAI", "Danh mục cha không được là chính nó.");
        if (await _context.Set<DanhMucSanPham>().FindAsync(maDanhMucCha) == null)
            throw new KhongTimThayException("Danh mục cha không tồn tại.");

        long? currentAncestorId = maDanhMucCha;
        var visited = new HashSet<long>();
        while (currentAncestorId.HasValue)
        {
            if (currentAncestorId.Value == id)
                throw new XungDotDuLieuException("DANH_MUC_VONG_LAP", "Không thể chọn danh mục con hoặc cháu làm danh mục cha (phát hiện vòng lặp phân cấp).");
            if (!visited.Add(currentAncestorId.Value)) break;

            var ancestor = await _context.Set<DanhMucSanPham>().AsNoTracking()
                .FirstOrDefaultAsync(d => d.MaDanhMuc == currentAncestorId.Value);
            currentAncestorId = ancestor?.MaDanhMucCha;
        }
    }

    public async Task DoiTrangThaiAsync(long id, string trangThaiMoi)
    {
        var danhMuc = await _context.Set<DanhMucSanPham>().FindAsync(id)
            ?? throw new KhongTimThayException("Không tìm thấy danh mục.");

        // [DM-03] Validate trạng thái hợp lệ và chặn ẩn danh mục đang chứa sản phẩm DangKinhDoanh.
        var valid = new[] { "HienThi", "TamAn" };
        if (!valid.Contains(trangThaiMoi))
            throw new DuLieuKhongHopLeException("TRANG_THAI_KHONG_HOP_LE", "Trạng thái danh mục không hợp lệ (chỉ chấp nhận HienThi hoặc TamAn).");
        if (trangThaiMoi == "TamAn")
        {
            var coSanPhamActive = await _context.Set<SanPham>()
                .AnyAsync(s => s.MaDanhMuc == id && s.TrangThaiKinhDoanh == Models.Enums.TrangThaiKinhDoanh.DangKinhDoanh);
            if (coSanPhamActive)
                throw new XungDotDuLieuException("DANH_MUC_DANG_CO_SAN_PHAM_KD", "Không thể ẩn danh mục đang chứa sản phẩm đang kinh doanh.");
        }

        danhMuc.TrangThai = trangThaiMoi;
        await _context.SaveChangesAsync();
    }

    public async Task XoaAsync(long id)
    {
        if (await _context.Set<SanPham>().AnyAsync(s => s.MaDanhMuc == id))
            throw new XungDotDuLieuException("DANH_MUC_DANG_CO_SAN_PHAM", "Không thể xóa danh mục đang chứa sản phẩm.");
        if (await _context.Set<DanhMucSanPham>().AnyAsync(d => d.MaDanhMucCha == id))
            throw new XungDotDuLieuException("DANH_MUC_DANG_CO_CON", "Không thể xóa danh mục đang chứa danh mục con.");

        var danhMuc = await _context.Set<DanhMucSanPham>().FindAsync(id);
        if (danhMuc != null)
        {
            _context.Remove(danhMuc);
            await _context.SaveChangesAsync();
        }
    }
}
