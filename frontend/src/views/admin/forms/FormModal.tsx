import React from "react";

export function FormModal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="btn btn-ghost btn-sm text-lg leading-none">×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export const fieldStyle = { width: "100%", border: "1px solid var(--color-bone)", borderRadius: "10px", padding: "10px 14px", background: "white", fontSize: "0.9rem" };
export const labelStyle = { display: "grid", gap: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" };

export function FormActions({ onClose, loading, submitLabel }: { onClose: () => void; loading?: boolean; submitLabel?: string }) {
  return (
    <div className="modal-footer mt-4">
      <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary btn-md">Hủy</button>
      <button type="submit" disabled={loading} className="btn btn-primary btn-md">
        {loading ? "Đang lưu..." : (submitLabel ?? "Lưu dữ liệu")}
      </button>
    </div>
  );
}

