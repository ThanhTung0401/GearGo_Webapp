using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GearGo.Migrations
{
    /// <inheritdoc />
    public partial class AddTaiKhoanPermissionVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "permission_version",
                table: "TAI_KHOAN",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "permission_version",
                table: "TAI_KHOAN");
        }
    }
}
