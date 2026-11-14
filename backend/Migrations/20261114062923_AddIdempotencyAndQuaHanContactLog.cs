using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GearGo.Migrations
{
    /// <inheritdoc />
    public partial class AddIdempotencyAndQuaHanContactLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DON_THUE_ma_khach_hang",
                table: "DON_THUE");

            migrationBuilder.AddColumn<string>(
                name: "idempotency_key",
                table: "DON_THUE",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "NHAT_KY_LIEN_HE_QUA_HAN",
                columns: table => new
                {
                    ma_nhat_ky_lien_he = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false),
                    ma_tai_khoan = table.Column<long>(type: "bigint", nullable: false),
                    kenh_lien_he = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ket_qua = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    noi_dung = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    hen_tra_moi = table.Column<DateTime>(type: "datetime2", nullable: true),
                    thoi_diem_lien_he = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NHAT_KY_LIEN_HE_QUA_HAN", x => x.ma_nhat_ky_lien_he);
                    table.ForeignKey(
                        name: "FK_NHAT_KY_LIEN_HE_QUA_HAN_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NHAT_KY_LIEN_HE_QUA_HAN_TAI_KHOAN_ma_tai_khoan",
                        column: x => x.ma_tai_khoan,
                        principalTable: "TAI_KHOAN",
                        principalColumn: "ma_tai_khoan",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DON_THUE_ma_khach_hang_idempotency_key",
                table: "DON_THUE",
                columns: new[] { "ma_khach_hang", "idempotency_key" });

            migrationBuilder.CreateIndex(
                name: "IX_NHAT_KY_LIEN_HE_QUA_HAN_ma_don_thue_thoi_diem_lien_he",
                table: "NHAT_KY_LIEN_HE_QUA_HAN",
                columns: new[] { "ma_don_thue", "thoi_diem_lien_he" });

            migrationBuilder.CreateIndex(
                name: "IX_NHAT_KY_LIEN_HE_QUA_HAN_ma_tai_khoan",
                table: "NHAT_KY_LIEN_HE_QUA_HAN",
                column: "ma_tai_khoan");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NHAT_KY_LIEN_HE_QUA_HAN");

            migrationBuilder.DropIndex(
                name: "IX_DON_THUE_ma_khach_hang_idempotency_key",
                table: "DON_THUE");

            migrationBuilder.DropColumn(
                name: "idempotency_key",
                table: "DON_THUE");

            migrationBuilder.CreateIndex(
                name: "IX_DON_THUE_ma_khach_hang",
                table: "DON_THUE",
                column: "ma_khach_hang");
        }
    }
}
