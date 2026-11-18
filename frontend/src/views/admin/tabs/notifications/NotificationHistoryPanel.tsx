import { type AppNotification } from "../../../../store";

interface NotificationHistoryPanelProps {
  filteredHistory: AppNotification[];
  filterRole: string;
  setFilterRole: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
}

/**
 * Cột hiển thị lịch sử thông báo đã phát kèm bộ lọc theo vai trò và danh mục nghiệp vụ.
 */
export function NotificationHistoryPanel({
  filteredHistory,
  filterRole,
  setFilterRole,
  filterCategory,
  setFilterCategory,
}: NotificationHistoryPanelProps) {
  return (
    <div className="adm-card adm-card--padded flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="adm-card-title">
          Thông báo đã phát ({filteredHistory.length})
        </h3>
      </div>

      {/* Bộ lọc lịch sử phát */}
      <div className="flex gap-2 mb-3">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="adm-select adm-select--xs"
        >
          <option value="all">Tất cả đối tượng</option>
          <option value="customer">Khách hàng</option>
          <option value="staff">Nhân viên kho</option>
          <option value="admin">Quản trị viên</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="adm-select adm-select--xs"
        >
          <option value="all">Tất cả danh mục</option>
          <option value="rental">⛺ Đơn thuê</option>
          <option value="order">📦 Đơn hàng</option>
          <option value="finance">💰 Tài chính</option>
          <option value="system">⚙️ Hệ thống</option>
        </select>
      </div>

      <div className="adm-notif-history-list">
        {filteredHistory.map((n) => (
          <div key={n.id} className="adm-notif-history-item">
            <div className="flex justify-between items-start mb-1 gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <strong className="adm-cell-title">{n.title}</strong>
                {n.category && (
                  <span className="adm-pill is-slate adm-pill--xs">
                    {n.category.toUpperCase()}
                  </span>
                )}
              </div>
              <span className={`adm-pill adm-pill--xs ${n.type === "alert" ? "is-danger" : n.type === "warning" ? "is-warning" : "is-info"}`}>
                {n.targetRole.toUpperCase()}
              </span>
            </div>
            <p className="text-[0.78rem] text-[#4B5563] leading-snug my-1">{n.message}</p>

            <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-200">
              <span className="adm-muted-note text-[0.68rem]">{n.createdAt}</span>
              {n.actionLink && (
                <span className="text-[0.7rem] font-semibold text-[#2563EB]">
                  🔗 {n.actionLink.label || "Liên kết"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
