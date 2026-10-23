using GearGo.Models.Common;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Helpers;

public abstract class BaseApiController : ControllerBase
{
    protected IActionResult HandleResult<T>(Result<T> result)
    {
        if (result.ThanhCong)
        {
            return Ok(result.DuLieu);
        }

        int statusCode = ResolveStatusCode(result.MaLoi);
        return StatusCode(statusCode, new { result.MaLoi, result.ThongDiep });
    }

    protected IActionResult HandleCreatedResult<T>(Result<T> result)
    {
        if (result.ThanhCong)
        {
            return StatusCode(201, result.DuLieu);
        }

        int statusCode = ResolveStatusCode(result.MaLoi);
        return StatusCode(statusCode, new { result.MaLoi, result.ThongDiep });
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
        DomainConstants.Errors.ProductNotFound => 404,

        DomainConstants.Errors.Forbidden or
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
        DomainConstants.Errors.ReceiptAlreadyApplied => 409,

        _ => 400
    };
}
