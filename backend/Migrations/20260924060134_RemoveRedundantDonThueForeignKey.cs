using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GearGo.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRedundantDonThueForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CHI_TIET_DON_THUE_DON_THUE_DonThueMaDonThue",
                table: "CHI_TIET_DON_THUE");

            migrationBuilder.DropIndex(
                name: "IX_CHI_TIET_DON_THUE_DonThueMaDonThue",
                table: "CHI_TIET_DON_THUE");

            migrationBuilder.DropColumn(
                name: "DonThueMaDonThue",
                table: "CHI_TIET_DON_THUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "DonThueMaDonThue",
                table: "CHI_TIET_DON_THUE",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_DON_THUE_DonThueMaDonThue",
                table: "CHI_TIET_DON_THUE",
                column: "DonThueMaDonThue");

            migrationBuilder.AddForeignKey(
                name: "FK_CHI_TIET_DON_THUE_DON_THUE_DonThueMaDonThue",
                table: "CHI_TIET_DON_THUE",
                column: "DonThueMaDonThue",
                principalTable: "DON_THUE",
                principalColumn: "ma_don_thue");
        }
    }
}
