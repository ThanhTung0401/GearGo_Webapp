import React from "react";
import Icon, { type IconName } from "../Icon";
import Button from "./Button";

export interface EmptyStateProps {
  message?: string;
  description?: string;
  icon?: IconName;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({
  message = "Không có dữ liệu trong danh sách.",
  description,
  icon = "package",
  actionText,
  onAction
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white rounded-2xl border border-[var(--color-bone)] my-4">
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-parchment)] text-gray-400 flex items-center justify-center mb-4">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="text-base font-bold text-[var(--color-bark)] mb-1">{message}</h3>
      {description && <p className="text-xs text-gray-500 max-w-sm mb-4 leading-relaxed">{description}</p>}
      {actionText && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
