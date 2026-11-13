using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GearGo.Migrations
{
    /// <inheritdoc />
    public partial class AddDanhGiaPhanHoiCuaHang : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ma_nguoi_phan_hoi",
                table: "DANH_GIA",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "phan_hoi_cua_hang",
                table: "DANH_GIA",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "thoi_diem_phan_hoi",
                table: "DANH_GIA",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DANH_GIA_ma_nguoi_phan_hoi",
                table: "DANH_GIA",
                column: "ma_nguoi_phan_hoi");

            migrationBuilder.AddForeignKey(
                name: "FK_DANH_GIA_TAI_KHOAN_ma_nguoi_phan_hoi",
                table: "DANH_GIA",
                column: "ma_nguoi_phan_hoi",
                principalTable: "TAI_KHOAN",
                principalColumn: "ma_tai_khoan",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DANH_GIA_TAI_KHOAN_ma_nguoi_phan_hoi",
                table: "DANH_GIA");

            migrationBuilder.DropIndex(
                name: "IX_DANH_GIA_ma_nguoi_phan_hoi",
                table: "DANH_GIA");

            migrationBuilder.DropColumn(
                name: "ma_nguoi_phan_hoi",
                table: "DANH_GIA");

            migrationBuilder.DropColumn(
                name: "phan_hoi_cua_hang",
                table: "DANH_GIA");

            migrationBuilder.DropColumn(
                name: "thoi_diem_phan_hoi",
                table: "DANH_GIA");
        }
    }
}
