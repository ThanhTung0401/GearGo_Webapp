namespace GearGo.Helpers;

public static class KietDomainConstants
{
    public static class PolicyConfig
    {
        public const int ThoiGianGiuChoPhut = 15;
        public const int SoNgayBaoCaoMacDinh = 30;
        public const int SoPhanTrangMacDinh = 20;
        public const int SoPhanTrangToiDa = 100;
        public const double SoGioMotNgay = 24.0;
        public const int TyLePhanTramNhan = 100;
        public const int SoChuSoThapPhanLamTron = 2;
        public const long MaChinhSachMacDinh = 1;
        public const int DungSaiPhutThoiGianThuc = 5;
        public const int ChuKyQuetJobPhut = 1;
        public const int DelayRetryJobGiay = 10;
        public const double SoNgayThueToiThieu = 1.0;
    }

    public static class PhieuStatus
    {
        public const string Nhap = "Nhap";
        public const string ChoGiao = "ChoGiao";
        public const string DaGiao = "DaGiao";
        public const string DaChot = "DaChot";
        public const string DaPhanCong = "DaPhanCong";
        public const string ThanhCong = "ThanhCong";
        public const string ChoThanhToan = "ChoThanhToan";
        public const string DaHuy = "DaHuy";
        public const string DaDuyet = "DaDuyet";
        public const string ChoDuyet = "ChoDuyet";
        public const string DaApDung = "DaApDung";
        public const string ChoXuLy = "ChoXuLy";
        public const string DaKiemTra = "DaKiemTra";
        public const string DaDuyetMat = "DaDuyetMat";
        public const string DangGiu = "DangGiu";
        public const string DaSuDung = "DaSuDung";
        public const string HetHan = "HetHan";
        public const string DaGiaiPhong = "DaGiaiPhong";
        public const string CanDoiChieu = "CanDoiChieu";
        public const string CanDoiSoat = "CanDoiSoat";
        public const string TinhTrangMacDinhBanGiao = "Hoạt động bình thường";
    }

    public static class MucDichGiaoDich
    {
        public const string TienThue = "TienThue";
        public const string TienCoc = "TienCoc";
        public const string ThuBoSung = "ThuBoSung";
    }

    public static class KetLuanKiemTra
    {
        public const string Dat = "Dat";
        public const string CanVeSinh = "CanVeSinh";
        public const string HongNhe = "HongNhe";
        public const string HongNang = "HongNang";
        public const string ThieuPhuKien = "ThieuPhuKien";
        public const string MatThietBi = "MatThietBi";
    }

    public static class BaoTriConfig
    {
        public const string LoaiVeSinh = "VeSinh";
        public const string LoaiSuaChua = "SuaChua";

        public const string MucDoNhe = "Nhe";
        public const string MucDoTrungBinh = "TrungBinh";
        public const string MucDoNang = "Nang";

        public const string TrangThaiChoXuLy = "ChoXuLy";
        public const string TrangThaiDangXuLy = "DangXuLy";
        public const string TrangThaiChoKiemTra = "ChoKiemTra";
        public const string TrangThaiHoanThanh = "HoanThanh";
        public const string TrangThaiKhongDat = "KhongDat";
    }

    public static class VongDoiConfig
    {
        public const string LoaiGiangCap = "GiangCap";
        public const string LoaiNgungSuDung = "NgungSuDung";
    }

    public static class ErrorCodes
    {
        // 404 Not Found
        public const string NotFound = "NOT_FOUND";
        public const string DonNotFound = "DON_NOT_FOUND";
        public const string DonThueNotFound = "DON_THUE_NOT_FOUND";
        public const string PhieuNotFound = "PHIEU_NOT_FOUND";
        public const string ThietBiNotFound = "THIET_BI_NOT_FOUND";
        public const string NhanVienNotFound = "NHAN_VIEN_NOT_FOUND";
        public const string ChiTietNotFound = "CHI_TIET_NOT_FOUND";
        public const string PhuPhiNotFound = "PHU_PHI_NOT_FOUND";
        public const string SanPhamNotFound = "SAN_PHAM_NOT_FOUND";
        public const string DoiSoatNotFound = "DOI_SOAT_NOT_FOUND";
        public const string GiaoDichNotFound = "GIAO_DICH_NOT_FOUND";

        // 403 Forbidden
        public const string KhongCoQuyen = "KHONG_CO_QUYEN";
        public const string KhongPhaiNguoiXuLy = "KHONG_PHAI_NGUOI_XU_LY";

        // 409 Conflict
        public const string InvalidState = "INVALID_STATE";
        public const string Locked = "LOCKED";
        public const string DongDaCoPhieu = "DONG_DA_CO_PHIEU_NHAN";
        public const string PhieuNhanDaChot = "PHIEU_NHAN_DA_CHOT";
        public const string KetLuanMatChuaDu = "KET_LUAN_MAT_CHUA_DU";
        public const string ThietBiDaTra = "THIET_BI_DA_TRA";
        public const string ThietBiDangOKhach = "THIET_BI_DANG_O_KHACH";
        public const string ThietBiDaCoBaoTriMo = "THIET_BI_DA_CO_BAO_TRI_MO";
        public const string PhieuBaoTriDaKetThuc = "PHIEU_BAO_TRI_DA_KET_THUC";
        public const string NhanVienDaNghiViec = "NHAN_VIEN_DA_NGHI_VIEC";
        public const string ThietBiChuaThuHoi = "THIET_BI_CHUA_THU_HOI";
        public const string ThayDoiLamThieuCamKet = "THAY_DOI_LAM_THIEU_CAM_KET";
        public const string ThuThemDangCho = "THU_THEM_DANG_CHO";

        // 400 Bad Request
        public const string DanhSachRong = "DANH_SACH_RONG";
        public const string DuplicateItems = "DUPLICATE_ITEMS";
        public const string KetLuanChuaDu = "KET_LUAN_CHUA_DU";
        public const string KetLuanKhongHopLe = "KET_LUAN_KHONG_HOP_LE";
        public const string ThoiDiemTraKhongHopLe = "THOI_DIEM_TRA_KHONG_HOP_LE";
        public const string KhongTheTachHet = "KHONG_THE_TACH_HET";
        public const string KhongPhaiMatThietBi = "KHONG_PHAI_MAT_THIET_BI";
        public const string DonChuaBanGiao = "DON_CHUA_BAN_GIAO";
        public const string ThietBiKhongThuocBanGiao = "THIET_BI_KHONG_THUOC_BAN_GIAO";
        public const string DuLieuKhongHopLe = "DU_LIEU_KHONG_HOP_LE";
        public const string ChiPhiKhongHopLe = "CHI_PHI_KHONG_HOP_LE";
        public const string KetQuaKiemTraChuaDu = "KET_QUA_KIEM_TRA_CHUA_DU";
        public const string SanPhamDichKhongPhuHop = "SAN_PHAM_DICH_KHONG_PHU_HOP";
        public const string ChuaThanhToanDu = "CHUA_THANH_TOAN_DU";
        public const string GioHangRong = "GIO_HANG_RONG";
        public const string ThoiGianKhongHopLe = "THOI_GIAN_KHONG_HOP_LE";
        public const string ThoiGianQuaKhu = "THOI_GIAN_QUA_KHU";
        public const string SoLuongKhongHopLe = "SO_LUONG_KHONG_HOP_LE";
        public const string HetHang = "HET_HANG";
        public const string SanPhamNgungKinhDoanh = "SAN_PHAM_NGUNG_KINH_DOANH";
        public const string KhuyenMaiKhongHopLe = "KHUYEN_MAI_KHONG_HOP_LE";
        public const string KhongCoNghiaVuThuThem = "KHONG_CO_NGHIA_VU_THU_THEM";
    }
}
