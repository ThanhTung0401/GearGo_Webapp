using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ Quản trị khuyến mãi dành cho Admin (W6-T2 - UC24 - Kiện Minh)
/// Tuân thủ quy tắc chuẩn hóa mã, khóa điều khoản cam kết và quản trị phạm vi nguyên tử.
/// </summary>
public class QuanTriKhuyenMaiService : IQuanTriKhuyenMaiService
{
    private readonly ApplicationDbContext _context;

    public QuanTriKhuyenMaiService(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Helper chuẩn hóa chuỗi mã giảm giá: Trim và chuyển toàn bộ thành chữ in hoa
    /// </summary>
    private static string ChuanHoaMa(string? ma) => string.IsNullOrWhiteSpace(ma) ? string.Empty : ma.Trim().ToUpperInvariant();

    public async Task<Result<PagedResult<KhuyenMaiResponse>>> TimKiemAsync(TimKiemKhuyenMaiRequest request)
    {
        var now = DateTime.UtcNow;
        var query = _context.KhuyenMais
            .Include(k => k.KhuyenMaiSanPhams)
            .Include(k => k.KhuyenMaiDanhMucs)
            .AsNoTracking()
            .AsQueryable();

        // 1. Lọc theo từ khóa
        if (!string.IsNullOrWhiteSpace(request.TuKhoa))
        {
            var tk = request.TuKhoa.Trim();
            query = query.Where(k => k.MaGiamGia.Contains(tk) || (k.TenKhuyenMai != null && k.TenKhuyenMai.Contains(tk)));
        }

        // 2. Lọc theo trạng thái
        if (request.TrangThai.HasValue)
        {
            query = query.Where(k => k.TrangThai == request.TrangThai.Value);
        }

        // 3. Lọc theo phạm vi
        if (request.PhamVi.HasValue)
        {
            query = query.Where(k => k.PhamVi == request.PhamVi.Value);
        }

        var totalItems = await query.CountAsync();
        var page = request.Trang < 1 ? 1 : request.Trang;
        var pageSize = request.SoMoiTrang < 1 ? 20 : (request.SoMoiTrang > 100 ? 100 : request.SoMoiTrang);

        var itemsRaw = await query
            .OrderByDescending(k => k.MaKhuyenMai)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var kmIds = itemsRaw.Select(k => k.MaKhuyenMai).ToList();

        // 4. Đếm số lượt sử dụng độc lập trực tiếp từ LUOT_SU_DUNG_KHUYEN_MAI (tránh Fanout khi join bảng nối)
        var counts = await _context.LuotSuDungKhuyenMais
            .Where(l => kmIds.Contains(l.MaKhuyenMai))
            .GroupBy(l => l.MaKhuyenMai)
            .Select(g => new
            {
                MaKhuyenMai = g.Key,
                DaDung = g.Count(x => x.TrangThai == "DaSuDung"),
                DangGiuConHan = g.Count(x => x.TrangThai == "DangGiu" && x.ThoiDiemHetHan > now),
                DaGiaiPhong = g.Count(x => x.TrangThai == "DaGiaiPhong" || (x.TrangThai == "DangGiu" && x.ThoiDiemHetHan <= now))
            })
            .ToDictionaryAsync(x => x.MaKhuyenMai);

        var responses = itemsRaw.Select(k =>
        {
            counts.TryGetValue(k.MaKhuyenMai, out var c);
            return new KhuyenMaiResponse
            {
                MaKhuyenMai = k.MaKhuyenMai,
                MaGiamGia = k.MaGiamGia,
                TenKhuyenMai = k.TenKhuyenMai,
                LoaiGiam = k.LoaiGiam,
                GiaTriGiam = k.GiaTriGiam,
                MucGiamToiDa = k.MucGiamToiDa,
                TienThueToiThieu = k.TienThueToiThieu,
                PhamVi = k.PhamVi,
                BatDau = k.BatDau,
                KetThuc = k.KetThuc,
                GioiHanTongLuot = k.GioiHanTongLuot,
                GioiHanMoiKhach = k.GioiHanMoiKhach,
                TrangThai = k.TrangThai,
                SanPhamIds = k.KhuyenMaiSanPhams.Select(sp => sp.MaSanPham).ToList(),
                DanhMucIds = k.KhuyenMaiDanhMucs.Select(dm => dm.MaDanhMuc).ToList(),
                SoLuotDaDung = c?.DaDung ?? 0,
                SoLuotDangGiuConHan = c?.DangGiuConHan ?? 0,
                SoLuotDaGiaiPhong = c?.DaGiaiPhong ?? 0
            };
        }).ToList();

        return Result<PagedResult<KhuyenMaiResponse>>.Ok(new PagedResult<KhuyenMaiResponse>
        {
            Items = responses,
            TotalItems = totalItems,
            CurrentPage = page,
            PageSize = pageSize
        });
    }

    public async Task<Result<KhuyenMaiResponse>> LayChiTietAsync(long id)
    {
        var now = DateTime.UtcNow;
        var km = await _context.KhuyenMais
            .Include(k => k.KhuyenMaiSanPhams)
            .Include(k => k.KhuyenMaiDanhMucs)
            .FirstOrDefaultAsync(k => k.MaKhuyenMai == id);

        if (km == null)
            return Result<KhuyenMaiResponse>.Loi("KHUYEN_MAI_NOT_FOUND", "Không tìm thấy chương trình khuyến mãi.");

        // Đếm lượt sử dụng
        var stats = await _context.LuotSuDungKhuyenMais
            .Where(l => l.MaKhuyenMai == id)
            .GroupBy(l => l.MaKhuyenMai)
            .Select(g => new
            {
                DaDung = g.Count(x => x.TrangThai == "DaSuDung"),
                DangGiuConHan = g.Count(x => x.TrangThai == "DangGiu" && x.ThoiDiemHetHan > now),
                DaGiaiPhong = g.Count(x => x.TrangThai == "DaGiaiPhong" || (x.TrangThai == "DangGiu" && x.ThoiDiemHetHan <= now))
            })
            .FirstOrDefaultAsync();

        var res = new KhuyenMaiResponse
        {
            MaKhuyenMai = km.MaKhuyenMai,
            MaGiamGia = km.MaGiamGia,
            TenKhuyenMai = km.TenKhuyenMai,
            LoaiGiam = km.LoaiGiam,
            GiaTriGiam = km.GiaTriGiam,
            MucGiamToiDa = km.MucGiamToiDa,
            TienThueToiThieu = km.TienThueToiThieu,
            PhamVi = km.PhamVi,
            BatDau = km.BatDau,
            KetThuc = km.KetThuc,
            GioiHanTongLuot = km.GioiHanTongLuot,
            GioiHanMoiKhach = km.GioiHanMoiKhach,
            TrangThai = km.TrangThai,
            SanPhamIds = km.KhuyenMaiSanPhams.Select(sp => sp.MaSanPham).ToList(),
            DanhMucIds = km.KhuyenMaiDanhMucs.Select(dm => dm.MaDanhMuc).ToList(),
            SoLuotDaDung = stats?.DaDung ?? 0,
            SoLuotDangGiuConHan = stats?.DangGiuConHan ?? 0,
            SoLuotDaGiaiPhong = stats?.DaGiaiPhong ?? 0
        };

        return Result<KhuyenMaiResponse>.Ok(res);
    }

    public async Task<Result<KhuyenMaiResponse>> TaoAsync(TaoKhuyenMaiRequest request, long actorId)
    {
        // 1. Chuẩn hóa mã giảm giá (Trim + Uppercase)
        var maChuanHoa = ChuanHoaMa(request.MaGiamGia);
        if (string.IsNullOrWhiteSpace(maChuanHoa))
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Mã giảm giá không được để trống.");

        // 2. Validate ràng buộc thời gian & số tiền
        if (request.BatDau > request.KetThuc)
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Thời điểm bắt đầu không được sau thời điểm kết thúc.");

        if (request.LoaiGiam == LoaiKhuyenMai.PhanTram && (request.GiaTriGiam <= 0 || request.GiaTriGiam > 100))
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Phần trăm giảm giá phải nằm trong khoảng (0, 100].");

        if (request.LoaiGiam == LoaiKhuyenMai.SoTien && request.GiaTriGiam <= 0)
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Số tiền giảm phải lớn hơn 0.");

        if (request.MucGiamToiDa.HasValue && request.MucGiamToiDa.Value <= 0)
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Mức giảm tối đa nếu có phải lớn hơn 0.");

        if (request.TienThueToiThieu < 0)
            return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Tiền thuê tối thiểu không được âm.");

        // 3. Validate phạm vi áp dụng
        List<long> validSanPhamIds = new();
        List<long> validDanhMucIds = new();

        if (request.PhamVi == PhamViApDung.TheoSanPham)
        {
            if (request.SanPhamIds == null || !request.SanPhamIds.Any())
                return Result<KhuyenMaiResponse>.Loi("PHAM_VI_MA_KHONG_HOP_LE", "Phải chọn ít nhất 1 sản phẩm khi áp dụng theo sản phẩm.");

            validSanPhamIds = request.SanPhamIds.Distinct().ToList();
            var existCount = await _context.SanPhams.CountAsync(s => validSanPhamIds.Contains(s.MaSanPham));
            if (existCount != validSanPhamIds.Count)
                return Result<KhuyenMaiResponse>.Loi("PHAM_VI_MA_KHONG_HOP_LE", "Có mã sản phẩm không tồn tại trong hệ thống.");
        }
        else if (request.PhamVi == PhamViApDung.TheoDanhMuc)
        {
            if (request.DanhMucIds == null || !request.DanhMucIds.Any())
                return Result<KhuyenMaiResponse>.Loi("PHAM_VI_MA_KHONG_HOP_LE", "Phải chọn ít nhất 1 danh mục khi áp dụng theo danh mục.");

            validDanhMucIds = request.DanhMucIds.Distinct().ToList();
            var existCount = await _context.DanhMucSanPhams.CountAsync(d => validDanhMucIds.Contains(d.MaDanhMuc));
            if (existCount != validDanhMucIds.Count)
                return Result<KhuyenMaiResponse>.Loi("PHAM_VI_MA_KHONG_HOP_LE", "Có mã danh mục không tồn tại trong hệ thống.");
        }

        // 4. Mở transaction để bảo đảm tính nguyên tử và bắt trùng lặp mã
        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var isDuplicate = await _context.KhuyenMais.AnyAsync(k => k.MaGiamGia == maChuanHoa);
            if (isDuplicate)
            {
                await tx.RollbackAsync();
                return Result<KhuyenMaiResponse>.Loi("MA_GIAM_GIA_TRUNG", $"Mã giảm giá '{maChuanHoa}' đã tồn tại trong hệ thống.");
            }

            var km = new KhuyenMai
            {
                MaGiamGia = maChuanHoa,
                TenKhuyenMai = request.TenKhuyenMai?.Trim(),
                LoaiGiam = request.LoaiGiam,
                GiaTriGiam = request.GiaTriGiam,
                MucGiamToiDa = request.MucGiamToiDa,
                TienThueToiThieu = request.TienThueToiThieu,
                PhamVi = request.PhamVi,
                BatDau = request.BatDau,
                KetThuc = request.KetThuc,
                GioiHanTongLuot = request.GioiHanTongLuot,
                GioiHanMoiKhach = request.GioiHanMoiKhach,
                TrangThai = TrangThaiKhuyenMai.HienThi
            };

            _context.KhuyenMais.Add(km);
            await _context.SaveChangesAsync();

            // Ghi nhận bảng nối
            if (request.PhamVi == PhamViApDung.TheoSanPham && validSanPhamIds.Any())
            {
                foreach (var spId in validSanPhamIds)
                {
                    _context.KhuyenMaiSanPhams.Add(new KhuyenMaiSanPham
                    {
                        MaKhuyenMai = km.MaKhuyenMai,
                        MaSanPham = spId
                    });
                }
                await _context.SaveChangesAsync();
            }
            else if (request.PhamVi == PhamViApDung.TheoDanhMuc && validDanhMucIds.Any())
            {
                foreach (var dmId in validDanhMucIds)
                {
                    _context.KhuyenMaiDanhMucs.Add(new KhuyenMaiDanhMuc
                    {
                        MaKhuyenMai = km.MaKhuyenMai,
                        MaDanhMuc = dmId
                    });
                }
                await _context.SaveChangesAsync();
            }

            await tx.CommitAsync();

            var res = new KhuyenMaiResponse
            {
                MaKhuyenMai = km.MaKhuyenMai,
                MaGiamGia = km.MaGiamGia,
                TenKhuyenMai = km.TenKhuyenMai,
                LoaiGiam = km.LoaiGiam,
                GiaTriGiam = km.GiaTriGiam,
                MucGiamToiDa = km.MucGiamToiDa,
                TienThueToiThieu = km.TienThueToiThieu,
                PhamVi = km.PhamVi,
                BatDau = km.BatDau,
                KetThuc = km.KetThuc,
                GioiHanTongLuot = km.GioiHanTongLuot,
                GioiHanMoiKhach = km.GioiHanMoiKhach,
                TrangThai = km.TrangThai,
                SanPhamIds = validSanPhamIds,
                DanhMucIds = validDanhMucIds,
                SoLuotDaDung = 0,
                SoLuotDangGiuConHan = 0,
                SoLuotDaGiaiPhong = 0
            };

            return Result<KhuyenMaiResponse>.Ok(res);
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync();
            if (ex.InnerException?.Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) == true ||
                ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true)
            {
                return Result<KhuyenMaiResponse>.Loi("MA_GIAM_GIA_TRUNG", $"Mã giảm giá '{maChuanHoa}' bị trùng lặp.");
            }
            return Result<KhuyenMaiResponse>.Loi("DB_ERROR", $"Lỗi ghi dữ liệu: {ex.Message}");
        }
    }

    public async Task<Result<KhuyenMaiResponse>> CapNhatAsync(long id, CapNhatKhuyenMaiRequest request, long actorId)
    {
        var now = DateTime.UtcNow;

        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            // Khóa dòng KHUYEN_MAI để đồng bộ với request checkout / giữ lượt
            var km = await _context.KhuyenMais
                .Include(k => k.KhuyenMaiSanPhams)
                .Include(k => k.KhuyenMaiDanhMucs)
                .FirstOrDefaultAsync(k => k.MaKhuyenMai == id);

            if (km == null)
            {
                await tx.RollbackAsync();
                return Result<KhuyenMaiResponse>.Loi("KHUYEN_MAI_NOT_FOUND", "Không tìm thấy chương trình khuyến mãi.");
            }

            // Đếm các lượt đã dùng hoặc đang giữ còn hạn
            var daDung = await _context.LuotSuDungKhuyenMais.CountAsync(l => l.MaKhuyenMai == id && l.TrangThai == "DaSuDung");
            var dangGiuConHan = await _context.LuotSuDungKhuyenMais.CountAsync(l => l.MaKhuyenMai == id && l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now);
            var tongDangChiem = daDung + dangGiuConHan;
            var coCamKet = tongDangChiem > 0;

            // 1. Kiểm tra khóa điều khoản cam kết nếu đã có lượt
            if (coCamKet)
            {
                bool doiLoaiGiam = request.LoaiGiam.HasValue && request.LoaiGiam.Value != km.LoaiGiam;
                bool doiGiaTri = request.GiaTriGiam.HasValue && request.GiaTriGiam.Value != km.GiaTriGiam;
                bool doiCap = request.MucGiamToiDa.HasValue && request.MucGiamToiDa.Value != km.MucGiamToiDa;
                bool doiMin = request.TienThueToiThieu.HasValue && request.TienThueToiThieu.Value != km.TienThueToiThieu;
                bool doiPhamVi = request.PhamVi.HasValue && request.PhamVi.Value != km.PhamVi;
                bool doiSp = request.SanPhamIds != null;
                bool doiDm = request.DanhMucIds != null;

                if (doiLoaiGiam || doiGiaTri || doiCap || doiMin || doiPhamVi || doiSp || doiDm)
                {
                    await tx.RollbackAsync();
                    return Result<KhuyenMaiResponse>.Loi("DIEU_KHOAN_MA_DA_CAM_KET", 
                        "Mã đã có đơn giữ chỗ hoặc sử dụng; không được phép sửa loại giảm, mức giảm, ngưỡng tối thiểu hay phạm vi áp dụng.");
                }

                // Không được hạ hạn mức thấp hơn tổng đã chiếm
                if (request.GioiHanTongLuot.HasValue && request.GioiHanTongLuot.Value < tongDangChiem)
                {
                    await tx.RollbackAsync();
                    return Result<KhuyenMaiResponse>.Loi("HAN_MUC_THAP_HON_DANG_CHIEM", 
                        $"Hạn mức mới ({request.GioiHanTongLuot.Value}) không được nhỏ hơn tổng số lượt đang chiếm ({tongDangChiem}).");
                }
            }

            // 2. Cập nhật các trường được phép
            if (!string.IsNullOrWhiteSpace(request.TenKhuyenMai))
                km.TenKhuyenMai = request.TenKhuyenMai.Trim();

            if (request.BatDau.HasValue) km.BatDau = request.BatDau.Value;
            if (request.KetThuc.HasValue) km.KetThuc = request.KetThuc.Value;

            if (km.BatDau > km.KetThuc)
            {
                await tx.RollbackAsync();
                return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Thời điểm bắt đầu không được sau thời điểm kết thúc.");
            }

            if (request.GioiHanTongLuot.HasValue) km.GioiHanTongLuot = request.GioiHanTongLuot.Value;
            if (request.GioiHanMoiKhach.HasValue) km.GioiHanMoiKhach = request.GioiHanMoiKhach.Value;

            // 3. Nếu chưa có cam kết, cho phép cập nhật toàn diện cấu hình giá và phạm vi
            if (!coCamKet)
            {
                if (request.LoaiGiam.HasValue) km.LoaiGiam = request.LoaiGiam.Value;
                if (request.GiaTriGiam.HasValue)
                {
                    if (km.LoaiGiam == LoaiKhuyenMai.PhanTram && (request.GiaTriGiam.Value <= 0 || request.GiaTriGiam.Value > 100))
                    {
                        await tx.RollbackAsync();
                        return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Phần trăm giảm giá phải nằm trong khoảng (0, 100].");
                    }
                    if (km.LoaiGiam == LoaiKhuyenMai.SoTien && request.GiaTriGiam.Value <= 0)
                    {
                        await tx.RollbackAsync();
                        return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Số tiền giảm phải lớn hơn 0.");
                    }
                    km.GiaTriGiam = request.GiaTriGiam.Value;
                }

                if (request.MucGiamToiDa.HasValue) km.MucGiamToiDa = request.MucGiamToiDa.Value;
                if (request.TienThueToiThieu.HasValue)
                {
                    if (request.TienThueToiThieu.Value < 0)
                    {
                        await tx.RollbackAsync();
                        return Result<KhuyenMaiResponse>.Loi("CAU_HINH_GIAM_KHONG_HOP_LE", "Tiền thuê tối thiểu không được âm.");
                    }
                    km.TienThueToiThieu = request.TienThueToiThieu.Value;
                }

                if (request.PhamVi.HasValue) km.PhamVi = request.PhamVi.Value;

                // Cập nhật lại bảng nối nguyên tử
                if (km.PhamVi == PhamViApDung.TheoSanPham && request.SanPhamIds != null)
                {
                    var validSpIds = request.SanPhamIds.Distinct().ToList();
                    var existCount = await _context.SanPhams.CountAsync(s => validSpIds.Contains(s.MaSanPham));
                    if (existCount != validSpIds.Count)
                    {
                        await tx.RollbackAsync();
                        return Result<KhuyenMaiResponse>.Loi("PHAM_VI_MA_KHONG_HOP_LE", "Có mã sản phẩm không tồn tại trong hệ thống.");
                    }

                    _context.KhuyenMaiSanPhams.RemoveRange(km.KhuyenMaiSanPhams);
                    _context.KhuyenMaiDanhMucs.RemoveRange(km.KhuyenMaiDanhMucs);

                    foreach (var spId in validSpIds)
                    {
                        _context.KhuyenMaiSanPhams.Add(new KhuyenMaiSanPham { MaKhuyenMai = km.MaKhuyenMai, MaSanPham = spId });
                    }
                }
                else if (km.PhamVi == PhamViApDung.TheoDanhMuc && request.DanhMucIds != null)
                {
                    var validDmIds = request.DanhMucIds.Distinct().ToList();
                    var existCount = await _context.DanhMucSanPhams.CountAsync(d => validDmIds.Contains(d.MaDanhMuc));
                    if (existCount != validDmIds.Count)
                    {
                        await tx.RollbackAsync();
                        return Result<KhuyenMaiResponse>.Loi("PHAM_VI_MA_KHONG_HOP_LE", "Có mã danh mục không tồn tại trong hệ thống.");
                    }

                    _context.KhuyenMaiSanPhams.RemoveRange(km.KhuyenMaiSanPhams);
                    _context.KhuyenMaiDanhMucs.RemoveRange(km.KhuyenMaiDanhMucs);

                    foreach (var dmId in validDmIds)
                    {
                        _context.KhuyenMaiDanhMucs.Add(new KhuyenMaiDanhMuc { MaKhuyenMai = km.MaKhuyenMai, MaDanhMuc = dmId });
                    }
                }
                else if (km.PhamVi == PhamViApDung.TatCa)
                {
                    _context.KhuyenMaiSanPhams.RemoveRange(km.KhuyenMaiSanPhams);
                    _context.KhuyenMaiDanhMucs.RemoveRange(km.KhuyenMaiDanhMucs);
                }
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

    public async Task<Result<KhuyenMaiResponse>> TamAnAsync(long id, DoiHienThiKhuyenMaiRequest request, long actorId)
    {
        var km = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == id);
        if (km == null)
            return Result<KhuyenMaiResponse>.Loi("KHUYEN_MAI_NOT_FOUND", "Không tìm thấy chương trình khuyến mãi.");

        km.TrangThai = TrangThaiKhuyenMai.TamAn;
        await _context.SaveChangesAsync();

        return await LayChiTietAsync(id);
    }

    public async Task<Result<KhuyenMaiResponse>> HienThiAsync(long id, DoiHienThiKhuyenMaiRequest request, long actorId)
    {
        var km = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == id);
        if (km == null)
            return Result<KhuyenMaiResponse>.Loi("KHUYEN_MAI_NOT_FOUND", "Không tìm thấy chương trình khuyến mãi.");

        km.TrangThai = TrangThaiKhuyenMai.HienThi;
        await _context.SaveChangesAsync();

        return await LayChiTietAsync(id);
    }

    public async Task<Result<SuDungKhuyenMaiResponse>> LayTinhHinhSuDungAsync(long id)
    {
        var now = DateTime.UtcNow;
        var km = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == id);
        if (km == null)
            return Result<SuDungKhuyenMaiResponse>.Loi("KHUYEN_MAI_NOT_FOUND", "Không tìm thấy chương trình khuyến mãi.");

        var luots = await _context.LuotSuDungKhuyenMais
            .Include(l => l.DonThue)
                .ThenInclude(d => d.KhachHang)
            .Where(l => l.MaKhuyenMai == id)
            .OrderByDescending(l => l.ThoiDiemGiuLuot)
            .ToListAsync();

        var daDung = luots.Count(l => l.TrangThai == "DaSuDung");
        var dangGiuConHan = luots.Count(l => l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now);
        var daGiaiPhong = luots.Count(l => l.TrangThai == "DaGiaiPhong" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan <= now));
        var tongTienGiam = luots.Where(l => l.TrangThai == "DaSuDung").Sum(l => l.DonThue.TongTienGiam);

        var chiTiets = luots.Select(l => new ChiTietSuDungItem
        {
            MaLuotSuDung = l.MaLuotSuDung,
            MaDonThue = l.MaDonThue,
            MaDonHienThi = l.DonThue.MaDonHienThi,
            MaKhachHang = l.DonThue.MaKhachHang,
            TenKhachHang = l.DonThue.KhachHang?.HoTen ?? l.DonThue.TenNguoiNhan,
            TrangThaiLuot = (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan <= now) ? "HetHan" : l.TrangThai,
            ThoiDiemGiuLuot = l.ThoiDiemGiuLuot,
            ThoiDiemHetHan = l.ThoiDiemHetHan,
            ThoiDiemSuDung = l.ThoiDiemSuDung,
            TienGiamDon = l.DonThue.TongTienGiam,
            TrangThaiDonThue = l.DonThue.TrangThai.ToString()
        }).ToList();

        var res = new SuDungKhuyenMaiResponse
        {
            MaKhuyenMai = km.MaKhuyenMai,
            MaGiamGia = km.MaGiamGia,
            TenKhuyenMai = km.TenKhuyenMai,
            TongLuotDaDung = daDung,
            TongLuotDangGiuConHan = dangGiuConHan,
            TongLuotDaGiaiPhong = daGiaiPhong,
            TongTienGiamDaDung = tongTienGiam,
            ChiTietSuDung = chiTiets
        };

        return Result<SuDungKhuyenMaiResponse>.Ok(res);
    }
}
