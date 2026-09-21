using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GearGo.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTask7Entities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CHINH_SACH",
                columns: table => new
                {
                    ma_chinh_sach = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_nguoi_tao = table.Column<long>(type: "bigint", nullable: false),
                    ten_chinh_sach = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    phien_ban = table.Column<int>(type: "int", nullable: false),
                    thoi_diem_ap_dung = table.Column<DateTime>(type: "datetime2", nullable: false),
                    noi_dung_chinh_sach = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ngay_tao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CHINH_SACH", x => x.ma_chinh_sach);
                    table.ForeignKey(
                        name: "FK_CHINH_SACH_NHAN_VIEN_ma_nguoi_tao",
                        column: x => x.ma_nguoi_tao,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DANH_MUC_SAN_PHAM",
                columns: table => new
                {
                    ma_danh_muc = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_danh_muc_cha = table.Column<long>(type: "bigint", nullable: true),
                    ten_danh_muc = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    mo_ta = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    thu_tu_hien_thi = table.Column<int>(type: "int", nullable: false),
                    trang_thai = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DANH_MUC_SAN_PHAM", x => x.ma_danh_muc);
                    table.ForeignKey(
                        name: "FK_DANH_MUC_SAN_PHAM_DANH_MUC_SAN_PHAM_ma_danh_muc_cha",
                        column: x => x.ma_danh_muc_cha,
                        principalTable: "DANH_MUC_SAN_PHAM",
                        principalColumn: "ma_danh_muc",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GIO_THUE",
                columns: table => new
                {
                    ma_gio_thue = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_khach_hang = table.Column<long>(type: "bigint", nullable: false),
                    ma_khuyen_mai = table.Column<long>(type: "bigint", nullable: true),
                    gio_nhan_du_kien = table.Column<DateTime>(type: "datetime2", nullable: true),
                    gio_tra_du_kien = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GIO_THUE", x => x.ma_gio_thue);
                    table.ForeignKey(
                        name: "FK_GIO_THUE_KHACH_HANG_ma_khach_hang",
                        column: x => x.ma_khach_hang,
                        principalTable: "KHACH_HANG",
                        principalColumn: "ma_khach_hang",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KHUYEN_MAI",
                columns: table => new
                {
                    ma_khuyen_mai = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_giam_gia = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    loai_giam = table.Column<int>(type: "int", nullable: false),
                    gia_tri_giam = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    muc_giam_toi_da = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    tien_thue_toi_thieu = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ngay_bat_dau = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ngay_ket_thuc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    tong_luot_su_dung = table.Column<int>(type: "int", nullable: true),
                    gioi_han_moi_khach = table.Column<int>(type: "int", nullable: true),
                    pham_vi_ap_dung = table.Column<int>(type: "int", nullable: false),
                    trang_thai = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KHUYEN_MAI", x => x.ma_khuyen_mai);
                });

            migrationBuilder.CreateTable(
                name: "NHA_CUNG_CAP",
                columns: table => new
                {
                    ma_nha_cung_cap = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_nha_cung_cap_hien_thi = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ten_nha_cung_cap = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    nguoi_lien_he = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    so_dien_thoai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    dia_chi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ma_so_thue = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    trang_thai_hop_tac = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NHA_CUNG_CAP", x => x.ma_nha_cung_cap);
                });

            migrationBuilder.CreateTable(
                name: "DON_THUE",
                columns: table => new
                {
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_khach_hang = table.Column<long>(type: "bigint", nullable: false),
                    ma_chinh_sach = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_huy = table.Column<long>(type: "bigint", nullable: true),
                    ma_don_hien_thi = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ngay_dat = table.Column<DateTime>(type: "datetime2", nullable: false),
                    gio_nhan_du_kien = table.Column<DateTime>(type: "datetime2", nullable: false),
                    gio_tra_du_kien = table.Column<DateTime>(type: "datetime2", nullable: false),
                    han_thanh_toan = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ten_nguoi_nhan = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    so_dien_thoai_nguoi_nhan = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    email_lien_he = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    tong_tien_thue_truoc_giam = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    tong_tien_giam = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    tong_tien_coc = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    khuyen_mai_luc_dat = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    thoi_diem_huy = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ly_do_huy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    tien_thue_giu_lai_khi_huy = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    thoi_diem_hoan_tat = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DON_THUE", x => x.ma_don_thue);
                    table.ForeignKey(
                        name: "FK_DON_THUE_CHINH_SACH_ma_chinh_sach",
                        column: x => x.ma_chinh_sach,
                        principalTable: "CHINH_SACH",
                        principalColumn: "ma_chinh_sach",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DON_THUE_KHACH_HANG_ma_khach_hang",
                        column: x => x.ma_khach_hang,
                        principalTable: "KHACH_HANG",
                        principalColumn: "ma_khach_hang",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DON_THUE_TAI_KHOAN_ma_nguoi_huy",
                        column: x => x.ma_nguoi_huy,
                        principalTable: "TAI_KHOAN",
                        principalColumn: "ma_tai_khoan");
                });

            migrationBuilder.CreateTable(
                name: "SAN_PHAM",
                columns: table => new
                {
                    ma_san_pham = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_danh_muc = table.Column<long>(type: "bigint", nullable: false),
                    ma_san_pham_hien_thi = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ten_san_pham = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    thuong_hieu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    mo_ta = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    suc_chua = table.Column<int>(type: "int", nullable: true),
                    kich_thuoc = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    thong_so = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    gia_thue_moi_ngay = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    muc_coc_moi_thiet_bi = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    gia_tri_boi_thuong = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    trang_thai_kinh_doanh = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SAN_PHAM", x => x.ma_san_pham);
                    table.ForeignKey(
                        name: "FK_SAN_PHAM_DANH_MUC_SAN_PHAM_ma_danh_muc",
                        column: x => x.ma_danh_muc,
                        principalTable: "DANH_MUC_SAN_PHAM",
                        principalColumn: "ma_danh_muc",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "KHUYEN_MAI_DANH_MUC",
                columns: table => new
                {
                    ma_khuyen_mai = table.Column<long>(type: "bigint", nullable: false),
                    ma_danh_muc = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KHUYEN_MAI_DANH_MUC", x => new { x.ma_khuyen_mai, x.ma_danh_muc });
                    table.ForeignKey(
                        name: "FK_KHUYEN_MAI_DANH_MUC_DANH_MUC_SAN_PHAM_ma_danh_muc",
                        column: x => x.ma_danh_muc,
                        principalTable: "DANH_MUC_SAN_PHAM",
                        principalColumn: "ma_danh_muc",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KHUYEN_MAI_DANH_MUC_KHUYEN_MAI_ma_khuyen_mai",
                        column: x => x.ma_khuyen_mai,
                        principalTable: "KHUYEN_MAI",
                        principalColumn: "ma_khuyen_mai",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PHIEU_NHAP_HANG",
                columns: table => new
                {
                    ma_phieu_nhap = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_nha_cung_cap = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_lap = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_xac_nhan = table.Column<long>(type: "bigint", nullable: true),
                    ma_phieu_hien_thi = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    so_chung_tu_nha_cung_cap = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ngay_lap = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ngay_nhap_du_kien = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ngay_nhap_thuc_te = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ngay_xac_nhan = table.Column<DateTime>(type: "datetime2", nullable: true),
                    tong_tien = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    thong_tin_nha_cung_cap_luc_nhap = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ten_nguoi_lap_luc_nhap = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ten_nguoi_xac_nhan_luc_nhap = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    trang_thai = table.Column<int>(type: "int", nullable: false),
                    ly_do_huy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PHIEU_NHAP_HANG", x => x.ma_phieu_nhap);
                    table.ForeignKey(
                        name: "FK_PHIEU_NHAP_HANG_NHAN_VIEN_ma_nguoi_lap",
                        column: x => x.ma_nguoi_lap,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PHIEU_NHAP_HANG_NHAN_VIEN_ma_nguoi_xac_nhan",
                        column: x => x.ma_nguoi_xac_nhan,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien");
                    table.ForeignKey(
                        name: "FK_PHIEU_NHAP_HANG_NHA_CUNG_CAP_ma_nha_cung_cap",
                        column: x => x.ma_nha_cung_cap,
                        principalTable: "NHA_CUNG_CAP",
                        principalColumn: "ma_nha_cung_cap",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LICH_SU_TRANG_THAI_DON",
                columns: table => new
                {
                    ma_lich_su_don = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_thuc_hien = table.Column<long>(type: "bigint", nullable: true),
                    trang_thai_truoc = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    trang_thai_sau = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    thoi_diem = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ly_do = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LICH_SU_TRANG_THAI_DON", x => x.ma_lich_su_don);
                    table.ForeignKey(
                        name: "FK_LICH_SU_TRANG_THAI_DON_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LICH_SU_TRANG_THAI_DON_TAI_KHOAN_ma_nguoi_thuc_hien",
                        column: x => x.ma_nguoi_thuc_hien,
                        principalTable: "TAI_KHOAN",
                        principalColumn: "ma_tai_khoan");
                });

            migrationBuilder.CreateTable(
                name: "LUOT_SU_DUNG_KHUYEN_MAI",
                columns: table => new
                {
                    ma_luot_su_dung = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_khuyen_mai = table.Column<long>(type: "bigint", nullable: false),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false),
                    thoi_diem_giu_luot = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_het_han = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_su_dung = table.Column<DateTime>(type: "datetime2", nullable: true),
                    thoi_diem_giai_phong = table.Column<DateTime>(type: "datetime2", nullable: true),
                    so_tien_giam = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    trang_thai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LUOT_SU_DUNG_KHUYEN_MAI", x => x.ma_luot_su_dung);
                    table.ForeignKey(
                        name: "FK_LUOT_SU_DUNG_KHUYEN_MAI_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LUOT_SU_DUNG_KHUYEN_MAI_KHUYEN_MAI_ma_khuyen_mai",
                        column: x => x.ma_khuyen_mai,
                        principalTable: "KHUYEN_MAI",
                        principalColumn: "ma_khuyen_mai",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CHI_TIET_DON_THUE",
                columns: table => new
                {
                    ma_chi_tiet_don = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false),
                    ma_san_pham = table.Column<long>(type: "bigint", nullable: false),
                    ten_san_pham_luc_dat = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    so_luong = table.Column<int>(type: "int", nullable: false),
                    so_ngay_tinh_tien = table.Column<int>(type: "int", nullable: false),
                    don_gia_thue_moi_ngay = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    tien_giam = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    muc_coc_moi_thiet_bi = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    gia_tri_boi_thuong_moi_thiet_bi = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    phu_kien_va_muc_boi_thuong_luc_dat = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DonThueMaDonThue = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CHI_TIET_DON_THUE", x => x.ma_chi_tiet_don);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_DON_THUE_DON_THUE_DonThueMaDonThue",
                        column: x => x.DonThueMaDonThue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue");
                    table.ForeignKey(
                        name: "FK_CHI_TIET_DON_THUE_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_DON_THUE_SAN_PHAM_ma_san_pham",
                        column: x => x.ma_san_pham,
                        principalTable: "SAN_PHAM",
                        principalColumn: "ma_san_pham",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CHI_TIET_GIO_THUE",
                columns: table => new
                {
                    ma_chi_tiet_gio = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_gio_thue = table.Column<long>(type: "bigint", nullable: false),
                    ma_san_pham = table.Column<long>(type: "bigint", nullable: false),
                    so_luong = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CHI_TIET_GIO_THUE", x => x.ma_chi_tiet_gio);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_GIO_THUE_GIO_THUE_ma_gio_thue",
                        column: x => x.ma_gio_thue,
                        principalTable: "GIO_THUE",
                        principalColumn: "ma_gio_thue",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_GIO_THUE_SAN_PHAM_ma_san_pham",
                        column: x => x.ma_san_pham,
                        principalTable: "SAN_PHAM",
                        principalColumn: "ma_san_pham",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HINH_ANH_SAN_PHAM",
                columns: table => new
                {
                    ma_hinh_anh = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_san_pham = table.Column<long>(type: "bigint", nullable: false),
                    duong_dan = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    la_anh_chinh = table.Column<bool>(type: "bit", nullable: false),
                    thu_tu = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HINH_ANH_SAN_PHAM", x => x.ma_hinh_anh);
                    table.ForeignKey(
                        name: "FK_HINH_ANH_SAN_PHAM_SAN_PHAM_ma_san_pham",
                        column: x => x.ma_san_pham,
                        principalTable: "SAN_PHAM",
                        principalColumn: "ma_san_pham",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KHUYEN_MAI_SAN_PHAM",
                columns: table => new
                {
                    ma_khuyen_mai = table.Column<long>(type: "bigint", nullable: false),
                    ma_san_pham = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KHUYEN_MAI_SAN_PHAM", x => new { x.ma_khuyen_mai, x.ma_san_pham });
                    table.ForeignKey(
                        name: "FK_KHUYEN_MAI_SAN_PHAM_KHUYEN_MAI_ma_khuyen_mai",
                        column: x => x.ma_khuyen_mai,
                        principalTable: "KHUYEN_MAI",
                        principalColumn: "ma_khuyen_mai",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KHUYEN_MAI_SAN_PHAM_SAN_PHAM_ma_san_pham",
                        column: x => x.ma_san_pham,
                        principalTable: "SAN_PHAM",
                        principalColumn: "ma_san_pham",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CHI_TIET_PHIEU_NHAP",
                columns: table => new
                {
                    ma_chi_tiet_phieu_nhap = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_phieu_nhap = table.Column<long>(type: "bigint", nullable: false),
                    ma_san_pham = table.Column<long>(type: "bigint", nullable: false),
                    ten_san_pham_luc_nhap = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    so_luong = table.Column<int>(type: "int", nullable: false),
                    don_gia_nhap = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    tinh_trang_khi_nhap = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CHI_TIET_PHIEU_NHAP", x => x.ma_chi_tiet_phieu_nhap);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_PHIEU_NHAP_PHIEU_NHAP_HANG_ma_phieu_nhap",
                        column: x => x.ma_phieu_nhap,
                        principalTable: "PHIEU_NHAP_HANG",
                        principalColumn: "ma_phieu_nhap",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_PHIEU_NHAP_SAN_PHAM_ma_san_pham",
                        column: x => x.ma_san_pham,
                        principalTable: "SAN_PHAM",
                        principalColumn: "ma_san_pham",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GIU_CHO",
                columns: table => new
                {
                    ma_giu_cho = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_chi_tiet_don = table.Column<long>(type: "bigint", nullable: false),
                    thoi_diem_tao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_het_han = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_giai_phong = table.Column<DateTime>(type: "datetime2", nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GIU_CHO", x => x.ma_giu_cho);
                    table.ForeignKey(
                        name: "FK_GIU_CHO_CHI_TIET_DON_THUE_ma_chi_tiet_don",
                        column: x => x.ma_chi_tiet_don,
                        principalTable: "CHI_TIET_DON_THUE",
                        principalColumn: "ma_chi_tiet_don",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "THIET_BI",
                columns: table => new
                {
                    ma_thiet_bi = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_chi_tiet_phieu_nhap = table.Column<long>(type: "bigint", nullable: false),
                    ma_thiet_bi_hien_thi = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ngay_nhap = table.Column<DateTime>(type: "datetime2", nullable: false),
                    gia_nhap = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    tinh_trang = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phu_kien_di_kem = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    trang_thai_su_dung = table.Column<int>(type: "int", nullable: false),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_THIET_BI", x => x.ma_thiet_bi);
                    table.ForeignKey(
                        name: "FK_THIET_BI_CHI_TIET_PHIEU_NHAP_ma_chi_tiet_phieu_nhap",
                        column: x => x.ma_chi_tiet_phieu_nhap,
                        principalTable: "CHI_TIET_PHIEU_NHAP",
                        principalColumn: "ma_chi_tiet_phieu_nhap",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PHAN_CONG_THIET_BI",
                columns: table => new
                {
                    ma_phan_cong = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_chi_tiet_don = table.Column<long>(type: "bigint", nullable: false),
                    ma_thiet_bi = table.Column<long>(type: "bigint", nullable: false),
                    ma_nhan_vien_phan_cong = table.Column<long>(type: "bigint", nullable: false),
                    ma_nhan_vien_huy = table.Column<long>(type: "bigint", nullable: true),
                    thoi_gian_phan_cong = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_gian_huy = table.Column<DateTime>(type: "datetime2", nullable: true),
                    trang_thai = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PHAN_CONG_THIET_BI", x => x.ma_phan_cong);
                    table.ForeignKey(
                        name: "FK_PHAN_CONG_THIET_BI_CHI_TIET_DON_THUE_ma_chi_tiet_don",
                        column: x => x.ma_chi_tiet_don,
                        principalTable: "CHI_TIET_DON_THUE",
                        principalColumn: "ma_chi_tiet_don",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PHAN_CONG_THIET_BI_NHAN_VIEN_ma_nhan_vien_huy",
                        column: x => x.ma_nhan_vien_huy,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien");
                    table.ForeignKey(
                        name: "FK_PHAN_CONG_THIET_BI_NHAN_VIEN_ma_nhan_vien_phan_cong",
                        column: x => x.ma_nhan_vien_phan_cong,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHAN_CONG_THIET_BI_THIET_BI_ma_thiet_bi",
                        column: x => x.ma_thiet_bi,
                        principalTable: "THIET_BI",
                        principalColumn: "ma_thiet_bi",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_DON_THUE_DonThueMaDonThue",
                table: "CHI_TIET_DON_THUE",
                column: "DonThueMaDonThue");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_DON_THUE_ma_don_thue",
                table: "CHI_TIET_DON_THUE",
                column: "ma_don_thue");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_DON_THUE_ma_san_pham",
                table: "CHI_TIET_DON_THUE",
                column: "ma_san_pham");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_GIO_THUE_ma_gio_thue",
                table: "CHI_TIET_GIO_THUE",
                column: "ma_gio_thue");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_GIO_THUE_ma_san_pham",
                table: "CHI_TIET_GIO_THUE",
                column: "ma_san_pham");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_PHIEU_NHAP_ma_phieu_nhap",
                table: "CHI_TIET_PHIEU_NHAP",
                column: "ma_phieu_nhap");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_PHIEU_NHAP_ma_san_pham",
                table: "CHI_TIET_PHIEU_NHAP",
                column: "ma_san_pham");

            migrationBuilder.CreateIndex(
                name: "IX_CHINH_SACH_ma_nguoi_tao",
                table: "CHINH_SACH",
                column: "ma_nguoi_tao");

            migrationBuilder.CreateIndex(
                name: "IX_CHINH_SACH_phien_ban",
                table: "CHINH_SACH",
                column: "phien_ban",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DANH_MUC_SAN_PHAM_ma_danh_muc_cha",
                table: "DANH_MUC_SAN_PHAM",
                column: "ma_danh_muc_cha");

            migrationBuilder.CreateIndex(
                name: "IX_DON_THUE_ma_chinh_sach",
                table: "DON_THUE",
                column: "ma_chinh_sach");

            migrationBuilder.CreateIndex(
                name: "IX_DON_THUE_ma_don_hien_thi",
                table: "DON_THUE",
                column: "ma_don_hien_thi",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DON_THUE_ma_khach_hang",
                table: "DON_THUE",
                column: "ma_khach_hang");

            migrationBuilder.CreateIndex(
                name: "IX_DON_THUE_ma_nguoi_huy",
                table: "DON_THUE",
                column: "ma_nguoi_huy");

            migrationBuilder.CreateIndex(
                name: "IX_GIO_THUE_ma_khach_hang",
                table: "GIO_THUE",
                column: "ma_khach_hang",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GIU_CHO_ma_chi_tiet_don",
                table: "GIU_CHO",
                column: "ma_chi_tiet_don",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HINH_ANH_SAN_PHAM_ma_san_pham",
                table: "HINH_ANH_SAN_PHAM",
                column: "ma_san_pham");

            migrationBuilder.CreateIndex(
                name: "IX_KHUYEN_MAI_ma_giam_gia",
                table: "KHUYEN_MAI",
                column: "ma_giam_gia",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KHUYEN_MAI_DANH_MUC_ma_danh_muc",
                table: "KHUYEN_MAI_DANH_MUC",
                column: "ma_danh_muc");

            migrationBuilder.CreateIndex(
                name: "IX_KHUYEN_MAI_SAN_PHAM_ma_san_pham",
                table: "KHUYEN_MAI_SAN_PHAM",
                column: "ma_san_pham");

            migrationBuilder.CreateIndex(
                name: "IX_LICH_SU_TRANG_THAI_DON_ma_don_thue",
                table: "LICH_SU_TRANG_THAI_DON",
                column: "ma_don_thue");

            migrationBuilder.CreateIndex(
                name: "IX_LICH_SU_TRANG_THAI_DON_ma_nguoi_thuc_hien",
                table: "LICH_SU_TRANG_THAI_DON",
                column: "ma_nguoi_thuc_hien");

            migrationBuilder.CreateIndex(
                name: "IX_LUOT_SU_DUNG_KHUYEN_MAI_ma_don_thue",
                table: "LUOT_SU_DUNG_KHUYEN_MAI",
                column: "ma_don_thue",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LUOT_SU_DUNG_KHUYEN_MAI_ma_khuyen_mai",
                table: "LUOT_SU_DUNG_KHUYEN_MAI",
                column: "ma_khuyen_mai");

            migrationBuilder.CreateIndex(
                name: "IX_NHA_CUNG_CAP_ma_nha_cung_cap_hien_thi",
                table: "NHA_CUNG_CAP",
                column: "ma_nha_cung_cap_hien_thi",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PHAN_CONG_THIET_BI_ma_chi_tiet_don",
                table: "PHAN_CONG_THIET_BI",
                column: "ma_chi_tiet_don");

            migrationBuilder.CreateIndex(
                name: "IX_PHAN_CONG_THIET_BI_ma_nhan_vien_huy",
                table: "PHAN_CONG_THIET_BI",
                column: "ma_nhan_vien_huy");

            migrationBuilder.CreateIndex(
                name: "IX_PHAN_CONG_THIET_BI_ma_nhan_vien_phan_cong",
                table: "PHAN_CONG_THIET_BI",
                column: "ma_nhan_vien_phan_cong");

            migrationBuilder.CreateIndex(
                name: "IX_PHAN_CONG_THIET_BI_ma_thiet_bi",
                table: "PHAN_CONG_THIET_BI",
                column: "ma_thiet_bi");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_NHAP_HANG_ma_nguoi_lap",
                table: "PHIEU_NHAP_HANG",
                column: "ma_nguoi_lap");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_NHAP_HANG_ma_nguoi_xac_nhan",
                table: "PHIEU_NHAP_HANG",
                column: "ma_nguoi_xac_nhan");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_NHAP_HANG_ma_nha_cung_cap",
                table: "PHIEU_NHAP_HANG",
                column: "ma_nha_cung_cap");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_NHAP_HANG_ma_phieu_hien_thi",
                table: "PHIEU_NHAP_HANG",
                column: "ma_phieu_hien_thi",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SAN_PHAM_ma_danh_muc",
                table: "SAN_PHAM",
                column: "ma_danh_muc");

            migrationBuilder.CreateIndex(
                name: "IX_SAN_PHAM_ma_san_pham_hien_thi",
                table: "SAN_PHAM",
                column: "ma_san_pham_hien_thi",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_THIET_BI_ma_chi_tiet_phieu_nhap",
                table: "THIET_BI",
                column: "ma_chi_tiet_phieu_nhap");

            migrationBuilder.CreateIndex(
                name: "IX_THIET_BI_ma_thiet_bi_hien_thi",
                table: "THIET_BI",
                column: "ma_thiet_bi_hien_thi",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CHI_TIET_GIO_THUE");

            migrationBuilder.DropTable(
                name: "GIU_CHO");

            migrationBuilder.DropTable(
                name: "HINH_ANH_SAN_PHAM");

            migrationBuilder.DropTable(
                name: "KHUYEN_MAI_DANH_MUC");

            migrationBuilder.DropTable(
                name: "KHUYEN_MAI_SAN_PHAM");

            migrationBuilder.DropTable(
                name: "LICH_SU_TRANG_THAI_DON");

            migrationBuilder.DropTable(
                name: "LUOT_SU_DUNG_KHUYEN_MAI");

            migrationBuilder.DropTable(
                name: "PHAN_CONG_THIET_BI");

            migrationBuilder.DropTable(
                name: "GIO_THUE");

            migrationBuilder.DropTable(
                name: "KHUYEN_MAI");

            migrationBuilder.DropTable(
                name: "CHI_TIET_DON_THUE");

            migrationBuilder.DropTable(
                name: "THIET_BI");

            migrationBuilder.DropTable(
                name: "DON_THUE");

            migrationBuilder.DropTable(
                name: "CHI_TIET_PHIEU_NHAP");

            migrationBuilder.DropTable(
                name: "CHINH_SACH");

            migrationBuilder.DropTable(
                name: "PHIEU_NHAP_HANG");

            migrationBuilder.DropTable(
                name: "SAN_PHAM");

            migrationBuilder.DropTable(
                name: "NHA_CUNG_CAP");

            migrationBuilder.DropTable(
                name: "DANH_MUC_SAN_PHAM");
        }
    }
}
