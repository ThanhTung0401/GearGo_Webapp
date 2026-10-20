namespace GearGo.Helpers;

/// <summary>
/// Lớp chuyển tiếp tương thích ngược, đảm bảo không phá vỡ code của các thành viên khác đang dùng KietDomainConstants
/// </summary>
public static class KietDomainConstants
{
    public static class PolicyConfig
    {
        public const int ThoiGianGiuChoPhut = DomainConstants.Policies.HoldTimeMinutes;
        public const int SoNgayBaoCaoMacDinh = DomainConstants.Policies.DefaultReportDays;
        public const int SoPhanTrangMacDinh = DomainConstants.Policies.DefaultPageSize;
        public const int SoPhanTrangToiDa = DomainConstants.Policies.MaxPageSize;
        public const double SoGioMotNgay = DomainConstants.Policies.HoursPerDay;
        public const int TyLePhanTramNhan = DomainConstants.Policies.PercentageMultiplier;
        public const int SoChuSoThapPhanLamTron = DomainConstants.Policies.DecimalRoundingDigits;
        public const long MaChinhSachMacDinh = DomainConstants.Policies.DefaultPolicyId;
        public const int DungSaiPhutThoiGianThuc = DomainConstants.Policies.ToleranceMinutes;
        public const int ChuKyQuetJobPhut = DomainConstants.Policies.JobScanIntervalMinutes;
        public const int DelayRetryJobGiay = DomainConstants.Policies.DelayRetryJobSeconds;
        public const double SoNgayThueToiThieu = DomainConstants.Policies.MinRentalDays;
    }

    public static class PhieuStatus
    {
        public const string Nhap = DomainConstants.Status.Draft;
        public const string ChoGiao = DomainConstants.Status.PendingDelivery;
        public const string DaGiao = DomainConstants.Status.Delivered;
        public const string DaChot = DomainConstants.Status.Finalized;
        public const string DaPhanCong = DomainConstants.Status.Assigned;
        public const string ThanhCong = DomainConstants.Status.Success;
        public const string ChoThanhToan = DomainConstants.Status.PendingPayment;
        public const string DaHuy = DomainConstants.Status.Cancelled;
        public const string DaDuyet = DomainConstants.Status.Approved;
        public const string ChoDuyet = DomainConstants.Status.PendingApproval;
        public const string DaApDung = DomainConstants.Status.Applied;
        public const string ChoXuLy = DomainConstants.Status.PendingProcessing;
        public const string DaKiemTra = DomainConstants.Status.Inspected;
        public const string DaDuyetMat = DomainConstants.Status.ApprovedLost;
        public const string DangGiu = DomainConstants.Status.Holding;
        public const string DaSuDung = DomainConstants.Status.Used;
        public const string HetHan = DomainConstants.Status.Expired;
        public const string DaGiaiPhong = DomainConstants.Status.Released;
        public const string CanDoiChieu = DomainConstants.Status.VerificationNeeded;
        public const string CanDoiSoat = DomainConstants.Status.ReconcileNeeded;
        public const string TinhTrangMacDinhBanGiao = DomainConstants.Status.DefaultHandoverCondition;
    }

    public static class MucDichGiaoDich
    {
        public const string TienThue = DomainConstants.TransactionPurposes.RentFee;
        public const string TienCoc = DomainConstants.TransactionPurposes.DepositFee;
        public const string ThuBoSung = DomainConstants.TransactionPurposes.SupplementaryFee;
    }

    public static class KetLuanKiemTra
    {
        public const string Dat = DomainConstants.InspectionConclusions.Pass;
        public const string CanVeSinh = DomainConstants.InspectionConclusions.NeedsCleaning;
        public const string HongNhe = DomainConstants.InspectionConclusions.MinorDamage;
        public const string HongNang = DomainConstants.InspectionConclusions.MajorDamage;
        public const string ThieuPhuKien = DomainConstants.InspectionConclusions.MissingAccessories;
        public const string MatThietBi = DomainConstants.InspectionConclusions.Lost;
    }

    public static class BaoTriConfig
    {
        public const string LoaiVeSinh = DomainConstants.Maintenance.TypeCleaning;
        public const string LoaiSuaChua = DomainConstants.Maintenance.TypeRepair;

        public const string MucDoNhe = DomainConstants.Maintenance.LevelMinor;
        public const string MucDoTrungBinh = DomainConstants.Maintenance.LevelMedium;
        public const string MucDoNang = DomainConstants.Maintenance.LevelMajor;

        public const string TrangThaiChoXuLy = DomainConstants.Status.PendingProcessing;
        public const string TrangThaiDangXuLy = DomainConstants.Status.InProgress;
        public const string TrangThaiChoKiemTra = DomainConstants.Status.PendingInspection;
        public const string TrangThaiHoanThanh = DomainConstants.Status.Completed;
        public const string TrangThaiKhongDat = DomainConstants.Status.Failed;
    }

    public static class VongDoiConfig
    {
        public const string LoaiGiangCap = DomainConstants.Lifecycle.Downgrade;
        public const string LoaiNgungSuDung = DomainConstants.Lifecycle.Decommission;
    }

    public static class StaffStatus
    {
        public const string Working = DomainConstants.StaffStatus.Working;
        public const string Resigned = DomainConstants.StaffStatus.Resigned;
    }

    public static class AccountStatus
    {
        public const string Active = DomainConstants.AccountStatus.Active;
        public const string Locked = DomainConstants.AccountStatus.Locked;
    }

    public static class ErrorCodes
    {
        // 500
        public const string SystemError = DomainConstants.Errors.SystemError;
        // 404
        public const string NotFound = DomainConstants.Errors.NotFound;
        public const string DonNotFound = DomainConstants.Errors.OrderNotFound;
        public const string DonThueNotFound = DomainConstants.Errors.OrderRentalNotFound;
        public const string PhieuNotFound = DomainConstants.Errors.ReceiptNotFound;
        public const string ThietBiNotFound = DomainConstants.Errors.EquipmentNotFound;
        public const string NhanVienNotFound = DomainConstants.Errors.StaffNotFound;
        public const string ChiTietNotFound = DomainConstants.Errors.DetailNotFound;
        public const string PhuPhiNotFound = DomainConstants.Errors.SurchargeNotFound;
        public const string SanPhamNotFound = DomainConstants.Errors.ProductNotFound;
        public const string DoiSoatNotFound = DomainConstants.Errors.ReconciliationNotFound;
        public const string GiaoDichNotFound = DomainConstants.Errors.TransactionNotFound;

        // 403
        public const string KhongCoQuyen = DomainConstants.Errors.Forbidden;
        public const string KhongPhaiNguoiXuLy = DomainConstants.Errors.NotAssignedStaff;

        // 409
        public const string InvalidState = DomainConstants.Errors.InvalidState;
        public const string Locked = DomainConstants.Errors.Locked;
        public const string DongDaCoPhieu = DomainConstants.Errors.LineAlreadyHasDraftReceipt;
        public const string PhieuNhanDaChot = DomainConstants.Errors.ReceiptFinalized;
        public const string KetLuanMatChuaDu = DomainConstants.Errors.LostConclusionIncomplete;
        public const string ThietBiDaTra = DomainConstants.Errors.EquipmentAlreadyReturned;
        public const string ThietBiDangOKhach = DomainConstants.Errors.EquipmentWithCustomer;
        public const string ThietBiDaCoBaoTriMo = DomainConstants.Errors.ActiveMaintenanceExists;
        public const string PhieuBaoTriDaKetThuc = DomainConstants.Errors.MaintenanceTicketClosed;
        public const string NhanVienDaNghiViec = DomainConstants.Errors.StaffResigned;
        public const string ThietBiChuaThuHoi = DomainConstants.Errors.EquipmentNotRecovered;
        public const string ThayDoiLamThieuCamKet = DomainConstants.Errors.ChangeViolatesCommitment;
        public const string ThuThemDangCho = DomainConstants.Errors.SupplementaryCollectionPending;

        // 400
        public const string DanhSachRong = DomainConstants.Errors.EmptyList;
        public const string DuplicateItems = DomainConstants.Errors.DuplicateItems;
        public const string KetLuanChuaDu = DomainConstants.Errors.IncompleteConclusion;
        public const string KetLuanKhongHopLe = DomainConstants.Errors.InvalidConclusion;
        public const string ThoiDiemTraKhongHopLe = DomainConstants.Errors.InvalidReturnTime;
        public const string KhongTheTachHet = DomainConstants.Errors.CannotSplitAll;
        public const string KhongPhaiMatThietBi = DomainConstants.Errors.NotLostEquipment;
        public const string DonChuaBanGiao = DomainConstants.Errors.OrderNotDelivered;
        public const string ThietBiKhongThuocBanGiao = DomainConstants.Errors.EquipmentNotInHandover;
        public const string DuLieuKhongHopLe = DomainConstants.Errors.InvalidData;
        public const string ChiPhiKhongHopLe = DomainConstants.Errors.InvalidCost;
        public const string KetQuaKiemTraChuaDu = DomainConstants.Errors.InspectionResultIncomplete;
        public const string SanPhamDichKhongPhuHop = DomainConstants.Errors.TargetProductMismatch;
        public const string ChuaThanhToanDu = DomainConstants.Errors.InsufficientPayment;
        public const string GioHangRong = DomainConstants.Errors.EmptyCart;
        public const string ThoiGianKhongHopLe = DomainConstants.Errors.InvalidTime;
        public const string ThoiGianQuaKhu = DomainConstants.Errors.PastTime;
        public const string SoLuongKhongHopLe = DomainConstants.Errors.InvalidQuantity;
        public const string HetHang = DomainConstants.Errors.OutOfStock;
        public const string SanPhamNgungKinhDoanh = DomainConstants.Errors.ProductDiscontinued;
        public const string KhuyenMaiKhongHopLe = DomainConstants.Errors.InvalidPromotion;
        public const string KhongCoNghiaVuThuThem = DomainConstants.Errors.NoSupplementaryDuty;
    }
}
