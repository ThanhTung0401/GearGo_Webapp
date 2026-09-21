using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DanhMuc;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class DanhMucService : IDanhMucService
{
    private readonly ApplicationDbContext _context;

    public DanhMucService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<DanhMucResponse>>> LayCayDanhMucAsync()
    {
        var tatCa = await _context.DanhMucSanPhams
            .Where(d => d.TrangThai == "HienThi")
            .OrderBy(d => d.ThuTuHienThi)
            .ToListAsync();

        var dict = tatCa.ToDictionary(d => d.MaDanhMuc, d => new DanhMucResponse
        {
            MaDanhMuc = d.MaDanhMuc,
            TenDanhMuc = d.TenDanhMuc,
            MoTa = d.MoTa,
            ThuTuHienThi = d.ThuTuHienThi,
            MaDanhMucCha = d.MaDanhMucCha,
            DanhMucCon = new List<DanhMucResponse>()
        });

        var roots = new List<DanhMucResponse>();

        foreach (var item in dict.Values)
        {
            if (item.MaDanhMucCha.HasValue && dict.TryGetValue(item.MaDanhMucCha.Value, out var parent))
            {
                parent.DanhMucCon.Add(item);
            }
            else
            {
                roots.Add(item);
            }
        }

        return Result<List<DanhMucResponse>>.Ok(roots);
    }

    public async Task<Result<DanhMucResponse>> LayChiTietAsync(long id)
    {
        var d = await _context.DanhMucSanPhams
            .Where(x => x.TrangThai == "HienThi")
            .FirstOrDefaultAsync(x => x.MaDanhMuc == id);

        if (d == null)
            return Result<DanhMucResponse>.Loi("DanhMuc_NotFound", "Không tìm thấy danh mục.");

        var res = new DanhMucResponse
        {
            MaDanhMuc = d.MaDanhMuc,
            TenDanhMuc = d.TenDanhMuc,
            MoTa = d.MoTa,
            ThuTuHienThi = d.ThuTuHienThi,
            MaDanhMucCha = d.MaDanhMucCha
        };

        return Result<DanhMucResponse>.Ok(res);
    }
}
