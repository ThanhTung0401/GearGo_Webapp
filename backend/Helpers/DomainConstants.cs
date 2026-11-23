namespace GearGo.Helpers;

public static class DomainConstants
{
    public static class Policies
    {
        public const int HoldTimeMinutes = 15;
        public const int DefaultReportDays = 30;
        public const int DefaultPageSize = 20;
        public const int MaxPageSize = 100;
        public const double HoursPerDay = 24.0;
        public const int PercentageMultiplier = 100;
        public const int DecimalRoundingDigits = 2;
        public const long DefaultPolicyId = 1;
        public const int ToleranceMinutes = 5;
        public const int JobScanIntervalMinutes = 1;
        public const int DelayRetryJobSeconds = 10;
        public const double MinRentalDays = 1.0;
    }

    public static class Status
    {
        public const string Draft = "Nhap";
        public const string PendingDelivery = "ChoGiao";
        public const string Delivered = "DaGiao";
        public const string Finalized = "DaChot";
        public const string Assigned = "DaPhanCong";
        public const string Success = "ThanhCong";
        public const string PendingPayment = "ChoThanhToan";
        public const string Cancelled = "DaHuy";
        public const string Approved = "DaDuyet";
        public const string PendingApproval = "ChoDuyet";
        public const string Applied = "DaApDung";
        public const string PendingProcessing = "ChoXuLy";
        public const string InProgress = "DangXuLy";
        public const string PendingInspection = "ChoKiemTra";
        public const string Inspected = "DaKiemTra";
        public const string Completed = "HoanThanh";
        public const string Failed = "KhongDat";
        public const string ApprovedLost = "DaDuyetMat";
        public const string Holding = "DangGiu";
        public const string Used = "DaSuDung";
        public const string Expired = "HetHan";
        public const string Released = "DaGiaiPhong";
        public const string ReconcileNeeded = "CanDoiSoat";
        public const string VerificationNeeded = "CanDoiChieu";
        public const string DefaultHandoverCondition = "Hoạt động bình thường";
    }

    public static class TransactionPurposes
    {
        public const string RentFee = "TienThue";
        public const string DepositFee = "TienCoc";
        public const string SupplementaryFee = "ThuBoSung";
    }

    public static class InspectionConclusions
    {
        public const string Pass = "Dat";
        public const string NeedsCleaning = "CanVeSinh";
        public const string MinorDamage = "HongNhe";
        public const string MajorDamage = "HongNang";
        public const string MissingAccessories = "ThieuPhuKien";
        public const string Lost = "MatThietBi";
    }

    public static class Maintenance
    {
        public const string TypeCleaning = "VeSinh";
        public const string TypeRepair = "SuaChua";

        public const string LevelMinor = "Nhe";
        public const string LevelMedium = "TrungBinh";
        public const string LevelMajor = "Nang";
    }

    public static class Lifecycle
    {
        public const string Downgrade = "GiangCap";
        public const string Decommission = "NgungSuDung";
    }

    public static class StaffStatus
    {
        public const string Working = "DangLamViec";
        public const string Resigned = "DaNghiViec";
    }

    public static class AccountStatus
    {
        public const string Active = "HoatDong";
        public const string Locked = "BiKhoa";
    }

    public static class Errors
    {
        // 500 Internal Server Error
        public const string SystemError = "SYS_ERROR";
        // 404 Not Found
        public const string NotFound = "NOT_FOUND";
        public const string OrderNotFound = "DON_NOT_FOUND";
        public const string OrderRentalNotFound = "DON_THUE_NOT_FOUND";
        public const string ReceiptNotFound = "PHIEU_NOT_FOUND";
        public const string EquipmentNotFound = "THIET_BI_NOT_FOUND";
        public const string StaffNotFound = "NHAN_VIEN_NOT_FOUND";
        public const string DetailNotFound = "CHI_TIET_NOT_FOUND";
        public const string SurchargeNotFound = "PHU_PHI_NOT_FOUND";
        public const string ProductNotFound = "SAN_PHAM_NOT_FOUND";
        public const string ReconciliationNotFound = "DOI_SOAT_NOT_FOUND";
        public const string TransactionNotFound = "GIAO_DICH_NOT_FOUND";

        // 403 Forbidden
        public const string Forbidden = "KHONG_CO_QUYEN";
        public const string NotAssignedStaff = "KHONG_PHAI_NGUOI_XU_LY";
        public const string ForbiddenCostInspection = "KHONG_CO_QUYEN_XEM_GIA_NHAP";

        // 409 Conflict
        public const string InvalidState = "INVALID_STATE";
        public const string Locked = "LOCKED";
        public const string LineAlreadyHasDraftReceipt = "DONG_DA_CO_PHIEU_NHAN";
        public const string ReceiptFinalized = "PHIEU_NHAN_DA_CHOT";
        public const string LostConclusionIncomplete = "KET_LUAN_MAT_CHUA_DU";
        public const string EquipmentAlreadyReturned = "THIET_BI_DA_TRA";
        public const string EquipmentWithCustomer = "THIET_BI_DANG_O_KHACH";
        public const string ActiveMaintenanceExists = "THIET_BI_DA_CO_BAO_TRI_MO";
        public const string MaintenanceTicketClosed = "PHIEU_BAO_TRI_DA_KET_THUC";
        public const string StaffResigned = "NHAN_VIEN_DA_NGHI_VIEC";
        public const string EquipmentNotRecovered = "THIET_BI_CHUA_THU_HOI";
        public const string ChangeViolatesCommitment = "THAY_DOI_LAM_THIEU_CAM_KET";
        public const string SupplementaryCollectionPending = "THU_THEM_DANG_CHO";
        public const string StaleAdjustmentSnapshot = "SNAPSHOT_DIEU_CHINH_DA_CU";
        public const string MissingReceiptEvidence = "CHUNG_CU_NHAP_CU_CHUA_DU";
        public const string DuplicateEquipmentCode = "MA_THIET_BI_TRUNG";
        public const string AdjustmentViolatesCommitment = "DIEU_CHINH_VUONG_CAM_KET";
        public const string ReceiptAlreadyApplied = "PHIEU_DA_AP_DUNG";

        // 400 Bad Request
        public const string EmptyList = "DANH_SACH_RONG";
        public const string DuplicateItems = "DUPLICATE_ITEMS";
        public const string IncompleteConclusion = "KET_LUAN_CHUA_DU";
        public const string InvalidConclusion = "KET_LUAN_KHONG_HOP_LE";
        public const string InvalidReturnTime = "THOI_DIEM_TRA_KHONG_HOP_LE";
        public const string CannotSplitAll = "KHONG_THE_TACH_HET";
        public const string NotLostEquipment = "KHONG_PHAI_MAT_THIET_BI";
        public const string OrderNotDelivered = "DON_CHUA_BAN_GIAO";
        public const string EquipmentNotInHandover = "THIET_BI_KHONG_THUOC_BAN_GIAO";
        public const string InvalidData = "DU_LIEU_KHONG_HOP_LE";
        public const string InvalidCost = "CHI_PHI_KHONG_HOP_LE";
        public const string InspectionResultIncomplete = "KET_QUA_KIEM_TRA_CHUA_DU";
        public const string TargetProductMismatch = "SAN_PHAM_DICH_KHONG_PHU_HOP";
        public const string InsufficientPayment = "CHUA_THANH_TOAN_DU";
        public const string EmptyCart = "GIO_HANG_RONG";
        public const string InvalidTime = "THOI_GIAN_KHONG_HOP_LE";
        public const string PastTime = "THOI_GIAN_QUA_KHU";
        public const string InvalidQuantity = "SO_LUONG_KHONG_HOP_LE";
        public const string OutOfStock = "HET_HANG";
        public const string ProductDiscontinued = "SAN_PHAM_NGUNG_KINH_DOANH";
        public const string InvalidPromotion = "KHUYEN_MAI_KHONG_HOP_LE";
        public const string NoSupplementaryDuty = "KHONG_CO_NGHIA_VU_THU_THEM";
        public const string ScopeInventoryUndefined = "PHAM_VI_KIEM_KE_KHONG_RO";
        public const string InvalidRentalPeriod = "KHOANG_THUE_KHONG_HOP_LE";
        public const string MissingSimulationData = "PHUONG_AN_THIEU_DU_LIEU";
        public const string ForbiddenAttributeModification = "THUOC_TINH_DIEU_CHINH_BI_CAM";
        public const string MismatchSourceReceipt = "CHI_TIET_KHAC_NGUON_NHAP";
        public const string ImmutableSourceReceipt = "NGUON_NHAP_BAT_BIEN";

        // W5-T1: quản trị tài khoản & nhân viên
        public const string AccountNotFound = "TAI_KHOAN_NOT_FOUND";
        public const string ContactExists = "LIEN_HE_DA_TON_TAI";
        public const string LastActiveAdmin = "ADMIN_HOAT_DONG_CUOI_CUNG";
        public const string InvalidRole = "VAI_TRO_KHONG_HOP_LE";
        public const string PermissionChanged = "QUYEN_DA_THAY_DOI";

        // W6-T6: báo cáo nhập hàng, kho và bảo trì (đều 400)
        public const string UnsupportedWarehouseReportMoment = "MOC_BAO_CAO_KHO_KHONG_HO_TRO";
        public const string UnsupportedExportType = "LOAI_XUAT_KHONG_HO_TRO";
        public const string ExportRangeTooLarge = "KHOANG_XUAT_QUA_LON";

        // feat/ROLE_Adjustment: phân quyền động
        public const string RoleNotFound = "VAI_TRO_KHONG_TON_TAI";
        public const string PermissionNotFound = "QUYEN_KHONG_TON_TAI";
        public const string PermissionDenied = "KHONG_DU_QUYEN";
    }

    /// <summary>
    /// Danh mục roles cố định (feat/ROLE_Adjustment). Không cho tạo mới từ UI.
    /// Khớp 1-1 với giá trị TAI_KHOAN.vai_tro.
    /// </summary>
    public static class Roles
    {
        public const string Admin = "QuanTriVien";
        public const string Staff = "NhanVien";
        public const string Customer = "KhachHang";

        public static readonly string[] All = { Admin, Staff, Customer };
    }

    /// <summary>
    /// Catalog permission tĩnh (feat/ROLE_Adjustment). Mã là literal, group theo module.
    /// Gắn với controller qua [RequirePermission("DonThue.Xoa")].
    /// Thêm quyền mới: thêm string ở đây rồi update seeder nếu muốn gán sẵn.
    /// </summary>
    public static class Permissions
    {
        public const string Type = "permission";

        public const string DonThue_Xem = "DonThue.Xem";
        public const string DonThue_Tao = "DonThue.Tao";
        public const string DonThue_CapNhat = "DonThue.CapNhat";
        public const string DonThue_Xoa = "DonThue.Xoa";
        public const string DonThue_Huy = "DonThue.Huy";

        public const string SanPham_Xem = "SanPham.Xem";
        public const string SanPham_Tao = "SanPham.Tao";
        public const string SanPham_CapNhat = "SanPham.CapNhat";
        public const string SanPham_Xoa = "SanPham.Xoa";

        public const string DanhMuc_Xem = "DanhMuc.Xem";
        public const string DanhMuc_Quan = "DanhMuc.Quan";

        public const string KhuyenMai_Xem = "KhuyenMai.Xem";
        public const string KhuyenMai_Quan = "KhuyenMai.Quan";

        public const string ChinhSach_Xem = "ChinhSach.Xem";
        public const string ChinhSach_Quan = "ChinhSach.Quan";

        public const string BaoCao_Xem = "BaoCao.Xem";
        public const string BaoCao_Xuat = "BaoCao.Xuat";

        public const string TaiKhoan_Xem = "TaiKhoan.Xem";
        public const string TaiKhoan_Quan = "TaiKhoan.Quan";
        public const string NhanVien_Xem = "NhanVien.Xem";
        public const string NhanVien_Quan = "NhanVien.Quan";

        public const string PhanQuyen_Xem = "PhanQuyen.Xem";
        public const string PhanQuyen_Quan = "PhanQuyen.Quan";

        // v2 §P0 — mở rộng catalog theo §1.4 (gap analysis)
        public const string PhuPhi_Xem = "PhuPhi.Xem";
        public const string PhuPhi_Tao = "PhuPhi.Tao";
        public const string PhuPhi_Duyet = "PhuPhi.Duyet";
        public const string PhuPhi_Huy = "PhuPhi.Huy";

        public const string DoiSoat_Xem = "DoiSoat.Xem";
        public const string DoiSoat_Chot = "DoiSoat.Chot";

        public const string QuaHan_Xem = "QuaHan.Xem";
        public const string QuaHan_XuLy = "QuaHan.XuLy";

        public const string VongDoiThietBi_Xem = "VongDoiThietBi.Xem";
        public const string VongDoiThietBi_CapNhat = "VongDoiThietBi.CapNhat";

        public const string PhieuNhap_Xem = "PhieuNhap.Xem";
        public const string PhieuNhap_Tao = "PhieuNhap.Tao";
        public const string PhieuNhap_Duyet = "PhieuNhap.Duyet";
        public const string PhieuNhap_Huy = "PhieuNhap.Huy";

        public const string ChuanBiDon_Xem = "ChuanBiDon.Xem";
        public const string ChuanBiDon_Thao = "ChuanBiDon.Thao";

        public const string BanGiao_Xem = "BanGiao.Xem";
        public const string BanGiao_Thao = "BanGiao.Thao";

        public const string BaoTri_Xem = "BaoTri.Xem";
        public const string BaoTri_Tao = "BaoTri.Tao";
        public const string BaoTri_Duyet = "BaoTri.Duyet";

        public const string NhanTra_Xem = "NhanTra.Xem";
        public const string NhanTra_Thao = "NhanTra.Thao";

        public const string HoanTien_Xem = "HoanTien.Xem";
        public const string HoanTien_Duyet = "HoanTien.Duyet";

        public const string NhaCungCap_Xem = "NhaCungCap.Xem";
        public const string NhaCungCap_Quan = "NhaCungCap.Quan";

        public const string Kho_Xem = "Kho.Xem";
        public const string Kho_Quan = "Kho.Quan";

        public const string DieuChinhKho_Xem = "DieuChinhKho.Xem";
        public const string DieuChinhKho_Duyet = "DieuChinhKho.Duyet";

        public const string BaoCaoKho_Xem = "BaoCaoKho.Xem";
        public const string BaoCaoKho_Xuat = "BaoCaoKho.Xuat";

        public const string BaoCaoVanHanh_Xem = "BaoCaoVanHanh.Xem";
        public const string BaoCaoVanHanh_Xuat = "BaoCaoVanHanh.Xuat";

        public const string BaoCaoTaiChinh_Xem = "BaoCaoTaiChinh.Xem";
        public const string BaoCaoTaiChinh_Xuat = "BaoCaoTaiChinh.Xuat";

        public const string ThongBao_Xem = "ThongBao.Xem";
        public const string ThongBao_Gui = "ThongBao.Gui";

        public const string NhatKy_Xem = "NhatKy.Xem";

        public const string DanhGia_Xem = "DanhGia.Xem";
        public const string DanhGia_Duyet = "DanhGia.Duyet";
        public const string DanhGia_Xoa = "DanhGia.Xoa";

        public static readonly string[] All =
        {
            DonThue_Xem, DonThue_Tao, DonThue_CapNhat, DonThue_Xoa, DonThue_Huy,
            SanPham_Xem, SanPham_Tao, SanPham_CapNhat, SanPham_Xoa,
            DanhMuc_Xem, DanhMuc_Quan,
            KhuyenMai_Xem, KhuyenMai_Quan,
            ChinhSach_Xem, ChinhSach_Quan,
            BaoCao_Xem, BaoCao_Xuat,
            TaiKhoan_Xem, TaiKhoan_Quan, NhanVien_Xem, NhanVien_Quan,
            PhanQuyen_Xem, PhanQuyen_Quan,
            // v2 §P0 mở rộng
            PhuPhi_Xem, PhuPhi_Tao, PhuPhi_Duyet, PhuPhi_Huy,
            DoiSoat_Xem, DoiSoat_Chot,
            QuaHan_Xem, QuaHan_XuLy,
            VongDoiThietBi_Xem, VongDoiThietBi_CapNhat,
            PhieuNhap_Xem, PhieuNhap_Tao, PhieuNhap_Duyet, PhieuNhap_Huy,
            ChuanBiDon_Xem, ChuanBiDon_Thao,
            BanGiao_Xem, BanGiao_Thao,
            BaoTri_Xem, BaoTri_Tao, BaoTri_Duyet,
            NhanTra_Xem, NhanTra_Thao,
            HoanTien_Xem, HoanTien_Duyet,
            NhaCungCap_Xem, NhaCungCap_Quan,
            Kho_Xem, Kho_Quan,
            DieuChinhKho_Xem, DieuChinhKho_Duyet,
            BaoCaoKho_Xem, BaoCaoKho_Xuat,
            BaoCaoVanHanh_Xem, BaoCaoVanHanh_Xuat,
            BaoCaoTaiChinh_Xem, BaoCaoTaiChinh_Xuat,
            ThongBao_Xem, ThongBao_Gui,
            NhatKy_Xem,
            DanhGia_Xem, DanhGia_Duyet, DanhGia_Xoa,
        };

        public static readonly string[] DefaultStaff =
        {
            DonThue_Xem, DonThue_Tao, DonThue_CapNhat, DonThue_Huy,
            SanPham_Xem, DanhMuc_Xem,
            KhuyenMai_Xem, ChinhSach_Xem, BaoCao_Xem,
            PhuPhi_Xem, PhuPhi_Tao, PhuPhi_Duyet,
            DoiSoat_Xem, DoiSoat_Chot,
            QuaHan_Xem, QuaHan_XuLy,
            PhieuNhap_Xem, PhieuNhap_Tao, PhieuNhap_Duyet, PhieuNhap_Huy,
            ChuanBiDon_Xem, ChuanBiDon_Thao,
            BanGiao_Xem, BanGiao_Thao,
            BaoTri_Xem, BaoTri_Tao, BaoTri_Duyet,
            NhanTra_Xem, NhanTra_Thao,
            HoanTien_Xem,
            NhaCungCap_Xem,
            Kho_Xem, DieuChinhKho_Xem, VongDoiThietBi_Xem,
            BaoCaoKho_Xem, BaoCaoVanHanh_Xem,
            ThongBao_Xem,
            // v2 §P3 — NhanVien được quyền trả lời đánh giá, xem nhật ký vận hành phạm vi của mình, duyệt yêu cầu hoàn tiền.
            DanhGia_Xem, DanhGia_Duyet,
            NhatKy_Xem,
            HoanTien_Duyet,
            // KHÔNG seed cho NhanVien (chỉ Admin): PhanQuyen.*, TaiKhoan.*, NhanVien.*, BaoCaoTaiChinh.*, DanhGia.Xoa
        };

        public static readonly string[] DefaultCustomer = System.Array.Empty<string>();

        /// <summary>
        /// v2 §8.5 — tập quyền NhanVien **không thể gỡ**. Admin PUT bộ quyền thiếu
        /// bất kỳ mã nào trong danh sách này sẽ bị chặn.
        /// </summary>
        public static readonly string[] MinStaff =
        {
            DonThue_Xem,
        };

        /// <summary>
        /// Nhóm quyền chỉ dành riêng cho Quản trị viên — cấm gán cho Nhân viên dưới mọi hình thức.
        /// </summary>
        public static readonly string[] AdminOnly =
        {
            PhanQuyen_Xem,
            PhanQuyen_Quan,
        };
    }

    /// <summary>
    /// v2 §P1 + §8.10 — danh định tài khoản "hệ thống" dùng làm actor cho hành động không có JWT:
    /// seeder, migration, callback payment gateway. Row <c>TaiKhoan</c> tương ứng được seed sẵn,
    /// role <c>SYSTEM</c>, không cấp permission quản trị nào → không vi phạm FK <c>NhatKyThaoTac.MaTaiKhoan</c>.
    /// </summary>
    public static class SystemActors
    {
        public const long Seeder = 1;
        public const long Gateway = 2;
        public const string SystemRole = "SYSTEM";

        public static readonly long[] All = { Seeder, Gateway };
    }
}
