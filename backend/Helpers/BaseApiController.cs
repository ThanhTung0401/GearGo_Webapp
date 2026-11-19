using GearGo.Models.Common;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Helpers;

public abstract class BaseApiController : ControllerBase
{
    /// <summary>Lấy mã tài khoản hiện tại từ JWT claims.</summary>
    protected long MaTaiKhoanHienTai => User.LayMaTaiKhoan();

    /// <summary>
    /// v2 §8.10 — biến thể an toàn cho action [AllowAnonymous]: trả về <paramref name="systemActor"/>
    /// thay vì throw khi không có claim MaTaiKhoan (vd. callback payment gateway, cron, migration).
    /// </summary>
    protected long MaTaiKhoanHienTaiOrSystem(long systemActor)
    {
        var raw = User.FindFirst("MaTaiKhoan")?.Value
                  ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return long.TryParse(raw, out var ma) ? ma : systemActor;
    }

    protected IActionResult HandleResult<T>(Result<T> result, Func<string?, int>? statusResolver = null)
        => result.ThanhCong
            ? Ok(result.DuLieu)
            : LoiActionResult(result.MaLoi, result.ThongDiep, result.ChiTiet, statusResolver);

    protected IActionResult HandleCreatedResult<T>(Result<T> result, Func<string?, int>? statusResolver = null)
        => result.ThanhCong
            ? StatusCode(201, result.DuLieu)
            : LoiActionResult(result.MaLoi, result.ThongDiep, result.ChiTiet, statusResolver);

    protected IActionResult HandleVoidResult(Result result, Func<string?, int>? statusResolver = null)
        => result.ThanhCong
            ? Ok(new { thongDiep = result.ThongDiep ?? "Thành công." })
            : LoiActionResult(result.MaLoi, result.ThongDiep, result.ChiTiet, statusResolver);

    private IActionResult LoiActionResult(string? maLoi, string? thongDiep, object? chiTiet, Func<string?, int>? statusResolver)
    {
        int statusCode = statusResolver != null ? statusResolver(maLoi) : ResolveStatusCode(maLoi);
        object payload = chiTiet != null
            ? new { maLoi, thongDiep, chiTiet }
            : new { maLoi, thongDiep };
        return StatusCode(statusCode, payload);
    }

    public static int ResolveStatusCode(string? maLoi) => maLoi switch
    {
        DomainConstants.Errors.NotFound or
        DomainConstants.Errors.OrderNotFound or
        DomainConstants.Errors.OrderRentalNotFound or
        DomainConstants.Errors.ReceiptNotFound or
        DomainConstants.Errors.EquipmentNotFound or
        DomainConstants.Errors.StaffNotFound or
        DomainConstants.Errors.DetailNotFound or
        DomainConstants.Errors.SurchargeNotFound or
        DomainConstants.Errors.ReconciliationNotFound or
        DomainConstants.Errors.TransactionNotFound or
        DomainConstants.Errors.ProductNotFound or
        DomainConstants.Errors.AccountNotFound => 404,

        DomainConstants.Errors.Forbidden or
        DomainConstants.Errors.PermissionChanged or
        DomainConstants.Errors.ForbiddenCostInspection or
        DomainConstants.Errors.NotAssignedStaff => 403,

        DomainConstants.Errors.InvalidState or
        DomainConstants.Errors.Locked or
        DomainConstants.Errors.LineAlreadyHasDraftReceipt or
        DomainConstants.Errors.ReceiptFinalized or
        DomainConstants.Errors.LostConclusionIncomplete or
        DomainConstants.Errors.EquipmentAlreadyReturned or
        DomainConstants.Errors.EquipmentWithCustomer or
        DomainConstants.Errors.ActiveMaintenanceExists or
        DomainConstants.Errors.MaintenanceTicketClosed or
        DomainConstants.Errors.StaffResigned or
        DomainConstants.Errors.EquipmentNotRecovered or
        DomainConstants.Errors.SupplementaryCollectionPending or
        DomainConstants.Errors.ChangeViolatesCommitment or
        DomainConstants.Errors.StaleAdjustmentSnapshot or
        DomainConstants.Errors.MissingReceiptEvidence or
        DomainConstants.Errors.DuplicateEquipmentCode or
        DomainConstants.Errors.AdjustmentViolatesCommitment or
        DomainConstants.Errors.ReceiptAlreadyApplied or
        DomainConstants.Errors.ContactExists or
        DomainConstants.Errors.LastActiveAdmin => 409,

        _ => 400
    };
}
