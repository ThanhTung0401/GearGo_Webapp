import { statusColors } from "../../utils/statusColors";

export interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const color = statusColors[status] || { bg: "#F3F4F6", text: "#4B5563" };
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[0.68rem]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center font-bold rounded-md whitespace-nowrap transition-colors ${sizeClass}`}
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {status}
    </span>
  );
}
