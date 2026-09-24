using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GearGo.Migrations
{
    /// <inheritdoc />
    public partial class FullERDInitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                name: "KHUYEN_MAI",
                columns: table => new
                {
                    ma_khuyen_mai = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_giam_gia = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ten_khuyen_mai = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    loai_giam = table.Column<int>(type: "int", nullable: false),
                    gia_tri_giam = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    muc_giam_toi_da = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    tien_thue_toi_thieu = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    pham_vi_ap_dung = table.Column<int>(type: "int", nullable: false),
                    bat_dau = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ket_thuc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    gioi_han_tong_luot = table.Column<int>(type: "int", nullable: true),
                    gioi_han_moi_khach = table.Column<int>(type: "int", nullable: true),
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
                    trang_thai_hop_tac = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NHA_CUNG_CAP", x => x.ma_nha_cung_cap);
                });

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
                    gia_thue_moi_ngay = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    muc_coc_moi_thiet_bi = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    gia_tri_boi_thuong = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
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

            migrationBuilder.CreateTable(
                name: "NHAT_KY_THAO_TAC",
                columns: table => new
                {
                    ma_nhat_ky = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_tai_khoan = table.Column<long>(type: "bigint", nullable: true),
                    hanh_dong = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    loai_doi_tuong = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ma_doi_tuong = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    du_lieu_truoc = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    du_lieu_sau = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    thoi_diem = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ly_do = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NHAT_KY_THAO_TAC", x => x.ma_nhat_ky);
                    table.ForeignKey(
                        name: "FK_NHAT_KY_THAO_TAC_TAI_KHOAN_ma_tai_khoan",
                        column: x => x.ma_tai_khoan,
                        principalTable: "TAI_KHOAN",
                        principalColumn: "ma_tai_khoan",
                        onDelete: ReferentialAction.Restrict);
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
                name: "GIO_THUE",
                columns: table => new
                {
                    ma_gio_thue = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_khach_hang = table.Column<long>(type: "bigint", nullable: false),
                    ma_khuyen_mai = table.Column<long>(type: "bigint", nullable: true),
                    gio_nhan_du_kien = table.Column<DateTime>(type: "datetime2", nullable: true),
                    gio_tra_du_kien = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ngay_cap_nhat = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                    table.ForeignKey(
                        name: "FK_GIO_THUE_KHUYEN_MAI_ma_khuyen_mai",
                        column: x => x.ma_khuyen_mai,
                        principalTable: "KHUYEN_MAI",
                        principalColumn: "ma_khuyen_mai");
                });

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
                    tong_tien = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
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
                    tong_tien_thue_truoc_giam = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    tong_tien_giam = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    tong_tien_coc = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    khuyen_mai_luc_dat = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    thoi_diem_huy = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ly_do_huy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    tien_thue_giu_lai_khi_huy = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
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
                name: "CHI_TIET_PHIEU_NHAP",
                columns: table => new
                {
                    ma_chi_tiet_phieu_nhap = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_phieu_nhap = table.Column<long>(type: "bigint", nullable: false),
                    ma_san_pham = table.Column<long>(type: "bigint", nullable: false),
                    ten_san_pham_luc_nhap = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    so_luong = table.Column<int>(type: "int", nullable: false),
                    don_gia_nhap = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
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
                name: "PHIEU_DIEU_CHINH_KHO",
                columns: table => new
                {
                    ma_phieu_dieu_chinh = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_phieu_nhap_lien_quan = table.Column<long>(type: "bigint", nullable: true),
                    ma_nguoi_lap = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_duyet = table.Column<long>(type: "bigint", nullable: true),
                    loai_dieu_chinh = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ly_do = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    bang_chung = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    thoi_diem_lap = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_duyet = table.Column<DateTime>(type: "datetime2", nullable: true),
                    thoi_diem_ap_dung = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ten_nguoi_lap_luc_lap = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ten_nguoi_duyet_luc_duyet = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PHIEU_DIEU_CHINH_KHO", x => x.ma_phieu_dieu_chinh);
                    table.ForeignKey(
                        name: "FK_PHIEU_DIEU_CHINH_KHO_NHAN_VIEN_ma_nguoi_duyet",
                        column: x => x.ma_nguoi_duyet,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHIEU_DIEU_CHINH_KHO_NHAN_VIEN_ma_nguoi_lap",
                        column: x => x.ma_nguoi_lap,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHIEU_DIEU_CHINH_KHO_PHIEU_NHAP_HANG_ma_phieu_nhap_lien_quan",
                        column: x => x.ma_phieu_nhap_lien_quan,
                        principalTable: "PHIEU_NHAP_HANG",
                        principalColumn: "ma_phieu_nhap",
                        onDelete: ReferentialAction.Restrict);
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
                    don_gia_thue_moi_ngay = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    tien_giam = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    muc_coc_moi_thiet_bi = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    gia_tri_boi_thuong_moi_thiet_bi = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
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
                name: "DOI_SOAT_TIEN_COC",
                columns: table => new
                {
                    ma_doi_soat = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false),
                    ma_doi_soat_goc = table.Column<long>(type: "bigint", nullable: true),
                    ma_nguoi_lap = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_chot = table.Column<long>(type: "bigint", nullable: true),
                    loai_doi_soat = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    tien_coc_duoc_doi_soat = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    tong_phu_phi_duoc_duyet = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    so_tien_can_hoan = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    so_tien_can_thu_them = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    bang_tinh_doi_soat = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ten_nguoi_chot_luc_doi_soat = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    thoi_diem_lap = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_chot = table.Column<DateTime>(type: "datetime2", nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ly_do_dieu_chinh = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DOI_SOAT_TIEN_COC", x => x.ma_doi_soat);
                    table.ForeignKey(
                        name: "FK_DOI_SOAT_TIEN_COC_DOI_SOAT_TIEN_COC_ma_doi_soat_goc",
                        column: x => x.ma_doi_soat_goc,
                        principalTable: "DOI_SOAT_TIEN_COC",
                        principalColumn: "ma_doi_soat",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DOI_SOAT_TIEN_COC_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DOI_SOAT_TIEN_COC_NHAN_VIEN_ma_nguoi_chot",
                        column: x => x.ma_nguoi_chot,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DOI_SOAT_TIEN_COC_NHAN_VIEN_ma_nguoi_lap",
                        column: x => x.ma_nguoi_lap,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
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
                        principalColumn: "ma_tai_khoan",
                        onDelete: ReferentialAction.Restrict);
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
                    so_tien_giam = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
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
                name: "PHIEU_BAN_GIAO",
                columns: table => new
                {
                    ma_phieu_ban_giao = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false),
                    ma_nhan_vien = table.Column<long>(type: "bigint", nullable: false),
                    thoi_diem_lap = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_giao_thuc_te = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ten_nhan_vien_luc_giao = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ten_nguoi_nhan_thuc_te = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    thoi_diem_khach_xac_nhan = table.Column<DateTime>(type: "datetime2", nullable: true),
                    bang_chung_xac_nhan = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PHIEU_BAN_GIAO", x => x.ma_phieu_ban_giao);
                    table.ForeignKey(
                        name: "FK_PHIEU_BAN_GIAO_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHIEU_BAN_GIAO_NHAN_VIEN_ma_nhan_vien",
                        column: x => x.ma_nhan_vien,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PHIEU_NHAN_TRA",
                columns: table => new
                {
                    ma_phieu_nhan_tra = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false),
                    ma_nhan_vien = table.Column<long>(type: "bigint", nullable: false),
                    ma_phieu_hien_thi = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    lan_tra = table.Column<int>(type: "int", nullable: false),
                    la_lan_tra_cuoi = table.Column<bool>(type: "bit", nullable: false),
                    thoi_diem_lap = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_chot = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ten_nhan_vien_luc_nhan = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PHIEU_NHAN_TRA", x => x.ma_phieu_nhan_tra);
                    table.ForeignKey(
                        name: "FK_PHIEU_NHAN_TRA_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHIEU_NHAN_TRA_NHAN_VIEN_ma_nhan_vien",
                        column: x => x.ma_nhan_vien,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "THANH_TOAN",
                columns: table => new
                {
                    ma_thanh_toan = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_ghi_nhan = table.Column<long>(type: "bigint", nullable: true),
                    ma_yeu_cau = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    cong_thanh_toan = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ma_giao_dich_cong = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    tong_so_tien = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    phuong_thuc = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    thoi_diem_tao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_thanh_cong = table.Column<DateTime>(type: "datetime2", nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    trang_thai_doi_chieu = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
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
                    table.ForeignKey(
                        name: "FK_THANH_TOAN_NHAN_VIEN_ma_nguoi_ghi_nhan",
                        column: x => x.ma_nguoi_ghi_nhan,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "THONG_BAO",
                columns: table => new
                {
                    ma_thong_bao = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_tai_khoan = table.Column<long>(type: "bigint", nullable: false),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: true),
                    ma_su_kien = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    loai_su_kien = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    tieu_de = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    noi_dung = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    kenh_gui = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    trang_thai_gui = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    so_lan_thu_gui = table.Column<int>(type: "int", nullable: false),
                    thoi_diem_tao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_gui = table.Column<DateTime>(type: "datetime2", nullable: true),
                    thoi_diem_doc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    loi_gui_gan_nhat = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_THONG_BAO", x => x.ma_thong_bao);
                    table.ForeignKey(
                        name: "FK_THONG_BAO_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_THONG_BAO_TAI_KHOAN_ma_tai_khoan",
                        column: x => x.ma_tai_khoan,
                        principalTable: "TAI_KHOAN",
                        principalColumn: "ma_tai_khoan",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "THIET_BI",
                columns: table => new
                {
                    ma_thiet_bi = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_chi_tiet_phieu_nhap = table.Column<long>(type: "bigint", nullable: false),
                    ma_san_pham_hien_tai = table.Column<long>(type: "bigint", nullable: false),
                    ma_thiet_bi_hien_thi = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ngay_nhap = table.Column<DateTime>(type: "datetime2", nullable: false),
                    gia_nhap = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
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
                    table.ForeignKey(
                        name: "FK_THIET_BI_SAN_PHAM_ma_san_pham_hien_tai",
                        column: x => x.ma_san_pham_hien_tai,
                        principalTable: "SAN_PHAM",
                        principalColumn: "ma_san_pham",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DANH_GIA",
                columns: table => new
                {
                    ma_danh_gia = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_chi_tiet_don = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_an = table.Column<long>(type: "bigint", nullable: true),
                    so_sao = table.Column<int>(type: "int", nullable: false),
                    noi_dung = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    danh_sach_anh = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ngay_tao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ngay_cap_nhat = table.Column<DateTime>(type: "datetime2", nullable: true),
                    trang_thai_hien_thi = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ly_do_an = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DANH_GIA", x => x.ma_danh_gia);
                    table.ForeignKey(
                        name: "FK_DANH_GIA_CHI_TIET_DON_THUE_ma_chi_tiet_don",
                        column: x => x.ma_chi_tiet_don,
                        principalTable: "CHI_TIET_DON_THUE",
                        principalColumn: "ma_chi_tiet_don",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DANH_GIA_NHAN_VIEN_ma_nguoi_an",
                        column: x => x.ma_nguoi_an,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
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
                name: "CHI_TIET_THANH_TOAN",
                columns: table => new
                {
                    ma_chi_tiet_thanh_toan = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_thanh_toan = table.Column<long>(type: "bigint", nullable: false),
                    muc_dich = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    so_tien = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false)
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

            migrationBuilder.CreateTable(
                name: "CHI_TIET_DIEU_CHINH_KHO",
                columns: table => new
                {
                    ma_chi_tiet_dieu_chinh = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_phieu_dieu_chinh = table.Column<long>(type: "bigint", nullable: false),
                    ma_thiet_bi = table.Column<long>(type: "bigint", nullable: true),
                    ma_chi_tiet_phieu_nhap = table.Column<long>(type: "bigint", nullable: true),
                    gia_tri_truoc = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    gia_tri_sau = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CHI_TIET_DIEU_CHINH_KHO", x => x.ma_chi_tiet_dieu_chinh);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_DIEU_CHINH_KHO_CHI_TIET_PHIEU_NHAP_ma_chi_tiet_phieu_nhap",
                        column: x => x.ma_chi_tiet_phieu_nhap,
                        principalTable: "CHI_TIET_PHIEU_NHAP",
                        principalColumn: "ma_chi_tiet_phieu_nhap",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_DIEU_CHINH_KHO_PHIEU_DIEU_CHINH_KHO_ma_phieu_dieu_chinh",
                        column: x => x.ma_phieu_dieu_chinh,
                        principalTable: "PHIEU_DIEU_CHINH_KHO",
                        principalColumn: "ma_phieu_dieu_chinh",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_DIEU_CHINH_KHO_THIET_BI_ma_thiet_bi",
                        column: x => x.ma_thiet_bi,
                        principalTable: "THIET_BI",
                        principalColumn: "ma_thiet_bi",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LICH_SU_TINH_TRANG_THIET_BI",
                columns: table => new
                {
                    ma_lich_su_thiet_bi = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_thiet_bi = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_thuc_hien = table.Column<long>(type: "bigint", nullable: true),
                    trang_thai_truoc = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    trang_thai_sau = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    tinh_trang_truoc = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    tinh_trang_sau = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    thoi_diem = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ly_do = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    tham_chieu_chung_tu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LICH_SU_TINH_TRANG_THIET_BI", x => x.ma_lich_su_thiet_bi);
                    table.ForeignKey(
                        name: "FK_LICH_SU_TINH_TRANG_THIET_BI_TAI_KHOAN_ma_nguoi_thuc_hien",
                        column: x => x.ma_nguoi_thuc_hien,
                        principalTable: "TAI_KHOAN",
                        principalColumn: "ma_tai_khoan",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LICH_SU_TINH_TRANG_THIET_BI_THIET_BI_ma_thiet_bi",
                        column: x => x.ma_thiet_bi,
                        principalTable: "THIET_BI",
                        principalColumn: "ma_thiet_bi",
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
                    ma_nguoi_phan_cong = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_huy_phan_cong = table.Column<long>(type: "bigint", nullable: true),
                    thoi_diem_phan_cong = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_huy_phan_cong = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ly_do_huy_phan_cong = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
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
                        name: "FK_PHAN_CONG_THIET_BI_NHAN_VIEN_ma_nguoi_huy_phan_cong",
                        column: x => x.ma_nguoi_huy_phan_cong,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien");
                    table.ForeignKey(
                        name: "FK_PHAN_CONG_THIET_BI_NHAN_VIEN_ma_nguoi_phan_cong",
                        column: x => x.ma_nguoi_phan_cong,
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

            migrationBuilder.CreateTable(
                name: "PHIEU_BAO_TRI",
                columns: table => new
                {
                    ma_phieu_bao_tri = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_thiet_bi = table.Column<long>(type: "bigint", nullable: false),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: true),
                    ma_nguoi_lap = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_xu_ly = table.Column<long>(type: "bigint", nullable: true),
                    ma_nguoi_xac_nhan_hoan_thanh = table.Column<long>(type: "bigint", nullable: true),
                    loai_xu_ly = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    mo_ta_loi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    muc_do = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ngay_bat_dau = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ngay_du_kien_hoan_thanh = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ngay_hoan_thanh_thuc_te = table.Column<DateTime>(type: "datetime2", nullable: true),
                    chi_phi = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    ket_qua = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    bang_chung = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PHIEU_BAO_TRI", x => x.ma_phieu_bao_tri);
                    table.ForeignKey(
                        name: "FK_PHIEU_BAO_TRI_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHIEU_BAO_TRI_NHAN_VIEN_ma_nguoi_lap",
                        column: x => x.ma_nguoi_lap,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHIEU_BAO_TRI_NHAN_VIEN_ma_nguoi_xac_nhan_hoan_thanh",
                        column: x => x.ma_nguoi_xac_nhan_hoan_thanh,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHIEU_BAO_TRI_NHAN_VIEN_ma_nguoi_xu_ly",
                        column: x => x.ma_nguoi_xu_ly,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHIEU_BAO_TRI_THIET_BI_ma_thiet_bi",
                        column: x => x.ma_thiet_bi,
                        principalTable: "THIET_BI",
                        principalColumn: "ma_thiet_bi",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GIAO_DICH_DOI_SOAT",
                columns: table => new
                {
                    ma_giao_dich_doi_soat = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_doi_soat = table.Column<long>(type: "bigint", nullable: false),
                    ma_chi_tiet_thanh_toan = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GIAO_DICH_DOI_SOAT", x => x.ma_giao_dich_doi_soat);
                    table.ForeignKey(
                        name: "FK_GIAO_DICH_DOI_SOAT_CHI_TIET_THANH_TOAN_ma_chi_tiet_thanh_toan",
                        column: x => x.ma_chi_tiet_thanh_toan,
                        principalTable: "CHI_TIET_THANH_TOAN",
                        principalColumn: "ma_chi_tiet_thanh_toan",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GIAO_DICH_DOI_SOAT_DOI_SOAT_TIEN_COC_ma_doi_soat",
                        column: x => x.ma_doi_soat,
                        principalTable: "DOI_SOAT_TIEN_COC",
                        principalColumn: "ma_doi_soat",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HOAN_TIEN",
                columns: table => new
                {
                    ma_hoan_tien = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_chi_tiet_thanh_toan_goc = table.Column<long>(type: "bigint", nullable: false),
                    ma_doi_soat = table.Column<long>(type: "bigint", nullable: true),
                    ma_nguoi_xu_ly = table.Column<long>(type: "bigint", nullable: true),
                    ma_yeu_cau = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ma_giao_dich_hoan_cong = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    loai_hoan = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    so_tien = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ly_do = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    thoi_diem_yeu_cau = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_thanh_cong = table.Column<DateTime>(type: "datetime2", nullable: true),
                    trang_thai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HOAN_TIEN", x => x.ma_hoan_tien);
                    table.ForeignKey(
                        name: "FK_HOAN_TIEN_CHI_TIET_THANH_TOAN_ma_chi_tiet_thanh_toan_goc",
                        column: x => x.ma_chi_tiet_thanh_toan_goc,
                        principalTable: "CHI_TIET_THANH_TOAN",
                        principalColumn: "ma_chi_tiet_thanh_toan",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HOAN_TIEN_DOI_SOAT_TIEN_COC_ma_doi_soat",
                        column: x => x.ma_doi_soat,
                        principalTable: "DOI_SOAT_TIEN_COC",
                        principalColumn: "ma_doi_soat",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HOAN_TIEN_NHAN_VIEN_ma_nguoi_xu_ly",
                        column: x => x.ma_nguoi_xu_ly,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CHI_TIET_BAN_GIAO",
                columns: table => new
                {
                    ma_chi_tiet_ban_giao = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_phieu_ban_giao = table.Column<long>(type: "bigint", nullable: false),
                    ma_phan_cong = table.Column<long>(type: "bigint", nullable: false),
                    tinh_trang_truoc_thue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phu_kien_thuc_giao = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    danh_sach_anh = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CHI_TIET_BAN_GIAO", x => x.ma_chi_tiet_ban_giao);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_BAN_GIAO_PHAN_CONG_THIET_BI_ma_phan_cong",
                        column: x => x.ma_phan_cong,
                        principalTable: "PHAN_CONG_THIET_BI",
                        principalColumn: "ma_phan_cong",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_BAN_GIAO_PHIEU_BAN_GIAO_ma_phieu_ban_giao",
                        column: x => x.ma_phieu_ban_giao,
                        principalTable: "PHIEU_BAN_GIAO",
                        principalColumn: "ma_phieu_ban_giao",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CHI_TIET_NHAN_TRA",
                columns: table => new
                {
                    ma_chi_tiet_nhan_tra = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_phieu_nhan_tra = table.Column<long>(type: "bigint", nullable: false),
                    ma_chi_tiet_ban_giao = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_duyet_mat = table.Column<long>(type: "bigint", nullable: true),
                    thoi_diem_tra_thuc_te = table.Column<DateTime>(type: "datetime2", nullable: true),
                    thoi_diem_duyet_mat = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ket_luan = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    tinh_trang_sau_thue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phu_kien_thuc_nhan = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phu_kien_con_thieu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    danh_sach_anh = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    bien_ban_mat = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    trang_thai_xu_ly = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ghi_chu = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CHI_TIET_NHAN_TRA", x => x.ma_chi_tiet_nhan_tra);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_NHAN_TRA_CHI_TIET_BAN_GIAO_ma_chi_tiet_ban_giao",
                        column: x => x.ma_chi_tiet_ban_giao,
                        principalTable: "CHI_TIET_BAN_GIAO",
                        principalColumn: "ma_chi_tiet_ban_giao",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_NHAN_TRA_NHAN_VIEN_ma_nguoi_duyet_mat",
                        column: x => x.ma_nguoi_duyet_mat,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CHI_TIET_NHAN_TRA_PHIEU_NHAN_TRA_ma_phieu_nhan_tra",
                        column: x => x.ma_phieu_nhan_tra,
                        principalTable: "PHIEU_NHAN_TRA",
                        principalColumn: "ma_phieu_nhan_tra",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PHU_PHI",
                columns: table => new
                {
                    ma_phu_phi = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ma_don_thue = table.Column<long>(type: "bigint", nullable: false),
                    ma_chi_tiet_ban_giao = table.Column<long>(type: "bigint", nullable: true),
                    ma_nguoi_lap = table.Column<long>(type: "bigint", nullable: false),
                    ma_nguoi_duyet = table.Column<long>(type: "bigint", nullable: true),
                    ma_phu_phi_goc = table.Column<long>(type: "bigint", nullable: true),
                    ma_doi_soat = table.Column<long>(type: "bigint", nullable: true),
                    loai_phi = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    so_tien = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ly_do = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    can_cu_tinh_phi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    bang_chung = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    thoi_diem_lap = table.Column<DateTime>(type: "datetime2", nullable: false),
                    thoi_diem_duyet = table.Column<DateTime>(type: "datetime2", nullable: true),
                    trang_thai_duyet = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    trang_thai_tranh_chap = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ket_qua_giai_quyet = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PHU_PHI", x => x.ma_phu_phi);
                    table.ForeignKey(
                        name: "FK_PHU_PHI_CHI_TIET_BAN_GIAO_ma_chi_tiet_ban_giao",
                        column: x => x.ma_chi_tiet_ban_giao,
                        principalTable: "CHI_TIET_BAN_GIAO",
                        principalColumn: "ma_chi_tiet_ban_giao",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHU_PHI_DOI_SOAT_TIEN_COC_ma_doi_soat",
                        column: x => x.ma_doi_soat,
                        principalTable: "DOI_SOAT_TIEN_COC",
                        principalColumn: "ma_doi_soat",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHU_PHI_DON_THUE_ma_don_thue",
                        column: x => x.ma_don_thue,
                        principalTable: "DON_THUE",
                        principalColumn: "ma_don_thue",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHU_PHI_NHAN_VIEN_ma_nguoi_duyet",
                        column: x => x.ma_nguoi_duyet,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHU_PHI_NHAN_VIEN_ma_nguoi_lap",
                        column: x => x.ma_nguoi_lap,
                        principalTable: "NHAN_VIEN",
                        principalColumn: "ma_nhan_vien",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PHU_PHI_PHU_PHI_ma_phu_phi_goc",
                        column: x => x.ma_phu_phi_goc,
                        principalTable: "PHU_PHI",
                        principalColumn: "ma_phu_phi",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_BAN_GIAO_ma_phan_cong",
                table: "CHI_TIET_BAN_GIAO",
                column: "ma_phan_cong",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_BAN_GIAO_ma_phieu_ban_giao",
                table: "CHI_TIET_BAN_GIAO",
                column: "ma_phieu_ban_giao");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_DIEU_CHINH_KHO_ma_chi_tiet_phieu_nhap",
                table: "CHI_TIET_DIEU_CHINH_KHO",
                column: "ma_chi_tiet_phieu_nhap");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_DIEU_CHINH_KHO_ma_phieu_dieu_chinh",
                table: "CHI_TIET_DIEU_CHINH_KHO",
                column: "ma_phieu_dieu_chinh");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_DIEU_CHINH_KHO_ma_thiet_bi",
                table: "CHI_TIET_DIEU_CHINH_KHO",
                column: "ma_thiet_bi");

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
                name: "IX_CHI_TIET_NHAN_TRA_ma_chi_tiet_ban_giao",
                table: "CHI_TIET_NHAN_TRA",
                column: "ma_chi_tiet_ban_giao",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_NHAN_TRA_ma_nguoi_duyet_mat",
                table: "CHI_TIET_NHAN_TRA",
                column: "ma_nguoi_duyet_mat");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_NHAN_TRA_ma_phieu_nhan_tra",
                table: "CHI_TIET_NHAN_TRA",
                column: "ma_phieu_nhan_tra");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_PHIEU_NHAP_ma_phieu_nhap",
                table: "CHI_TIET_PHIEU_NHAP",
                column: "ma_phieu_nhap");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_PHIEU_NHAP_ma_san_pham",
                table: "CHI_TIET_PHIEU_NHAP",
                column: "ma_san_pham");

            migrationBuilder.CreateIndex(
                name: "IX_CHI_TIET_THANH_TOAN_ma_thanh_toan",
                table: "CHI_TIET_THANH_TOAN",
                column: "ma_thanh_toan");

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
                name: "IX_DANH_GIA_ma_chi_tiet_don",
                table: "DANH_GIA",
                column: "ma_chi_tiet_don",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DANH_GIA_ma_nguoi_an",
                table: "DANH_GIA",
                column: "ma_nguoi_an");

            migrationBuilder.CreateIndex(
                name: "IX_DANH_MUC_SAN_PHAM_ma_danh_muc_cha",
                table: "DANH_MUC_SAN_PHAM",
                column: "ma_danh_muc_cha");

            migrationBuilder.CreateIndex(
                name: "IX_DOI_SOAT_TIEN_COC_ma_doi_soat_goc",
                table: "DOI_SOAT_TIEN_COC",
                column: "ma_doi_soat_goc");

            migrationBuilder.CreateIndex(
                name: "IX_DOI_SOAT_TIEN_COC_ma_don_thue",
                table: "DOI_SOAT_TIEN_COC",
                column: "ma_don_thue");

            migrationBuilder.CreateIndex(
                name: "IX_DOI_SOAT_TIEN_COC_ma_nguoi_chot",
                table: "DOI_SOAT_TIEN_COC",
                column: "ma_nguoi_chot");

            migrationBuilder.CreateIndex(
                name: "IX_DOI_SOAT_TIEN_COC_ma_nguoi_lap",
                table: "DOI_SOAT_TIEN_COC",
                column: "ma_nguoi_lap");

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
                name: "IX_GIAO_DICH_DOI_SOAT_ma_chi_tiet_thanh_toan",
                table: "GIAO_DICH_DOI_SOAT",
                column: "ma_chi_tiet_thanh_toan",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GIAO_DICH_DOI_SOAT_ma_doi_soat",
                table: "GIAO_DICH_DOI_SOAT",
                column: "ma_doi_soat");

            migrationBuilder.CreateIndex(
                name: "IX_GIO_THUE_ma_khach_hang",
                table: "GIO_THUE",
                column: "ma_khach_hang",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GIO_THUE_ma_khuyen_mai",
                table: "GIO_THUE",
                column: "ma_khuyen_mai");

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
                name: "IX_HOAN_TIEN_ma_chi_tiet_thanh_toan_goc",
                table: "HOAN_TIEN",
                column: "ma_chi_tiet_thanh_toan_goc");

            migrationBuilder.CreateIndex(
                name: "IX_HOAN_TIEN_ma_doi_soat",
                table: "HOAN_TIEN",
                column: "ma_doi_soat");

            migrationBuilder.CreateIndex(
                name: "IX_HOAN_TIEN_ma_nguoi_xu_ly",
                table: "HOAN_TIEN",
                column: "ma_nguoi_xu_ly");

            migrationBuilder.CreateIndex(
                name: "IX_HOAN_TIEN_ma_yeu_cau",
                table: "HOAN_TIEN",
                column: "ma_yeu_cau",
                unique: true,
                filter: "[ma_yeu_cau] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_KHACH_HANG_ma_tai_khoan",
                table: "KHACH_HANG",
                column: "ma_tai_khoan",
                unique: true);

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
                name: "IX_LICH_SU_TINH_TRANG_THIET_BI_ma_nguoi_thuc_hien",
                table: "LICH_SU_TINH_TRANG_THIET_BI",
                column: "ma_nguoi_thuc_hien");

            migrationBuilder.CreateIndex(
                name: "IX_LICH_SU_TINH_TRANG_THIET_BI_ma_thiet_bi",
                table: "LICH_SU_TINH_TRANG_THIET_BI",
                column: "ma_thiet_bi");

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
                name: "IX_NHAN_VIEN_ma_tai_khoan",
                table: "NHAN_VIEN",
                column: "ma_tai_khoan",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NHAT_KY_THAO_TAC_ma_tai_khoan",
                table: "NHAT_KY_THAO_TAC",
                column: "ma_tai_khoan");

            migrationBuilder.CreateIndex(
                name: "IX_PHAN_CONG_THIET_BI_ma_chi_tiet_don",
                table: "PHAN_CONG_THIET_BI",
                column: "ma_chi_tiet_don");

            migrationBuilder.CreateIndex(
                name: "IX_PHAN_CONG_THIET_BI_ma_nguoi_huy_phan_cong",
                table: "PHAN_CONG_THIET_BI",
                column: "ma_nguoi_huy_phan_cong");

            migrationBuilder.CreateIndex(
                name: "IX_PHAN_CONG_THIET_BI_ma_nguoi_phan_cong",
                table: "PHAN_CONG_THIET_BI",
                column: "ma_nguoi_phan_cong");

            migrationBuilder.CreateIndex(
                name: "IX_PHAN_CONG_THIET_BI_ma_thiet_bi",
                table: "PHAN_CONG_THIET_BI",
                column: "ma_thiet_bi");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_BAN_GIAO_ma_don_thue",
                table: "PHIEU_BAN_GIAO",
                column: "ma_don_thue",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_BAN_GIAO_ma_nhan_vien",
                table: "PHIEU_BAN_GIAO",
                column: "ma_nhan_vien");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_BAO_TRI_ma_don_thue",
                table: "PHIEU_BAO_TRI",
                column: "ma_don_thue");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_BAO_TRI_ma_nguoi_lap",
                table: "PHIEU_BAO_TRI",
                column: "ma_nguoi_lap");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_BAO_TRI_ma_nguoi_xac_nhan_hoan_thanh",
                table: "PHIEU_BAO_TRI",
                column: "ma_nguoi_xac_nhan_hoan_thanh");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_BAO_TRI_ma_nguoi_xu_ly",
                table: "PHIEU_BAO_TRI",
                column: "ma_nguoi_xu_ly");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_BAO_TRI_ma_thiet_bi",
                table: "PHIEU_BAO_TRI",
                column: "ma_thiet_bi");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_DIEU_CHINH_KHO_ma_nguoi_duyet",
                table: "PHIEU_DIEU_CHINH_KHO",
                column: "ma_nguoi_duyet");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_DIEU_CHINH_KHO_ma_nguoi_lap",
                table: "PHIEU_DIEU_CHINH_KHO",
                column: "ma_nguoi_lap");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_DIEU_CHINH_KHO_ma_phieu_nhap_lien_quan",
                table: "PHIEU_DIEU_CHINH_KHO",
                column: "ma_phieu_nhap_lien_quan");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_NHAN_TRA_ma_don_thue_lan_tra",
                table: "PHIEU_NHAN_TRA",
                columns: new[] { "ma_don_thue", "lan_tra" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_NHAN_TRA_ma_nhan_vien",
                table: "PHIEU_NHAN_TRA",
                column: "ma_nhan_vien");

            migrationBuilder.CreateIndex(
                name: "IX_PHIEU_NHAN_TRA_ma_phieu_hien_thi",
                table: "PHIEU_NHAN_TRA",
                column: "ma_phieu_hien_thi",
                unique: true);

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
                name: "IX_PHU_PHI_ma_chi_tiet_ban_giao",
                table: "PHU_PHI",
                column: "ma_chi_tiet_ban_giao");

            migrationBuilder.CreateIndex(
                name: "IX_PHU_PHI_ma_doi_soat",
                table: "PHU_PHI",
                column: "ma_doi_soat");

            migrationBuilder.CreateIndex(
                name: "IX_PHU_PHI_ma_don_thue",
                table: "PHU_PHI",
                column: "ma_don_thue");

            migrationBuilder.CreateIndex(
                name: "IX_PHU_PHI_ma_nguoi_duyet",
                table: "PHU_PHI",
                column: "ma_nguoi_duyet");

            migrationBuilder.CreateIndex(
                name: "IX_PHU_PHI_ma_nguoi_lap",
                table: "PHU_PHI",
                column: "ma_nguoi_lap");

            migrationBuilder.CreateIndex(
                name: "IX_PHU_PHI_ma_phu_phi_goc",
                table: "PHU_PHI",
                column: "ma_phu_phi_goc");

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

            migrationBuilder.CreateIndex(
                name: "IX_THANH_TOAN_ma_don_thue",
                table: "THANH_TOAN",
                column: "ma_don_thue");

            migrationBuilder.CreateIndex(
                name: "IX_THANH_TOAN_ma_nguoi_ghi_nhan",
                table: "THANH_TOAN",
                column: "ma_nguoi_ghi_nhan");

            migrationBuilder.CreateIndex(
                name: "IX_THANH_TOAN_ma_yeu_cau",
                table: "THANH_TOAN",
                column: "ma_yeu_cau",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_THIET_BI_ma_chi_tiet_phieu_nhap",
                table: "THIET_BI",
                column: "ma_chi_tiet_phieu_nhap");

            migrationBuilder.CreateIndex(
                name: "IX_THIET_BI_ma_san_pham_hien_tai",
                table: "THIET_BI",
                column: "ma_san_pham_hien_tai");

            migrationBuilder.CreateIndex(
                name: "IX_THIET_BI_ma_thiet_bi_hien_thi",
                table: "THIET_BI",
                column: "ma_thiet_bi_hien_thi",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_THONG_BAO_ma_don_thue",
                table: "THONG_BAO",
                column: "ma_don_thue");

            migrationBuilder.CreateIndex(
                name: "IX_THONG_BAO_ma_tai_khoan",
                table: "THONG_BAO",
                column: "ma_tai_khoan");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CHI_TIET_DIEU_CHINH_KHO");

            migrationBuilder.DropTable(
                name: "CHI_TIET_GIO_THUE");

            migrationBuilder.DropTable(
                name: "CHI_TIET_NHAN_TRA");

            migrationBuilder.DropTable(
                name: "DANH_GIA");

            migrationBuilder.DropTable(
                name: "GIAO_DICH_DOI_SOAT");

            migrationBuilder.DropTable(
                name: "GIU_CHO");

            migrationBuilder.DropTable(
                name: "HINH_ANH_SAN_PHAM");

            migrationBuilder.DropTable(
                name: "HOAN_TIEN");

            migrationBuilder.DropTable(
                name: "KHUYEN_MAI_DANH_MUC");

            migrationBuilder.DropTable(
                name: "KHUYEN_MAI_SAN_PHAM");

            migrationBuilder.DropTable(
                name: "LICH_SU_TINH_TRANG_THIET_BI");

            migrationBuilder.DropTable(
                name: "LICH_SU_TRANG_THAI_DON");

            migrationBuilder.DropTable(
                name: "LUOT_SU_DUNG_KHUYEN_MAI");

            migrationBuilder.DropTable(
                name: "NHAT_KY_THAO_TAC");

            migrationBuilder.DropTable(
                name: "PHIEU_BAO_TRI");

            migrationBuilder.DropTable(
                name: "PHU_PHI");

            migrationBuilder.DropTable(
                name: "THONG_BAO");

            migrationBuilder.DropTable(
                name: "PHIEU_DIEU_CHINH_KHO");

            migrationBuilder.DropTable(
                name: "GIO_THUE");

            migrationBuilder.DropTable(
                name: "PHIEU_NHAN_TRA");

            migrationBuilder.DropTable(
                name: "CHI_TIET_THANH_TOAN");

            migrationBuilder.DropTable(
                name: "CHI_TIET_BAN_GIAO");

            migrationBuilder.DropTable(
                name: "DOI_SOAT_TIEN_COC");

            migrationBuilder.DropTable(
                name: "KHUYEN_MAI");

            migrationBuilder.DropTable(
                name: "THANH_TOAN");

            migrationBuilder.DropTable(
                name: "PHAN_CONG_THIET_BI");

            migrationBuilder.DropTable(
                name: "PHIEU_BAN_GIAO");

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
                name: "KHACH_HANG");

            migrationBuilder.DropTable(
                name: "PHIEU_NHAP_HANG");

            migrationBuilder.DropTable(
                name: "SAN_PHAM");

            migrationBuilder.DropTable(
                name: "NHAN_VIEN");

            migrationBuilder.DropTable(
                name: "NHA_CUNG_CAP");

            migrationBuilder.DropTable(
                name: "DANH_MUC_SAN_PHAM");

            migrationBuilder.DropTable(
                name: "TAI_KHOAN");
        }
    }
}
