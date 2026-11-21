/**
 * orderFinanceDtos.ts - DTO phụ phí, hoàn tiền, đối soát và tổng hợp tài chính đơn
 */

export interface PhuPhiKhachBackend {
  maPhuPhi: number;
  loaiPhi: string;
  soTien: number;
  lyDo?: string | null;
  trangThaiDuyet: string;
}

export interface HoanTienKhachBackend {
  maHoanTien: number;
  loaiHoan?: string | null;
  soTien: number;
  trangThai: string;
  thoiDiemThanhCong?: string | null;
  nhanHienThi: string;
}

export interface DonTaiChinhBackend {
  nhanTra: {
    tongThietBiDaGiao: number;
    daTra: number;
    matDaDuyet: number;
    dangXuLyMat: number;
    soConNo: number;
    cacDot: Array<{
      maPhieuNhanTra: number;
      maPhieuHienThi: string;
      lanTra: number;
      laLanTraCuoi: boolean;
      thoiDiemChot?: string | null;
      soTra: number;
      soMat: number;
    }>;
    conNo: Array<{
      maChiTietBanGiao: number;
      maThietBiHienThi: string;
      tenSanPham: string;
      dangXuLyMat: boolean;
    }>;
  };
  phuPhi: {
    tongDeNghi: number;
    tongDaDuyet: number;
    tongTranhChap: number;
    tongTuChoi: number;
    soTranhChapDangMo: number;
    items: Array<{
      maPhuPhi: number;
      loaiPhi: string;
      soTien: number;
      lyDo?: string | null;
      trangThaiDuyet: string;
      trangThaiTranhChap?: string | null;
      ketQuaGiaiQuyet?: string | null;
      maPhuPhiGoc?: number | null;
      maDoiSoat?: number | null;
      laDieuChinh: boolean;
    }>;
  };
  doiSoat: Array<{
    maDoiSoat: number;
    maDoiSoatGoc?: number | null;
    laDieuChinh: boolean;
    loaiDoiSoat: string;
    tienCocDuocDoiSoat: number;
    tongPhuPhiDuocDuyet: number;
    soTienCanHoan: number;
    soTienCanThuThem: number;
    trangThai: string;
    thoiDiemLap: string;
    thoiDiemChot?: string | null;
    lyDoDieuChinh?: string | null;
  }>;
  thu: {
    tienThueDaThu: number;
    tienCocDaThu: number;
    thuBoSungDaThu: number;
    chuaPhanLoai: number;
    dangCho: number;
  };
  hoan: {
    tongDuKien: number;
    tongDangXuLy: number;
    tongDaHoan: number;
    tongCanXuLyLai: number;
    items: HoanTienKhachBackend[];
  };
  huy?: {
    trangThaiHuy: string;
    thoiDiemHuy?: string | null;
    lyDoHuy?: string | null;
    tienThueGiuLai: number;
  } | null;
  thoiDiemHoanTat?: string | null;
  coDieuChinhSauHoanTat: boolean;
  nhan: string[];
}
