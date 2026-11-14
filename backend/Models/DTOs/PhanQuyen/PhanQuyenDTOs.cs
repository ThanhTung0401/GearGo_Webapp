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

/// <summary>Chi tiết quyền của một nhân viên (hỗ trợ phân quyền riêng theo tài khoản - UC1.10).</summary>
public class QuyenCuaNhanVienResponse
{
    public long MaTaiKhoan { get; set; }
    public long? MaNhanVien { get; set; }
    public string HoTen { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public bool CoPhanQuyenRieng { get; set; }
    public List<string> QuyenCoDuoc { get; set; } = new();
    public List<string> QuyenTheoVaiTro { get; set; } = new();
}

/// <summary>Request cấp/thu quyền riêng cho từng nhân viên.</summary>
public class CapNhatQuyenNhanVienRequest
{
    [Required]
    public List<string> Quyen { get; set; } = new();
}
