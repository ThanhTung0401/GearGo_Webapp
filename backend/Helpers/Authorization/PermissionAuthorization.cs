using System;
using System.Security.Claims;
using System.Threading.Tasks;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace GearGo.Helpers.Authorization;

/// <summary>
/// Yêu cầu quyền động (feat/ROLE_Adjustment). Policy name chuẩn: "perm:&lt;Ma&gt;".
/// </summary>
public class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }
    public PermissionRequirement(string permission) => Permission = permission;
}

/// <summary>
/// Đọc role HIỆN TẠI từ claim (đã được Program.cs.OnTokenValidated sync từ DB)
/// rồi hỏi <see cref="IPermissionService"/>. Service tự cache 30s + compare version → thay đổi
/// quyền có hiệu lực ngay request kế mà không cần logout.
/// </summary>
public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IServiceScopeFactory _scopeFactory;

    public PermissionAuthorizationHandler(IServiceScopeFactory scopeFactory) => _scopeFactory = scopeFactory;

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var role = context.User.FindFirst(ClaimTypes.Role)?.Value;
        if (string.IsNullOrEmpty(role)) return;

        if (role == DomainConstants.Roles.Admin)
        {
            context.Succeed(requirement);
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IPermissionService>();
        if (await service.KiemTraCoQuyenAsync(role, requirement.Permission))
        {
            context.Succeed(requirement);
        }
    }
}

/// <summary>
/// Sinh policy động cho tên "perm:&lt;Ma&gt;"; policy khác fallback về mặc định.
/// </summary>
public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private const string Prefix = "perm:";
    private readonly DefaultAuthorizationPolicyProvider _fallback;

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
    {
        _fallback = new DefaultAuthorizationPolicyProvider(options);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!string.IsNullOrEmpty(policyName) && policyName.StartsWith(Prefix, StringComparison.Ordinal))
        {
            var ma = policyName.Substring(Prefix.Length);
            var policy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(ma))
                .Build();
            return Task.FromResult<AuthorizationPolicy?>(policy);
        }
        return _fallback.GetPolicyAsync(policyName);
    }
}

/// <summary>
/// Shortcut cho controller: <c>[RequirePermission("DonThue.Xoa")]</c>.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permission) : base($"perm:{permission}") { }
}
