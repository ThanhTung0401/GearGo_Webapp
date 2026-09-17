using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GearGo.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TAI_KHOAN",
                columns: table => new
                {
                    ma_tai_khoan = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    so_dien_thoai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    mat_khau_bam = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    vai_tro = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    trang_thai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ly_do_khoa = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ngay_tao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ngay_cap_nhat = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TAI_KHOAN", x => x.ma_tai_khoan);
                });

            migrationBuilder.CreateTable(
                name: "KHACH_HANG",
                columns: table => new
                {
                    ma_khach_hang = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_tai_khoan = table.Column<long>(type: "bigint", nullable: false),
                    ho_ten = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    dia_chi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ngay_sinh = table.Column<DateOnly>(type: "date", nullable: true),
                    anh_dai_dien = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KHACH_HANG", x => x.ma_khach_hang);
                    table.ForeignKey(
                        name: "FK_KHACH_HANG_TAI_KHOAN_ma_tai_khoan",
                        column: x => x.ma_tai_khoan,
                        principalTable: "TAI_KHOAN",
                        principalColumn: "ma_tai_khoan",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NHAN_VIEN",
                columns: table => new
                {
                    ma_nhan_vien = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_tai_khoan = table.Column<long>(type: "bigint", nullable: false),
                    ho_ten = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    dia_chi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ngay_vao_lam = table.Column<DateOnly>(type: "date", nullable: true),
                    ngay_nghi_viec = table.Column<DateOnly>(type: "date", nullable: true),
                    trang_thai_lam_viec = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NHAN_VIEN", x => x.ma_nhan_vien);
                    table.ForeignKey(
                        name: "FK_NHAN_VIEN_TAI_KHOAN_ma_tai_khoan",
                        column: x => x.ma_tai_khoan,
                        principalTable: "TAI_KHOAN",
                        principalColumn: "ma_tai_khoan",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KHACH_HANG_ma_tai_khoan",
                table: "KHACH_HANG",
                column: "ma_tai_khoan",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NHAN_VIEN_ma_tai_khoan",
                table: "NHAN_VIEN",
                column: "ma_tai_khoan",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TAI_KHOAN_email",
                table: "TAI_KHOAN",
                column: "email",
                unique: true,
                filter: "[email] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_TAI_KHOAN_so_dien_thoai",
                table: "TAI_KHOAN",
                column: "so_dien_thoai",
                unique: true,
                filter: "[so_dien_thoai] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KHACH_HANG");

            migrationBuilder.DropTable(
                name: "NHAN_VIEN");

            migrationBuilder.DropTable(
                name: "TAI_KHOAN");
        }
    }
}
