using System;
using System.Threading.Tasks;
namespace GearGo.Services.Interfaces;
public interface IInventoryService
{
    Task<int> CheckAvailabilityAsync(long sanPhamId, DateTime tuNgay, DateTime denNgay);
}
