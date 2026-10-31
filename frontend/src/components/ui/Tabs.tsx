import React from "react";
import type { IconName } from "../Icon";
import Icon from "../Icon";

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: IconName;
  badge?: number | string;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  variant?: "pills" | "underline";
}

export default function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = "pills"
}: TabsProps<T>) {
  if (variant === "underline") {
    return (
      <div className="flex items-center gap-2 border-b border-[var(--color-bone)] overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-[var(--color-forest)] text-[var(--color-forest)]"
                  : "border-transparent text-gray-500 hover:text-[var(--color-bark)] hover:border-gray-300"
              }`}
            >
              {tab.icon && <Icon name={tab.icon} size={16} />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-gray-100 font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 p-1 bg-[var(--color-parchment)] rounded-xl border border-[var(--color-bone)] overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              isActive
                ? "bg-[var(--color-forest)] text-white shadow-xs"
                : "text-[var(--color-bark)] hover:bg-white/60"
            }`}
          >
            {tab.icon && <Icon name={tab.icon} size={15} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[0.65rem] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
