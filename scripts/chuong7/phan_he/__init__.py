# -*- coding: utf-8 -*-
"""Tổng hợp 71 màn hình và đặc tả biến cố tự nhiên từ 10 phân hệ."""

from . import phan_he_01_tai_khoan_nhan_vien
from . import phan_he_02_tu_van_danh_muc_gio_thue
from . import phan_he_03_dat_thue_thanh_toan_huy
from . import phan_he_04_chuan_bi_ban_giao_nhan_tra
from . import phan_he_05_phu_phi_doi_soat_hoan_tien
from . import phan_he_06_san_pham_thiet_bi_bao_tri
from . import phan_he_07_nha_cung_cap_nhap_kho
from . import phan_he_08_khuyen_mai_chinh_sach
from . import phan_he_09_danh_gia_thong_bao
from . import phan_he_10_bao_cao_nhat_ky

_SUBSYSTEM_MODULES = [
    phan_he_01_tai_khoan_nhan_vien,
    phan_he_02_tu_van_danh_muc_gio_thue,
    phan_he_03_dat_thue_thanh_toan_huy,
    phan_he_04_chuan_bi_ban_giao_nhan_tra,
    phan_he_05_phu_phi_doi_soat_hoan_tien,
    phan_he_06_san_pham_thiet_bi_bao_tri,
    phan_he_07_nha_cung_cap_nhap_kho,
    phan_he_08_khuyen_mai_chinh_sach,
    phan_he_09_danh_gia_thong_bao,
    phan_he_10_bao_cao_nhat_ky,
]

SCREENS_71 = [s for mod in _SUBSYSTEM_MODULES for s in mod.SCREENS]
NATURAL_EVENTS = {}
for _mod in _SUBSYSTEM_MODULES:
    NATURAL_EVENTS.update(_mod.NATURAL_EVENTS)
