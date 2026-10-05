using System.Text.Json;
using System.Text.Json.Nodes;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;

namespace GearGo.Services.Implements;

public class LichSuNghiepVuService : ILichSuNghiepVuService
{
    // Khóa nhạy cảm không bao giờ được đưa vào nhật ký trước/sau.
    private static readonly HashSet<string> KhoaCam = new(StringComparer.OrdinalIgnoreCase)
    {
        "matKhauBam", "mat_khau_bam", "matKhau", "password", "token", "refreshToken"
    };

    private readonly ApplicationDbContext _context;

    public LichSuNghiepVuService(ApplicationDbContext context) => _context = context;

    public LichSuTrangThaiDon GhiChuyenTrangThaiDon(GhiLichSuDonCommand c)
    {
        if (c.MaDonThue <= 0 || string.IsNullOrWhiteSpace(c.TrangThaiTruoc) || string.IsNullOrWhiteSpace(c.TrangThaiSau))
            throw new SuKienKhongHopLeException("Thiếu đơn hoặc trạng thái trước/sau.");

        var entry = new LichSuTrangThaiDon
        {
            MaDonThue = c.MaDonThue,
            MaNguoiThucHien = c.MaNguoiThucHien,
            TrangThaiTruoc = c.TrangThaiTruoc,
            TrangThaiSau = c.TrangThaiSau,
            ThoiDiem = DateTime.UtcNow, // giờ server
            LyDo = c.LyDo
        };
        _context.LichSuTrangThaiDons.Add(entry);
        return entry;
    }

    public LichSuTinhTrangThietBi GhiThayDoiThietBi(GhiLichSuThietBiCommand c)
    {
        if (c.MaThietBi <= 0)
            throw new SuKienKhongHopLeException("Thiếu mã thiết bị.");

        var entry = new LichSuTinhTrangThietBi
        {
            MaThietBi = c.MaThietBi,
            MaNguoiThucHien = c.MaNguoiThucHien,
            TrangThaiTruoc = c.TrangThaiTruoc,
            TrangThaiSau = c.TrangThaiSau,
            TinhTrangTruoc = c.TinhTrangTruoc,
            TinhTrangSau = c.TinhTrangSau,
            ThoiDiem = DateTime.UtcNow,
            LyDo = c.LyDo,
            ThamChieuChungTu = c.ThamChieuChungTu
        };
        _context.LichSuTinhTrangThietBis.Add(entry);
        return entry;
    }

    public NhatKyThaoTac GhiNhatKyThaoTac(GhiNhatKyCommand c)
    {
        if (string.IsNullOrWhiteSpace(c.HanhDong) || string.IsNullOrWhiteSpace(c.LoaiDoiTuong) || string.IsNullOrWhiteSpace(c.MaDoiTuong))
            throw new SuKienKhongHopLeException("Thiếu hành động hoặc đối tượng của nhật ký.");

        var entry = new NhatKyThaoTac
        {
            MaTaiKhoan = c.MaTaiKhoan,
            HanhDong = c.HanhDong,
            LoaiDoiTuong = c.LoaiDoiTuong,
            MaDoiTuong = c.MaDoiTuong, // luôn là chuỗi
            DuLieuTruoc = Sanitize(c.DuLieuTruoc),
            DuLieuSau = Sanitize(c.DuLieuSau),
            ThoiDiem = DateTime.UtcNow,
            LyDo = c.LyDo
        };
        _context.NhatKyThaoTacs.Add(entry);
        return entry;
    }

    private static string? Sanitize(object? data)
    {
        if (data == null) return null;
        var node = JsonSerializer.SerializeToNode(data);
        Strip(node);
        return node?.ToJsonString();
    }

    private static void Strip(JsonNode? node)
    {
        switch (node)
        {
            case JsonObject obj:
                foreach (var key in obj.Select(kv => kv.Key).ToList())
                {
                    if (KhoaCam.Contains(key)) obj.Remove(key);
                    else Strip(obj[key]);
                }
                break;
            case JsonArray arr:
                foreach (var item in arr) Strip(item);
                break;
        }
    }
}
