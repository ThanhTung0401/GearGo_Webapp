-- =========================================================================================
-- HỆ THỐNG GEARGO - SCRIPT SEED DỮ LIỆU MẪU TOÀN DIỆN CHO 39 ENTITIES & 10 PHÂN HỆ
-- Đáp ứng 71 Use Cases / Sequence Diagrams (UC1.1 -> UC10.4)
-- Tương thích: Microsoft SQL Server 2019 / 2022 / Azure SQL Database
-- Mật khẩu mặc định cho tất cả tài khoản mẫu: GearGo@2026
-- =========================================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT N'>> Bắt đầu nạp dữ liệu Seed mẫu toàn diện cho GearGo...';

-- 1. Tạm thời vô hiệu hóa tất cả Foreign Keys để việc nạp dữ liệu không bị lỗi phụ thuộc vòng
EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all";

BEGIN TRANSACTION;
BEGIN TRY

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 1. TAI_KHOAN (Tài khoản người dùng)
    -- Mật khẩu BCrypt hash cho "GearGo@2026": $2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [TAI_KHOAN] ON;
    
    MERGE INTO [TAI_KHOAN] AS target
    USING (VALUES
        (1, N'admin@geargo.vn', N'0901000001', N'$2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', N'QuanTriVien', N'HoatDong', NULL, GETUTCDATE(), GETUTCDATE()),
        (2, N'staff@geargo.vn', N'0901000002', N'$2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', N'NhanVien', N'HoatDong', NULL, GETUTCDATE(), GETUTCDATE()),
        (3, N'tuan.staff@geargo.vn', N'0901000005', N'$2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', N'NhanVien', N'HoatDong', NULL, GETUTCDATE(), GETUTCDATE()),
        (4, N'customer@geargo.vn', N'0901000003', N'$2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', N'KhachHang', N'HoatDong', NULL, GETUTCDATE(), GETUTCDATE()),
        (5, N'quang.kh@geargo.vn', N'0918765432', N'$2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', N'KhachHang', N'HoatDong', NULL, GETUTCDATE(), GETUTCDATE()),
        (6, N'locked.kh@geargo.vn', N'0909999888', N'$2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', N'KhachHang', N'BiKhoa', N'Vi phạm điều khoản nhiều lần làm hỏng thiết bị không bồi thường', GETUTCDATE(), GETUTCDATE())
    ) AS source (ma_tai_khoan, email, so_dien_thoai, mat_khau_bam, vai_tro, trang_thai, ly_do_khoa, ngay_tao, ngay_cap_nhat)
    ON target.ma_tai_khoan = source.ma_tai_khoan
    WHEN MATCHED THEN
        UPDATE SET email = source.email, so_dien_thoai = source.so_dien_thoai, mat_khau_bam = source.mat_khau_bam, vai_tro = source.vai_tro, trang_thai = source.trang_thai, ly_do_khoa = source.ly_do_khoa
    WHEN NOT MATCHED THEN
        INSERT (ma_tai_khoan, email, so_dien_thoai, mat_khau_bam, vai_tro, trang_thai, ly_do_khoa, ngay_tao, ngay_cap_nhat)
        VALUES (source.ma_tai_khoan, source.email, source.so_dien_thoai, source.mat_khau_bam, source.vai_tro, source.trang_thai, source.ly_do_khoa, source.ngay_tao, source.ngay_cap_nhat);

    SET IDENTITY_INSERT [TAI_KHOAN] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 2. KHACH_HANG & 3. NHAN_VIEN
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [KHACH_HANG] ON;
    MERGE INTO [KHACH_HANG] AS target
    USING (VALUES
        (1, 4, N'Nguyễn Văn An', N'123 Cầu Giấy, Phường Dịch Vọng, Hà Nội', CAST('1992-05-15' AS date), N'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
        (2, 5, N'Trần Minh Quang', N'456 Lê Lợi, Quận 1, TP. Hồ Chí Minh', CAST('1995-10-20' AS date), N'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
        (3, 6, N'Hoàng Văn Khóa', N'789 Nguyễn Trãi, Thanh Xuân, Hà Nội', CAST('1988-12-01' AS date), NULL)
    ) AS source (ma_khach_hang, ma_tai_khoan, ho_ten, dia_chi, ngay_sinh, anh_dai_dien)
    ON target.ma_khach_hang = source.ma_khach_hang
    WHEN MATCHED THEN
        UPDATE SET ho_ten = source.ho_ten, dia_chi = source.dia_chi, ngay_sinh = source.ngay_sinh, anh_dai_dien = source.anh_dai_dien
    WHEN NOT MATCHED THEN
        INSERT (ma_khach_hang, ma_tai_khoan, ho_ten, dia_chi, ngay_sinh, anh_dai_dien)
        VALUES (source.ma_khach_hang, source.ma_tai_khoan, source.ho_ten, source.dia_chi, source.ngay_sinh, source.anh_dai_dien);
    SET IDENTITY_INSERT [KHACH_HANG] OFF;

    SET IDENTITY_INSERT [NHAN_VIEN] ON;
    MERGE INTO [NHAN_VIEN] AS target
    USING (VALUES
        (1, 1, N'Nguyễn Văn Quản Trị', N'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội', CAST('2023-01-01' AS date), NULL, N'DangLamViec'),
        (2, 2, N'Lê Thị Mai (NV Kho)', N'25 Lạc Long Quân, Tây Hồ, Hà Nội', CAST('2023-06-01' AS date), NULL, N'DangLamViec'),
        (3, 3, N'Trần Tuấn (NV Vận Hành)', N'88 Hoàng Hoa Thám, Ba Đình, Hà Nội', CAST('2023-08-15' AS date), NULL, N'DangLamViec')
    ) AS source (ma_nhan_vien, ma_tai_khoan, ho_ten, dia_chi, ngay_vao_lam, ngay_nghi_viec, trang_thai_lam_viec)
    ON target.ma_nhan_vien = source.ma_nhan_vien
    WHEN MATCHED THEN
        UPDATE SET ho_ten = source.ho_ten, dia_chi = source.dia_chi, trang_thai_lam_viec = source.trang_thai_lam_viec
    WHEN NOT MATCHED THEN
        INSERT (ma_nhan_vien, ma_tai_khoan, ho_ten, dia_chi, ngay_vao_lam, ngay_nghi_viec, trang_thai_lam_viec)
        VALUES (source.ma_nhan_vien, source.ma_tai_khoan, source.ho_ten, source.dia_chi, source.ngay_vao_lam, source.ngay_nghi_viec, source.trang_thai_lam_viec);
    SET IDENTITY_INSERT [NHAN_VIEN] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 4. DANH_MUC_SAN_PHAM (Danh mục sản phẩm)
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [DANH_MUC_SAN_PHAM] ON;
    MERGE INTO [DANH_MUC_SAN_PHAM] AS target
    USING (VALUES
        (1, NULL, N'Lều & Bạt dã ngoại', N'Lều cắm trại 2-6 người, tăng che mưa nắng, bạt trải dã ngoại cao cấp', 1, N'HoatDong'),
        (2, NULL, N'Bếp & Dụng cụ nấu nướng', N'Bếp ga dã ngoại gấp gọn, bộ nồi nhôm Anodized, bình giữ nhiệt', 2, N'HoatDong'),
        (3, NULL, N'Bàn ghế & Đèn cắm trại', N'Bàn cuộn nhôm, ghế xếp Kermit, đèn LED vintage dã ngoại', 3, N'HoatDong'),
        (4, NULL, N'Túi ngủ & Đệm hơi', N'Túi ngủ lông vũ mùa đông, đệm tự bơm hơi cách nhiệt', 4, N'HoatDong'),
        (5, NULL, N'Balo & Túi chống nước', N'Balo trợ lực trekking 45L-65L, túi khô bảo vệ thiết bị', 5, N'HoatDong')
    ) AS source (ma_danh_muc, ma_danh_muc_cha, ten_danh_muc, mo_ta, thu_tu_hien_thi, trang_thai)
    ON target.ma_danh_muc = source.ma_danh_muc
    WHEN MATCHED THEN
        UPDATE SET ten_danh_muc = source.ten_danh_muc, mo_ta = source.mo_ta, thu_tu_hien_thi = source.thu_tu_hien_thi, trang_thai = source.trang_thai
    WHEN NOT MATCHED THEN
        INSERT (ma_danh_muc, ma_danh_muc_cha, ten_danh_muc, mo_ta, thu_tu_hien_thi, trang_thai)
        VALUES (source.ma_danh_muc, source.ma_danh_muc_cha, source.ten_danh_muc, source.mo_ta, source.thu_tu_hien_thi, source.trang_thai);
    SET IDENTITY_INSERT [DANH_MUC_SAN_PHAM] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 5. SAN_PHAM (Sản phẩm)
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [SAN_PHAM] ON;
    MERGE INTO [SAN_PHAM] AS target
    USING (VALUES
        (1, 1, N'SP-LEU-001', N'Lều Cắm Trại 4 Người Naturehike P-Series', N'Naturehike', N'Lều chống mưa gió UPF50+, chống thấm 3000mm, khung hợp kim nhôm 7001 siêu nhẹ', 4, N'210 x 210 x 130 cm', N'Trọng lượng 2.8kg, vải 210T Polyester', 120000.00, 500000.00, 1600000.00, N'DangKinhDoanh'),
        (2, 2, N'SP-BEP-001', N'Bếp Ga Dã Ngoại Gấp Gọn Kovea Spider', N'Kovea', N'Bếp ga mini công suất cao, đầu đốt tỏa nhiệt đều, chân đế chống trượt gập gọn', 2, N'10 x 10 x 12 cm', N'Trọng lượng 168g, công suất 2800W', 50000.00, 200000.00, 750000.00, N'DangKinhDoanh'),
        (3, 3, N'SP-GHE-001', N'Ghế Xếp Dã Ngoại Kermit Naturehike', N'Naturehike', N'Ghế cắm trại khung vân gỗ cao cấp, vải Oxford 600D chịu lực 120kg', 1, N'62 x 52 x 43 cm', N'Chịu tải 120kg, gấp gọn kèm túi xách', 35000.00, 150000.00, 450000.00, N'DangKinhDoanh'),
        (4, 3, N'SP-DEN-001', N'Đèn Bão LED Vintage Dã Ngoại Barebones', N'Barebones', N'Đèn LED ánh sáng vàng ấm vintage, pin dùng liên tục 20 giờ, chống nước nhẹ IPX4', 1, N'15 x 15 x 24 cm', N'Độ sáng 200 Lumens, cổng sạc Type-C', 40000.00, 100000.00, 400000.00, N'DangKinhDoanh'),
        (5, 4, N'SP-TUI-001', N'Túi Ngủ Mùa Đông Naturehike Goose Down', N'Naturehike', N'Túi ngủ lông ngỗng siêu nhẹ, giữ nhiệt nhiệt độ -5°C đến 5°C, chống thấm ẩm ngoài', 1, N'210 x 80 cm', N'Trọng lượng 800g, nén nhỏ gọn', 60000.00, 200000.00, 800000.00, N'DangKinhDoanh')
    ) AS source (ma_san_pham, ma_danh_muc, ma_san_pham_hien_thi, ten_san_pham, thuong_hieu, mo_ta, suc_chua, kich_thuoc, thong_so, gia_thue_moi_ngay, muc_coc_moi_thiet_bi, gia_tri_boi_thuong, trang_thai_kinh_doanh)
    ON target.ma_san_pham = source.ma_san_pham
    WHEN MATCHED THEN
        UPDATE SET ten_san_pham = source.ten_san_pham, gia_thue_moi_ngay = source.gia_thue_moi_ngay, muc_coc_moi_thiet_bi = source.muc_coc_moi_thiet_bi, gia_tri_boi_thuong = source.gia_tri_boi_thuong, trang_thai_kinh_doanh = source.trang_thai_kinh_doanh
    WHEN NOT MATCHED THEN
        INSERT (ma_san_pham, ma_danh_muc, ma_san_pham_hien_thi, ten_san_pham, thuong_hieu, mo_ta, suc_chua, kich_thuoc, thong_so, gia_thue_moi_ngay, muc_coc_moi_thiet_bi, gia_tri_boi_thuong, trang_thai_kinh_doanh)
        VALUES (source.ma_san_pham, source.ma_danh_muc, source.ma_san_pham_hien_thi, source.ten_san_pham, source.thuong_hieu, source.mo_ta, source.suc_chua, source.kich_thuoc, source.thong_so, source.gia_thue_moi_ngay, source.muc_coc_moi_thiet_bi, source.gia_tri_boi_thuong, source.trang_thai_kinh_doanh);
    SET IDENTITY_INSERT [SAN_PHAM] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 6. HINH_ANH_SAN_PHAM
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [HINH_ANH_SAN_PHAM] ON;
    MERGE INTO [HINH_ANH_SAN_PHAM] AS target
    USING (VALUES
        (1, 1, N'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600', 1, 1),
        (2, 1, N'https://images.unsplash.com/photo-1576176539998-0237d1ac6a85?w=600', 0, 2),
        (3, 2, N'https://images.unsplash.com/photo-1525811902-f2342640856e?w=600', 1, 1),
        (4, 3, N'https://images.unsplash.com/photo-1533873942090-d4c91493ee39?w=600', 1, 1),
        (5, 4, N'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=600', 1, 1),
        (6, 5, N'https://images.unsplash.com/photo-1517824806704-9040b037703b?w=600', 1, 1)
    ) AS source (ma_hinh_anh, ma_san_pham, duong_dan, la_anh_chinh, thu_tu)
    ON target.ma_hinh_anh = source.ma_hinh_anh
    WHEN MATCHED THEN
        UPDATE SET duong_dan = source.duong_dan, la_anh_chinh = source.la_anh_chinh, thu_tu = source.thu_tu
    WHEN NOT MATCHED THEN
        INSERT (ma_hinh_anh, ma_san_pham, duong_dan, la_anh_chinh, thu_tu)
        VALUES (source.ma_hinh_anh, source.ma_san_pham, source.duong_dan, source.la_anh_chinh, source.thu_tu);
    SET IDENTITY_INSERT [HINH_ANH_SAN_PHAM] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 7. NHA_CUNG_CAP (Nhà cung cấp)
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [NHA_CUNG_CAP] ON;
    MERGE INTO [NHA_CUNG_CAP] AS target
    USING (VALUES
        (1, N'NCC-NAT-01', N'Công ty TNHH Thiết bị Dã ngoại Naturehike Việt Nam', N'Trần Minh Quân', N'02438889999', N'contact@naturehike.vn', N'Tòa nhà Keangnam, Nam Từ Liêm, Hà Nội', N'0108889999', N'Đối tác chính phân phối lều và túi ngủ', N'DangHopTac', GETUTCDATE()),
        (2, N'NCC-OUT-02', N'Công ty CP Outdoor Pro Việt Nam', N'Lê Thu Hà', N'02839998888', N'sales@outdoorpro.vn', N'Quận 1, TP. Hồ Chí Minh', N'0309998888', N'Phân phối bếp dã ngoại Kovea và đèn Barebones', N'DangHopTac', GETUTCDATE())
    ) AS source (ma_nha_cung_cap, ma_nha_cung_cap_hien_thi, ten_nha_cung_cap, nguoi_lien_he, so_dien_thoai, email, dia_chi, ma_so_thue, ghi_chu, trang_thai_hop_tac, ngay_tao)
    ON target.ma_nha_cung_cap = source.ma_nha_cung_cap
    WHEN MATCHED THEN
        UPDATE SET ten_nha_cung_cap = source.ten_nha_cung_cap, nguoi_lien_he = source.nguoi_lien_he, so_dien_thoai = source.so_dien_thoai, email = source.email, trang_thai_hop_tac = source.trang_thai_hop_tac
    WHEN NOT MATCHED THEN
        INSERT (ma_nha_cung_cap, ma_nha_cung_cap_hien_thi, ten_nha_cung_cap, nguoi_lien_he, so_dien_thoai, email, dia_chi, ma_so_thue, ghi_chu, trang_thai_hop_tac, ngay_tao)
        VALUES (source.ma_nha_cung_cap, source.ma_nha_cung_cap_hien_thi, source.ten_nha_cung_cap, source.nguoi_lien_he, source.so_dien_thoai, source.email, source.dia_chi, source.ma_so_thue, source.ghi_chu, source.trang_thai_hop_tac, source.ngay_tao);
    SET IDENTITY_INSERT [NHA_CUNG_CAP] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 8. PHIEU_NHAP_HANG & 9. CHI_TIET_PHIEU_NHAP
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [PHIEU_NHAP_HANG] ON;
    MERGE INTO [PHIEU_NHAP_HANG] AS target
    USING (VALUES
        (1, 1, 1, 1, N'PN-2026-001', N'HD-NAT-202601', DATEADD(month, -2, GETUTCDATE()), DATEADD(month, -2, GETUTCDATE()), DATEADD(month, -2, GETUTCDATE()), 25000000.00, N'Nguyễn Văn Quản Trị', N'Nguyễn Văn Quản Trị', 2)
    ) AS source (ma_phieu_nhap, ma_nha_cung_cap, ma_nguoi_lap, ma_nguoi_xac_nhan, ma_phieu_hien_thi, so_chung_tu_nha_cung_cap, ngay_lap, ngay_nhap_thuc_te, ngay_xac_nhan, tong_tien, ten_nguoi_lap_luc_nhap, ten_nguoi_xac_nhan_luc_nhap, trang_thai)
    ON target.ma_phieu_nhap = source.ma_phieu_nhap
    WHEN MATCHED THEN
        UPDATE SET tong_tien = source.tong_tien, trang_thai = source.trang_thai
    WHEN NOT MATCHED THEN
        INSERT (ma_phieu_nhap, ma_nha_cung_cap, ma_nguoi_lap, ma_nguoi_xac_nhan, ma_phieu_hien_thi, so_chung_tu_nha_cung_cap, ngay_lap, ngay_nhap_thuc_te, ngay_xac_nhan, tong_tien, ten_nguoi_lap_luc_nhap, ten_nguoi_xac_nhan_luc_nhap, trang_thai)
        VALUES (source.ma_phieu_nhap, source.ma_nha_cung_cap, source.ma_nguoi_lap, source.ma_nguoi_xac_nhan, source.ma_phieu_hien_thi, source.so_chung_tu_nha_cung_cap, source.ngay_lap, source.ngay_nhap_thuc_te, source.ngay_xac_nhan, source.tong_tien, source.ten_nguoi_lap_luc_nhap, source.ten_nguoi_xac_nhan_luc_nhap, source.trang_thai);
    SET IDENTITY_INSERT [PHIEU_NHAP_HANG] OFF;

    SET IDENTITY_INSERT [CHI_TIET_PHIEU_NHAP] ON;
    MERGE INTO [CHI_TIET_PHIEU_NHAP] AS target
    USING (VALUES
        (1, 1, 1, N'Lều Cắm Trại 4 Người Naturehike P-Series', 10, 1200000.00, N'Mới 100%'),
        (2, 1, 2, N'Bếp Ga Dã Ngoại Gấp Gọn Kovea Spider', 10, 450000.00, N'Mới 100%'),
        (3, 1, 3, N'Ghế Xếp Dã Ngoại Kermit Naturehike', 10, 250000.00, N'Mới 100%'),
        (4, 1, 4, N'Đèn Bão LED Vintage Dã Ngoại Barebones', 10, 280000.00, N'Mới 100%'),
        (5, 1, 5, N'Túi Ngủ Mùa Đông Naturehike Goose Down', 10, 500000.00, N'Mới 100%')
    ) AS source (ma_chi_tiet_phieu_nhap, ma_phieu_nhap, ma_san_pham, ten_san_pham_luc_nhap, so_luong, don_gia_nhap, tinh_trang_khi_nhap)
    ON target.ma_chi_tiet_phieu_nhap = source.ma_chi_tiet_phieu_nhap
    WHEN MATCHED THEN
        UPDATE SET so_luong = source.so_luong, don_gia_nhap = source.don_gia_nhap
    WHEN NOT MATCHED THEN
        INSERT (ma_chi_tiet_phieu_nhap, ma_phieu_nhap, ma_san_pham, ten_san_pham_luc_nhap, so_luong, don_gia_nhap, tinh_trang_khi_nhap)
        VALUES (source.ma_chi_tiet_phieu_nhap, source.ma_phieu_nhap, source.ma_san_pham, source.ten_san_pham_luc_nhap, source.so_luong, source.don_gia_nhap, source.tinh_trang_khi_nhap);
    SET IDENTITY_INSERT [CHI_TIET_PHIEU_NHAP] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 10. THIET_BI (Từng thiết bị vật lý cá thể hóa trong kho)
    -- TrangThaiSuDung enum: SanSang=1, DangThue=2, DangBaoTri=3, ThatLac=4, NgungSuDung=5
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [THIET_BI] ON;
    MERGE INTO [THIET_BI] AS target
    USING (VALUES
        (1, 1, 1, N'TB-LEU-001', DATEADD(month, -2, GETUTCDATE()), 1200000.00, N'Mới', N'10 cọc ghim, 4 dây căng, bao đựng', 2, N'Đang cho thuê ORD-202610-001'),
        (2, 1, 1, N'TB-LEU-002', DATEADD(month, -2, GETUTCDATE()), 1200000.00, N'Tốt', N'10 cọc ghim, 4 dây căng, bao đựng', 1, N'Đã hoàn tất đơn DT-20241120-008 sẵn sàng'),
        (3, 1, 1, N'TB-LEU-003', DATEADD(month, -2, GETUTCDATE()), 1200000.00, N'Mới 100%', N'Đầy đủ phụ kiện tiêu chuẩn', 1, N'Thiết bị dự phòng sẵn sàng cho thuê'),
        (4, 2, 2, N'TB-BEP-001', DATEADD(month, -2, GETUTCDATE()), 450000.00, N'Tốt', N'Hộp nhựa đựng bếp, van điều áp', 2, N'Đang cho thuê ORD-202610-001'),
        (5, 2, 2, N'TB-BEP-002', DATEADD(month, -2, GETUTCDATE()), 450000.00, N'Gãy chân đế', N'Hộp nhựa đựng bếp', 3, N'Đang bảo trì tại xưởng'),
        (6, 3, 3, N'TB-GHE-001', DATEADD(month, -2, GETUTCDATE()), 250000.00, N'Tốt', N'Túi đựng ghế', 1, N'Sẵn sàng phục vụ'),
        (7, 4, 4, N'TB-DEN-001', DATEADD(month, -2, GETUTCDATE()), 280000.00, N'Tốt', N'Cáp sạc Type-C, móc treo', 2, N'Đang cho thuê đơn trả 1 phần DT-20241208-015'),
        (8, 4, 4, N'TB-DEN-002', DATEADD(month, -2, GETUTCDATE()), 280000.00, N'Mới', N'Cáp sạc Type-C, móc treo', 1, N'Sẵn sàng'),
        (9, 5, 5, N'TB-TUI-001', DATEADD(month, -2, GETUTCDATE()), 500000.00, N'Tốt', N'Bao nén chống nước', 1, N'Đã giặt sấy thơm tho sẵn sàng'),
        (10, 5, 5, N'TB-TUI-002', DATEADD(month, -2, GETUTCDATE()), 500000.00, N'Tốt', N'Bao nén chống nước', 1, N'Sẵn sàng')
    ) AS source (ma_thiet_bi, ma_chi_tiet_phieu_nhap, ma_san_pham_hien_tai, ma_thiet_bi_hien_thi, ngay_nhap, gia_nhap, tinh_trang, phu_kien_di_kem, trang_thai_su_dung, ghi_chu)
    ON target.ma_thiet_bi = source.ma_thiet_bi
    WHEN MATCHED THEN
        UPDATE SET tinh_trang = source.tinh_trang, trang_thai_su_dung = source.trang_thai_su_dung, ghi_chu = source.ghi_chu
    WHEN NOT MATCHED THEN
        INSERT (ma_thiet_bi, ma_chi_tiet_phieu_nhap, ma_san_pham_hien_tai, ma_thiet_bi_hien_thi, ngay_nhap, gia_nhap, tinh_trang, phu_kien_di_kem, trang_thai_su_dung, ghi_chu)
        VALUES (source.ma_thiet_bi, source.ma_chi_tiet_phieu_nhap, source.ma_san_pham_hien_tai, source.ma_thiet_bi_hien_thi, source.ngay_nhap, source.gia_nhap, source.tinh_trang, source.phu_kien_di_kem, source.trang_thai_su_dung, source.ghi_chu);
    SET IDENTITY_INSERT [THIET_BI] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 11. CHINH_SACH (Chính sách thuê, cọc & hủy)
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [CHINH_SACH] ON;
    MERGE INTO [CHINH_SACH] AS target
    USING (VALUES
        (1, 1, N'Chính sách thuê tiêu chuẩn GearGo 2026', 1, DATEADD(month, -3, GETUTCDATE()),
         N'{"heSoTre": 1.5, "hanMucStaff": 500000, "tyLeCoc": 100, "huyDon": {"tyLeGiuLaiTu24Den48Gio": 0.5, "tyLeGiuLaiDuoi24Gio": 1.0}, "khongDenNhan": {"soPhutChoSauGioNhan": 120, "tyLeGiuLaiTienThue": 1.0}}',
         DATEADD(month, -3, GETUTCDATE()))
    ) AS source (ma_chinh_sach, ma_nguoi_tao, ten_chinh_sach, phien_ban, thoi_diem_ap_dung, noi_dung_chinh_sach, ngay_tao)
    ON target.ma_chinh_sach = source.ma_chinh_sach
    WHEN MATCHED THEN
        UPDATE SET ten_chinh_sach = source.ten_chinh_sach, noi_dung_chinh_sach = source.noi_dung_chinh_sach
    WHEN NOT MATCHED THEN
        INSERT (ma_chinh_sach, ma_nguoi_tao, ten_chinh_sach, phien_ban, thoi_diem_ap_dung, noi_dung_chinh_sach, ngay_tao)
        VALUES (source.ma_chinh_sach, source.ma_nguoi_tao, source.ten_chinh_sach, source.phien_ban, source.thoi_diem_ap_dung, source.noi_dung_chinh_sach, source.ngay_tao);
    SET IDENTITY_INSERT [CHINH_SACH] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 14. KHUYEN_MAI (Mã giảm giá) & 15. KHUYEN_MAI_SAN_PHAM, 16. KHUYEN_MAI_DANH_MUC
    -- LoaiKhuyenMai enum: PhanTram=1, SoTienCoDinh=2
    -- PhamViApDung enum: ToanBo=1, TheoSanPham=2, TheoDanhMuc=3
    -- TrangThaiKhuyenMai enum: HienThi=1, TamAn=2, HetHan=3
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [KHUYEN_MAI] ON;
    MERGE INTO [KHUYEN_MAI] AS target
    USING (VALUES
        (1, N'GEARGOHE2026', N'Chào hè rực rỡ - Giảm 10%', 1, 10.00, 100000.00, 200000.00, 3, DATEADD(month, -1, GETUTCDATE()), DATEADD(month, 2, GETUTCDATE()), 500, 2, 1),
        (2, N'CAMPGO10', N'Ưu đãi cắm trại cuối tuần - Giảm 10%', 1, 10.00, 300000.00, 500000.00, 1, DATEADD(month, -2, GETUTCDATE()), DATEADD(year, 1, GETUTCDATE()), 100, 1, 1),
        (3, N'VIPCAMP20', N'Tri ân hội viên VIP - Giảm 20%', 1, 20.00, 500000.00, 1000000.00, 1, DATEADD(month, -1, GETUTCDATE()), DATEADD(year, 1, GETUTCDATE()), 50, 1, 1)
    ) AS source (ma_khuyen_mai, ma_giam_gia, ten_khuyen_mai, loai_giam, gia_tri_giam, muc_giam_toi_da, tien_thue_toi_thieu, pham_vi_ap_dung, bat_dau, ket_thuc, gioi_han_tong_luot, gioi_han_moi_khach, trang_thai)
    ON target.ma_khuyen_mai = source.ma_khuyen_mai
    WHEN MATCHED THEN
        UPDATE SET ten_khuyen_mai = source.ten_khuyen_mai, gia_tri_giam = source.gia_tri_giam
    WHEN NOT MATCHED THEN
        INSERT (ma_khuyen_mai, ma_giam_gia, ten_khuyen_mai, loai_giam, gia_tri_giam, muc_giam_toi_da, tien_thue_toi_thieu, pham_vi_ap_dung, bat_dau, ket_thuc, gioi_han_tong_luot, gioi_han_moi_khach, trang_thai)
        VALUES (source.ma_khuyen_mai, source.ma_giam_gia, source.ten_khuyen_mai, source.loai_giam, source.gia_tri_giam, source.muc_giam_toi_da, source.tien_thue_toi_thieu, source.pham_vi_ap_dung, source.bat_dau, source.ket_thuc, source.gioi_han_tong_luot, source.gioi_han_moi_khach, source.trang_thai);
    SET IDENTITY_INSERT [KHUYEN_MAI] OFF;

    IF NOT EXISTS (SELECT 1 FROM [KHUYEN_MAI_SAN_PHAM] WHERE ma_khuyen_mai = 1 AND ma_san_pham = 1)
        INSERT INTO [KHUYEN_MAI_SAN_PHAM] (ma_khuyen_mai, ma_san_pham) VALUES (1, 1);
    IF NOT EXISTS (SELECT 1 FROM [KHUYEN_MAI_DANH_MUC] WHERE ma_khuyen_mai = 1 AND ma_danh_muc = 1)
        INSERT INTO [KHUYEN_MAI_DANH_MUC] (ma_khuyen_mai, ma_danh_muc) VALUES (1, 1);

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 17. DON_THUE (Đơn thuê đại diện cho các trạng thái cốt lõi trong 71 Use Cases)
    -- Đơn 1 (ma_don_thue = 1): ORD-202610-001 (Đang thuê, có phụ phí vệ sinh bùn đất & hoàn cọc đối soát)
    -- Đơn 2 (ma_don_thue = 2): DT-20241120-008 (Hoàn tất, đã trả đủ đồ, đối soát cọc thành công và ĐÃ ĐÁNH GIÁ 5 sao)
    -- Đơn 3 (ma_don_thue = 3): DT-20241210-042 (Đã xác nhận, khách đã cọc & tiền thuê, đang chờ kho chuẩn bị)
    -- Đơn 4 (ma_don_thue = 4): DT-20241208-015 (Đang thuê có trả 1 phần, đã trả đèn đợt 1, lều vẫn đang giữ)
    -- Đơn 5 (ma_don_thue = 5): DT-20241201-099 (Quá hạn, đã quá giờ trả 48 giờ chưa trả hết đồ, phụ phí trễ 150%)
    -- Đơn 6 (ma_don_thue = 6): DT-20241205-003 (Khách hủy, hủy trước 48h, đã hoàn 100% tiền cọc)
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [DON_THUE] ON;
    MERGE INTO [DON_THUE] AS target
    USING (VALUES
        (1, 1, 1, NULL, N'ORD-202610-001', DATEADD(day, -3, GETUTCDATE()), DATEADD(day, -2, GETUTCDATE()), DATEADD(day, 1, GETUTCDATE()), NULL, N'Nguyễn Văn An', N'0901000003', N'customer@geargo.vn', 340000.00, 34000.00, 700000.00, N'GEARGOHE2026', N'DangThue', NULL, NULL, 0.00, NULL, N'Khách nhận đồ tại quầy'),
        (2, 1, 1, NULL, N'DT-20241120-008', DATEADD(day, -10, GETUTCDATE()), DATEADD(day, -8, GETUTCDATE()), DATEADD(day, -5, GETUTCDATE()), NULL, N'Nguyễn Văn An', N'0901000003', N'customer@geargo.vn', 750000.00, 0.00, 900000.00, NULL, N'HoanTat', NULL, NULL, 0.00, DATEADD(day, -5, GETUTCDATE()), N'Đơn cắm trại Ba Vì đã đối soát hoàn tất 100% cọc'),
        (3, 1, 1, NULL, N'DT-20241210-042', DATEADD(day, -1, GETUTCDATE()), DATEADD(day, 2, GETUTCDATE()), DATEADD(day, 5, GETUTCDATE()), NULL, N'Nguyễn Văn An', N'0901000003', N'customer@geargo.vn', 900000.00, 90000.00, 1000000.00, N'CAMPGO10', N'DaXacNhan', NULL, NULL, 0.00, NULL, N'Đã thanh toán cọc và tiền thuê, chờ chuẩn bị thiết bị'),
        (4, 2, 1, NULL, N'DT-20241208-015', DATEADD(day, -4, GETUTCDATE()), DATEADD(day, -3, GETUTCDATE()), DATEADD(day, 2, GETUTCDATE()), NULL, N'Trần Minh Quang', N'0918765432', N'quang.kh@geargo.vn', 760000.00, 0.00, 600000.00, NULL, N'DangThue', NULL, NULL, 0.00, NULL, N'Đang thuê có trả 1 phần đèn trước đợt 1'),
        (5, 2, 1, NULL, N'DT-20241201-099', DATEADD(day, -7, GETUTCDATE()), DATEADD(day, -5, GETUTCDATE()), DATEADD(day, -2, GETUTCDATE()), NULL, N'Trần Minh Quang', N'0918765432', N'quang.kh@geargo.vn', 240000.00, 0.00, 500000.00, NULL, N'DangThue', NULL, NULL, 0.00, NULL, N'Quá hạn trả 48 giờ chưa liên hệ'),
        (6, 1, 1, 4, N'DT-20241205-003', DATEADD(day, -6, GETUTCDATE()), DATEADD(day, -2, GETUTCDATE()), DATEADD(day, 1, GETUTCDATE()), NULL, N'Nguyễn Văn An', N'0901000003', N'customer@geargo.vn', 350000.00, 0.00, 300000.00, NULL, N'KhachHuy', DATEADD(day, -5, GETUTCDATE()), N'Khách bận việc gia đình đột xuất', 0.00, NULL, N'Khách hủy trước 48h được hoàn 100% tiền cọc')
    ) AS source (ma_don_thue, ma_khach_hang, ma_chinh_sach, ma_nguoi_huy, ma_don_hien_thi, ngay_dat, gio_nhan_du_kien, gio_tra_du_kien, han_thanh_toan, ten_nguoi_nhan, so_dien_thoai_nguoi_nhan, email_lien_he, tong_tien_thue_truoc_giam, tong_tien_giam, tong_tien_coc, khuyen_mai_luc_dat, trang_thai, thoi_diem_huy, ly_do_huy, tien_thue_giu_lai_khi_huy, thoi_diem_hoan_tat, ghi_chu)
    ON target.ma_don_thue = source.ma_don_thue
    WHEN MATCHED THEN
        UPDATE SET trang_thai = source.trang_thai, tong_tien_thue_truoc_giam = source.tong_tien_thue_truoc_giam, tong_tien_giam = source.tong_tien_giam, tong_tien_coc = source.tong_tien_coc
    WHEN NOT MATCHED THEN
        INSERT (ma_don_thue, ma_khach_hang, ma_chinh_sach, ma_nguoi_huy, ma_don_hien_thi, ngay_dat, gio_nhan_du_kien, gio_tra_du_kien, han_thanh_toan, ten_nguoi_nhan, so_dien_thoai_nguoi_nhan, email_lien_he, tong_tien_thue_truoc_giam, tong_tien_giam, tong_tien_coc, khuyen_mai_luc_dat, trang_thai, thoi_diem_huy, ly_do_huy, tien_thue_giu_lai_khi_huy, thoi_diem_hoan_tat, ghi_chu)
        VALUES (source.ma_don_thue, source.ma_khach_hang, source.ma_chinh_sach, source.ma_nguoi_huy, source.ma_don_hien_thi, source.ngay_dat, source.gio_nhan_du_kien, source.gio_tra_du_kien, source.han_thanh_toan, source.ten_nguoi_nhan, source.so_dien_thoai_nguoi_nhan, source.email_lien_he, source.tong_tien_thue_truoc_giam, source.tong_tien_giam, source.tong_tien_coc, source.khuyen_mai_luc_dat, source.trang_thai, source.thoi_diem_huy, source.ly_do_huy, source.tien_thue_giu_lai_khi_huy, source.thoi_diem_hoan_tat, source.ghi_chu);
    SET IDENTITY_INSERT [DON_THUE] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 18. CHI_TIET_DON_THUE
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [CHI_TIET_DON_THUE] ON;
    MERGE INTO [CHI_TIET_DON_THUE] AS target
    USING (VALUES
        (1, 1, 1, N'Lều Cắm Trại 4 Người Naturehike P-Series', 1, 2, 120000.00, 24000.00, 500000.00, 1600000.00, N'10 cọc ghim, 4 dây căng'),
        (2, 1, 2, N'Bếp Ga Dã Ngoại Gấp Gọn Kovea Spider', 1, 2, 50000.00, 100000.00, 200000.00, 750000.00, N'Hộp nhựa đựng bếp'),
        (3, 2, 1, N'Lều Cắm Trại 4 Người Naturehike P-Series', 1, 3, 150000.00, 0.00, 500000.00, 2500000.00, N'Đầy đủ phụ kiện cọc và dây'),
        (4, 2, 5, N'Túi Ngủ Mùa Đông Naturehike Goose Down', 2, 3, 50000.00, 0.00, 200000.00, 800000.00, N'Bao nén chống nước'),
        (5, 3, 1, N'Lều Cắm Trại 4 Người Naturehike P-Series', 2, 3, 150000.00, 90000.00, 500000.00, 2500000.00, N'Cọc ghim, dây căng, bao đựng'),
        (6, 4, 1, N'Lều Cắm Trại 4 Người Naturehike P-Series', 1, 4, 150000.00, 0.00, 500000.00, 2500000.00, N'Cọc ghim và dây căng'),
        (7, 4, 4, N'Đèn Bão LED Vintage Dã Ngoại Barebones', 1, 4, 40000.00, 0.00, 100000.00, 400000.00, N'Cáp sạc Type-C'),
        (8, 5, 1, N'Lều Cắm Trại 4 Người Naturehike P-Series', 1, 2, 120000.00, 0.00, 500000.00, 1600000.00, N'Đầy đủ cọc ghim'),
        (9, 6, 3, N'Ghế Xếp Dã Ngoại Kermit Naturehike', 2, 2, 35000.00, 0.00, 150000.00, 450000.00, N'Túi đựng ghế')
    ) AS source (ma_chi_tiet_don, ma_don_thue, ma_san_pham, ten_san_pham_luc_dat, so_luong, so_ngay_tinh_tien, don_gia_thue_moi_ngay, tien_giam, muc_coc_moi_thiet_bi, gia_tri_boi_thuong_moi_thiet_bi, phu_kien_va_muc_boi_thuong_luc_dat)
    ON target.ma_chi_tiet_don = source.ma_chi_tiet_don
    WHEN MATCHED THEN
        UPDATE SET don_gia_thue_moi_ngay = source.don_gia_thue_moi_ngay, tien_giam = source.tien_giam
    WHEN NOT MATCHED THEN
        INSERT (ma_chi_tiet_don, ma_don_thue, ma_san_pham, ten_san_pham_luc_dat, so_luong, so_ngay_tinh_tien, don_gia_thue_moi_ngay, tien_giam, muc_coc_moi_thiet_bi, gia_tri_boi_thuong_moi_thiet_bi, phu_kien_va_muc_boi_thuong_luc_dat)
        VALUES (source.ma_chi_tiet_don, source.ma_don_thue, source.ma_san_pham, source.ten_san_pham_luc_dat, source.so_luong, source.so_ngay_tinh_tien, source.don_gia_thue_moi_ngay, source.tien_giam, source.muc_coc_moi_thiet_bi, source.gia_tri_boi_thuong_moi_thiet_bi, source.phu_kien_va_muc_boi_thuong_luc_dat);
    SET IDENTITY_INSERT [CHI_TIET_DON_THUE] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 19. GIU_CHO (Giữ chỗ thiết bị)
    -- TrangThaiGiuCho enum: DangGiu=0, DaXacNhan=1, DaGiaiPhong=2, HetHan=3
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [GIU_CHO] ON;
    MERGE INTO [GIU_CHO] AS target
    USING (VALUES
        (1, 1, DATEADD(day, -3, GETUTCDATE()), DATEADD(day, 2, GETUTCDATE()), 1),
        (2, 2, DATEADD(day, -3, GETUTCDATE()), DATEADD(day, 2, GETUTCDATE()), 1),
        (3, 5, DATEADD(day, -1, GETUTCDATE()), DATEADD(day, 5, GETUTCDATE()), 1)
    ) AS source (ma_giu_cho, ma_chi_tiet_don, thoi_diem_tao, thoi_diem_het_han, trang_thai)
    ON target.ma_giu_cho = source.ma_giu_cho
    WHEN MATCHED THEN
        UPDATE SET trang_thai = source.trang_thai
    WHEN NOT MATCHED THEN
        INSERT (ma_giu_cho, ma_chi_tiet_don, thoi_diem_tao, thoi_diem_het_han, trang_thai)
        VALUES (source.ma_giu_cho, source.ma_chi_tiet_don, source.thoi_diem_tao, source.thoi_diem_het_han, source.trang_thai);
    SET IDENTITY_INSERT [GIU_CHO] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 20. LUOT_SU_DUNG_KHUYEN_MAI
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [LUOT_SU_DUNG_KHUYEN_MAI] ON;
    MERGE INTO [LUOT_SU_DUNG_KHUYEN_MAI] AS target
    USING (VALUES
        (1, 1, 1, DATEADD(day, -3, GETUTCDATE()), DATEADD(day, 2, GETUTCDATE()), DATEADD(day, -3, GETUTCDATE()), NULL, 34000.00, N'DaSuDung'),
        (2, 2, 3, DATEADD(day, -1, GETUTCDATE()), DATEADD(day, 5, GETUTCDATE()), DATEADD(day, -1, GETUTCDATE()), NULL, 90000.00, N'DaSuDung')
    ) AS source (ma_luot_su_dung, ma_khuyen_mai, ma_don_thue, thoi_diem_giu_luot, thoi_diem_het_han, thoi_diem_su_dung, thoi_diem_giai_phong, so_tien_giam, trang_thai)
    ON target.ma_luot_su_dung = source.ma_luot_su_dung
    WHEN MATCHED THEN
        UPDATE SET trang_thai = source.trang_thai, so_tien_giam = source.so_tien_giam
    WHEN NOT MATCHED THEN
        INSERT (ma_luot_su_dung, ma_khuyen_mai, ma_don_thue, thoi_diem_giu_luot, thoi_diem_het_han, thoi_diem_su_dung, thoi_diem_giai_phong, so_tien_giam, trang_thai)
        VALUES (source.ma_luot_su_dung, source.ma_khuyen_mai, source.ma_don_thue, source.thoi_diem_giu_luot, source.thoi_diem_het_han, source.thoi_diem_su_dung, source.thoi_diem_giai_phong, source.so_tien_giam, source.trang_thai);
    SET IDENTITY_INSERT [LUOT_SU_DUNG_KHUYEN_MAI] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 21. LICH_SU_TRANG_THAI_DON
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [LICH_SU_TRANG_THAI_DON] ON;
    MERGE INTO [LICH_SU_TRANG_THAI_DON] AS target
    USING (VALUES
        (1, 1, 4, N'TaoMoi', N'ChoThanhToan', DATEADD(day, -3, GETUTCDATE()), N'Khách tạo đơn thuê trực tuyến'),
        (2, 1, 2, N'ChoThanhToan', N'DangThue', DATEADD(day, -2, GETUTCDATE()), N'Thanh toán VNPay thành công và đã nhận thiết bị'),
        (3, 2, 4, N'TaoMoi', N'DaXacNhan', DATEADD(day, -10, GETUTCDATE()), N'Khách thanh toán cọc thành công'),
        (4, 2, 2, N'DaXacNhan', N'DangThue', DATEADD(day, -8, GETUTCDATE()), N'Đã bàn giao đầy đủ thiết bị'),
        (5, 2, 2, N'DangThue', N'HoanTat', DATEADD(day, -5, GETUTCDATE()), N'Đã nhận trả và đối soát hoàn cọc 100%'),
        (6, 5, 2, N'DangThue', N'DangThue', DATEADD(day, -2, GETUTCDATE()), N'Cảnh báo: Đơn thuê đã quá giờ hẹn trả 48h')
    ) AS source (ma_lich_su, ma_don_thue, ma_nguoi_thuc_hien, trang_thai_truoc, trang_thai_sau, thoi_diem, ly_do)
    ON target.ma_lich_su = source.ma_lich_su
    WHEN MATCHED THEN
        UPDATE SET trang_thai_sau = source.trang_thai_sau, ly_do = source.ly_do
    WHEN NOT MATCHED THEN
        INSERT (ma_lich_su, ma_don_thue, ma_nguoi_thuc_hien, trang_thai_truoc, trang_thai_sau, thoi_diem, ly_do)
        VALUES (source.ma_lich_su, source.ma_don_thue, source.ma_nguoi_thuc_hien, source.trang_thai_truoc, source.trang_thai_sau, source.thoi_diem, source.ly_do);
    SET IDENTITY_INSERT [LICH_SU_TRANG_THAI_DON] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 22. THANH_TOAN & 23. CHI_TIET_THANH_TOAN
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [THANH_TOAN] ON;
    MERGE INTO [THANH_TOAN] AS target
    USING (VALUES
        (1, 1, 2, N'PAY_INIT_ORD001', N'VNPay', N'VNP_202610_001', 1006000.00, N'VNPayQR', DATEADD(day, -3, GETUTCDATE()), DATEADD(day, -3, GETUTCDATE()), N'ThanhCong'),
        (2, 2, 2, N'PAY_INIT_DT008', N'VNPay', N'VNP_202411_008', 1650000.00, N'VNPayQR', DATEADD(day, -10, GETUTCDATE()), DATEADD(day, -10, GETUTCDATE()), N'ThanhCong'),
        (3, 3, 2, N'PAY_INIT_DT042', N'VNPay', N'VNP_202412_042', 1810000.00, N'VNPayQR', DATEADD(day, -1, GETUTCDATE()), DATEADD(day, -1, GETUTCDATE()), N'ThanhCong')
    ) AS source (ma_thanh_toan, ma_don_thue, ma_nguoi_ghi_nhan, ma_yeu_cau, cong_thanh_toan, ma_giao_dich_cong, tong_so_tien, phuong_thuc, thoi_diem_tao, thoi_diem_thanh_cong, trang_thai)
    ON target.ma_thanh_toan = source.ma_thanh_toan
    WHEN MATCHED THEN
        UPDATE SET tong_so_tien = source.tong_so_tien, trang_thai = source.trang_thai
    WHEN NOT MATCHED THEN
        INSERT (ma_thanh_toan, ma_don_thue, ma_nguoi_ghi_nhan, ma_yeu_cau, cong_thanh_toan, ma_giao_dich_cong, tong_so_tien, phuong_thuc, thoi_diem_tao, thoi_diem_thanh_cong, trang_thai)
        VALUES (source.ma_thanh_toan, source.ma_don_thue, source.ma_nguoi_ghi_nhan, source.ma_yeu_cau, source.cong_thanh_toan, source.ma_giao_dich_cong, source.tong_so_tien, source.phuong_thuc, source.thoi_diem_tao, source.thoi_diem_thanh_cong, source.trang_thai);
    SET IDENTITY_INSERT [THANH_TOAN] OFF;

    SET IDENTITY_INSERT [CHI_TIET_THANH_TOAN] ON;
    MERGE INTO [CHI_TIET_THANH_TOAN] AS target
    USING (VALUES
        (1, 1, N'TienThue', 306000.00),
        (2, 1, N'TienCoc', 700000.00),
        (3, 2, N'TienThue', 750000.00),
        (4, 2, N'TienCoc', 900000.00),
        (5, 3, N'TienThue', 810000.00),
        (6, 3, N'TienCoc', 1000000.00)
    ) AS source (ma_chi_tiet_thanh_toan, ma_thanh_toan, muc_dich, so_tien)
    ON target.ma_chi_tiet_thanh_toan = source.ma_chi_tiet_thanh_toan
    WHEN MATCHED THEN
        UPDATE SET so_tien = source.so_tien
    WHEN NOT MATCHED THEN
        INSERT (ma_chi_tiet_thanh_toan, ma_thanh_toan, muc_dich, so_tien)
        VALUES (source.ma_chi_tiet_thanh_toan, source.ma_thanh_toan, source.muc_dich, source.so_tien);
    SET IDENTITY_INSERT [CHI_TIET_THANH_TOAN] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 24. PHAN_CONG_THIET_BI
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [PHAN_CONG_THIET_BI] ON;
    MERGE INTO [PHAN_CONG_THIET_BI] AS target
    USING (VALUES
        (1, 1, 1, 2, DATEADD(day, -2, GETUTCDATE()), N'DaBanGiao'),
        (2, 2, 4, 2, DATEADD(day, -2, GETUTCDATE()), N'DaBanGiao'),
        (3, 3, 2, 3, DATEADD(day, -8, GETUTCDATE()), N'DaBanGiao'),
        (4, 4, 9, 3, DATEADD(day, -8, GETUTCDATE()), N'DaBanGiao'),
        (5, 4, 10, 3, DATEADD(day, -8, GETUTCDATE()), N'DaBanGiao'),
        (6, 6, 1, 3, DATEADD(day, -3, GETUTCDATE()), N'DaBanGiao'),
        (7, 7, 7, 3, DATEADD(day, -3, GETUTCDATE()), N'DaBanGiao')
    ) AS source (ma_phan_cong, ma_chi_tiet_don, ma_thiet_bi, ma_nguoi_phan_cong, thoi_diem_phan_cong, trang_thai)
    ON target.ma_phan_cong = source.ma_phan_cong
    WHEN MATCHED THEN
        UPDATE SET trang_thai = source.trang_thai
    WHEN NOT MATCHED THEN
        INSERT (ma_phan_cong, ma_chi_tiet_don, ma_thiet_bi, ma_nguoi_phan_cong, thoi_diem_phan_cong, trang_thai)
        VALUES (source.ma_phan_cong, source.ma_chi_tiet_don, source.ma_thiet_bi, source.ma_nguoi_phan_cong, source.thoi_diem_phan_cong, source.trang_thai);
    SET IDENTITY_INSERT [PHAN_CONG_THIET_BI] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 25. PHIEU_BAN_GIAO & 26. CHI_TIET_BAN_GIAO
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [PHIEU_BAN_GIAO] ON;
    MERGE INTO [PHIEU_BAN_GIAO] AS target
    USING (VALUES
        (1, 1, 2, DATEADD(day, -2, GETUTCDATE()), DATEADD(day, -2, GETUTCDATE()), N'Lê Thị Mai', N'Nguyễn Văn An', DATEADD(day, -2, GETUTCDATE()), N'DaGiao'),
        (2, 2, 3, DATEADD(day, -8, GETUTCDATE()), DATEADD(day, -8, GETUTCDATE()), N'Trần Tuấn', N'Nguyễn Văn An', DATEADD(day, -8, GETUTCDATE()), N'DaGiao'),
        (3, 4, 3, DATEADD(day, -3, GETUTCDATE()), DATEADD(day, -3, GETUTCDATE()), N'Trần Tuấn', N'Trần Minh Quang', DATEADD(day, -3, GETUTCDATE()), N'DaGiao')
    ) AS source (ma_phieu_ban_giao, ma_don_thue, ma_nhan_vien, thoi_diem_lap, thoi_diem_giao_thuc_te, ten_nhan_vien_luc_giao, ten_nguoi_nhan_thuc_te, thoi_diem_khach_xac_nhan, trang_thai)
    ON target.ma_phieu_ban_giao = source.ma_phieu_ban_giao
    WHEN MATCHED THEN
        UPDATE SET trang_thai = source.trang_thai
    WHEN NOT MATCHED THEN
        INSERT (ma_phieu_ban_giao, ma_don_thue, ma_nhan_vien, thoi_diem_lap, thoi_diem_giao_thuc_te, ten_nhan_vien_luc_giao, ten_nguoi_nhan_thuc_te, thoi_diem_khach_xac_nhan, trang_thai)
        VALUES (source.ma_phieu_ban_giao, source.ma_don_thue, source.ma_nhan_vien, source.thoi_diem_lap, source.thoi_diem_giao_thuc_te, source.ten_nhan_vien_luc_giao, source.ten_nguoi_nhan_thuc_te, source.thoi_diem_khach_xac_nhan, source.trang_thai);
    SET IDENTITY_INSERT [PHIEU_BAN_GIAO] OFF;

    SET IDENTITY_INSERT [CHI_TIET_BAN_GIAO] ON;
    MERGE INTO [CHI_TIET_BAN_GIAO] AS target
    USING (VALUES
        (1, 1, 1, N'Lều mới, đầy đủ 10 cọc ghim và 4 dây căng', N'Khách đã kiểm tra tại quầy'),
        (2, 1, 2, N'Bếp ga hoạt động tốt, đánh lửa nhạy', N'Đã thử lửa an toàn'),
        (3, 2, 3, N'Lều sạch sẽ, phụ kiện nguyên vẹn', N'Bàn giao đầy đủ phụ kiện theo đúng thỏa thuận'),
        (4, 2, 4, N'Túi ngủ mới sạch', N'Kèm bao nén'),
        (5, 2, 5, N'Túi ngủ mới sạch', N'Kèm bao nén'),
        (6, 3, 6, N'Lều 4 người tốt', N'Kèm 10 cọc'),
        (7, 3, 7, N'Đèn Barebones pin đầy 100%', N'Kèm cáp sạc USB-C')
    ) AS source (ma_chi_tiet_ban_giao, ma_phieu_ban_giao, ma_phan_cong, tinh_trang_truoc_thue, ghi_chu)
    ON target.ma_chi_tiet_ban_giao = source.ma_chi_tiet_ban_giao
    WHEN MATCHED THEN
        UPDATE SET tinh_trang_truoc_thue = source.tinh_trang_truoc_thue, ghi_chu = source.ghi_chu
    WHEN NOT MATCHED THEN
        INSERT (ma_chi_tiet_ban_giao, ma_phieu_ban_giao, ma_phan_cong, tinh_trang_truoc_thue, ghi_chu)
        VALUES (source.ma_chi_tiet_ban_giao, source.ma_phieu_ban_giao, source.ma_phan_cong, source.tinh_trang_truoc_thue, source.ghi_chu);
    SET IDENTITY_INSERT [CHI_TIET_BAN_GIAO] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 27. PHIEU_NHAN_TRA & 28. CHI_TIET_NHAN_TRA
    -- TrangThaiPhieuNhanTra: Nhap=1, DaChot=2, DaHuy=3
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [PHIEU_NHAN_TRA] ON;
    MERGE INTO [PHIEU_NHAN_TRA] AS target
    USING (VALUES
        (1, 1, 2, N'PNT-ORD001-01', 1, 0, GETUTCDATE(), N'Lê Thị Mai', 1),
        (2, 2, 3, N'PNT-DT008-01', 1, 1, DATEADD(day, -5, GETUTCDATE()), N'Trần Tuấn', 2),
        (3, 4, 2, N'PNT-DT015-01', 1, 0, DATEADD(day, -1, GETUTCDATE()), N'Lê Thị Mai', 2)
    ) AS source (ma_phieu_nhan_tra, ma_don_thue, ma_nhan_vien, ma_phieu_hien_thi, lan_tra, la_lan_tra_cuoi, thoi_diem_lap, ten_nhan_vien_luc_nhan, trang_thai)
    ON target.ma_phieu_nhan_tra = source.ma_phieu_nhan_tra
    WHEN MATCHED THEN
        UPDATE SET trang_thai = source.trang_thai, la_lan_tra_cuoi = source.la_lan_tra_cuoi
    WHEN NOT MATCHED THEN
        INSERT (ma_phieu_nhan_tra, ma_don_thue, ma_nhan_vien, ma_phieu_hien_thi, lan_tra, la_lan_tra_cuoi, thoi_diem_lap, ten_nhan_vien_luc_nhan, trang_thai)
        VALUES (source.ma_phieu_nhan_tra, source.ma_don_thue, source.ma_nhan_vien, source.ma_phieu_hien_thi, source.lan_tra, source.la_lan_tra_cuoi, source.thoi_diem_lap, source.ten_nhan_vien_luc_nhan, source.trang_thai);
    SET IDENTITY_INSERT [PHIEU_NHAN_TRA] OFF;

    SET IDENTITY_INSERT [CHI_TIET_NHAN_TRA] ON;
    MERGE INTO [CHI_TIET_NHAN_TRA] AS target
    USING (VALUES
        (1, 1, 1, GETUTCDATE(), N'CanVeSinh', N'Lều bị dính bùn đất cần vệ sinh chuyên sâu', N'ChoXuLy'),
        (2, 2, 3, DATEADD(day, -5, GETUTCDATE()), N'DatChuan', N'Lều nguyên vẹn sạch sẽ', N'DaXuLy'),
        (3, 2, 4, DATEADD(day, -5, GETUTCDATE()), N'DatChuan', N'Túi ngủ tốt sạch sẽ', N'DaXuLy'),
        (4, 2, 5, DATEADD(day, -5, GETUTCDATE()), N'DatChuan', N'Túi ngủ tốt sạch sẽ', N'DaXuLy'),
        (5, 3, 7, DATEADD(day, -1, GETUTCDATE()), N'DatChuan', N'Khách trả sớm đèn LED trước, hoạt động bình thường', N'DaXuLy')
    ) AS source (ma_chi_tiet_nhan_tra, ma_phieu_nhan_tra, ma_chi_tiet_ban_giao, thoi_diem_tra_thuc_te, ket_luan, tinh_trang_sau_thue, trang_thai_xu_ly)
    ON target.ma_chi_tiet_nhan_tra = source.ma_chi_tiet_nhan_tra
    WHEN MATCHED THEN
        UPDATE SET ket_luan = source.ket_luan, tinh_trang_sau_thue = source.tinh_trang_sau_thue, trang_thai_xu_ly = source.trang_thai_xu_ly
    WHEN NOT MATCHED THEN
        INSERT (ma_chi_tiet_nhan_tra, ma_phieu_nhan_tra, ma_chi_tiet_ban_giao, thoi_diem_tra_thuc_te, ket_luan, tinh_trang_sau_thue, trang_thai_xu_ly)
        VALUES (source.ma_chi_tiet_nhan_tra, source.ma_phieu_nhan_tra, source.ma_chi_tiet_ban_giao, source.thoi_diem_tra_thuc_te, source.ket_luan, source.tinh_trang_sau_thue, source.trang_thai_xu_ly);
    SET IDENTITY_INSERT [CHI_TIET_NHAN_TRA] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 29. PHU_PHI (Phụ phí W4-T3)
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [PHU_PHI] ON;
    MERGE INTO [PHU_PHI] AS target
    USING (VALUES
        (1, 1, 1, 2, 1, N'VeSinhDacBiet', 100000.00, N'Phí vệ sinh lều bám bùn đất sau mưa', N'{"loaiPhi":"VeSinhDacBiet","congThuc":"DinhMucVeSinhChuan"}', GETUTCDATE(), GETUTCDATE(), N'DaDuyet', NULL)
    ) AS source (ma_phu_phi, ma_don_thue, ma_chi_tiet_ban_giao, ma_nguoi_lap, ma_nguoi_duyet, loai_phi, so_tien, ly_do, can_cu_tinh_phi, thoi_diem_lap, thoi_diem_duyet, trang_thai_duyet, trang_thai_tranh_chap)
    ON target.ma_phu_phi = source.ma_phu_phi
    WHEN MATCHED THEN
        UPDATE SET so_tien = source.so_tien, trang_thai_duyet = source.trang_thai_duyet
    WHEN NOT MATCHED THEN
        INSERT (ma_phu_phi, ma_don_thue, ma_chi_tiet_ban_giao, ma_nguoi_lap, ma_nguoi_duyet, loai_phi, so_tien, ly_do, can_cu_tinh_phi, thoi_diem_lap, thoi_diem_duyet, trang_thai_duyet, trang_thai_tranh_chap)
        VALUES (source.ma_phu_phi, source.ma_don_thue, source.ma_chi_tiet_ban_giao, source.ma_nguoi_lap, source.ma_nguoi_duyet, source.loai_phi, source.so_tien, source.ly_do, source.can_cu_tinh_phi, source.thoi_diem_lap, source.thoi_diem_duyet, source.trang_thai_duyet, source.trang_thai_tranh_chap);
    SET IDENTITY_INSERT [PHU_PHI] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 30. DOI_SOAT_TIEN_COC & 31. GIAO_DICH_DOI_SOAT & 32. HOAN_TIEN
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [DOI_SOAT_TIEN_COC] ON;
    MERGE INTO [DOI_SOAT_TIEN_COC] AS target
    USING (VALUES
        (1, 1, 2, N'DoiSoatBanDau', 700000.00, 100000.00, 600000.00, 0.00, N'{"tienCoc":700000,"phuPhi":100000,"hoan":600000}', GETUTCDATE(), N'ChoXuLyTien'),
        (2, 2, 3, N'DoiSoatBanDau', 900000.00, 0.00, 900000.00, 0.00, N'{"tienCoc":900000,"phuPhi":0,"hoan":900000}', DATEADD(day, -5, GETUTCDATE()), N'HoanTat')
    ) AS source (ma_doi_soat, ma_don_thue, ma_nguoi_lap, loai_doi_soat, tien_coc_duoc_doi_soat, tong_phu_phi_duoc_duyet, so_tien_can_hoan, so_tien_can_thu_them, bang_tinh_doi_soat, thoi_diem_lap, trang_thai)
    ON target.ma_doi_soat = source.ma_doi_soat
    WHEN MATCHED THEN
        UPDATE SET trang_thai = source.trang_thai, so_tien_can_hoan = source.so_tien_can_hoan
    WHEN NOT MATCHED THEN
        INSERT (ma_doi_soat, ma_don_thue, ma_nguoi_lap, loai_doi_soat, tien_coc_duoc_doi_soat, tong_phu_phi_duoc_duyet, so_tien_can_hoan, so_tien_can_thu_them, bang_tinh_doi_soat, thoi_diem_lap, trang_thai)
        VALUES (source.ma_doi_soat, source.ma_don_thue, source.ma_nguoi_lap, source.loai_doi_soat, source.tien_coc_duoc_doi_soat, source.tong_phu_phi_duoc_duyet, source.so_tien_can_hoan, source.so_tien_can_thu_them, source.bang_tinh_doi_soat, source.thoi_diem_lap, source.trang_thai);
    SET IDENTITY_INSERT [DOI_SOAT_TIEN_COC] OFF;

    IF NOT EXISTS (SELECT 1 FROM [GIAO_DICH_DOI_SOAT] WHERE ma_doi_soat = 1 AND ma_chi_tiet_thanh_toan = 2)
        INSERT INTO [GIAO_DICH_DOI_SOAT] (ma_doi_soat, ma_chi_tiet_thanh_toan) VALUES (1, 2);
    IF NOT EXISTS (SELECT 1 FROM [GIAO_DICH_DOI_SOAT] WHERE ma_doi_soat = 2 AND ma_chi_tiet_thanh_toan = 4)
        INSERT INTO [GIAO_DICH_DOI_SOAT] (ma_doi_soat, ma_chi_tiet_thanh_toan) VALUES (2, 4);

    SET IDENTITY_INSERT [HOAN_TIEN] ON;
    MERGE INTO [HOAN_TIEN] AS target
    USING (VALUES
        (1, 2, 1, 1, N'HT:DS:1:2:L1', N'HoanCocDoiSoat', 600000.00, N'Hoàn cọc sau đối soát trừ phí vệ sinh', GETUTCDATE(), NULL, N'ChoXuLy'),
        (2, 4, 2, 1, N'HT:DS:2:4:L1', N'HoanCocDoiSoat', 900000.00, N'Hoàn 100% tiền cọc đơn hoàn tất', DATEADD(day, -5, GETUTCDATE()), DATEADD(day, -5, GETUTCDATE()), N'ThanhCong')
    ) AS source (ma_hoan_tien, ma_chi_tiet_thanh_toan_goc, ma_doi_soat, ma_nguoi_xu_ly, ma_yeu_cau, loai_hoan, so_tien, ly_do, thoi_diem_yeu_cau, thoi_diem_thanh_cong, trang_thai)
    ON target.ma_hoan_tien = source.ma_hoan_tien
    WHEN MATCHED THEN
        UPDATE SET trang_thai = source.trang_thai, so_tien = source.so_tien
    WHEN NOT MATCHED THEN
        INSERT (ma_hoan_tien, ma_chi_tiet_thanh_toan_goc, ma_doi_soat, ma_nguoi_xu_ly, ma_yeu_cau, loai_hoan, so_tien, ly_do, thoi_diem_yeu_cau, thoi_diem_thanh_cong, trang_thai)
        VALUES (source.ma_hoan_tien, source.ma_chi_tiet_thanh_toan_goc, source.ma_doi_soat, source.ma_nguoi_xu_ly, source.ma_yeu_cau, source.loai_hoan, source.so_tien, source.ly_do, source.thoi_diem_yeu_cau, source.thoi_diem_thanh_cong, source.trang_thai);
    SET IDENTITY_INSERT [HOAN_TIEN] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 33. PHIEU_BAO_TRI
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [PHIEU_BAO_TRI] ON;
    MERGE INTO [PHIEU_BAO_TRI] AS target
    USING (VALUES
        (1, 5, 1, 2, N'SuaChua', N'Chân đế bếp ga bị gãy khớp gập', N'TrungBinh', GETUTCDATE(), NULL, 150000.00, NULL, N'Đang chờ linh kiện thay thế', N'DangXuLy')
    ) AS source (ma_phieu_bao_tri, ma_thiet_bi, ma_don_thue, ma_nguoi_lap, loai_xu_ly, mo_ta_loi, muc_do, ngay_bat_dau, ngay_hoan_thanh, chi_phi_uoc_tinh, chi_phi_thuc_te, ghi_chu, trang_thai)
    ON target.ma_phieu_bao_tri = source.ma_phieu_bao_tri
    WHEN MATCHED THEN
        UPDATE SET trang_thai = source.trang_thai
    WHEN NOT MATCHED THEN
        INSERT (ma_phieu_bao_tri, ma_thiet_bi, ma_don_thue, ma_nguoi_lap, loai_xu_ly, mo_ta_loi, muc_do, ngay_bat_dau, ngay_hoan_thanh, chi_phi_uoc_tinh, chi_phi_thuc_te, ghi_chu, trang_thai)
        VALUES (source.ma_phieu_bao_tri, source.ma_thiet_bi, source.ma_don_thue, source.ma_nguoi_lap, source.loai_xu_ly, source.mo_ta_loi, source.muc_do, source.ngay_bat_dau, source.ngay_hoan_thanh, source.chi_phi_uoc_tinh, source.chi_phi_thuc_te, source.ghi_chu, source.trang_thai);
    SET IDENTITY_INSERT [PHIEU_BAO_TRI] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 34. PHIEU_DIEU_CHINH_KHO & 35. CHI_TIET_DIEU_CHINH_KHO
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [PHIEU_DIEU_CHINH_KHO] ON;
    MERGE INTO [PHIEU_DIEU_CHINH_KHO] AS target
    USING (VALUES
        (1, 1, 1, N'KiemKeDinhKy', N'Kiểm kê kho định kỳ Quý 4/2026', GETUTCDATE(), GETUTCDATE(), N'DaDuyet')
    ) AS source (ma_phieu_dieu_chinh, ma_nguoi_lap, ma_nguoi_duyet, loai_dieu_chinh, ly_do, thoi_diem_lap, thoi_diem_duyet, trang_thai)
    ON target.ma_phieu_dieu_chinh = source.ma_phieu_dieu_chinh
    WHEN MATCHED THEN
        UPDATE SET trang_thai = source.trang_thai
    WHEN NOT MATCHED THEN
        INSERT (ma_phieu_dieu_chinh, ma_nguoi_lap, ma_nguoi_duyet, loai_dieu_chinh, ly_do, thoi_diem_lap, thoi_diem_duyet, trang_thai)
        VALUES (source.ma_phieu_dieu_chinh, source.ma_nguoi_lap, source.ma_nguoi_duyet, source.loai_dieu_chinh, source.ly_do, source.thoi_diem_lap, source.thoi_diem_duyet, source.trang_thai);
    SET IDENTITY_INSERT [PHIEU_DIEU_CHINH_KHO] OFF;

    SET IDENTITY_INSERT [CHI_TIET_DIEU_CHINH_KHO] ON;
    MERGE INTO [CHI_TIET_DIEU_CHINH_KHO] AS target
    USING (VALUES
        (1, 1, 5, 2, N'{"trangThai":"SanSang"}', N'{"trangThai":"DangBaoTri"}', N'Chuyển sang bảo trì sau kiểm kê')
    ) AS source (ma_chi_tiet_dieu_chinh, ma_phieu_dieu_chinh, ma_thiet_bi, ma_chi_tiet_phieu_nhap, gia_tri_truoc, gia_tri_sau, ghi_chu)
    ON target.ma_chi_tiet_dieu_chinh = source.ma_chi_tiet_dieu_chinh
    WHEN MATCHED THEN
        UPDATE SET ghi_chu = source.ghi_chu
    WHEN NOT MATCHED THEN
        INSERT (ma_chi_tiet_dieu_chinh, ma_phieu_dieu_chinh, ma_thiet_bi, ma_chi_tiet_phieu_nhap, gia_tri_truoc, gia_tri_sau, ghi_chu)
        VALUES (source.ma_chi_tiet_dieu_chinh, source.ma_phieu_dieu_chinh, source.ma_thiet_bi, source.ma_chi_tiet_phieu_nhap, source.gia_tri_truoc, source.gia_tri_sau, source.ghi_chu);
    SET IDENTITY_INSERT [CHI_TIET_DIEU_CHINH_KHO] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 36. DANH_GIA (Đánh giá khách hàng - UC15 & UC08)
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [DANH_GIA] ON;
    MERGE INTO [DANH_GIA] AS target
    USING (VALUES
        (1, 3, NULL, 5, N'Lều rất chắc chắn, chống mưa tốt trong chuyến đi Ba Vì. Đầy đủ cọc và dây chằng phụ kiện!', N'["https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600"]', DATEADD(day, -5, GETUTCDATE()), NULL, N'HienThi', NULL),
        (2, 4, NULL, 5, N'Túi ngủ lông ngỗng rất ấm, giữ nhiệt ban đêm ở núi tuyệt vời, sạch sẽ và nén gọn gàng.', N'["https://images.unsplash.com/photo-1517824806704-9040b037703b?w=600"]', DATEADD(day, -5, GETUTCDATE()), NULL, N'HienThi', NULL),
        (3, 1, NULL, 5, N'Lều rất tốt, chống gió chống mưa tuyệt vời, nhân viên hướng dẫn cách dựng lều rất nhiệt tình.', N'[]', DATEADD(day, -1, GETUTCDATE()), NULL, N'HienThi', NULL)
    ) AS source (ma_danh_gia, ma_chi_tiet_don, ma_nguoi_an, so_sao, noi_dung, danh_sach_anh, ngay_tao, ngay_cap_nhat, trang_thai_hien_thi, ly_do_an)
    ON target.ma_danh_gia = source.ma_danh_gia
    WHEN MATCHED THEN
        UPDATE SET so_sao = source.so_sao, noi_dung = source.noi_dung, trang_thai_hien_thi = source.trang_thai_hien_thi
    WHEN NOT MATCHED THEN
        INSERT (ma_danh_gia, ma_chi_tiet_don, ma_nguoi_an, so_sao, noi_dung, danh_sach_anh, ngay_tao, ngay_cap_nhat, trang_thai_hien_thi, ly_do_an)
        VALUES (source.ma_danh_gia, source.ma_chi_tiet_don, source.ma_nguoi_an, source.so_sao, source.noi_dung, source.danh_sach_anh, source.ngay_tao, source.ngay_cap_nhat, source.trang_thai_hien_thi, source.ly_do_an);
    SET IDENTITY_INSERT [DANH_GIA] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 37. THONG_BAO (Thông báo người dùng)
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [THONG_BAO] ON;
    MERGE INTO [THONG_BAO] AS target
    USING (VALUES
        (1, 4, 1, N'EVT_ORD001_CONFIRMED', N'XacNhanDon', N'Đơn thuê ORD-202610-001 đã được xác nhận', N'Cửa hàng đã chuẩn bị xong thiết bị. Bạn có thể đến nhận lều và bếp dã ngoại.', N'InApp', N'DaGui', 1, DATEADD(day, -2, GETUTCDATE()), DATEADD(day, -2, GETUTCDATE()), NULL, NULL),
        (2, 4, 1, N'EVT_ORD001_FEE', N'ThongBaoPhuPhi', N'Thông báo phụ phí vệ sinh đơn thuê ORD-202610-001', N'Phát sinh khoản phụ phí vệ sinh đặc biệt 100.000 VNĐ cho lều dính bùn đất.', N'InApp', N'DaGui', 1, GETUTCDATE(), GETUTCDATE(), NULL, NULL),
        (3, 4, 2, N'EVT_DT008_COMPLETED', N'HoanTatDon', N'Đơn thuê DT-20241120-008 đã hoàn tất thành công', N'Cảm ơn bạn đã sử dụng dịch vụ của GearGo! Cọc 900.000 VNĐ đã được hoàn trả thành công.', N'InApp', N'DaGui', 1, DATEADD(day, -5, GETUTCDATE()), DATEADD(day, -5, GETUTCDATE()), DATEADD(day, -5, GETUTCDATE()), NULL),
        (4, 5, 5, N'EVT_DT099_OVERDUE', N'CanhBaoQuaHan', N'Cảnh báo: Đơn thuê DT-20241201-099 đã quá hạn', N'Đơn thuê của bạn đã quá hạn trả 48 giờ. Vui lòng mang thiết bị hoàn trả ngay để tránh phụ phí trễ 150%.', N'InApp', N'DaGui', 1, DATEADD(day, -2, GETUTCDATE()), DATEADD(day, -2, GETUTCDATE()), NULL, NULL)
    ) AS source (ma_thong_bao, ma_tai_khoan, ma_don_thue, ma_su_kien, loai_su_kien, tieu_de, noi_dung, kenh_gui, trang_thai_gui, so_lan_thu_gui, thoi_diem_tao, thoi_diem_gui, thoi_diem_doc, loi_gui_gan_nhat)
    ON target.ma_thong_bao = source.ma_thong_bao
    WHEN MATCHED THEN
        UPDATE SET tieu_de = source.tieu_de, noi_dung = source.noi_dung, trang_thai_gui = source.trang_thai_gui
    WHEN NOT MATCHED THEN
        INSERT (ma_thong_bao, ma_tai_khoan, ma_don_thue, ma_su_kien, loai_su_kien, tieu_de, noi_dung, kenh_gui, trang_thai_gui, so_lan_thu_gui, thoi_diem_tao, thoi_diem_gui, thoi_diem_doc, loi_gui_gan_nhat)
        VALUES (source.ma_thong_bao, source.ma_tai_khoan, source.ma_don_thue, source.ma_su_kien, source.loai_su_kien, source.tieu_de, source.noi_dung, source.kenh_gui, source.trang_thai_gui, source.so_lan_thu_gui, source.thoi_diem_tao, source.thoi_diem_gui, source.thoi_diem_doc, source.loi_gui_gan_nhat);
    SET IDENTITY_INSERT [THONG_BAO] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 38. LICH_SU_TINH_TRANG_THIET_BI
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [LICH_SU_TINH_TRANG_THIET_BI] ON;
    MERGE INTO [LICH_SU_TINH_TRANG_THIET_BI] AS target
    USING (VALUES
        (1, 1, 2, N'SanSang', N'DangThue', N'Mới', N'Bàn giao cho khách hàng', DATEADD(day, -2, GETUTCDATE()), N'Bàn giao thiết bị cho đơn thuê ORD-202610-001'),
        (2, 2, 3, N'DangThue', N'SanSang', N'Đang thuê', N'Đã nhận trả, vệ sinh kiểm tra đạt chuẩn', DATEADD(day, -5, GETUTCDATE()), N'Thu hồi thiết bị từ đơn thuê hoàn tất DT-20241120-008'),
        (3, 5, 2, N'SanSang', N'DangBaoTri', N'Tốt', N'Gãy chân đế gập', GETUTCDATE(), N'Phát hiện gãy chân đế, chuyển sang phòng bảo trì sửa chữa')
    ) AS source (ma_lich_su, ma_thiet_bi, ma_nguoi_thuc_hien, trang_thai_truoc, trang_thai_sau, tinh_trang_truoc, tinh_trang_sau, thoi_diem, ly_do)
    ON target.ma_lich_su = source.ma_lich_su
    WHEN MATCHED THEN
        UPDATE SET trang_thai_sau = source.trang_thai_sau, tinh_trang_sau = source.tinh_trang_sau, ly_do = source.ly_do
    WHEN NOT MATCHED THEN
        INSERT (ma_lich_su, ma_thiet_bi, ma_nguoi_thuc_hien, trang_thai_truoc, trang_thai_sau, tinh_trang_truoc, tinh_trang_sau, thoi_diem, ly_do)
        VALUES (source.ma_lich_su, source.ma_thiet_bi, source.ma_nguoi_thuc_hien, source.trang_thai_truoc, source.trang_thai_sau, source.tinh_trang_truoc, source.tinh_trang_sau, source.thoi_diem, source.ly_do);
    SET IDENTITY_INSERT [LICH_SU_TINH_TRANG_THIET_BI] OFF;

    -- ─────────────────────────────────────────────────────────────────────────────────────
    -- 39. NHAT_KY_THAO_TAC (Audit Trail toàn hệ thống)
    -- ─────────────────────────────────────────────────────────────────────────────────────
    SET IDENTITY_INSERT [NHAT_KY_THAO_TAC] ON;
    MERGE INTO [NHAT_KY_THAO_TAC] AS target
    USING (VALUES
        (1, 1, N'KhoiTaoHeThong', N'HeThong', N'SYS_INIT', NULL, NULL, DATEADD(month, -3, GETUTCDATE()), N'Khởi tạo hệ thống quản trị GearGo'),
        (2, 2, N'BanGiaoThietBi', N'DonThue', N'1', NULL, NULL, DATEADD(day, -2, GETUTCDATE()), N'Bàn giao thiết bị đơn thuê ORD-202610-001'),
        (3, 2, N'LapPhuPhi', N'PhuPhi', N'1', NULL, NULL, GETUTCDATE(), N'Lập phụ phí vệ sinh bùn đất cho lều'),
        (4, 3, N'XacNhanHoanTat', N'DonThue', N'2', NULL, NULL, DATEADD(day, -5, GETUTCDATE()), N'Đối soát hoàn tất cọc và đóng đơn DT-20241120-008')
    ) AS source (ma_nhat_ky, ma_tai_khoan, hanh_dong, loai_doi_tuong, ma_doi_tuong, du_lieu_truoc, du_lieu_sau, thoi_diem, ly_do)
    ON target.ma_nhat_ky = source.ma_nhat_ky
    WHEN MATCHED THEN
        UPDATE SET hanh_dong = source.hanh_dong, ly_do = source.ly_do
    WHEN NOT MATCHED THEN
        INSERT (ma_nhat_ky, ma_tai_khoan, hanh_dong, loai_doi_tuong, ma_doi_tuong, du_lieu_truoc, du_lieu_sau, thoi_diem, ly_do)
        VALUES (source.ma_nhat_ky, source.ma_tai_khoan, source.hanh_dong, source.loai_doi_tuong, source.ma_doi_tuong, source.du_lieu_truoc, source.du_lieu_sau, source.thoi_diem, source.ly_do);
    SET IDENTITY_INSERT [NHAT_KY_THAO_TAC] OFF;

    COMMIT TRANSACTION;
    PRINT N'>> [THÀNH CÔNG] Đã nạp dữ liệu Seed mẫu toàn diện cho tất cả 39 Entities GearGo!';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    PRINT N'>> [LỖI] Xảy ra lỗi khi nạp dữ liệu Seed: ' + @ErrorMessage;
    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;

-- Kích hoạt lại toàn bộ Foreign Keys
EXEC sp_MSforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all";
GO
