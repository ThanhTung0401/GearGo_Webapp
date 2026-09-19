using System.Threading.Tasks;
namespace GearGo.Services.Interfaces;
public interface ICheckoutService
{
    Task<bool> PlaceOrderWithReserveAsync(long khachHangId, long chinhSachId, long? khuyenMaiId);
}
