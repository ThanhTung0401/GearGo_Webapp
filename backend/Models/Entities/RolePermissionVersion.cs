using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Version counter per role dùng để invalidate cache phân quyền
/// (feat/ROLE_Adjustment). Mỗi lần admin thay đổi quyền của một role,
/// version của role đó tăng → handler biết cần đọc lại claim từ DB.
/// </summary>
[Table("ROLE_PERMISSION_VERSION")]
public class RolePermissionVersion
{
    [Key]
    [Column("role_name")]
    [MaxLength(50)]
    public string RoleName { get; set; } = string.Empty;

    [Column("version")]
    public long Version { get; set; }

    [Column("cap_nhat_luc")]
    public DateTime CapNhatLuc { get; set; } = DateTime.UtcNow;
}
