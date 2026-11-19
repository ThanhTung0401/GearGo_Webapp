import type { StaffAccount } from "../../../store";

interface BackendStaffItem {
  maNhanVien: number;
  maTaiKhoan: number;
  hoTen?: string | null;
  email?: string | null;
  soDienThoai?: string | null;
  vaiTro?: string | null;
  trangThaiTaiKhoan?: string | null;
  trangThaiLamViec?: string | null;
  ngayNghiViec?: string | null;
  ngayVaoLam?: string | null;
}

/**
 * Chuyển đổi danh sách nhân viên từ API sang cấu trúc StaffAccount của UI,
 * đồng thời tạo bản đồ mã hiển thị -> maTaiKhoan / maNhanVien để gọi API cập nhật.
 */
export function mapBackendStaffItems(items: BackendStaffItem[]) {
  const tkMap: Record<string, number> = {};
  const nvMap: Record<string, number> = {};

  const mapped: StaffAccount[] = items.map((nv) => {
    const staffId = `NV-${String(nv.maNhanVien).padStart(3, "0")}`;
    tkMap[staffId] = nv.maTaiKhoan;
    nvMap[staffId] = nv.maNhanVien;

    const isLocked = nv.trangThaiTaiKhoan === "BiKhoa" || nv.trangThaiLamViec === "DaNghiViec";
    return {
      id: staffId,
      username: nv.email ? nv.email.split("@")[0] : `nv_${nv.maNhanVien}`,
      name: nv.hoTen || "Nhân viên",
      role: nv.vaiTro === "QuanTriVien" ? "Quản trị viên" : "Nhân viên kho",
      phone: nv.soDienThoai || "",
      email: nv.email || "",
      status: isLocked ? "locked" : "active",
      lockedReason:
        nv.trangThaiLamViec === "DaNghiViec"
          ? `Nghỉ việc từ ${nv.ngayNghiViec || "đã nghỉ"}`
          : nv.trangThaiTaiKhoan === "BiKhoa"
          ? "Tài khoản bị khóa"
          : undefined,
      permissions:
        nv.vaiTro === "QuanTriVien"
          ? ["Quản lý kho thiết bị", "Bàn giao & Nhận trả", "Lập phụ phí & Đối soát", "Xem báo cáo doanh thu", "Quản lý khuyến mãi"]
          : ["Quản lý kho thiết bị", "Bàn giao & Nhận trả"],
      createdAt: nv.ngayVaoLam || "01/01/2026",
    };
  });

  return { mapped, tkMap, nvMap };
}

/**
 * Lọc danh sách nhân viên cục bộ (chế độ mock) theo từ khóa, vai trò và trạng thái.
 */
export function filterMockStaffAccounts(
  staffAccounts: StaffAccount[],
  search: string,
  roleFilter: string,
  statusFilter: "all" | "active" | "locked"
): StaffAccount[] {
  const keyword = search.toLowerCase();
  return staffAccounts.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(keyword) ||
      s.username.toLowerCase().includes(keyword) ||
      s.id.toLowerCase().includes(keyword) ||
      s.phone.includes(search) ||
      s.email.toLowerCase().includes(keyword);
    const matchRole = roleFilter === "all" || s.role === roleFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });
}
