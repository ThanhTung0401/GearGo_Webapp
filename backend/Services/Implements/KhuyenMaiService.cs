using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.DTOs.KhuyenMai;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ áp mã, phân bổ tiền giảm và kiểm soát lượt khuyến mãi (W6-T3 - Kiện Minh)
/// Đáp ứng thuật toán phân bổ tiền lẻ VND không âm dòng, không giảm cọc, và pessimistic lock chống race condition.
/// </summary>
public class KhuyenMaiService : IKhuyenMaiService
{
    private readonly ApplicationDbContext _context;

    public KhuyenMaiService(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Chuẩn hóa mã giảm giá (Trim + Uppercase)
    /// </summary>
    private static string ChuanHoaMa(string? ma) => string.IsNullOrWhiteSpace(ma) ? string.Empty : ma.Trim().ToUpperInvariant();

    /// <summary>
    /// Kiểm tra áp dụng mã cơ bản (tương thích interface Week 2)
    /// </summary>
    public async Task<KhuyenMaiHopLe> KiemTraApDungAsync(string maGiamGia, long maKhachHang, List<long> sanPhamIds, decimal tienThueTruocGiam)
    {
        var maChuanHoa = ChuanHoaMa(maGiamGia);
        var now = DateTime.UtcNow;

        var km = await _context.KhuyenMais
            .Include(k => k.KhuyenMaiSanPhams)
            .Include(k => k.KhuyenMaiDanhMucs)
            .FirstOrDefaultAsync(k => k.MaGiamGia == maChuanHoa);

        if (km == null)
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá không tồn tại.");

        if (km.TrangThai == TrangThaiKhuyenMai.TamAn)
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá đang tạm ẩn.");

        if (km.TrangThai == TrangThaiKhuyenMai.HetHan || now < km.BatDau || now > km.KetThuc)
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá đã hết hạn hoặc chưa đến thời gian áp dụng.");

        if (tienThueTruocGiam < km.TienThueToiThieu)
            throw new KhuyenMaiKhongHopLeException($"Đơn hàng chưa đạt mức tối thiểu {km.TienThueToiThieu:N0} đ để áp dụng mã.");

        // Đếm tổng lượt đang giữ (còn hạn) hoặc đã dùng (loại trừ các lượt giữ quá hạn ngay trong query)
        var tongLuot = await _context.LuotSuDungKhuyenMais
            .Where(l => l.MaKhuyenMai == km.MaKhuyenMai &&
                        (l.TrangThai == "DaSuDung" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now)))
            .CountAsync();

        if (km.GioiHanTongLuot.HasValue && tongLuot >= km.GioiHanTongLuot.Value)
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá đã hết lượt sử dụng.");

        // Đếm lượt của khách hàng này
        var luotKhach = await _context.LuotSuDungKhuyenMais
            .Include(l => l.DonThue)
            .Where(l => l.MaKhuyenMai == km.MaKhuyenMai && l.DonThue.MaKhachHang == maKhachHang &&
                        (l.TrangThai == "DaSuDung" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now)))
            .CountAsync();

        if (km.GioiHanMoiKhach.HasValue && luotKhach >= km.GioiHanMoiKhach.Value)
            throw new KhuyenMaiKhongHopLeException("Bạn đã hết lượt sử dụng mã này.");

        // Kiểm tra phạm vi
        if (km.PhamVi == PhamViApDung.TheoSanPham)
        {
            var spApDung = km.KhuyenMaiSanPhams.Select(x => x.MaSanPham).ToHashSet();
            if (!sanPhamIds.Any(id => spApDung.Contains(id)))
                throw new KhuyenMaiKhongHopLeException("Mã giảm giá không áp dụng cho sản phẩm trong đơn.");
        }
        else if (km.PhamVi == PhamViApDung.TheoDanhMuc)
        {
            var dmApDung = km.KhuyenMaiDanhMucs.Select(x => x.MaDanhMuc).ToHashSet();
            var spDanhMucs = await _context.SanPhams
                .Where(s => sanPhamIds.Contains(s.MaSanPham))
                .Select(s => s.MaDanhMuc)
                .ToListAsync();

            if (!spDanhMucs.Any(dm => dmApDung.Contains(dm)))
                throw new KhuyenMaiKhongHopLeException("Mã giảm giá không áp dụng cho danh mục sản phẩm trong đơn.");
        }

        // Tính tiền giảm
        decimal soTienGiam = 0;
        if (km.LoaiGiam == LoaiKhuyenMai.SoTien)
        {
            soTienGiam = Math.Min(km.GiaTriGiam, tienThueTruocGiam);
        }
        else
        {
            soTienGiam = Math.Round(tienThueTruocGiam * (km.GiaTriGiam / 100m), MidpointRounding.AwayFromZero);
            soTienGiam = Math.Min(soTienGiam, tienThueTruocGiam);
        }

        if (km.MucGiamToiDa.HasValue && soTienGiam > km.MucGiamToiDa.Value)
            soTienGiam = km.MucGiamToiDa.Value;

        return new KhuyenMaiHopLe { MaKhuyenMai = km.MaKhuyenMai, SoTienDuocGiam = soTienGiam };
    }

    /// <summary>
    /// Kiểm tra áp dụng mã chi tiết theo danh sách dòng giỏ hàng (báo giá hiển thị, Read-only không giữ lượt)
    /// </summary>
    public async Task<KiemTraMaResult> KiemTraApDungChiTietAsync(string maGiamGia, long maKhachHang, List<DongBaoGiaItem> items)
    {
        var maChuanHoa = ChuanHoaMa(maGiamGia);
        var now = DateTime.UtcNow;

        var result = new KiemTraMaResult
        {
            MaGiamGia = maChuanHoa,
            TienThueXetNguong = items.Sum(i => i.TienThueTruocGiam),
            TongCoc = items.Sum(i => i.TienCocDong)
        };

        var km = await _context.KhuyenMais
            .Include(k => k.KhuyenMaiSanPhams)
            .Include(k => k.KhuyenMaiDanhMucs)
            .FirstOrDefaultAsync(k => k.MaGiamGia == maChuanHoa);

        if (km == null)
        {
            result.HopLe = false;
            result.LyDoKhongHopLe = "Mã giảm giá không tồn tại.";
            return result;
        }

        result.MaKhuyenMai = km.MaKhuyenMai;
        result.TenKhuyenMai = km.TenKhuyenMai;

        if (km.TrangThai == TrangThaiKhuyenMai.TamAn)
        {
            result.HopLe = false;
            result.LyDoKhongHopLe = "Mã giảm giá đang tạm ẩn.";
            return result;
        }

        if (km.TrangThai == TrangThaiKhuyenMai.HetHan || now < km.BatDau || now > km.KetThuc)
        {
            result.HopLe = false;
            result.LyDoKhongHopLe = "Mã giảm giá đã hết hạn hoặc chưa đến thời gian áp dụng.";
            return result;
        }

        if (result.TienThueXetNguong < km.TienThueToiThieu)
        {
            result.HopLe = false;
            result.LyDoKhongHopLe = $"Đơn hàng cần đạt mức tối thiểu {km.TienThueToiThieu:N0} đ tiền thuê.";
            return result;
        }

        // Kiểm tra quota tổng (loại bỏ lượt giữ quá hạn ngay trong query)
        var tongLuot = await _context.LuotSuDungKhuyenMais
            .Where(l => l.MaKhuyenMai == km.MaKhuyenMai &&
                        (l.TrangThai == "DaSuDung" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now)))
            .CountAsync();

        if (km.GioiHanTongLuot.HasValue && tongLuot >= km.GioiHanTongLuot.Value)
        {
            result.HopLe = false;
            result.LyDoKhongHopLe = "Mã giảm giá đã hết lượt sử dụng.";
            return result;
        }

        // Kiểm tra quota mỗi khách
        if (maKhachHang > 0)
        {
            var luotKhach = await _context.LuotSuDungKhuyenMais
                .Include(l => l.DonThue)
                .Where(l => l.MaKhuyenMai == km.MaKhuyenMai && l.DonThue.MaKhachHang == maKhachHang &&
                            (l.TrangThai == "DaSuDung" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now)))
                .CountAsync();

            if (km.GioiHanMoiKhach.HasValue && luotKhach >= km.GioiHanMoiKhach.Value)
            {
                result.HopLe = false;
                result.LyDoKhongHopLe = "Bạn đã hết lượt sử dụng mã này.";
                return result;
            }
        }

        // Lọc các dòng đủ điều kiện phạm vi
        var spHopLeIds = new HashSet<long>();
        if (km.PhamVi == PhamViApDung.TheoSanPham)
        {
            spHopLeIds = km.KhuyenMaiSanPhams.Select(x => x.MaSanPham).ToHashSet();
        }
        else if (km.PhamVi == PhamViApDung.TheoDanhMuc)
        {
            var dmHopLeIds = km.KhuyenMaiDanhMucs.Select(x => x.MaDanhMuc).ToHashSet();

            // Nếu items chưa có sẵn MaDanhMuc, tra cứu từ database
            var spIdsCanTra = items.Where(i => !i.MaDanhMuc.HasValue).Select(i => i.MaSanPham).Distinct().ToList();
            var dictDm = new Dictionary<long, long>();
            if (spIdsCanTra.Any())
            {
                dictDm = await _context.SanPhams
                    .Where(s => spIdsCanTra.Contains(s.MaSanPham))
                    .ToDictionaryAsync(s => s.MaSanPham, s => s.MaDanhMuc);
            }

            foreach (var item in items)
            {
                var dm = item.MaDanhMuc ?? (dictDm.TryGetValue(item.MaSanPham, out var d) ? d : 0);
                if (dmHopLeIds.Contains(dm))
                {
                    spHopLeIds.Add(item.MaSanPham);
                }
            }
        }

        // Xác định các dòng đủ điều kiện và tính E (tổng tiền thuê dòng đủ điều kiện)
        var linesWithEligibility = items.Select(item =>
        {
            bool duDieuKien = km.PhamVi == PhamViApDung.TatCa || spHopLeIds.Contains(item.MaSanPham);
            return (item, duDieuKien);
        }).ToList();

        decimal tienThueDuPhamVi = linesWithEligibility.Where(x => x.duDieuKien).Sum(x => x.item.TienThueTruocGiam);
        result.TienThueDuPhamVi = tienThueDuPhamVi;

        if (tienThueDuPhamVi <= 0)
        {
            result.HopLe = false;
            result.LyDoKhongHopLe = "Không có sản phẩm nào trong giỏ/đơn thuộc phạm vi áp dụng mã.";
            return result;
        }

        // Tính mức giảm thực tế: Không vượt quá E, không giảm cọc, áp trần nếu có
        decimal tongGiam = 0;
        if (km.LoaiGiam == LoaiKhuyenMai.SoTien)
        {
            tongGiam = Math.Min(km.GiaTriGiam, tienThueDuPhamVi);
        }
        else
        {
            tongGiam = Math.Round(tienThueDuPhamVi * (km.GiaTriGiam / 100m), MidpointRounding.AwayFromZero);
            tongGiam = Math.Min(tongGiam, tienThueDuPhamVi);
        }

        if (km.MucGiamToiDa.HasValue && tongGiam > km.MucGiamToiDa.Value)
            tongGiam = km.MucGiamToiDa.Value;

        // Đảm bảo không bao giờ giảm vượt quá E
        tongGiam = Math.Min(tongGiam, tienThueDuPhamVi);

        result.HopLe = true;
        result.TongGiamGia = tongGiam;

        // Phân bổ giảm giá xuống từng dòng
        result.PhanBoCacDong = PhanBoGiamGia(items, tongGiam, spHopLeIds, km.PhamVi);

        return result;
    }

    /// <summary>
    /// Thuật toán phân bổ giảm giá VND xuống từng dòng đơn thuê (W6-T3, W6-06, W6-07)
    /// Bảo đảm:
    /// 1. Tổng tiền giảm các dòng == tongGiam chính xác từng đồng.
    /// 2. Tiền giảm mỗi dòng <= Tiền thuê của dòng đó (không âm dòng).
    /// 3. Tiền cọc giữ nguyên 100%.
    /// 4. Phần dư được dồn theo thứ tự MaSanPham tăng dần ổn định có Capacity Check.
    /// </summary>
    public List<PhanBoDongResult> PhanBoGiamGia(List<DongBaoGiaItem> lines, decimal tongGiam)
    {
        // Mặc định phạm vi tất cả các dòng
        return PhanBoGiamGia(lines, tongGiam, null, PhamViApDung.TatCa);
    }

    private List<PhanBoDongResult> PhanBoGiamGia(List<DongBaoGiaItem> lines, decimal tongGiam, HashSet<long>? spHopLeIds, PhamViApDung phamVi)
    {
        var results = lines.Select(l => new PhanBoDongResult
        {
            MaSanPham = l.MaSanPham,
            TienThueTruocGiam = l.TienThueTruocGiam,
            TienGiam = 0,
            DuDieuKien = phamVi == PhamViApDung.TatCa || (spHopLeIds != null && spHopLeIds.Contains(l.MaSanPham))
        }).ToList();

        if (tongGiam <= 0) return results;

        var eligibleLines = results.Where(r => r.DuDieuKien && r.TienThueTruocGiam > 0).ToList();
        if (!eligibleLines.Any()) return results;

        decimal totalEligibleRent = eligibleLines.Sum(r => r.TienThueTruocGiam);
        if (totalEligibleRent <= 0) return results;

        // Giới hạn tổng giảm không vượt quá tổng tiền thuê đủ điều kiện
        tongGiam = Math.Min(tongGiam, totalEligibleRent);

        // 1. Phân bổ phần nguyên (Floor) theo tỷ lệ tiền thuê
        decimal daPhanBo = 0;
        foreach (var line in eligibleLines)
        {
            // d_i = Floor(tongGiam * (T_i / E))
            decimal proportion = line.TienThueTruocGiam / totalEligibleRent;
            decimal giamDong = Math.Floor(tongGiam * proportion);

            // Chặn không vượt quá tiền thuê dòng
            giamDong = Math.Min(giamDong, line.TienThueTruocGiam);

            line.TienGiam = giamDong;
            daPhanBo += giamDong;
        }

        // 2. Dồn phần dư (Remainder) từng đồng vào các dòng theo thứ tự ổn định MaSanPham tăng dần
        decimal phanDu = tongGiam - daPhanBo;

        if (phanDu > 0)
        {
            // Sắp xếp các dòng đủ điều kiện theo MaSanPham tăng dần
            var sortedLines = eligibleLines.OrderBy(l => l.MaSanPham).ToList();

            // Lặp dồn phần dư cho các dòng còn room (TienGiam < TienThueTruocGiam)
            while (phanDu > 0)
            {
                bool daCongTrongVong = false;

                foreach (var line in sortedLines)
                {
                    if (phanDu <= 0) break;

                    // Capacity check: Chỉ cộng nếu dòng còn room
                    if (line.TienGiam < line.TienThueTruocGiam)
                    {
                        line.TienGiam += 1;
                        phanDu -= 1;
                        daCongTrongVong = true;
                    }
                }

                // Nếu tất cả các dòng đều đã chạm trần thì dừng lại để tránh lặp vô tận
                if (!daCongTrongVong) break;
            }
        }

        return results;
    }

    /// <summary>
    /// Giữ lượt khuyến mãi trong transaction tạo đơn (tương thích Week 2)
    /// </summary>
    public async Task GiuLuotAsync(long maKhuyenMai, long maDonThue, DateTime thoiDiemHetHan)
    {
        await GiuLuotV2Async(new GiuLuotCommand
        {
            MaKhuyenMai = maKhuyenMai,
            MaDonThue = maDonThue,
            ThoiDiemHetHan = thoiDiemHetHan,
            SoTienGiamSnapshot = 0
        });
    }

    /// <summary>
    /// Giữ lượt khuyến mãi mở rộng (với pessimistic lock chống race condition)
    /// </summary>
    public async Task<KetQuaLuotResponse> GiuLuotV2Async(GiuLuotCommand command)
    {
        var now = DateTime.UtcNow;

        // Khóa dòng KHUYEN_MAI bằng SQL Raw UPDLOCK, ROWLOCK nếu trên SQL Server
        // (Nếu đang chạy InMemory test, câu query Linq vẫn hoạt động bình thường)
        try
        {
            if (_context.Database.IsSqlServer())
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT ma_khuyen_mai FROM KHUYEN_MAI WITH (UPDLOCK, ROWLOCK) WHERE ma_khuyen_mai = {0}",
                    command.MaKhuyenMai);
            }
        }
        catch
        {
            // Bỏ qua nếu DB provider không hỗ trợ hint
        }

        var km = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == command.MaKhuyenMai);
        if (km == null)
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá không tồn tại.");

        if (km.TrangThai == TrangThaiKhuyenMai.HetHan)
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá đã hết hạn.");

        // Kiểm tra quota tổng (loại trừ các lượt giữ đã quá hạn ngay trong query)
        var daDung = await _context.LuotSuDungKhuyenMais.CountAsync(l => l.MaKhuyenMai == km.MaKhuyenMai && l.TrangThai == "DaSuDung");
        var dangGiuConHan = await _context.LuotSuDungKhuyenMais.CountAsync(l => l.MaKhuyenMai == km.MaKhuyenMai && l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now);

        if (km.GioiHanTongLuot.HasValue && (daDung + dangGiuConHan) >= km.GioiHanTongLuot.Value)
        {
            throw new KhuyenMaiKhongHopLeException("Mã giảm giá đã hết lượt sử dụng.")
            {
                Data = { ["MaLoi"] = "MA_HET_LUOT" }
            };
        }

        // Kiểm tra quota mỗi khách hàng nếu có
        if (command.MaKhachHang > 0 && km.GioiHanMoiKhach.HasValue)
        {
            var luotKhach = await _context.LuotSuDungKhuyenMais
                .Include(l => l.DonThue)
                .CountAsync(l => l.MaKhuyenMai == km.MaKhuyenMai && l.DonThue.MaKhachHang == command.MaKhachHang &&
                                 (l.TrangThai == "DaSuDung" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now)));

            if (luotKhach >= km.GioiHanMoiKhach.Value)
            {
                throw new KhuyenMaiKhongHopLeException("Bạn đã hết lượt sử dụng mã giảm giá này.")
                {
                    Data = { ["MaLoi"] = "KHACH_HET_LUOT_MA" }
                };
            }
        }

        // Tạo bản ghi lượt giữ
        var luot = new LuotSuDungKhuyenMai
        {
            MaKhuyenMai = command.MaKhuyenMai,
            MaDonThue = command.MaDonThue,
            ThoiDiemGiuLuot = now,
            ThoiDiemHetHan = command.ThoiDiemHetHan,
            TrangThai = "DangGiu"
        };

        _context.LuotSuDungKhuyenMais.Add(luot);
        await _context.SaveChangesAsync();

        return new KetQuaLuotResponse
        {
            MaLuotSuDung = luot.MaLuotSuDung,
            MaKhuyenMai = luot.MaKhuyenMai,
            MaDonThue = luot.MaDonThue,
            TrangThai = luot.TrangThai,
            ThoiDiemHetHan = luot.ThoiDiemHetHan,
            SoTienGiamSnapshot = command.SoTienGiamSnapshot
        };
    }

    /// <summary>
    /// Xác nhận đã sử dụng mã khi thanh toán thành công (idempotent, chuyển DangGiu -> DaSuDung)
    /// </summary>
    public async Task XacNhanDaSuDungAsync(long maDonThue)
    {
        var now = DateTime.UtcNow;
        var luot = await _context.LuotSuDungKhuyenMais
            .Include(l => l.DonThue)
            .FirstOrDefaultAsync(l => l.MaDonThue == maDonThue);

        if (luot == null) return;

        // Idempotent: Nếu đã là DaSuDung thì bỏ qua, không trừ thêm lượt
        if (luot.TrangThai == "DaSuDung") return;

        // Nếu lượt đã bị giải phóng trước đó thì không thể xác nhận
        if (luot.TrangThai == "DaGiaiPhong")
            throw new KhuyenMaiKhongHopLeException("Lượt khuyến mãi đã bị giải phóng, không thể xác nhận.");

        // Kiểm tra hết hạn giữ chỗ: Tiền đến sau khi đã hết hạn giữ chỗ thì không được xác nhận
        if (now > luot.ThoiDiemHetHan)
            throw new KhuyenMaiKhongHopLeException("Lượt giữ khuyến mãi đã hết hạn.");

        luot.TrangThai = "DaSuDung";
        luot.ThoiDiemSuDung = now;
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Giải phóng lượt khuyến mãi (chỉ giải phóng khi hủy/hết hạn trước thanh toán)
    /// </summary>
    public async Task GiaiPhongLuotAsync(long maDonThue, string? lyDo = null)
    {
        var luot = await _context.LuotSuDungKhuyenMais
            .Include(l => l.DonThue)
            .FirstOrDefaultAsync(l => l.MaDonThue == maDonThue);

        if (luot == null) return;

        // Hủy sau thanh toán: Giữ nguyên lịch sử DaSuDung, không phục hồi lượt
        if (luot.TrangThai == "DaSuDung") return;

        // Đã giải phóng rồi: No-op
        if (luot.TrangThai == "DaGiaiPhong") return;

        // Chỉ giải phóng lượt đang giữ
        if (luot.TrangThai == "DangGiu")
        {
            luot.TrangThai = "DaGiaiPhong";
            luot.ThoiDiemGiaiPhong = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}
