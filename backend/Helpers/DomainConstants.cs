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
    }
}
