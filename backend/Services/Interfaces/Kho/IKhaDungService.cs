using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GearGo.Services.Interfaces;

public interface IKhaDungService
{
    Task<int> LayKhaDungAsync(long maSanPham, DateTime gioNhan, DateTime gioTra);
    Task<Dictionary<long, int>> LayKhaDungNhieuAsync(IEnumerable<long> maSanPhams, DateTime gioNhan, DateTime gioTra);
}
