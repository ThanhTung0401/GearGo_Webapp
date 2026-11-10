using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.PhanQuyen;

/// <summary>Role + số quyền đang có — dùng cho danh sách quản trị.</summary>
public class VaiTroResponse
{
    public string RoleName { get; set; } = string.Empty;
    public string TenHienThi { get; set; } = string.Empty;
    public long Version { get; set; }
    public int SoQuyen { get; set; }
}

/// <summary>Một quyền đơn lẻ trong catalog.</summary>
public class QuyenItem
{
    public string Ma { get; set; } = string.Empty;
    public string TenHienThi { get; set; } = string.Empty;
}

/// <summary>Catalog quyền group theo module (DonThue, SanPham, ...).</summary>
public class QuyenCatalogResponse
{
    public string Nhom { get; set; } = string.Empty;
    public List<QuyenItem> Quyen { get; set; } = new();
}

/// <summary>Chi tiết quyền đang cấp cho một role.</summary>
public class QuyenCuaVaiTroResponse
{
    public string RoleName { get; set; } = string.Empty;
    public long Version { get; set; }
    public List<string> QuyenCoDuoc { get; set; } = new();
}

/// <summary>Request set toàn bộ quyền cho một role (idempotent).</summary>
public class CapNhatQuyenVaiTroRequest
{
    [Required]
    public List<string> Quyen { get; set; } = new();
}

/// <summary>Quyền hiện tại của user đang đăng nhập.</summary>
public class QuyenCuaToiResponse
{
    public long MaTaiKhoan { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public long Version { get; set; }
    public List<string> Quyen { get; set; } = new();
}
