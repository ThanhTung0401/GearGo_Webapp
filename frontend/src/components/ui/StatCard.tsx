import React from "react";
import Icon, { type IconName } from "../Icon";

export interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: IconName;
  color?: string;
  bg?: string;
  trend?: { value: string; isPositive: boolean };
  onClick?: () => void;
}

export default function StatCard({
  label,
  value,
  sub,
  icon,
  color = "var(--color-forest)",
  bg = "white",
  trend,
  onClick
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl border border-[var(--color-bone)] shadow-xs transition-all duration-200 ${
        onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""
      }`}
      style={{ background: bg }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ color, background: `${color}15` }}>
          <Icon name={icon} size={20} />
        </div>
      </div>
      <div className="text-2xl font-bold font-[family-name:var(--font-mono)]" style={{ color }}>
        {value}
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        {sub && <span>{sub}</span>}
        {trend && (
          <span className={`font-semibold ${trend.isPositive ? "text-emerald-600" : "text-rose-600"}`}>
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
