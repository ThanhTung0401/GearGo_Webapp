using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GearGo.Migrations
{
    /// <inheritdoc />
    public partial class AddThanhToanEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "THANH_TOAN",
                columns: table => new
                {
                    ma_thanh_toan = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false),
                    ma_thanh_toan_hien_thi = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    phuong_thuc_thanh_toan = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    so_tien = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    thoi_gian_thanh_toan = table.Column<DateTime>(type: "datetime2", nullable: false),
                    trang_thai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ma_giao_dich_doi_tac = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_THANH_TOAN", x => x.ma_thanh_toan);
                    table.ForeignKey(
                        name: "FK_THANH_TOAN_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CHI_TIET_THANH_TOAN",
                columns: table => new
                {
                    ma_chi_tiet_thanh_toan = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_thanh_toan = table.Column<long>(type: "bigint", nullable: false),
                    loai_tien = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    so_tien = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CHI_TIET_THANH_TOAN", x => x.ma_chi_tiet_thanh_toan);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_THANH_TOAN_THANH_TOAN_ma_thanh_toan",
                        column: x => x.ma_thanh_toan,
                        principalTable: "THANH_TOAN",
                        principalColumn: "ma_thanh_toan",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_THANH_TOAN_ma_thanh_toan",
                table: "CHI_TIET_THANH_TOAN",
                column: "ma_thanh_toan");

            migrationBuilder.CreateIndex(
                name: "IX_THANH_TOAN_ma_don_thue",
                table: "THANH_TOAN",
                column: "ma_don_thue");

            migrationBuilder.CreateIndex(
                name: "IX_THANH_TOAN_ma_thanh_toan_hien_thi",
                table: "THANH_TOAN",
                column: "ma_thanh_toan_hien_thi",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CHI_TIET_THANH_TOAN");

            migrationBuilder.DropTable(
                name: "THANH_TOAN");
        }
    }
}
