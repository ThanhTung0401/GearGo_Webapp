using GearGo.Models.Common;
using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.KhuyenMai;

public partial class QuanTriKhuyenMaiService
{
    private static Result<KhuyenMaiResponse>? ValidateCauHinhTao(TaoKhuyenMaiRequest req, string maChuanHoa)
    {
        if (string.IsNullOrWhiteSpace(maChuanHoa))
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Mã giảm giá không được để trống.");
        if (req.BatDau > req.KetThuc)
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Thời điểm bắt đầu không được sau thời điểm kết thúc.");
        if (req.LoaiGiam == LoaiKhuyenMai.PhanTram && (req.GiaTriGiam <= 0 || req.GiaTriGiam > 100))
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Phần trăm giảm giá phải nằm trong khoảng (0, 100].");
        if (req.LoaiGiam == LoaiKhuyenMai.SoTien && req.GiaTriGiam <= 0)
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Số tiền giảm phải lớn hơn 0.");
        if (req.MucGiamToiDa.HasValue && req.MucGiamToiDa.Value <= 0)
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Mức giảm tối đa nếu có phải lớn hơn 0.");
        if (req.TienThueToiThieu < 0)
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Tiền thuê tối thiểu không được âm.");
        return null;
    }

    private async Task<(Result<KhuyenMaiResponse>? Loi, List<long> SpIds, List<long> DmIds)> ValidatePhamViAsync(
        PhamViApDung phamVi, List<long>? sanPhamIds, List<long>? danhMucIds)
    {
        if (phamVi == PhamViApDung.TheoSanPham)
        {
            if (sanPhamIds == null || !sanPhamIds.Any())
                return (Result<KhuyenMaiResponse>.Loi("PHAM_VI_MA_KHONG_HOP_LE", "Phải chọn ít nhất 1 sản phẩm khi áp dụng theo sản phẩm."), new(), new());
            var validSp = sanPhamIds.Distinct().ToList();
            if (await _context.SanPhams.CountAsync(s => validSp.Contains(s.MaSanPham)) != validSp.Count)
                return (Result<KhuyenMaiResponse>.Loi("PHAM_VI_MA_KHONG_HOP_LE", "Có mã sản phẩm không tồn tại trong hệ thống."), new(), new());
            return (null, validSp, new());
        }
        if (phamVi == PhamViApDung.TheoDanhMuc)
        {
            if (danhMucIds == null || !danhMucIds.Any())
                return (Result<KhuyenMaiResponse>.Loi("PHAM_VI_MA_KHONG_HOP_LE", "Phải chọn ít nhất 1 danh mục khi áp dụng theo danh mục."), new(), new());
            var validDm = danhMucIds.Distinct().ToList();
            if (await _context.DanhMucSanPhams.CountAsync(d => validDm.Contains(d.MaDanhMuc)) != validDm.Count)
                return (Result<KhuyenMaiResponse>.Loi("PHAM_VI_MA_KHONG_HOP_LE", "Có mã danh mục không tồn tại trong hệ thống."), new(), new());
            return (null, new(), validDm);
        }
        return (null, new(), new());
    }

    public async Task<Result<KhuyenMaiResponse>> TaoAsync(TaoKhuyenMaiRequest request, long actorId)
    {
        var maChuanHoa = KhuyenMaiHelper.ChuanHoaMa(request.MaGiamGia);
        if (ValidateCauHinhTao(request, maChuanHoa) is { } loiCauHinh) return loiCauHinh;

        var (loiPhamVi, validSpIds, validDmIds) = await ValidatePhamViAsync(request.PhamVi, request.SanPhamIds, request.DanhMucIds);
        if (loiPhamVi != null) return loiPhamVi;

        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            if (await _context.KhuyenMais.AnyAsync(k => k.MaGiamGia == maChuanHoa))
            {
                await tx.RollbackAsync();
                return Result<KhuyenMaiResponse>.Loi("MA_GIAM_GIA_TRUNG", $"Mã giảm giá '{maChuanHoa}' đã tồn tại trong hệ thống.");
            }

            var km = new GearGo.Models.Entities.KhuyenMai
            {
                MaGiamGia = maChuanHoa, TenKhuyenMai = request.TenKhuyenMai?.Trim(),
                LoaiGiam = request.LoaiGiam, GiaTriGiam = request.GiaTriGiam,
                MucGiamToiDa = request.MucGiamToiDa, TienThueToiThieu = request.TienThueToiThieu,
                PhamVi = request.PhamVi, BatDau = request.BatDau, KetThuc = request.KetThuc,
                GioiHanTongLuot = request.GioiHanTongLuot, GioiHanMoiKhach = request.GioiHanMoiKhach,
                TrangThai = TrangThaiKhuyenMai.HienThi
            };
            _context.KhuyenMais.Add(km);
            await _context.SaveChangesAsync();

            foreach (var spId in validSpIds)
                _context.KhuyenMaiSanPhams.Add(new KhuyenMaiSanPham { MaKhuyenMai = km.MaKhuyenMai, MaSanPham = spId });
            foreach (var dmId in validDmIds)
                _context.KhuyenMaiDanhMucs.Add(new KhuyenMaiDanhMuc { MaKhuyenMai = km.MaKhuyenMai, MaDanhMuc = dmId });
            if (validSpIds.Any() || validDmIds.Any()) await _context.SaveChangesAsync();

            await tx.CommitAsync();
            return Result<KhuyenMaiResponse>.Ok(KhuyenMaiHelper.MapResponse(km, 0, 0, 0, validSpIds, validDmIds));
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync();
            bool isDup = ex.InnerException?.Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) == true ||
                         ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true;
            return isDup
                ? Result<KhuyenMaiResponse>.Loi("MA_GIAM_GIA_TRUNG", $"Mã giảm giá '{maChuanHoa}' bị trùng lặp.")
                : Result<KhuyenMaiResponse>.Loi("DB_ERROR", $"Lỗi ghi dữ liệu: {ex.Message}");
        }
    }

    // Kiểm tra khóa điều khoản cam kết khi đã có đơn giữ chỗ hoặc đã dùng
    private static Result<KhuyenMaiResponse>? KiemTraCamKetCapNhat(
        GearGo.Models.Entities.KhuyenMai km, CapNhatKhuyenMaiRequest req, int tongDangChiem)
    {
        if (tongDangChiem <= 0) return null;

        bool doiDieuKhoan = (req.LoaiGiam.HasValue && req.LoaiGiam.Value != km.LoaiGiam)
            || (req.GiaTriGiam.HasValue && req.GiaTriGiam.Value != km.GiaTriGiam)
            || (req.MucGiamToiDa.HasValue && req.MucGiamToiDa.Value != km.MucGiamToiDa)
            || (req.TienThueToiThieu.HasValue && req.TienThueToiThieu.Value != km.TienThueToiThieu)
            || (req.PhamVi.HasValue && req.PhamVi.Value != km.PhamVi)
            || req.SanPhamIds != null || req.DanhMucIds != null;

        if (doiDieuKhoan)
            return Result<KhuyenMaiResponse>.Loi("DIEU_KHOAN_MA_DA_CAM_KET",
                "Mã đã có đơn giữ chỗ hoặc sử dụng; không được phép sửa loại giảm, mức giảm, ngưỡng tối thiểu hay phạm vi áp dụng.");

        if (req.GioiHanTongLuot.HasValue && req.GioiHanTongLuot.Value < tongDangChiem)
            return Result<KhuyenMaiResponse>.Loi("HAN_MUC_THAP_HON_DANG_CHIEM",
                $"Hạn mức mới ({req.GioiHanTongLuot.Value}) không được nhỏ hơn tổng số lượt đang chiếm ({tongDangChiem}).");

        return null;
    }

    private async Task<Result<KhuyenMaiResponse>?> ApDungCauHinhChuaCamKetAsync(
        GearGo.Models.Entities.KhuyenMai km, CapNhatKhuyenMaiRequest req)
    {
        if (req.LoaiGiam.HasValue) km.LoaiGiam = req.LoaiGiam.Value;
        if (req.GiaTriGiam.HasValue)
        {
            if (km.LoaiGiam == LoaiKhuyenMai.PhanTram && (req.GiaTriGiam.Value <= 0 || req.GiaTriGiam.Value > 100))
                return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Phần trăm giảm giá phải nằm trong khoảng (0, 100].");
            if (km.LoaiGiam == LoaiKhuyenMai.SoTien && req.GiaTriGiam.Value <= 0)
                return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Số tiền giảm phải lớn hơn 0.");
            km.GiaTriGiam = req.GiaTriGiam.Value;
        }
        if (req.MucGiamToiDa.HasValue) km.MucGiamToiDa = req.MucGiamToiDa.Value;
        if (req.TienThueToiThieu.HasValue)
        {
            if (req.TienThueToiThieu.Value < 0)
                return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Tiền thuê tối thiểu không được âm.");
            km.TienThueToiThieu = req.TienThueToiThieu.Value;
        }
        if (req.PhamVi.HasValue) km.PhamVi = req.PhamVi.Value;

        if (km.PhamVi == PhamViApDung.TatCa)
        {
            _context.KhuyenMaiSanPhams.RemoveRange(km.KhuyenMaiSanPhams);
            _context.KhuyenMaiDanhMucs.RemoveRange(km.KhuyenMaiDanhMucs);
            return null;
        }

        if ((km.PhamVi == PhamViApDung.TheoSanPham && req.SanPhamIds != null) ||
            (km.PhamVi == PhamViApDung.TheoDanhMuc && req.DanhMucIds != null))
        {
            var (loiPv, spIds, dmIds) = await ValidatePhamViAsync(km.PhamVi, req.SanPhamIds, req.DanhMucIds);
            if (loiPv != null) return loiPv;
            _context.KhuyenMaiSanPhams.RemoveRange(km.KhuyenMaiSanPhams);
            _context.KhuyenMaiDanhMucs.RemoveRange(km.KhuyenMaiDanhMucs);
            foreach (var spId in spIds)
                _context.KhuyenMaiSanPhams.Add(new KhuyenMaiSanPham { MaKhuyenMai = km.MaKhuyenMai, MaSanPham = spId });
            foreach (var dmId in dmIds)
                _context.KhuyenMaiDanhMucs.Add(new KhuyenMaiDanhMuc { MaKhuyenMai = km.MaKhuyenMai, MaDanhMuc = dmId });
        }
        return null;
    }

    public async Task<Result<KhuyenMaiResponse>> CapNhatAsync(long id, CapNhatKhuyenMaiRequest request, long actorId)
    {
        var now = DateTime.UtcNow;
        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var km = await _context.KhuyenMais
                .Include(k => k.KhuyenMaiSanPhams).Include(k => k.KhuyenMaiDanhMucs)
                .FirstOrDefaultAsync(k => k.MaKhuyenMai == id);
            if (km == null) { await tx.RollbackAsync(); return Result<KhuyenMaiResponse>.Loi("KHUYEN_MAI_NOT_FOUND", "Không tìm thấy chương trình khuyến mãi."); }

            int daDung = await _context.LuotSuDungKhuyenMais.CountAsync(l => l.MaKhuyenMai == id && l.TrangThai == "DaSuDung");
            int dangGiu = await _context.LuotSuDungKhuyenMais.CountAsync(l => l.MaKhuyenMai == id && l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now);
            int tongDangChiem = daDung + dangGiu;

            if (KiemTraCamKetCapNhat(km, request, tongDangChiem) is { } loiCamKet) { await tx.RollbackAsync(); return loiCamKet; }

            if (!string.IsNullOrWhiteSpace(request.TenKhuyenMai)) km.TenKhuyenMai = request.TenKhuyenMai.Trim();
            if (request.BatDau.HasValue) km.BatDau = request.BatDau.Value;
            if (request.KetThuc.HasValue) km.KetThuc = request.KetThuc.Value;
            if (km.BatDau > km.KetThuc) { await tx.RollbackAsync(); return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Thời điểm bắt đầu không được sau thời điểm kết thúc."); }

            if (request.GioiHanTongLuot.HasValue) km.GioiHanTongLuot = request.GioiHanTongLuot.Value;
            if (request.GioiHanMoiKhach.HasValue) km.GioiHanMoiKhach = request.GioiHanMoiKhach.Value;

            if (tongDangChiem == 0 && await ApDungCauHinhChuaCamKetAsync(km, request) is { } loiCauHinh)
            {
                await tx.RollbackAsync();
                return loiCauHinh;
            }

            await _context.SaveChangesAsync();
            await tx.CommitAsync();
            return await LayChiTietAsync(km.MaKhuyenMai);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            return Result<KhuyenMaiResponse>.Loi("SYS_ERROR", $"Lỗi cập nhật: {ex.Message}");
        }
    }
}
