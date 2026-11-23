import { formatDateVi, type StaffAccount } from "../../../store";

interface BackendStaffItem {
  maNhanVien: number;
  maTaiKhoan: number;
  hoTen?: string | null;
  email?: string | null;
  soDienThoai?: string | null;
  diaChi?: string | null;
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
      role: nv.vaiTro === "QuanTriVien" ? "Quản trị viên" : "Nhân viên",
      phone: nv.soDienThoai || "",
      email: nv.email || "",
      // [STF-03] Luu dia chi that de UI/update khong ghi de thanh "Van phong GearGo".
      address: nv.diaChi || "",
      status: isLocked ? "locked" : "active",
      // [STF-05] Workstatus: resigned khi da nghi viec de bang an nut "Mo" khoa.
      workStatus: nv.trangThaiLamViec === "DaNghiViec" ? "resigned" : "working",
      lockedReason:
        nv.trangThaiLamViec === "DaNghiViec"
          ? `Nghỉ việc từ ${nv.ngayNghiViec ? formatDateVi(nv.ngayNghiViec) : "đã nghỉ"}`
          : nv.trangThaiTaiKhoan === "BiKhoa"
          ? "Tài khoản bị khóa"
          : undefined,
      permissions: nv.vaiTro === "QuanTriVien" ? ["Toàn quyền quản trị hệ thống"] : [],
      createdAt: nv.ngayVaoLam ? formatDateVi(nv.ngayVaoLam) : "01/01/2026",
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
